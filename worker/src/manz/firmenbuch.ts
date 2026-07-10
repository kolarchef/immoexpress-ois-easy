import type { APIResponse, Page, Response } from "playwright";
import { dumpDebug } from "../debug.js";
import type {
  FirmenbuchCompanyHit,
  FirmenbuchExtract,
  RequestFirmenbuchExtractInput,
  SearchFirmenbuchCompanyInput,
} from "../types.js";

const PDF_TIMEOUT_MS = 90000;
const NAV_TIMEOUT_MS = 90000;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeFnr(value: string): string {
  return cleanText(value).replace(/\s+/g, "");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firmenbuchFileName(input: Pick<RequestFirmenbuchExtractInput, "fnr" | "companyName">): string {
  const fnr = normalizeFnr(input.fnr).replace(/[^0-9A-Za-z_-]+/g, "-");
  const company = (input.companyName || "firma")
    .replace(/[^0-9A-Za-z_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `firmenbuch-auszug-${company || "firma"}-fn-${fnr}.pdf`;
}

async function readPdfResponse(response: APIResponse | Response): Promise<{ contentType: string; pdfBase64: string }> {
  const contentType = response.headers()["content-type"] || "application/pdf";
  const buffer = await response.body();
  return {
    contentType,
    pdfBase64: buffer.toString("base64"),
  };
}

async function submitCurrentForm(page: Page): Promise<void> {
  const navigation = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).catch(() => null);

  const submitted = await page
    .evaluate(`(function () {
      const visible = function (el) {
        if (!el) return false;
        const box = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const candidates = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'));
      const button = candidates.find(function (el) {
        const text = String(el.value || el.textContent || "").toLowerCase();
        return visible(el) && (
          text.includes("start") ||
          text.includes("suchen") ||
          text.includes("anzeigen") ||
          text.includes("auszug")
        );
      });
      if (button) {
        button.click();
        return true;
      }
      const form = document.querySelector("form");
      if (form) {
        form.submit();
        return true;
      }
      return false;
    })()`)
    .then(Boolean)
    .catch(() => false);

  if (!submitted) {
    await dumpDebug(page, "firmenbuch-submit-fehlt");
    throw new Error("Firmenbuch-Formular: kein Button/Formular zum Absenden gefunden. Siehe debug/-Snapshot.");
  }

  await navigation;
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
}

async function fillCompanySearchForm(page: Page, input: SearchFirmenbuchCompanyInput): Promise<void> {
  const payload = JSON.stringify(input);
  const ok = await page
    .evaluate(`(function (raw) {
      const input = JSON.parse(raw);
      const set = function (selectors, value) {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (!el) continue;
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      };
      const check = function (selectors, checked) {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (!el) continue;
          el.checked = checked;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      };

      const nameOk = set(["#firmenwortlaut", 'input[name="firmenwortlaut"]'], input.firmenwortlaut);
      check(["#exakteSuche", 'input[name="exakteSuche"]'], Boolean(input.exact));
      check(["#negerg", 'input[name="negerg"]'], Boolean(input.includeNotFoundConfirmation));

      set(['select[name="suchbereich"]'], "3");
      set(['select[name="handelsgericht"]'], "***");
      set(['select[name="rechtsform"]'], "+++");
      set(['select[name="rechtseigenschaft"]'], " ");
      set(['select[name="bundesland"]'], " ");
      set(['input[name="polgem"]'], "");
      set(['input[name="status"]'], "");
      set(['input[name="verrechnungsArt"]'], "LEER");
      return Boolean(nameOk);
    })(${JSON.stringify(payload)})`)
    .then(Boolean)
    .catch(() => false);

  if (!ok) {
    await dumpDebug(page, "firmenbuch-suchformular-felder-fehlen");
    throw new Error("Firmenbuch-Suchformular konnte nicht befuellt werden. Siehe debug/-Snapshot.");
  }
}

async function parseCompanyResults(page: Page): Promise<FirmenbuchCompanyHit[]> {
  const rows = (await page
    .evaluate(`(function () {
      const abs = function (href) {
        try { return new URL(href, window.location.href).toString(); } catch { return ""; }
      };
      const normalizeFnr = function (value) {
        return String(value || "").replace(/\\s+/g, "").trim();
      };
      const anchors = Array.from(document.querySelectorAll('a[href], table a'));
      const byFnr = new Map();

      anchors.forEach(function (anchor) {
        const href = String(anchor.getAttribute("href") || "");
        const text = String(anchor.textContent || "").replace(/\\s+/g, " ").trim();
        const hrefMatch = href.match(/[?&]fnr=([^&#]+)/i);
        const textMatch = text.match(/\\b\\d{1,6}\\s*[a-z]\\b/i);
        const rawFnr = hrefMatch ? decodeURIComponent(hrefMatch[1]) : textMatch ? textMatch[0] : "";
        const fnr = normalizeFnr(rawFnr);
        if (!fnr) return;

        const row = anchor.closest("tr");
        const cells = row ? Array.from(row.querySelectorAll("th,td")).map(function (cell) {
          return String(cell.textContent || "").replace(/\\s+/g, " ").trim();
        }) : [];

        const displayFnr = cells[0] && /\\d/.test(cells[0]) ? cells[0] : text;
        const item = {
          fnr: fnr,
          displayFnr: displayFnr,
          companyName: cells[1] || "",
          seat: cells[2] || "",
          legalForm: cells[3] || "",
          court: cells[4] || "",
          detailUrl: href ? abs(href) : ""
        };
        byFnr.set(fnr, item);
      });

      return Array.from(byFnr.values());
    })()`)
    .catch(() => [])) as Array<Omit<FirmenbuchCompanyHit, "source">>;

  return rows
    .filter((row) => row.fnr)
    .map((row) => ({
      ...row,
      companyName: cleanText(row.companyName || ""),
      seat: row.seat ? cleanText(row.seat) : undefined,
      legalForm: row.legalForm ? cleanText(row.legalForm) : undefined,
      court: row.court ? cleanText(row.court) : undefined,
      detailUrl: row.detailUrl || undefined,
      source: "manz" as const,
    }));
}

async function fillExtractForm(page: Page, input: RequestFirmenbuchExtractInput): Promise<string> {
  const stichtag = input.stichtag?.trim() || todayIso();
  const payload = JSON.stringify({
    ...input,
    fnr: normalizeFnr(input.fnr),
    stichtag,
  });

  const ok = await page
    .evaluate(`(function (raw) {
      const input = JSON.parse(raw);
      const set = function (selectors, value) {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (!el) continue;
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      };
      const check = function (selectors, checked) {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (!el) continue;
          el.checked = checked;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      };
      const selectRadioByValue = function (name, value) {
        const el = document.querySelector('input[type="radio"][name="' + name + '"][value="' + value + '"]');
        if (!el) return false;
        el.checked = true;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      };

      const fnrOk = set(["#fnr", 'input[name="fnr"]'], input.fnr);
      set(["#stichtag", 'input[name="stichtag"]'], input.stichtag);
      selectRadioByValue("auszugArt", "AKT");
      check(["#auszugHistorisch", 'input[name="auszugHistorisch"]'], Boolean(input.includeHistorical));
      check(["#signierterStichtagsauszug", 'input[name="signierterStichtagsauszug"]'], Boolean(input.signed));
      check(["#auszugMitVerlinkung", 'input[name="auszugMitVerlinkung"]'], Boolean(input.includeDocumentLinks));
      check(["#signierterTeilauszug", 'input[name="signierterTeilauszug"]'], false);
      check(["#teilAuszugHistorisch", 'input[name="teilAuszugHistorisch"]'], false);
      set(['input[name="person1"]'], "");
      set(['input[name="person2"]'], "");
      set(['input[name="verrechnungsArt"]'], "LEER");
      return Boolean(fnrOk);
    })(${JSON.stringify(payload)})`)
    .then(Boolean)
    .catch(() => false);

  if (!ok) {
    await dumpDebug(page, "firmenbuch-auszug-formular-felder-fehlen");
    throw new Error("Firmenbuch-Auszugformular konnte nicht mit FN befuellt werden. Siehe debug/-Snapshot.");
  }

  return stichtag;
}

async function renderCurrentPageAsPdf(page: Page): Promise<{ html: string; pdfBase64: string }> {
  const html = await page.content();
  let pdfBuffer: Buffer;
  try {
    await page.emulateMedia({ media: "print" }).catch(() => {});
    pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });
  } catch (err) {
    await dumpDebug(page, "firmenbuch-html-pdf-render-fehlgeschlagen");
    throw new Error(`Firmenbuchauszug wurde geladen, aber PDF-Erstellung ist fehlgeschlagen: ${(err as Error).message}`);
  }

  return {
    html,
    pdfBase64: pdfBuffer.toString("base64"),
  };
}

function responseLooksLikePdf(response: Response): boolean {
  const contentType = response.headers()["content-type"] || "";
  return response.url().toLowerCase().includes(".pdf") || contentType.toLowerCase().includes("application/pdf");
}

export async function searchFirmenbuchCompany(
  page: Page,
  gotoCompanySearch: (page: Page) => Promise<void>,
  input: SearchFirmenbuchCompanyInput
): Promise<FirmenbuchCompanyHit[]> {
  await gotoCompanySearch(page);
  await fillCompanySearchForm(page, input);
  await submitCurrentForm(page);

  const results = await parseCompanyResults(page);
  if (!results.length) {
    await dumpDebug(page, "firmenbuch-suche-keine-treffer");
  }
  console.log(`[manz] ${results.length} Firmenbuch-Treffer fuer "${input.firmenwortlaut}"`);
  return results;
}

export async function requestFirmenbuchExtract(
  page: Page,
  gotoExtractForm: (page: Page, fnr?: string) => Promise<void>,
  input: RequestFirmenbuchExtractInput
): Promise<FirmenbuchExtract> {
  const normalizedInput = { ...input, fnr: normalizeFnr(input.fnr) };
  await gotoExtractForm(page, normalizedInput.fnr);
  const stichtag = await fillExtractForm(page, normalizedInput);

  const responsePromise = page.waitForResponse(responseLooksLikePdf, { timeout: PDF_TIMEOUT_MS }).catch(() => null);
  await submitCurrentForm(page);
  const directPdfResponse = await responsePromise;

  if (directPdfResponse) {
    const pdfData = await readPdfResponse(directPdfResponse);
    console.log(`[manz] Offizielles Firmenbuch-PDF geladen: FN ${normalizedInput.fnr}`);
    return {
      mode: "live",
      fnr: normalizedInput.fnr,
      companyName: normalizedInput.companyName,
      stichtag,
      fileName: firmenbuchFileName(normalizedInput),
      contentType: pdfData.contentType,
      pdfBase64: pdfData.pdfBase64,
      pdfKind: "official-pdf",
      officialPdf: true,
      pdfUrl: directPdfResponse.url(),
      extractUrl: page.url(),
      source: "manz",
    };
  }

  const rendered = await renderCurrentPageAsPdf(page);
  console.log(`[manz] Firmenbuchauszug als HTML-PDF gerendert: FN ${normalizedInput.fnr}`);
  return {
    mode: "live",
    fnr: normalizedInput.fnr,
    companyName: normalizedInput.companyName,
    stichtag,
    fileName: firmenbuchFileName(normalizedInput),
    contentType: "application/pdf",
    pdfBase64: rendered.pdfBase64,
    pdfKind: "rendered-html",
    officialPdf: false,
    extractUrl: page.url(),
    htmlBase64: Buffer.from(rendered.html, "utf8").toString("base64"),
    warnings: [
      "Dieses PDF ist aus der MANZ-HTML-Ansicht gerendert. Es ist nicht das signierte MANZ-Original-PDF.",
      "Urkunden-/Dokumentlinks im Firmenbuch koennen gebuehrenpflichtig sein und sollten separat bestaetigt werden.",
    ],
    source: "manz",
  };
}
