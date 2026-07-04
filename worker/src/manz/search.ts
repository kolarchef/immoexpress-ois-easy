import type { Locator, Page } from "playwright";
import { dumpDebug, dumpDiagnostics } from "../debug.js";
import type { GrundbuchHit, SearchAddressInput } from "../types.js";
import { allScopes, firstVisible, type Scope } from "./session.js";

/**
 * Formular und Tabelle entsprechen der echten MANZ-Seite (aus den
 * HAR-Aufnahmen). Felder der Grundstücksadressensuche:
 *   ort            Radio: REGION | POLGEM             (#ortr / #ortp)
 *   regionsb       Select Bundesland (inkl. "Österreich")
 *   ortsname       Text Ortsname
 *   pg             Text PG-Nummer (optional)
 *   strasse        Text Straße (maxlength 25)
 *   orientierungsnr Radio: NUMMER | NUMMERNBEREICH | ALLE | NURSTRASSE
 *   nummer         Text Hausnummer
 *   phonetisch     Radio: false (#exakt) | true (#erweitert)
 *   searchButton   Submit "Suchen"
 */

/**
 * Header-Text -> Feldname im Ergebnis. Die Spaltenreihenfolge wird NICHT
 * angenommen, sondern pro Suche aus der echten MANZ-Tabelle gelesen
 * (Header: Politische Gemeinde, PG Nr., Ort, Straße, Hnr., EZ, KG EZ,
 * Gst, KG Gst, Gehe zu ...).
 */
const HEADER_MAP: Record<string, keyof Omit<GrundbuchHit, "address" | "source" | "auszugUrl">> = {
  politischegemeinde: "politischeGemeinde",
  pgnr: "pgNr",
  ort: "ort",
  strasse: "strasse",
  hnr: "hausnummer",
  hausnummer: "hausnummer",
  ez: "ez",
  kgez: "kgEz",
  gst: "grundstuecksnummer",
  gstnr: "grundstuecksnummer",
  grundstuecksnummer: "grundstuecksnummer",
  kggst: "kgGst",
};

function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^strase$/, "strasse");
}

function streetFieldCandidates(scope: Scope): Locator[] {
  return [
    scope.locator("#strasse"),
    scope.locator('input[name="strasse"]'),
    scope.getByLabel(/stra(ß|ss)e/i),
  ];
}

/** Das Formular liegt direkt auf der Seite; iframes nur als Sicherheitsnetz. */
async function findFormScope(page: Page): Promise<Scope | null> {
  const deadline = Date.now() + 15000;
  do {
    for (const scope of allScopes(page)) {
      const field = await firstVisible(streetFieldCandidates(scope), 800);
      if (field) return scope;
    }
    await page.waitForTimeout(400);
  } while (Date.now() < deadline);
  return null;
}

async function checkRadio(scope: Scope, candidates: Locator[], name: string): Promise<boolean> {
  const radio = await firstVisible(candidates, 2000);
  if (!radio) {
    console.warn(`[manz] Radio "${name}" nicht gefunden — Standardwert bleibt aktiv.`);
    return false;
  }
  await radio.check().catch(async () => radio.click().catch(() => {}));
  return true;
}

async function fillField(
  scope: Scope,
  page: Page,
  candidates: Locator[],
  value: string,
  fieldName: string,
  required: boolean
): Promise<void> {
  const field = await firstVisible(candidates, 3000);
  if (!field) {
    if (required) {
      await dumpDebug(page, `suchformular-feld-fehlt-${fieldName}`);
      await dumpDiagnostics(page, `suchformular-feld-fehlt-${fieldName}`);
      throw new Error(
        `Suchformular: Feld "${fieldName}" nicht gefunden. Siehe debug/-Snapshot + Diagnose-JSON.`
      );
    }
    console.warn(`[manz] Optionales Feld "${fieldName}" nicht gefunden — übersprungen.`);
    return;
  }
  await field.fill(value);
}

export async function fillSearchForm(
  scope: Scope,
  page: Page,
  input: SearchAddressInput
): Promise<void> {
  // Suchvariante "REGION" (Bundesland + Ortsname) — wie in der
  // aufgezeichneten, funktionierenden Suche. Ohne region: "Österreich".
  await checkRadio(
    scope,
    [scope.locator("#ortr"), scope.locator('input[name="ort"][value="REGION"]')],
    "ort=REGION"
  );

  const regionSelect = await firstVisible(
    [scope.locator("#regionsb"), scope.locator('select[name="regionsb"]')],
    2500
  );
  if (regionSelect) {
    const region = input.region?.trim() || "Österreich";
    await regionSelect.selectOption({ label: region }).catch(async () => {
      console.warn(`[manz] Bundesland "${region}" unbekannt — verwende "Österreich".`);
      await regionSelect.selectOption({ label: "Österreich" }).catch(() => {});
    });
  }

  await fillField(
    scope,
    page,
    [scope.locator("#ortsname"), scope.locator('input[name="ortsname"]')],
    input.city,
    "ortsname",
    true
  );

  // maxlength 25 auf der MANZ-Seite — längere Eingaben schneidet der
  // Browser ohnehin ab, wir loggen es nur zur Nachvollziehbarkeit.
  if (input.street.length > 25) {
    console.warn(`[manz] Straße länger als 25 Zeichen — MANZ schneidet ab: "${input.street}"`);
  }
  await fillField(scope, page, streetFieldCandidates(scope), input.street, "strasse", true);

  if (input.houseNumber) {
    await checkRadio(
      scope,
      [
        scope.locator("#orientierungsnrn"),
        scope.locator('input[name="orientierungsnr"][value="NUMMER"]'),
      ],
      "orientierungsnr=NUMMER"
    );
    await fillField(
      scope,
      page,
      [scope.locator("#nummer"), scope.locator('input[name="nummer"]')],
      input.houseNumber,
      "nummer",
      false
    );
  } else {
    // Ohne Hausnummer: alle Hausnummern der Straße suchen.
    await checkRadio(
      scope,
      [
        scope.locator("#orientierungsnrallestr"),
        scope.locator('input[name="orientierungsnr"][value="ALLE"]'),
      ],
      "orientierungsnr=ALLE"
    );
  }

  // searchMode: exact -> phonetisch=false (#exakt), fuzzy -> true (#erweitert)
  const modeCandidates =
    input.searchMode === "fuzzy"
      ? [scope.locator("#erweitert"), scope.locator('input[name="phonetisch"][value="true"]')]
      : [scope.locator("#exakt"), scope.locator('input[name="phonetisch"][value="false"]')];
  await checkRadio(scope, modeCandidates, `phonetisch (${input.searchMode})`);
}

async function submitSearch(scope: Scope, page: Page): Promise<void> {
  const button = await firstVisible([
    scope.locator("#searchButton"),
    scope.locator('input[name="searchButton"]'),
    scope.locator('input[type="submit"][value*="such" i]'),
    scope.getByRole("button", { name: /suchen/i }),
  ]);
  if (!button) {
    await dumpDebug(page, "suchen-button-fehlt");
    await dumpDiagnostics(page, "suchen-button-fehlt");
    throw new Error('Suchformular: "Suchen"-Button nicht gefunden. Siehe debug/-Snapshot.');
  }
  await button.click();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Findet die Ergebnistabelle: die Tabelle, deren Header EZ + KG/Gst enthält. */
async function findResultTable(
  scope: Scope
): Promise<{ table: Locator; columns: string[] } | null> {
  const tables = scope.locator("table");
  const count = await tables.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const table = tables.nth(i);
    const headerCells = table.locator("tr").first().locator("th, td");
    const headerTexts = await headerCells.allInnerTexts().catch(() => [] as string[]);
    const normalized = headerTexts.map(normalizeHeader);
    if (normalized.includes("ez") && (normalized.includes("gst") || normalized.includes("kgez"))) {
      return { table, columns: normalized };
    }
  }
  return null;
}

/** Wartet frame-übergreifend auf Ergebnistabelle oder "keine Treffer". */
async function waitForResults(
  page: Page,
  timeoutMs = 30000
): Promise<{ table: Locator; columns: string[] } | "empty" | null> {
  const deadline = Date.now() + timeoutMs;
  do {
    for (const scope of allScopes(page)) {
      const result = await findResultTable(scope);
      if (result) return result;

      const noResults = scope
        .getByText(/keine (treffer|ergebnisse|daten|adressen)|kein ergebnis|nicht gefunden/i)
        .first();
      if (await noResults.isVisible().catch(() => false)) return "empty";
    }
    await page.waitForTimeout(500);
  } while (Date.now() < deadline);
  return null;
}

export async function parseResults(page: Page): Promise<GrundbuchHit[]> {
  const outcome = await waitForResults(page);
  if (outcome === "empty") return [];
  if (!outcome) {
    await dumpDebug(page, "ergebnistabelle-fehlt");
    await dumpDiagnostics(page, "ergebnistabelle-fehlt");
    throw new Error(
      "MANZ-Ergebnistabelle nicht gefunden (weder Treffer noch 'keine Treffer'-Hinweis). Siehe debug/-Snapshot + Diagnose-JSON."
    );
  }

  const { table, columns } = outcome;
  const rows = table.locator("tr");
  const rowCount = await rows.count();
  const hits: GrundbuchHit[] = [];

  for (let r = 1; r < rowCount; r++) {
    const row = rows.nth(r);
    const cells = await row.locator("th, td").allInnerTexts();
    if (cells.length < 3) continue; // Trenner-/Kopfzeilen überspringen

    const hit: GrundbuchHit = {
      politischeGemeinde: "",
      pgNr: "",
      ort: "",
      strasse: "",
      hausnummer: "",
      ez: "",
      kgEz: "",
      grundstuecksnummer: "",
      kgGst: "",
      address: "",
      source: "manz",
    };

    for (let c = 0; c < columns.length && c < cells.length; c++) {
      const field = HEADER_MAP[columns[c]];
      if (field) hit[field] = cells[c].trim();
    }

    // Zeilen ohne EZ und ohne Gst sind keine echten Treffer (z.B. Paging-Zeile).
    if (!hit.ez && !hit.grundstuecksnummer) continue;

    // "Gehe zu ..."-Link (auszugsuche?kg=…&ez=…) für den späteren
    // /request-extract mitnehmen — NICHT klicken, nur die URL merken.
    const auszugLink = row.locator('a[href*="auszugsuche"]').first();
    if ((await auszugLink.count().catch(() => 0)) > 0) {
      const href = await auszugLink.getAttribute("href").catch(() => null);
      if (href) {
        try {
          hit.auszugUrl = new URL(href, page.url()).toString();
        } catch {
          hit.auszugUrl = href;
        }
      }
    }

    hit.address = [
      [hit.strasse, hit.hausnummer].filter(Boolean).join(" "),
      hit.ort || hit.politischeGemeinde,
    ]
      .filter(Boolean)
      .join(", ");
    hits.push(hit);
  }

  return hits;
}

/**
 * Führt die reine Adresssuche aus. Löst KEINE kostenpflichtige
 * Grundbuch-Abfrage aus — es wird nur die Trefferliste gelesen.
 */
export async function searchAddress(
  page: Page,
  gotoAddressSearch: (page: Page) => Promise<void>,
  input: SearchAddressInput
): Promise<GrundbuchHit[]> {
  await gotoAddressSearch(page);

  const scope = await findFormScope(page);
  if (!scope) {
    await dumpDebug(page, "suchformular-nicht-gefunden");
    await dumpDiagnostics(page, "suchformular-nicht-gefunden");
    throw new Error(
      "MANZ-Suchformular nicht gefunden (auch nicht in iframes). Siehe debug/-Snapshot + Diagnose-JSON."
    );
  }

  await fillSearchForm(scope, page, input);
  await submitSearch(scope, page);
  const hits = await parseResults(page);
  console.log(
    `[manz] ${hits.length} Treffer für "${input.street} ${input.houseNumber}, ${input.city}"`
  );
  return hits;
}
