import { createHash } from "node:crypto";
import type { APIResponse, Page, Response } from "playwright";
import { dumpDebug } from "../debug.js";
import type {
  GrundbuchExtract,
  RelatedDocument,
  RelatedDocumentResult,
  RequestExtractInput,
  RequestRelatedDocumentInput,
} from "../types.js";

const PDF_TIMEOUT_MS = 90000;
const NAV_TIMEOUT_MS = 90000;

function pdfFileName(input: Pick<RequestExtractInput, "kg" | "ez">, suffix = "auszug"): string {
  const kg = input.kg.replace(/[^0-9A-Za-z_-]+/g, "-");
  const ez = input.ez.replace(/[^0-9A-Za-z_-]+/g, "-");
  return `grundbuch-${suffix}-kg-${kg}-ez-${ez}.pdf`;
}

function relatedPdfFileName(input: RequestRelatedDocumentInput): string {
  const basis = input.reference || input.label || "zusatzdokument";
  const safe = basis.replace(/[^0-9A-Za-z_-]+/g, "-").replace(/^-+|-+$/g, "") || "zusatzdokument";
  return `grundbuch-${safe}.pdf`;
}

function absoluteUrl(page: Page, href: string): string {
  return new URL(href, page.url()).toString();
}

function idForUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function inferDocumentKind(url: string): RelatedDocument["kind"] {
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return "pdf";
  if (lower.includes("urkunde")) return "urkunde";
  if (lower.includes("tagebuch") || lower.includes("tz=")) return "tagebuch";
  if (lower.includes("dokument") || lower.includes("document")) return "document";
  return "unknown";
}

function inferReference(label: string, context: string): string {
  const combined = cleanText(`${label} ${context}`);
  const tz = combined.match(/\b\d{1,8}\s*\/\s*\d{4}\b/);
  if (tz) return tz[0].replace(/\s+/g, "");
  const bg = combined.match(/\bBG\s*\d+.*?(TZ\s*\d+\s*\/\s*\d{4})/i);
  if (bg) return cleanText(bg[0]);
  return cleanText(label || context).slice(0, 120);
}

function ensureAllowedManzUrl(page: Page, rawUrl: string): string {
  const url = absoluteUrl(page, rawUrl);
  const parsed = new URL(url);
  const currentHost = new URL(page.url()).hostname;
  const allowedHost = parsed.hostname === currentHost || parsed.hostname === "dienste.manz.at";
  const allowedPath =
    parsed.pathname.includes("/grundbuch.web/") ||
    parsed.pathname.includes("/vst/rev-proxy/gb/") ||
    parsed.pathname.includes("/pdf/");

  if (!allowedHost || !allowedPath) {
    throw new Error(`Zusatzdokument-Link wird aus Sicherheitsgruenden nicht abgerufen: ${url}`);
  }

  return url;
}

async function readPdfResponse(response: APIResponse | Response): Promise<{ contentType: string; pdfBase64: string }> {
  const contentType = response.headers()["content-type"] || "application/pdf";
  const buffer = await response.body();
  return {
    contentType,
    pdfBase64: buffer.toString("base64"),
  };
}

async function downloadPdfUrl(page: Page, url: string): Promise<{ contentType: string; pdfBase64: string }> {
  const response = await page.context().request.get(url, { timeout: PDF_TIMEOUT_MS });
  if (!response.ok()) {
    throw new Error(`PDF-Link gefunden, Download fehlgeschlagen: HTTP ${response.status()}`);
  }
  return readPdfResponse(response);
}

async function fillExtractForm(
  page: Page,
  input: Pick<RequestExtractInput, "kg" | "ez">,
  options: { html: boolean; signed: boolean }
): Promise<void> {
  const payload = JSON.stringify({
    kg: input.kg,
    ez: input.ez,
    html: options.html,
    signed: options.signed,
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

      const kgOk = set(["#kg", 'input[name="kg"]'], input.kg);
      set(['input[name="null"]'], input.kg);
      const ezOk = set(["#ez", 'input[name="ez"]'], input.ez);
      set(["#gstnr", 'input[name="gstnr"]'], "");

      selectRadioByValue("suche", "EZ");
      selectRadioByValue("ausgabe", "auszugVollstaendig");
      set(['select[name="ablattauswahl"]'], "mit Gutbestandsblatt");
      set(['select[name="bblattauswahl"]'], "mit Eigentumsblatt");
      set(['select[name="cblattauswahl"]'], "mit Lastenblatt");

      check(['input[name="html"]', "#html"], Boolean(input.html));
      check(['input[name="_html"]', "#_html"], true);
      check(['input[name="signatur"]', "#signatur"], Boolean(input.signed));
      check(['input[name="_signatur"]', "#_signatur"], true);

      return Boolean(kgOk && ezOk);
    })(${JSON.stringify(payload)})`)
    .then(Boolean)
    .catch(() => false);

  if (!ok) {
    await dumpDebug(page, "auszug-formular-felder-fehlen");
    throw new Error("Auszug-Formular konnte nicht mit KG/EZ befuellt werden. Siehe debug/-Snapshot.");
  }
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
          text.includes("suchen") ||
          text.includes("abfragen") ||
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
    await dumpDebug(page, "auszug-submit-fehlt");
    throw new Error('Auszug-Formular: kein Button/Formular zum Absenden gefunden. Siehe debug/-Snapshot.');
  }

  await navigation;
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
}

async function findPdfLink(page: Page): Promise<string | null> {
  return page
    .evaluate(`(function () {
      const link = Array.from(document.querySelectorAll("a[href]")).find(function (a) {
        return String(a.getAttribute("href") || "").toLowerCase().includes(".pdf");
      });
      return link ? link.getAttribute("href") : null;
    })()`)
    .then((href) => (typeof href === "string" && href ? absoluteUrl(page, href) : null))
    .catch(() => null);
}

async function extractRelatedDocumentsFromPage(page: Page): Promise<RelatedDocument[]> {
  const rows = (await page
    .evaluate(`(function () {
      const anchors = Array.from(document.querySelectorAll("a[href]"));
      return anchors.map(function (a) {
        const href = String(a.getAttribute("href") || "");
        const text = String(a.textContent || "").replace(/\\s+/g, " ").trim();
        let node = a.parentElement;
        let context = "";
        for (let i = 0; node && i < 5; i++) {
          const value = String(node.textContent || "").replace(/\\s+/g, " ").trim();
          if (value && value.length <= 700) {
            context = value;
            break;
          }
          node = node.parentElement;
        }
        return { href: href, text: text, context: context };
      }).filter(function (item) {
        const haystack = (item.href + " " + item.text + " " + item.context).toLowerCase();
        return (
          haystack.includes("urkunde") ||
          haystack.includes("tagebuch") ||
          haystack.includes("dokument") ||
          haystack.includes(".pdf") ||
          /\\b\\d{1,8}\\s*\\/\\s*\\d{4}\\b/.test(haystack)
        );
      });
    })()`)
    .catch(() => [])) as Array<{ href: string; text: string; context: string }>;

  const byUrl = new Map<string, RelatedDocument>();
  for (const row of rows) {
    if (!row.href || row.href.startsWith("#") || row.href.toLowerCase().startsWith("javascript:")) continue;
    const url = ensureAllowedManzUrl(page, row.href);
    const label = cleanText(row.text) || inferReference(row.text, row.context) || "Zusatzdokument";
    const reference = inferReference(row.text, row.context) || label;
    const kind = inferDocumentKind(url);
    if (kind === "unknown" && !/\d+\/\d{4}/.test(reference)) continue;

    byUrl.set(url, {
      id: idForUrl(url),
      label,
      reference,
      url,
      kind,
      requiresPayment: true,
      source: "manz",
    });
  }

  return Array.from(byUrl.values());
}

async function requestOfficialPdf(
  page: Page,
  gotoExtractSearch: (page: Page, kg: string, ez: string) => Promise<void>,
  input: RequestExtractInput
): Promise<GrundbuchExtract> {
  await gotoExtractSearch(page, input.kg, input.ez);
  await fillExtractForm(page, input, { html: false, signed: true });

  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.url().toLowerCase().includes(".pdf") ||
        (response.headers()["content-type"] || "").toLowerCase().includes("application/pdf"),
      { timeout: PDF_TIMEOUT_MS }
    )
    .catch(() => null);

  await submitCurrentForm(page);
  const directPdfResponse = await responsePromise;

  let pdfUrl: string | undefined;
  let pdfData: { contentType: string; pdfBase64: string } | null = null;

  if (directPdfResponse) {
    pdfUrl = directPdfResponse.url();
    pdfData = await readPdfResponse(directPdfResponse);
  } else {
    const link = await findPdfLink(page);
    if (link) {
      pdfUrl = link;
      pdfData = await downloadPdfUrl(page, link);
    }
  }

  if (!pdfData) {
    await dumpDebug(page, "auszug-pdf-nicht-gefunden");
    throw new Error(
      "Auszug wurde angefordert, aber kein PDF-Link/PDF-Download gefunden. Siehe debug/-Snapshot; vermutlich verlangt MANZ eine weitere Bestaetigung."
    );
  }

  console.log(`[manz] Offizielles Grundbuch-PDF geladen: KG ${input.kg}, EZ ${input.ez}`);
  return {
    mode: "live",
    kg: input.kg,
    ez: input.ez,
    grundstuecksnummer: input.grundstuecksnummer,
    address: input.address,
    fileName: pdfFileName(input, "official"),
    contentType: pdfData.contentType,
    pdfBase64: pdfData.pdfBase64,
    pdfKind: "official-pdf",
    officialPdf: true,
    pdfUrl,
    relatedDocuments: [],
    relatedDocumentsCount: 0,
    warnings: [
      "Im offiziellen MANZ-PDF sind Zusatzdokument-Links oft nicht als auslesbare PDF-Links enthalten. Fuer die Zusatzliste bitte format=html-pdf-with-links verwenden.",
    ],
    source: "manz",
  };
}

async function requestHtmlPdfWithLinks(
  page: Page,
  gotoExtractSearch: (page: Page, kg: string, ez: string) => Promise<void>,
  input: RequestExtractInput
): Promise<GrundbuchExtract> {
  await gotoExtractSearch(page, input.kg, input.ez);
  await fillExtractForm(page, input, { html: true, signed: false });
  await submitCurrentForm(page);

  const html = await page.content();
  const relatedDocuments = await extractRelatedDocumentsFromPage(page);

  let pdfBuffer: Buffer;
  try {
    await page.emulateMedia({ media: "print" }).catch(() => {});
    pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });
  } catch (err) {
    await dumpDebug(page, "html-auszug-pdf-render-fehlgeschlagen");
    throw new Error(`HTML-Auszug wurde geladen, aber PDF-Erstellung ist fehlgeschlagen: ${(err as Error).message}`);
  }

  console.log(
    `[manz] HTML-Grundbuchauszug geladen und als PDF gerendert: KG ${input.kg}, EZ ${input.ez}, Zusatzlinks: ${relatedDocuments.length}`
  );

  return {
    mode: "live",
    kg: input.kg,
    ez: input.ez,
    grundstuecksnummer: input.grundstuecksnummer,
    address: input.address,
    fileName: pdfFileName(input),
    contentType: "application/pdf",
    pdfBase64: pdfBuffer.toString("base64"),
    pdfKind: "rendered-html",
    officialPdf: false,
    extractUrl: page.url(),
    htmlBase64: Buffer.from(html, "utf8").toString("base64"),
    relatedDocuments,
    relatedDocumentsCount: relatedDocuments.length,
    warnings: [
      "Dieses PDF ist aus der MANZ-HTML-Ansicht gerendert, damit Zusatzdokumente erkannt und aufgelistet werden koennen. Es ist nicht das signierte MANZ-Original-PDF.",
      "Zusatzdokumente/Urkunden sind laut MANZ-Hinweis gebuehrenpflichtig und werden erst beim separaten Abruf geladen.",
    ],
    source: "manz",
  };
}

export async function requestExtract(
  page: Page,
  gotoExtractSearch: (page: Page, kg: string, ez: string) => Promise<void>,
  input: RequestExtractInput
): Promise<GrundbuchExtract> {
  if (input.format === "official-pdf") {
    return requestOfficialPdf(page, gotoExtractSearch, input);
  }
  return requestHtmlPdfWithLinks(page, gotoExtractSearch, input);
}

async function requestRelatedDocumentInternal(
  page: Page,
  input: RequestRelatedDocumentInput,
  depth: number
): Promise<RelatedDocumentResult> {
  if (depth > 3) {
    throw new Error("Zusatzdokument konnte nicht eindeutig aufgeloest werden.");
  }

  const documentUrl = ensureAllowedManzUrl(page, input.documentUrl);
  const response = await page.goto(documentUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).catch((err) => {
    throw new Error(`Zusatzdokument konnte nicht geoeffnet werden: ${(err as Error).message}`);
  });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

  const responseContentType = response?.headers()["content-type"] || "";
  if (response && responseContentType.toLowerCase().includes("application/pdf")) {
    const pdfData = await readPdfResponse(response);
    return {
      mode: "live",
      label: input.label,
      reference: input.reference,
      documentUrl,
      fileName: relatedPdfFileName(input),
      contentType: pdfData.contentType,
      pdfBase64: pdfData.pdfBase64,
      pdfUrl: documentUrl,
      source: "manz",
    };
  }

  const pdfLink = await findPdfLink(page);
  if (pdfLink) {
    const safePdfLink = ensureAllowedManzUrl(page, pdfLink);
    const pdfData = await downloadPdfUrl(page, safePdfLink);
    return {
      mode: "live",
      label: input.label,
      reference: input.reference,
      documentUrl,
      fileName: relatedPdfFileName(input),
      contentType: pdfData.contentType,
      pdfBase64: pdfData.pdfBase64,
      pdfUrl: safePdfLink,
      source: "manz",
    };
  }

  const relatedDocuments = await extractRelatedDocumentsFromPage(page);
  if (relatedDocuments.length === 1 && relatedDocuments[0].url !== documentUrl) {
    return requestRelatedDocumentInternal(
      page,
      {
        ...input,
        documentUrl: relatedDocuments[0].url,
        label: input.label || relatedDocuments[0].label,
        reference: input.reference || relatedDocuments[0].reference,
      },
      depth + 1
    );
  }

  if (relatedDocuments.length > 0) {
    return {
      mode: "live",
      label: input.label,
      reference: input.reference,
      documentUrl,
      relatedDocuments,
      relatedDocumentsCount: relatedDocuments.length,
      requiresSelection: true,
      source: "manz",
    };
  }

  await dumpDebug(page, "zusatzdokument-pdf-nicht-gefunden");
  throw new Error(
    "Zusatzdokument wurde geoeffnet, aber kein PDF und keine weitere Dokumentliste gefunden. Siehe debug/-Snapshot."
  );
}

export async function requestRelatedDocument(
  page: Page,
  input: RequestRelatedDocumentInput
): Promise<RelatedDocumentResult> {
  const result = await requestRelatedDocumentInternal(page, input, 0);
  console.log(`[manz] Zusatzdokument verarbeitet: ${input.reference || input.label || input.documentUrl}`);
  return result;
}
