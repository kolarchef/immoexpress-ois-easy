import type { Locator, Page } from "playwright";
import { dumpDebug } from "../debug.js";
import type { GrundbuchHit, SearchAddressInput } from "../types.js";
import { firstVisible } from "./session.js";

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
      throw new Error(
        `Suchformular: Feld "${fieldName}" nicht gefunden. Siehe debug/-Snapshot — ggf. Selektoren anhand der HAR-Dateien nachschärfen.`
      );
    }
    console.warn(`[manz] Optionales Feld "${fieldName}" nicht gefunden — übersprungen.`);
    return;
  }
  await field.fill(value);
}

async function fillSearchForm(page: Page, input: SearchAddressInput): Promise<void> {
  // Bundesland (falls als Auswahlfeld vorhanden) zuerst, da es andere Felder
  // zurücksetzen kann.
  if (input.region) {
    const regionSelect = await firstVisible(
      [
        page.getByLabel(/bundesland/i),
        page.locator('select[name*="bundesland" i]'),
        page.locator('select[id*="bundesland" i]'),
      ],
      2000
    );
    if (regionSelect) {
      await regionSelect.selectOption({ label: input.region }).catch(async () => {
        console.warn(`[manz] Bundesland "${input.region}" nicht in Auswahlliste gefunden — übersprungen.`);
      });
    }
  }

  await fillFirstMatch(
    [
      page.getByLabel(/politische gemeinde/i),
      page.getByLabel(/gemeinde/i),
      page.getByLabel(/^ort/i),
      page.locator('input[name*="gemeinde" i]'),
      page.locator('input[id*="gemeinde" i]'),
      page.locator('input[name*="ort" i]'),
    ],
    input.city,
    "Gemeinde/Ort",
    true,
    page
  );

  await fillFirstMatch(
    [
      page.getByLabel(/stra(ß|ss)e/i),
      page.locator('input[name*="strasse" i]'),
      page.locator('input[id*="strasse" i]'),
      page.locator('input[name*="street" i]'),
    ],
    input.street,
    "Straße",
    true,
    page
  );

  if (input.houseNumber) {
    await fillFirstMatch(
      [
        page.getByLabel(/hausnummer|hnr/i),
        page.locator('input[name*="hausnummer" i]'),
        page.locator('input[id*="hausnummer" i]'),
        page.locator('input[name*="hnr" i]'),
      ],
      input.houseNumber,
      "Hausnummer",
      false,
      page
    );
  }
}

async function submitSearch(page: Page): Promise<void> {
  const button = await firstVisible([
    page.getByRole("button", { name: /^suchen$/i }),
    page.getByRole("button", { name: /suchen/i }),
    page.locator('input[type="submit"][value*="such" i]'),
    page.locator('button[type="submit"]'),
  ]);
  if (!button) {
    await dumpDebug(page, "suchen-button-fehlt");
    throw new Error('Suchformular: "Suchen"-Button nicht gefunden. Siehe debug/-Snapshot.');
  }
  await button.click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Findet die Ergebnistabelle: die Tabelle, deren Header EZ + KG/Gst enthält. */
async function findResultTable(page: Page): Promise<{ table: Locator; columns: string[] } | null> {
  const tables = page.locator("table");
  const count = await tables.count();
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

async function parseResults(page: Page): Promise<GrundbuchHit[]> {
  // Entweder erscheint eine Ergebnistabelle oder ein "keine Treffer"-Hinweis.
  const noResults = page.getByText(/keine (treffer|ergebnisse|daten)|kein ergebnis/i);

  const found = await Promise.race([
    page
      .waitForFunction(
        // String statt Funktion: kein Bundler-Code in die Seite injizieren.
        `Array.from(document.querySelectorAll("table tr:first-child")).some(function (row) {
           var t = (row.innerText || "").toLowerCase();
           return t.indexOf("ez") !== -1 && (t.indexOf("gst") !== -1 || t.indexOf("kg") !== -1);
         })`,
        undefined,
        { timeout: 30000 }
      )
      .then(() => "table" as const)
      .catch(() => null),
    noResults
      .first()
      .waitFor({ state: "visible", timeout: 30000 })
      .then(() => "empty" as const)
      .catch(() => null),
  ]);

  if (found === "empty") return [];
  const result = await findResultTable(page);
  if (!result) {
    await dumpDebug(page, "ergebnistabelle-fehlt");
    throw new Error(
      "MANZ-Ergebnistabelle nicht gefunden (weder Treffer noch 'keine Treffer'-Hinweis). Siehe debug/-Snapshot."
    );
  }

  const { table, columns } = result;
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
  await fillSearchForm(page, input);
  await submitSearch(page);
  const hits = await parseResults(page);
  console.log(`[manz] ${hits.length} Treffer für "${input.street} ${input.houseNumber}, ${input.city}"`);
  return hits;
}
