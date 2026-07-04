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
 * - POST https://www.immoservice-austria.com/login  (Felder: email, password, submit)
 *   -> 302 /auswahl
 * - GET  /grundbuchimmo/auswahl  (Modulübersicht, Link target="_blank")
 * - GET  /grundbuchimmo/grundbuch  -> SSO-Redirect zu dienste.manz.at
 *   (setzt JSESSIONID / AAA-SESSION-ID Cookies)
 * - Adresssuche liegt unter einer FESTEN URL (kein Session-Teil im Pfad).
 */
const ISA_BASE = "https://www.immoservice-austria.com";
const GRUNDBUCH_LAUNCH_URL = `${ISA_BASE}/grundbuchimmo/grundbuch`;
const MODULE_OVERVIEW_URL = `${ISA_BASE}/grundbuchimmo/auswahl`;
export const MANZ_ADDRESS_SEARCH_URL =
  "https://dienste.manz.at/vst/rev-proxy/gb/at.gv.bmj.grundbuch.web/ds/suche/grundstuecksadressensuche";

/** Fehler, der klar auf falsche Zugangsdaten / Login-Problem hinweist. */
export class LoginError extends Error {}

/**
 * Suchbereich für Locators: die Seite selbst oder ein iframe darin.
 */
export type Scope = Page | Frame;

/** Alle Suchbereiche einer Seite: Hauptseite zuerst, dann alle iframes. */
export function allScopes(page: Page): Scope[] {
  return [page, ...page.frames().filter((frame) => frame.parentFrame() !== null)];
}

/**
 * Pollt alle Kandidaten PARALLEL (statt jeden nacheinander mit vollem
 * Timeout abzuwarten): schnell, wenn ein Element da ist, und mit klarer
 * Obergrenze, wenn nicht.
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
 * Usercentrics-/Cookie-Banner schließen. Playwright-Locators durchdringen
 * offene Shadow-DOMs automatisch (#usercentrics-root). Der Banner lädt oft
 * verzögert, daher wird mehrfach probiert; ohne Usercentrics-Root und ohne
 * sichtbaren Button brechen wir früh ab.
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
      misses = 0; // Button da, aber Klick blockiert — weiter versuchen
    } else {
      misses += 1;
      const hasUsercentrics =
        (await page.locator("#usercentrics-root").count().catch(() => 0)) > 0;
      // Kein Usercentrics und zweimal kein Button: es gibt keinen Banner.
      if (!hasUsercentrics && misses >= 2) return false;
      // Usercentrics-Root da, aber nie ein Button (Consent schon erteilt).
      if (hasUsercentrics && misses >= 4) return false;
    }
  } while (Date.now() < deadline);
  return false;
}

/**
 * Hält genau eine eingeloggte MANZ-Browsersession. Wird eine Suche mit einer
 * abgelaufenen Session versucht, setzt der Aufrufer die Session per reset()
 * zurück und loggt neu ein.
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

    // 1) Login — bevorzugt als direkter Formular-POST über den
    //    Browser-Kontext (teilt Cookies mit den Tabs): immun gegen
    //    Cookie-Banner und Selektor-Änderungen. UI-Login als Fallback.
    console.log("[manz] Login bei Immoservice Austria …");
    const apiLoginOk = await this.apiLogin();
    if (apiLoginOk) {
      console.log("[manz] Login per Formular-POST erfolgreich.");
    } else {
      console.log("[manz] Formular-POST-Login fehlgeschlagen — versuche UI-Login …");
      await this.uiLogin(page);
    }

    // 2) Grundbuch-Modul starten. Der Modul-Link ist target="_blank", die URL
    //    selbst ist aber eine normale Navigation mit SSO-Redirect zu
    //    dienste.manz.at — direkter Aufruf umgeht Banner und Popup.
    console.log("[manz] Starte Grundbuch-Modul (SSO-Redirect zu MANZ) …");
    await page.goto(GRUNDBUCH_LAUNCH_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    let manzPage: Page = page;
    if (!page.url().includes("manz.at")) {
      // Fallback: über die Modulübersicht klicken (öffnet ggf. neuen Tab).
      console.log("[manz] Direkter Start ohne Redirect — versuche Klick in der Modulübersicht …");
      manzPage = await this.openGrundbuchModuleByClick(page);
    }

    if (!manzPage.url().includes("manz.at")) {
      await dumpDebug(manzPage, "manz-start-fehlgeschlagen");
      await dumpDiagnostics(manzPage, "manz-start-fehlgeschlagen");
      throw new LoginError(
        "Grundbuch-Modul konnte nicht gestartet werden (kein Redirect zu dienste.manz.at). " +
          "Meist bedeutet das: Login fehlgeschlagen oder Modul nicht freigeschaltet. Siehe debug/."
      );
    }

    await dismissCookieBanner(manzPage, 4000);
    console.log(`[manz] Grundbuch-Modul geöffnet: ${manzPage.url()}`);
    return manzPage;
  }

  /**
   * Login wie im HAR aufgezeichnet: POST /login mit email/password/submit,
   * Erfolg = Redirect auf /auswahl. Kein CSRF-Token nötig.
   */
  private async apiLogin(): Promise<boolean> {
    if (!this.context) return false;
    const response = await this.context.request
      .post(`${ISA_BASE}/login`, {
        form: { email: config.isaEmail, password: config.isaPassword, submit: " " },
      })
      .catch(() => null);
    if (!response || !response.ok()) return false;
    // Redirects werden gefolgt; bei Erfolg landen wir auf /auswahl.
    return response.url().includes("auswahl");
  }

  /** UI-Login als Fallback (Startseite -> Login-Formular -> absenden). */
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

    const submit = await firstVisible([
      page.locator('[name="submit"]'),
      page.getByRole("button", { name: /login|anmelden|einloggen/i }),
      page.locator('button[type="submit"]'),
      page.locator('input[type="submit"]'),
    ]);
    if (submit) {
      await submit.click();
    } else {
      await passwordField.press("Enter");
    }

    const errorText = page.getByText(
      /fehler beim login|login fehlgeschlagen|passwort.*(falsch|ungültig)|ungültige.*anmeldedaten/i
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
        "Fehler beim Login: Immoservice hat die Anmeldung nicht angenommen. Bitte ISA_EMAIL und ISA_PASSWORD in der .env prüfen."
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

  /** Fallback: Grundbuch-Link in der Modulübersicht klicken (target=_blank). */
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
      await dumpDebug(page, "grundbuch-link-nicht-gefunden");
      await dumpDiagnostics(page, "grundbuch-link-nicht-gefunden");
      throw new LoginError(
        "Grundbuch-Modul nicht gefunden — vermutlich ist der Login fehlgeschlagen oder das Modul nicht freigeschaltet. Siehe debug/."
      );
    }

    const popupPromise = page.waitForEvent("popup", { timeout: 15000 }).catch(() => null);
    await link.click();
    const popup = await popupPromise;

    const manzPage = popup ?? page;
    await manzPage.waitForLoadState("domcontentloaded");
    await manzPage.waitForURL(/manz\.at/i, { timeout: 20000 }).catch(() => {});
    await manzPage.waitForLoadState("networkidle").catch(() => {});
    return manzPage;
  }

  /**
   * Zur MANZ-Grundstücksadressensuche navigieren. Die URL ist fix (aus den
   * HAR-Aufnahmen), die Session hängt nur an Cookies — direkter goto reicht.
   */
  async gotoAddressSearch(page: Page): Promise<void> {
    await page.goto(MANZ_ADDRESS_SEARCH_URL, { waitUntil: "domcontentloaded" });
    if (page.url().includes("grundstuecksadressensuche")) return;

    // Redirect woandershin = Session abgelaufen o.ä. — Aufrufer resettet.
    await dumpDebug(page, "adresssuche-nicht-erreichbar");
    await dumpDiagnostics(page, "adresssuche-nicht-erreichbar");
    throw new Error(
      `MANZ-Adresssuche nicht erreichbar (gelandet auf: ${page.url()}). Session vermutlich abgelaufen.`
    );
  }
}
