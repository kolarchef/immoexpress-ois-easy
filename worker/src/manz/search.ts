import type { Locator, Page } from "playwright";
import { dumpDebug, dumpDiagnostics } from "../debug.js";
import type { GrundbuchHit, SearchAddressInput } from "../types.js";
import { allScopes, firstVisible, type Scope } from "./session.js";

/**
 * Header-Text -> Feldname im Ergebnis. Die Spaltenreihenfolge wird NICHT
 * angenommen, sondern pro Suche aus der echten MANZ-Tabelle gelesen.
 */
const HEADER_MAP: Record<string, keyof Omit<GrundbuchHit, "address" | "source">> = {
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
    // MANZ schreibt "Straße" -> normalisiert "strasse"; Umlaut-Varianten angleichen
    .replace(/^strase$/, "strasse");
}

function streetFieldCandidates(scope: Scope): Locator[] {
  return [
    scope.getByLabel(/stra(ß|ss)e/i),
    scope.locator('input[name*="strasse" i]'),
    scope.locator('input[id*="strasse" i]'),
    scope.locator('input[name*="street" i]'),
  ];
}

/**
 * Das MANZ-Suchformular kann direkt auf der Seite oder in einem iframe
 * liegen. Wir suchen den Bereich, in dem das Straße-Feld sichtbar ist.
 */
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

async function fillFirstMatch(
  candidates: Locator[],
  value: string,
  fieldName: string,
  required: boolean,
  page: Page
): Promise<void> {
  const field = await firstVisible(candidates, 3000);
  if (!field) {
    if (required) {
      await dumpDebug(page, `suchformular-feld-fehlt-${fieldName}`);
      await dumpDiagnostics(page, `suchformular-feld-fehlt-${fieldName}`);
      throw new Error(
        `Suchformular: Feld "${fieldName}" nicht gefunden. Siehe debug/-Snapshot + Diagnose-JSON — dort stehen die echten Feldnamen.`
      );
    }
    console.warn(`[manz] Optionales Feld "${fieldName}" nicht gefunden — übersprungen.`);
    return;
  }
  await field.fill(value);
}

async function fillSearchForm(scope: Scope, page: Page, input: SearchAddressInput): Promise<void> {
  // Bundesland (falls als Auswahlfeld vorhanden) zuerst, da es andere Felder
  // zurücksetzen kann.
  if (input.region) {
    const regionSelect = await firstVisible(
      [
        scope.getByLabel(/bundesland/i),
        scope.locator('select[name*="bundesland" i]'),
        scope.locator('select[id*="bundesland" i]'),
      ],
      2000
    );
    if (regionSelect) {
      await regionSelect.selectOption({ label: input.region }).catch(() => {
        console.warn(
          `[manz] Bundesland "${input.region}" nicht in Auswahlliste gefunden — übersprungen.`
        );
      });
    }
  }

  await fillFirstMatch(
    [
      scope.getByLabel(/politische gemeinde/i),
      scope.getByLabel(/gemeinde/i),
      scope.getByLabel(/^ort/i),
      scope.locator('input[name*="gemeinde" i]'),
      scope.locator('input[id*="gemeinde" i]'),
      scope.locator('input[name*="ort" i]'),
    ],
    input.city,
    "Gemeinde-Ort",
    true,
    page
  );

  await fillFirstMatch(streetFieldCandidates(scope), input.street, "Strasse", true, page);

  if (input.houseNumber) {
    await fillFirstMatch(
      [
        scope.getByLabel(/hausnummer|hnr/i),
        scope.locator('input[name*="hausnummer" i]'),
        scope.locator('input[id*="hausnummer" i]'),
        scope.locator('input[name*="hnr" i]'),
      ],
      input.houseNumber,
      "Hausnummer",
      false,
      page
    );
  }
}

async function submitSearch(scope: Scope, page: Page): Promise<void> {
  const button = await firstVisible([
    scope.getByRole("button", { name: /^suchen$/i }),
    scope.getByRole("button", { name: /suchen/i }),
    scope.locator('input[type="submit"][value*="such" i]'),
    scope.locator('button[type="submit"]'),
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
        .getByText(/keine (treffer|ergebnisse|daten)|kein ergebnis/i)
        .first();
      if (await noResults.isVisible().catch(() => false)) return "empty";
    }
    await page.waitForTimeout(500);
  } while (Date.now() < deadline);
  return null;
}

async function parseResults(page: Page): Promise<GrundbuchHit[]> {
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
    const cells = await rows.nth(r).locator("th, td").allInnerTexts();
    if (cells.length < 3) continue; // Trenner-/Footer-Zeilen überspringen

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
