import {
  chromium,
  type Browser,
  type BrowserContext,
  type Frame,
  type Locator,
  type Page,
} from "playwright";
import { config } from "../config.js";
import { dumpDebug, dumpDiagnostics } from "../debug.js";

/**
 * URLs und Ablauf stammen aus den HAR-Aufnahmen der echten Sitzung:
 * - POST https://www.immoservice-austria.com/login
 * - GET /grundbuchimmo/grundbuch -> SSO-Redirect zu dienste.manz.at
 * - Grundbuch/Firmenbuch laufen danach ueber MANZ Rev-Proxy URLs.
 */
const ISA_BASE = "https://www.immoservice-austria.com";
const GRUNDBUCH_LAUNCH_URL = `${ISA_BASE}/grundbuchimmo/grundbuch`;
const MODULE_OVERVIEW_URL = `${ISA_BASE}/grundbuchimmo/auswahl`;
export const MANZ_ADDRESS_SEARCH_URL =
  "https://dienste.manz.at/vst/rev-proxy/gb/at.gv.bmj.grundbuch.web/ds/suche/grundstuecksadressensuche";
const MANZ_EXTRACT_SEARCH_URL =
  "https://dienste.manz.at/vst/rev-proxy/gb/at.gv.bmj.grundbuch.web/ds/auszug/auszugsuche";
const MANZ_FIRMENBUCH_SEARCH_URL =
  "https://dienste.manz.at/vst/rev-proxy/fb/at.gv.justiz.fbw/ds/suche/firmen";
const MANZ_FIRMENBUCH_EXTRACT_FORM_URL =
  "https://dienste.manz.at/vst/rev-proxy/fb/at.gv.justiz.fbw/ds/auszug/formular";
const ADDRESS_SEARCH_PATH = "/ds/suche/grundstuecksadressensuche";
const EXTRACT_SEARCH_PATH = "/ds/auszug/auszugsuche";
const FIRMENBUCH_SEARCH_PATH = "/ds/suche/firmen";
const FIRMENBUCH_EXTRACT_FORM_PATH = "/ds/auszug/formular";
const MANZ_HOST_RE = /(?:^|\.)dienste\.manz\.at$/i;

/** Fehler, der klar auf falsche Zugangsdaten / Login-Problem hinweist. */
export class LoginError extends Error {}

/** Suchbereich fuer Locators: die Seite selbst oder ein iframe darin. */
export type Scope = Page | Frame;

/** Alle Suchbereiche einer Seite: Hauptseite zuerst, dann alle iframes. */
export function allScopes(page: Page): Scope[] {
  return [page, ...page.frames().filter((frame) => frame.parentFrame() !== null)];
}

/**
 * Pollt alle Kandidaten parallel: schnell, wenn ein Element da ist, und mit
 * klarer Obergrenze, wenn nicht.
 */
export async function firstVisible(
  candidates: Locator[],
  timeoutMs = 2500
): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  do {
    for (const candidate of candidates) {
      const first = candidate.first();
      if (await first.isVisible().catch(() => false)) return first;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  return null;
}

/**
 * Usercentrics-/Cookie-Banner schliessen. Der Banner laedt oft verzoegert,
 * daher wird mehrfach probiert.
 */
export async function dismissCookieBanner(page: Page, timeoutMs = 8000): Promise<boolean> {
  const candidates = [
    page.locator('[data-testid="uc-accept-all-button"]'),
    page.getByRole("button", { name: /alle akzeptieren|alles akzeptieren|accept all/i }),
    page.getByRole("button", { name: /akzeptieren|zustimmen|einverstanden/i }),
  ];
  const deadline = Date.now() + timeoutMs;
  let misses = 0;

  do {
    const button = await firstVisible(candidates, 900);
    if (button) {
      const clicked = await button
        .click({ timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        await page.waitForTimeout(400);
        console.log("[manz] Cookie-Banner geschlossen.");
        return true;
      }
      misses = 0;
    } else {
      misses += 1;
      const hasUsercentrics =
        (await page.locator("#usercentrics-root").count().catch(() => 0)) > 0;
      if (!hasUsercentrics && misses >= 2) return false;
      if (hasUsercentrics && misses >= 4) return false;
    }
  } while (Date.now() < deadline);
  return false;
}

async function clickLoginSubmit(page: Page): Promise<boolean> {
  return page
    .evaluate(`(() => {
      const candidates = Array.from(document.querySelectorAll('input, button, a'));
      const submit = candidates.find((el) => {
        const text = [
          el.getAttribute('value'),
          el.getAttribute('title'),
          el.getAttribute('alt'),
          el.textContent
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes('login') || text.includes('anmelden') || text.includes('einloggen');
      });
      if (!submit) return false;
      submit.click();
      return true;
    })()`)
    .then(Boolean)
    .catch(() => false);
}

async function clickGrundbuchLauncher(page: Page): Promise<boolean> {
  return page
    .evaluate(`(() => {
      const candidates = Array.from(document.querySelectorAll('a, button, [onclick]'));
      const score = (el) => {
        const text = [
          el.getAttribute('href'),
          el.getAttribute('title'),
          el.getAttribute('alt'),
          el.textContent
        ].filter(Boolean).join(' ').toLowerCase();
        if (text.includes('/grundbuchimmo/grundbuch')) return 3;
        if ((el.textContent || '').trim().toLowerCase() === 'grundbuch') return 2;
        if (text.includes('grundbuchimmo') || text.includes('grundbuch')) return 1;
        return 0;
      };
      const launcher = candidates
        .map((el) => ({ el, score: score(el) }))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.el;
      if (!launcher) return false;
      launcher.click();
      return true;
    })()`)
    .then(Boolean)
    .catch(() => false);
}

/**
 * Haelt genau eine eingeloggte MANZ-Browsersession. Wird eine Suche mit einer
 * abgelaufenen Session versucht, setzt der Aufrufer die Session per reset()
 * zurueck und loggt neu ein.
 */
export class ManzSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private manzPage: Page | null = null;

  /** Liefert die MANZ-Seite; loggt bei Bedarf neu ein. */
  async getManzPage(): Promise<Page> {
    if (this.manzPage && !this.manzPage.isClosed()) {
      return this.manzPage;
    }
    await this.reset();
    this.manzPage = await this.loginAndOpenGrundbuch();
    return this.manzPage;
  }

  async reset(): Promise<void> {
    this.manzPage = null;
    if (this.context) await this.context.close().catch(() => {});
    this.context = null;
    if (this.browser) await this.browser.close().catch(() => {});
    this.browser = null;
  }

  private async loginAndOpenGrundbuch(): Promise<Page> {
    this.browser = await chromium.launch({
      headless: config.headless,
      slowMo: config.slowMoMs || undefined,
      executablePath: config.chromiumPath || undefined,
    });
    this.context = await this.browser.newContext({ locale: "de-AT" });
    const page = await this.context.newPage();

    console.log("[manz] Login bei Immoservice Austria ...");
    const apiLoginOk = await this.apiLogin();
    if (apiLoginOk) {
      console.log("[manz] Login per Formular-POST erfolgreich.");
    } else {
      console.log("[manz] Formular-POST-Login fehlgeschlagen - versuche UI-Login ...");
      await this.uiLogin(page);
    }

    console.log("[manz] Starte Grundbuch-Modul (SSO-Redirect zu MANZ) ...");
    await page.goto(GRUNDBUCH_LAUNCH_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    let manzPage: Page = page;
    if (!page.url().includes("manz.at")) {
      console.log("[manz] Direkter Start ohne Redirect - versuche Klick in der Moduluebersicht ...");
      manzPage = await this.openGrundbuchModuleByClick(page);
    }

    if (!page.url().includes("manz.at") && !manzPage.url().includes("manz.at")) {
      await dumpDebug(manzPage, "manz-start-fehlgeschlagen");
      await dumpDiagnostics(manzPage, "manz-start-fehlgeschlagen");
      throw new LoginError(
        "Grundbuch-Modul konnte nicht gestartet werden (kein Redirect zu dienste.manz.at). " +
          "Meist bedeutet das: Login fehlgeschlagen oder Modul nicht freigeschaltet. Siehe debug/."
      );
    }

    await this.submitManzBridgeLoginIfNeeded(manzPage);
    await dismissCookieBanner(manzPage, 4000);
    console.log(`[manz] Grundbuch-Modul geoeffnet: ${manzPage.url()}`);
    return manzPage;
  }

  /**
   * Login wie im HAR aufgezeichnet: POST /login mit email/password/submit,
   * Erfolg = Redirect auf /auswahl.
   */
  private async apiLogin(): Promise<boolean> {
    if (!this.context) return false;
    const response = await this.context.request
      .post(`${ISA_BASE}/login`, {
        form: { email: config.isaEmail, password: config.isaPassword, submit: " " },
      })
      .catch(() => null);
    if (!response || !response.ok()) return false;
    return response.url().includes("auswahl");
  }

  /** UI-Login als Fallback. */
  private async uiLogin(page: Page): Promise<void> {
    await page.goto(ISA_BASE, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    if (!(await this.findEmailField(page, 1500))) {
      const loginLink = await firstVisible([
        page.getByRole("link", { name: /login|anmelden|einloggen/i }),
        page.getByRole("button", { name: /login|anmelden|einloggen/i }),
        page.locator('a[href*="login" i]'),
      ]);
      if (loginLink) {
        await loginLink.click();
        await page.waitForLoadState("domcontentloaded");
        await dismissCookieBanner(page, 4000);
      }
    }

    const emailField = await this.findEmailField(page, 8000);
    if (!emailField) {
      await dumpDebug(page, "login-kein-email-feld");
      await dumpDiagnostics(page, "login-kein-email-feld");
      throw new LoginError(
        "Login-Formular nicht gefunden (kein E-Mail-Feld sichtbar). Siehe debug/-Snapshot + Diagnose-JSON."
      );
    }
    const passwordField = await firstVisible(
      [page.locator('input[name="password"]'), page.locator('input[type="password"]')],
      5000
    );
    if (!passwordField) {
      await dumpDebug(page, "login-kein-passwort-feld");
      await dumpDiagnostics(page, "login-kein-passwort-feld");
      throw new LoginError("Login-Formular nicht gefunden (kein Passwort-Feld sichtbar).");
    }

    await emailField.fill(config.isaEmail);
    await passwordField.fill(config.isaPassword);
    await dismissCookieBanner(page);

    const submit = await firstVisible([
      page.locator('[name="submit"]'),
      page.getByRole("button", { name: /login|anmelden|einloggen/i }),
      page.locator('button[type="submit"]'),
      page.locator('input[type="submit"]'),
    ]);
    if (submit) {
      await submit.click({ force: true }).catch(async () => {
        await clickLoginSubmit(page);
      });
    } else if (await clickLoginSubmit(page)) {
      // Clicked by DOM fallback.
    } else {
      await passwordField.press("Enter");
    }

    const errorText = page.getByText(
      /fehler beim login|login fehlgeschlagen|passwort.*(falsch|ungueltig)|ungueltige.*anmeldedaten/i
    );
    const outcome = await Promise.race([
      page
        .waitForURL(/\/auswahl/i, { timeout: 25000 })
        .then(() => "ok" as const)
        .catch(() => null),
      errorText
        .first()
        .waitFor({ state: "visible", timeout: 25000 })
        .then(() => "error" as const)
        .catch(() => null),
    ]);

    if (outcome !== "ok") {
      await dumpDebug(page, "login-fehlgeschlagen");
      if (outcome !== "error") await dumpDiagnostics(page, "login-fehlgeschlagen");
      throw new LoginError(
        "Fehler beim Login: Immoservice hat die Anmeldung nicht angenommen. Bitte ISA_EMAIL und ISA_PASSWORD in der .env pruefen."
      );
    }
  }

  private async findEmailField(page: Page, timeoutMs = 2500): Promise<Locator | null> {
    return firstVisible(
      [
        page.locator('input[name="email"]'),
        page.locator('input[type="email"]'),
        page.locator('input[name*="mail" i]'),
        page.getByPlaceholder(/e-?mail/i),
      ],
      timeoutMs
    );
  }

  /** Fallback: Grundbuch-Link in der Moduluebersicht klicken (target=_blank). */
  private async openGrundbuchModuleByClick(page: Page): Promise<Page> {
    await page.goto(MODULE_OVERVIEW_URL, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page, 4000);

    const link = await firstVisible(
      [
        page.locator('a[href*="grundbuchimmo/grundbuch" i]'),
        page.locator('a[href*="grundbuchimmo" i]', { hasText: /grundbuch/i }),
        page.getByRole("link", { name: /grundbuch/i }),
      ],
      8000
    );

    if (!link) {
      const clicked = await clickGrundbuchLauncher(page);
      if (!clicked) {
        await dumpDebug(page, "grundbuch-link-nicht-gefunden");
        await dumpDiagnostics(page, "grundbuch-link-nicht-gefunden");
        throw new LoginError(
          "Grundbuch-Modul nicht gefunden - vermutlich ist der Login fehlgeschlagen oder das Modul nicht freigeschaltet. Siehe debug/."
        );
      }
    }

    const popupPromise = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
    const manzNavigationPromise = page
      .waitForURL(/dienste\.manz\.at|login\.manz\.at|\/vst\//i, { timeout: 15000 })
      .catch(() => null);

    if (link) {
      await link.click({ force: true });
    }
    const popup = await Promise.race([popupPromise, manzNavigationPromise.then(() => null)]);

    const manzPage = popup ?? page;
    await manzPage.waitForLoadState("domcontentloaded");
    await manzPage.waitForURL(/manz\.at/i, { timeout: 20000 }).catch(() => {});
    await manzPage.waitForLoadState("networkidle").catch(() => {});
    await this.submitManzBridgeLoginIfNeeded(manzPage);
    return manzPage;
  }

  /**
   * Zur MANZ-Grundstuecksadressensuche navigieren.
   */
  async gotoAddressSearch(page: Page): Promise<void> {
    if (page.url().includes("grundstuecksadressensuche") && !(await this.isManzBridgeLoginVisible(page))) return;

    await page.goto(MANZ_ADDRESS_SEARCH_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
    await this.submitManzBridgeLoginIfNeeded(page);
    if (page.url().includes("grundstuecksadressensuche") && !(await this.isManzBridgeLoginVisible(page))) return;

    const link = await firstVisible(
      [
        page.locator('a[href*="grundstuecksadressensuche" i]'),
        page.getByRole("link", { name: /grundstuecksadresse/i }),
        page.getByRole("link", { name: /adressen?suche/i }),
        page.getByText(/grundstuecksadressensuche/i),
      ],
      6000
    );
    if (link) {
      await link.click({ force: true });
      await page.waitForLoadState("domcontentloaded");
      return;
    }

    const match = page.url().match(/^(.*at\.gv\.bmj\.grundbuch\.web[^?#]*?)(\/ds\/.*)?$/);
    if (match) {
      const base = match[1].replace(/\/+$/, "");
      await page.goto(`${base}${ADDRESS_SEARCH_PATH}`, { waitUntil: "domcontentloaded" });
      await this.submitManzBridgeLoginIfNeeded(page);
      if (page.url().includes("grundstuecksadressensuche") && !(await this.isManzBridgeLoginVisible(page))) return;
    }

    await dumpDebug(page, "adresssuche-nicht-gefunden");
    await dumpDiagnostics(page, "adresssuche-nicht-gefunden");
    throw new Error(
      `MANZ-Adresssuche nicht erreichbar (gelandet auf: ${page.url()}). Session vermutlich abgelaufen.`
    );
  }

  async gotoExtractSearch(page: Page, kg: string, ez: string): Promise<void> {
    const query = `?kg=${encodeURIComponent(kg)}&ez=${encodeURIComponent(ez)}`;
    await page.goto(`${MANZ_EXTRACT_SEARCH_URL}${query}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await this.submitManzBridgeLoginIfNeeded(page);
    if (page.url().includes("/ds/auszug/auszugsuche") && !(await this.isManzBridgeLoginVisible(page))) return;

    const link = await firstVisible(
      [
        page.locator('a[href*="/ds/auszug/auszugsuche" i]'),
        page.getByRole("link", { name: /^auszug$/i }),
        page.getByRole("link", { name: /auszug/i }),
      ],
      6000
    );

    if (link) {
      await link.click({ force: true });
      await page.waitForLoadState("domcontentloaded");
      await page.goto(`${MANZ_EXTRACT_SEARCH_URL}${query}`, { waitUntil: "domcontentloaded" }).catch(() => {});
      await this.submitManzBridgeLoginIfNeeded(page);
      if (page.url().includes("/ds/auszug/auszugsuche") && !(await this.isManzBridgeLoginVisible(page))) return;
    }

    const match = page.url().match(/^(.*at\.gv\.bmj\.grundbuch\.web[^?#]*?)(\/ds\/.*)?$/);
    if (match) {
      const base = match[1].replace(/\/+$/, "");
      await page.goto(`${base}${EXTRACT_SEARCH_PATH}${query}`, { waitUntil: "domcontentloaded" });
      await this.submitManzBridgeLoginIfNeeded(page);
      if (page.url().includes("/ds/auszug/auszugsuche") && !(await this.isManzBridgeLoginVisible(page))) return;
    }

    await dumpDebug(page, "auszugssuche-nicht-gefunden");
    await dumpDiagnostics(page, "auszugssuche-nicht-gefunden");
    throw new Error(
      "MANZ-Auszugssuche nicht erreichbar: Weder Link noch abgeleitete URL fuehrten zu /ds/auszug/auszugsuche. Siehe debug/-Snapshot."
    );
  }

  async gotoFirmenbuchCompanySearch(page: Page): Promise<void> {
    if (page.url().includes(FIRMENBUCH_SEARCH_PATH) && !(await this.isManzBridgeLoginVisible(page))) return;

    await page.goto(MANZ_FIRMENBUCH_SEARCH_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
    await this.submitManzBridgeLoginIfNeeded(page);
    if (page.url().includes(FIRMENBUCH_SEARCH_PATH) && !(await this.isManzBridgeLoginVisible(page))) return;

    const link = await firstVisible(
      [
        page.locator('a[href*="/ds/suche/firmen" i]'),
        page.getByRole("link", { name: /^firmen$/i }),
        page.getByRole("link", { name: /suche/i }),
      ],
      6000
    );

    if (link) {
      await link.click({ force: true });
      await page.waitForLoadState("domcontentloaded");
      await this.submitManzBridgeLoginIfNeeded(page);
      if (page.url().includes(FIRMENBUCH_SEARCH_PATH) && !(await this.isManzBridgeLoginVisible(page))) return;
    }

    const match = page.url().match(/^(.*at\.gv\.justiz\.fbw[^?#]*?)(\/ds\/.*)?$/);
    if (match) {
      const base = match[1].replace(/\/+$/, "");
      await page.goto(`${base}${FIRMENBUCH_SEARCH_PATH}`, { waitUntil: "domcontentloaded" });
      await this.submitManzBridgeLoginIfNeeded(page);
      if (page.url().includes(FIRMENBUCH_SEARCH_PATH) && !(await this.isManzBridgeLoginVisible(page))) return;
    }

    await dumpDebug(page, "firmenbuch-suche-nicht-gefunden");
    await dumpDiagnostics(page, "firmenbuch-suche-nicht-gefunden");
    throw new Error(
      "MANZ-Firmenbuchsuche nicht erreichbar: Weder Link noch abgeleitete URL fuehrten zu /ds/suche/firmen. Siehe debug/-Snapshot."
    );
  }

  async gotoFirmenbuchExtractForm(page: Page, fnr?: string): Promise<void> {
    const query = fnr ? `?fnr=${encodeURIComponent(fnr.replace(/\s+/g, ""))}` : "";
    await page.goto(`${MANZ_FIRMENBUCH_EXTRACT_FORM_URL}${query}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await this.submitManzBridgeLoginIfNeeded(page);
    if (page.url().includes(FIRMENBUCH_EXTRACT_FORM_PATH) && !(await this.isManzBridgeLoginVisible(page))) return;

    const link = await firstVisible(
      [
        page.locator('a[href*="/ds/auszug/formular" i]'),
        page.getByRole("link", { name: /^auszug$/i }),
        page.getByRole("link", { name: /auszug/i }),
      ],
      6000
    );

    if (link) {
      await link.click({ force: true });
      await page.waitForLoadState("domcontentloaded");
      await page.goto(`${MANZ_FIRMENBUCH_EXTRACT_FORM_URL}${query}`, { waitUntil: "domcontentloaded" }).catch(() => {});
      await this.submitManzBridgeLoginIfNeeded(page);
      if (page.url().includes(FIRMENBUCH_EXTRACT_FORM_PATH) && !(await this.isManzBridgeLoginVisible(page))) return;
    }

    const match = page.url().match(/^(.*at\.gv\.justiz\.fbw[^?#]*?)(\/ds\/.*)?$/);
    if (match) {
      const base = match[1].replace(/\/+$/, "");
      await page.goto(`${base}${FIRMENBUCH_EXTRACT_FORM_PATH}${query}`, { waitUntil: "domcontentloaded" });
      await this.submitManzBridgeLoginIfNeeded(page);
      if (page.url().includes(FIRMENBUCH_EXTRACT_FORM_PATH) && !(await this.isManzBridgeLoginVisible(page))) return;
    }

    await dumpDebug(page, "firmenbuch-auszug-formular-nicht-gefunden");
    await dumpDiagnostics(page, "firmenbuch-auszug-formular-nicht-gefunden");
    throw new Error(
      "MANZ-Firmenbuchauszug nicht erreichbar: Weder Link noch abgeleitete URL fuehrten zu /ds/auszug/formular. Siehe debug/-Snapshot."
    );
  }

  private isManzHost(page: Page): boolean {
    try {
      return MANZ_HOST_RE.test(new URL(page.url()).hostname);
    } catch {
      return false;
    }
  }

  private async isManzBridgeLoginVisible(page: Page): Promise<boolean> {
    return firstVisible(
      [
        page.locator("#bridge-username"),
        page.locator('input[name="username"]'),
        page.locator('form[action*="login.manz.at" i] input[type="password"]'),
      ],
      1000
    ).then(Boolean);
  }

  private async submitManzBridgeLoginIfNeeded(page: Page): Promise<void> {
    const usernameField = await firstVisible(
      [
        page.locator("#bridge-username"),
        page.locator('input[name="username"]'),
        page.getByLabel(/benutzername|kennung|e-?mail/i),
      ],
      2000
    );
    if (!usernameField) return;

    const passwordField = await firstVisible(
      [page.locator("#password"), page.locator('input[name="password"]'), page.locator('input[type="password"]')],
      3000
    );
    if (!passwordField) {
      await dumpDebug(page, "manz-login-kein-passwort-feld");
      await dumpDiagnostics(page, "manz-login-kein-passwort-feld");
      throw new LoginError("MANZ-Login-Formular gefunden, aber kein Passwort-Feld sichtbar.");
    }

    console.log("[manz] MANZ infoDienste verlangt Login, melde an ...");
    await usernameField.fill(config.isaEmail);
    await passwordField.fill(config.isaPassword);

    const submit = await firstVisible(
      [
        page.locator("#bridge-login-button"),
        page.locator('input[type="submit"][value*="anmelden" i]'),
        page.getByRole("button", { name: /anmelden|login/i }),
        page.getByRole("button", { name: /einloggen/i }),
      ],
      3000
    );

    if (submit) {
      await submit.click({ force: true }).catch(async () => {
        await passwordField.press("Enter");
      });
    } else {
      await passwordField.press("Enter");
    }

    const errorText = page.getByText(/login fehlgeschlagen|fehler beim login|passwort.*(falsch|ungueltig)|ungueltige.*anmeldedaten/i);
    const outcome = await Promise.race([
      page
        .locator('form#form, #navlist, a[href*="grundstuecksadressensuche" i], a[href*="/ds/suche/firmen" i]')
        .first()
        .waitFor({ state: "visible", timeout: 30000 })
        .then(() => "ok" as const)
        .catch(() => null),
      page
        .waitForURL(/rev-proxy\/(?:gb|fb)|at\.gv\.bmj\.grundbuch\.web|at\.gv\.justiz\.fbw/i, { timeout: 30000 })
        .then(() => "ok" as const)
        .catch(() => null),
      errorText
        .first()
        .waitFor({ state: "visible", timeout: 30000 })
        .then(() => "error" as const)
        .catch(() => null),
    ]);

    if (outcome === "error") {
      await dumpDebug(page, "manz-login-fehlgeschlagen");
      await dumpDiagnostics(page, "manz-login-fehlgeschlagen");
      throw new LoginError("MANZ infoDienste hat die Anmeldung abgelehnt. Bitte Zugangsdaten in der .env pruefen.");
    }
    if (outcome !== "ok" && (await this.isManzBridgeLoginVisible(page))) {
      await dumpDebug(page, "manz-login-timeout");
      await dumpDiagnostics(page, "manz-login-timeout");
      throw new LoginError("MANZ infoDienste Login blieb offen. Siehe debug/-Snapshot.");
    }
  }
}
