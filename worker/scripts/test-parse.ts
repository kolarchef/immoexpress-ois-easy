/**
 * Testet Formular-Befüllung und Tabellen-Parsing gegen die ECHTEN
 * MANZ-HTML-Seiten aus den HAR-Aufnahmen (test/fixtures/) — ohne Login,
 * ohne Netz, ohne Kosten. Läuft mit: npm run test:parse
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

process.env.BRAINY_WORKER_SECRET ??= "nur-fuer-fixture-test-0000";
process.env.GRUNDBUCH_MODE ??= "mock";
process.env.DEBUG_DUMPS = "false";

const { fillSearchForm, parseResults } = await import("../src/manz/search.js");

const fixtures = path.resolve(process.cwd(), "test/fixtures");
const formUrl = pathToFileURL(path.join(fixtures, "manz-adresssuche-formular.html")).href;
const resultUrl = pathToFileURL(path.join(fixtures, "manz-adresssuche-ergebnis.html")).href;

let failures = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "OK " : "FEHLER"}  ${name}: ${JSON.stringify(actual)}${ok ? "" : ` (erwartet: ${JSON.stringify(expected)})`}`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage();

console.log("1) Formular-Befüllung (echtes MANZ-Formular-HTML) …");
await page.goto(formUrl);
await fillSearchForm(page, page, {
  city: "Perchtoldsdorf",
  street: "Hochstraße",
  houseNumber: "137",
  region: "Niederösterreich",
  searchMode: "exact",
});
check("ort=REGION gewählt", await page.locator("#ortr").isChecked(), true);
check("regionsb", await page.locator("#regionsb").inputValue(), "Niederösterreich");
check("ortsname", await page.locator("#ortsname").inputValue(), "Perchtoldsdorf");
check("strasse", await page.locator("#strasse").inputValue(), "Hochstraße");
check("orientierungsnr=NUMMER", await page.locator("#orientierungsnrn").isChecked(), true);
check("nummer", await page.locator("#nummer").inputValue(), "137");
check("phonetisch=false (exakt)", await page.locator("#exakt").isChecked(), true);

console.log("\n2) Tabellen-Parsing (echtes MANZ-Ergebnis-HTML) …");
await page.goto(resultUrl);
const hits = await parseResults(page);
console.log(`  ${hits.length} Treffer geparst`);
if (hits.length === 0) {
  failures++;
  console.log("  FEHLER: keine Treffer geparst");
} else {
  const hit = hits[0];
  check("politischeGemeinde", hit.politischeGemeinde, "Perchtoldsdorf");
  check("pgNr", hit.pgNr, "31719");
  check("ort", hit.ort, "Perchtoldsdorf");
  check("strasse", hit.strasse, "Hochstraße");
  check("hausnummer", hit.hausnummer, "137");
  check("ez", hit.ez, "330");
  check("kgEz", hit.kgEz, "16121");
  check("grundstuecksnummer", hit.grundstuecksnummer, "2546/2");
  check("kgGst", hit.kgGst, "16121");
  check("address", hit.address, "Hochstraße 137, Perchtoldsdorf");
  check("source", hit.source, "manz");
  check(
    "auszugUrl enthält kg/ez",
    (hit.auszugUrl ?? "").includes("kg=16121") && (hit.auszugUrl ?? "").includes("ez=330"),
    true
  );
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nAlle Prüfungen bestanden — Formular & Parser passen zum echten MANZ-HTML.");
