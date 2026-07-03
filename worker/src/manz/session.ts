import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright";
import { config } from "../config.js";
import { dumpDebug } from "../debug.js";

const ISA_BASE_URL = "https://www.immoservice-austria.com/";
const ADDRESS_SEARCH_PATH = "/ds/suche/grundstuecksadressensuche";

/** Fehler, der klar auf falsche Zugangsdaten / Login-Problem hinweist. */
export class LoginError extends Error {}

/** Gibt den ersten sichtbaren Locator aus einer Kandidatenliste zurück. */
export async function firstVisible(
  candidates: Locator[],
  timeoutMs = 2500
): Promise<Locator | null> {
  for (const candidate of candidates) {
    try {
      const first = candidate.first();
      await first.waitFor({ state: "visible", timeout: timeoutMs });
      return first;
    } catch {
      // nächsten Kandidaten probieren
    }
  }
  return null;
}

/**
 * Usercentrics-/Cookie-Banner schließen. Playwright-Locators durchdringen
 * offene Shadow-DOMs automatisch, daher funktioniert das auch für
 * Usercentrics (#usercentrics-root).
 */
export async function dismissCookieBanner(page: Page): Promise<boolean> {
  const button = await firstVisible([
    page.locator('[data-testid="uc-accept-all-button"]'),
    page.getByRole("button", { name: /alle akzeptieren/i }),
    page.getByRole("button", { name: /alles akzeptieren/i }),
    page.getByRole("button", { name: /accept all/i }),
    page.getByRole("button", { name: /akzeptieren/i }),
    page.getByRole("button", { name: /zustimmen/i }),
  ]);
  if (!button) return false;
  try {
    await button.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    return true;
  } catch {
    return false;
  }
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
    });
    this.context = await this.browser.newContext({ locale: "de-AT" });
    const page = await this.context.newPage();

    console.log("[manz] Öffne Immoservice Austria …");
    await page.goto(ISA_BASE_URL, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    await this.openLoginForm(page);
    await this.submitLogin(page);
    console.log("[manz] Login erfolgreich, öffne Grundbuch-Modul …");

    const manzPage = await this.openGrundbuchModule(page);
    await dismissCookieBanner(manzPage);
    console.log(`[manz] Grundbuch-Modul geöffnet: ${manzPage.url()}`);
    return manzPage;
  }

  /** Login-Formular sichtbar machen (falls hinter einem "Login"-Link). */
  private async openLoginForm(page: Page): Promise<void> {
    if (await this.findEmailField(page, 1500)) return;

    const loginLink = await firstVisible([
      page.getByRole("link", { name: /login|anmelden|einloggen/i }),
      page.getByRole("button", { name: /login|anmelden|einloggen/i }),
      page.locator('a[href*="login" i]'),
    ]);
    if (loginLink) {
      await loginLink.click();
      await page.waitForLoadState("domcontentloaded");
      await dismissCookieBanner(page);
    }
  }

  private async findEmailField(page: Page, timeoutMs = 2500): Promise<Locator | null> {
    return firstVisible(
      [
        page.locator('input[type="email"]'),
        page.locator('input[name*="mail" i]'),
        page.locator('input[id*="mail" i]'),
        page.locator('input[name*="user" i]'),
        page.getByLabel(/e-?mail/i),
      ],
      timeoutMs
    );
  }

  private async submitLogin(page: Page): Promise<void> {
    const emailField = await this.findEmailField(page, 8000);
    if (!emailField) {
      await dumpDebug(page, "login-kein-email-feld");
      throw new LoginError(
        "Login-Formular nicht gefunden (kein E-Mail-Feld sichtbar). Siehe debug/-Snapshot."
      );
    }
    const passwordField = await firstVisible([page.locator('input[type="password"]')], 5000);
    if (!passwordField) {
      await dumpDebug(page, "login-kein-passwort-feld");
      throw new LoginError("Login-Formular nicht gefunden (kein Passwort-Feld sichtbar).");
    }

    await emailField.fill(config.isaEmail);
    await passwordField.fill(config.isaPassword);

    const submit = await firstVisible([
      page.getByRole("button", { name: /login|anmelden|einloggen/i }),
      page.locator('button[type="submit"]'),
      page.locator('input[type="submit"]'),
    ]);
    if (submit) {
      await submit.click();
    } else {
      await passwordField.press("Enter");
    }

    // Erfolg = Modulübersicht/"auswahl" erreicht ODER Grundbuch-Link sichtbar.
    // Misserfolg = Fehlermeldung sichtbar.
    const errorText = page.getByText(/fehler beim login|login fehlgeschlagen|passwort.*(falsch|ungültig)|ungültige.*anmeldedaten/i);
    const grundbuchLink = this.grundbuchLinkLocator(page);

    const outcome = await Promise.race([
      page
        .waitForURL(/auswahl|modul|dashboard|start/i, { timeout: 25000 })
        .then(() => "ok" as const)
        .catch(() => null),
      grundbuchLink
        .first()
        .waitFor({ state: "visible", timeout: 25000 })
        .then(() => "ok" as const)
        .catch(() => null),
      errorText
        .first()
        .waitFor({ state: "visible", timeout: 25000 })
        .then(() => "error" as const)
        .catch(() => null),
    ]);

    if (outcome === "error") {
      await dumpDebug(page, "login-fehlgeschlagen");
      throw new LoginError(
        "Fehler beim Login: Immoservice hat die Anmeldung abgelehnt. Bitte ISA_EMAIL und ISA_PASSWORD in der .env prüfen."
      );
    }
    if (outcome !== "ok") {
      // Race lief in den Timeout — noch einmal direkt prüfen, bevor wir aufgeben.
      if (!(await grundbuchLink.first().isVisible().catch(() => false))) {
        await dumpDebug(page, "login-timeout");
        throw new LoginError(
          "Login-Ergebnis unklar: Weder Modulübersicht noch Fehlermeldung erschienen. Möglicherweise blockiert der Cookie-Banner. Siehe debug/-Snapshot."
        );
      }
    }
  }

  private grundbuchLinkLocator(page: Page): Locator {
    return page
      .locator('a[href*="grundbuchimmo" i]')
      .or(page.getByRole("link", { name: /grundbuchimmo/i }))
      .or(page.getByRole("link", { name: /grundbuch/i }));
  }

  /** Grundbuch-/Grundbuchimmo-Modul öffnen; MANZ öffnet oft in neuem Tab. */
  private async openGrundbuchModule(page: Page): Promise<Page> {
    const link = await firstVisible(
      [
        page.locator('a[href*="grundbuchimmo" i]'),
        page.getByRole("link", { name: /grundbuchimmo/i }),
        page.getByRole("link", { name: /grundbuch/i }),
        page.getByText(/grundbuchimmo/i),
        page.getByText(/^\s*grundbuch\s*$/i),
      ],
      6000
    );
    if (!link) {
      await dumpDebug(page, "grundbuch-link-nicht-gefunden");
      throw new Error(
        "Grundbuch-Modul nicht gefunden (kein Link mit 'grundbuchimmo'/'Grundbuch'). Siehe debug/-Snapshot."
      );
    }

    const popupPromise = page
      .waitForEvent("popup", { timeout: 15000 })
      .catch(() => null);
    await link.click();
    const popup = await popupPromise;

    const manzPage = popup ?? page;
    await manzPage.waitForLoadState("domcontentloaded");
    // MANZ braucht nach dem Rev-Proxy-Redirect oft einen Moment.
    await manzPage.waitForLoadState("networkidle").catch(() => {});
    return manzPage;
  }

  /** Zur MANZ-Grundstücksadressensuche navigieren. */
  async gotoAddressSearch(page: Page): Promise<void> {
    if (page.url().includes("grundstuecksadressensuche")) return;

    const link = await firstVisible(
      [
        page.locator('a[href*="grundstuecksadressensuche" i]'),
        page.getByRole("link", { name: /grundstücksadresse/i }),
        page.getByRole("link", { name: /adressen?suche/i }),
        page.getByText(/grundstücksadressensuche/i),
      ],
      6000
    );
    if (link) {
      await link.click();
      await page.waitForLoadState("domcontentloaded");
      return;
    }

    // Fallback: URL aus dem Rev-Proxy-Pfad ableiten
    // (…/at.gv.bmj.grundbuch.web/<…>/ds/suche/grundstuecksadressensuche).
    const match = page.url().match(/^(.*at\.gv\.bmj\.grundbuch\.web[^?#]*?)(\/ds\/.*)?$/);
    if (match) {
      const base = match[1].replace(/\/+$/, "");
      await page.goto(`${base}${ADDRESS_SEARCH_PATH}`, { waitUntil: "domcontentloaded" });
      if (page.url().includes("grundstuecksadressensuche")) return;
    }

    await dumpDebug(page, "adresssuche-nicht-gefunden");
    throw new Error(
      "MANZ-Adresssuche nicht erreichbar: Weder Link noch abgeleitete URL führten zu /ds/suche/grundstuecksadressensuche. Siehe debug/-Snapshot."
    );
  }
}
