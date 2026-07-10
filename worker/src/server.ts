import { timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { requestFirmenbuchExtract, searchFirmenbuchCompany } from "./manz/firmenbuch.js";
import { requestExtract, requestRelatedDocument } from "./manz/extract.js";
import { searchAddress } from "./manz/search.js";
import { LoginError, ManzSession } from "./manz/session.js";
import {
  RequestFirmenbuchExtractInputSchema,
  RequestExtractInputSchema,
  RequestRelatedDocumentInputSchema,
  SearchFirmenbuchCompanyInputSchema,
  SearchAddressInputSchema,
  type FirmenbuchCompanyHit,
  type FirmenbuchExtract,
  type GrundbuchExtract,
  type GrundbuchHit,
  type RelatedDocumentResult,
  type RequestFirmenbuchExtractInput,
  type RequestExtractInput,
  type RequestRelatedDocumentInput,
  type SearchFirmenbuchCompanyInput,
  type SearchAddressInput,
} from "./types.js";

const app = express();
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: config.mode });
});

function requireSecret(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const expected = Buffer.from(config.workerSecret);
  const actual = Buffer.from(token);
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!ok) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
app.use(requireSecret);

let lockChain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lockChain.then(fn, fn);
  lockChain = run.catch(() => {});
  return run;
}

const session = new ManzSession();

const MOCK_HIT: GrundbuchHit = {
  politischeGemeinde: "Perchtoldsdorf",
  pgNr: "31719",
  ort: "Perchtoldsdorf",
  strasse: "Hochstrasse",
  hausnummer: "137",
  ez: "330",
  kgEz: "16121",
  grundstuecksnummer: "2546/2",
  kgGst: "16121",
  address: "Hochstrasse 137, Perchtoldsdorf",
  source: "manz",
  auszugUrl:
    "https://dienste.manz.at/vst/rev-proxy/gb/at.gv.bmj.grundbuch.web/ds/auszug/auszugsuche?kg=16121&ez=330",
};

async function runLiveSearch(input: SearchAddressInput): Promise<GrundbuchHit[]> {
  const goto = (p: Parameters<typeof searchAddress>[0]) => session.gotoAddressSearch(p);
  try {
    const page = await session.getManzPage();
    return await searchAddress(page, goto, input);
  } catch (err) {
    if (err instanceof LoginError) throw err;
    console.warn("[worker] Suche fehlgeschlagen, versuche Re-Login:", (err as Error).message);
    await session.reset();
    const page = await session.getManzPage();
    return await searchAddress(page, goto, input);
  }
}

async function runLiveExtract(input: RequestExtractInput): Promise<GrundbuchExtract> {
  const goto = (p: Parameters<typeof requestExtract>[0], kg: string, ez: string) =>
    session.gotoExtractSearch(p, kg, ez);
  try {
    const page = await session.getManzPage();
    return await requestExtract(page, goto, input);
  } catch (err) {
    if (err instanceof LoginError) throw err;
    console.warn("[worker] Auszug fehlgeschlagen, versuche Re-Login:", (err as Error).message);
    await session.reset();
    const page = await session.getManzPage();
    return await requestExtract(page, goto, input);
  }
}

async function runLiveRelatedDocument(input: RequestRelatedDocumentInput): Promise<RelatedDocumentResult> {
  try {
    const page = await session.getManzPage();
    return await requestRelatedDocument(page, input);
  } catch (err) {
    if (err instanceof LoginError) throw err;
    console.warn("[worker] Zusatzdokument fehlgeschlagen, versuche Re-Login:", (err as Error).message);
    await session.reset();
    const page = await session.getManzPage();
    return await requestRelatedDocument(page, input);
  }
}

async function runLiveFirmenbuchCompanySearch(input: SearchFirmenbuchCompanyInput): Promise<FirmenbuchCompanyHit[]> {
  const goto = (p: Parameters<typeof searchFirmenbuchCompany>[0]) => session.gotoFirmenbuchCompanySearch(p);
  try {
    const page = await session.getManzPage();
    return await searchFirmenbuchCompany(page, goto, input);
  } catch (err) {
    if (err instanceof LoginError) throw err;
    console.warn("[worker] Firmenbuchsuche fehlgeschlagen, versuche Re-Login:", (err as Error).message);
    await session.reset();
    const page = await session.getManzPage();
    return await searchFirmenbuchCompany(page, goto, input);
  }
}

async function runLiveFirmenbuchExtract(input: RequestFirmenbuchExtractInput): Promise<FirmenbuchExtract> {
  const goto = (p: Parameters<typeof requestFirmenbuchExtract>[0], fnr?: string) =>
    session.gotoFirmenbuchExtractForm(p, fnr);
  try {
    const page = await session.getManzPage();
    return await requestFirmenbuchExtract(page, goto, input);
  } catch (err) {
    if (err instanceof LoginError) throw err;
    console.warn("[worker] Firmenbuchauszug fehlgeschlagen, versuche Re-Login:", (err as Error).message);
    await session.reset();
    const page = await session.getManzPage();
    return await requestFirmenbuchExtract(page, goto, input);
  }
}

app.post("/search-address", async (req, res) => {
  const parsed = SearchAddressInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Eingabe", details: parsed.error.flatten().fieldErrors });
    return;
  }

  if (config.mode === "mock") {
    res.json({ mode: "mock", results: [MOCK_HIT] });
    return;
  }

  try {
    const results = await withLock(() => runLiveSearch(parsed.data));
    res.json({ mode: "live", results });
  } catch (err) {
    const message = (err as Error).message;
    console.error("[worker] /search-address fehlgeschlagen:", message);
    res.status(err instanceof LoginError ? 502 : 500).json({
      error: message,
      hint:
        err instanceof LoginError
          ? "ISA_EMAIL/ISA_PASSWORD pruefen; ggf. HEADLESS=false setzen und Login im Fenster beobachten."
          : "Details siehe Worker-Log und debug/-Snapshots.",
    });
  }
});

app.post("/request-extract", async (req, res) => {
  const parsed = RequestExtractInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Eingabe", details: parsed.error.flatten().fieldErrors });
    return;
  }

  if (config.mode === "mock") {
    res.status(501).json({
      mode: "mock",
      error: "PDF-Abruf ist im Mock-Modus nicht verfuegbar.",
    });
    return;
  }

  try {
    const extract = await withLock(() => runLiveExtract(parsed.data));
    res.json(extract);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[worker] /request-extract fehlgeschlagen:", message);
    res.status(err instanceof LoginError ? 502 : 500).json({
      error: message,
      hint:
        err instanceof LoginError
          ? "ISA_EMAIL/ISA_PASSWORD pruefen; ggf. HEADLESS=false setzen und Login im Fenster beobachten."
          : "Details siehe Worker-Log und debug/-Snapshots.",
    });
  }
});

app.post("/request-related-document", async (req, res) => {
  const parsed = RequestRelatedDocumentInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Eingabe", details: parsed.error.flatten().fieldErrors });
    return;
  }

  if (config.mode === "mock") {
    res.status(501).json({
      mode: "mock",
      error: "Zusatzdokument-Abruf ist im Mock-Modus nicht verfuegbar.",
    });
    return;
  }

  try {
    const documentResult = await withLock(() => runLiveRelatedDocument(parsed.data));
    res.json(documentResult);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[worker] /request-related-document fehlgeschlagen:", message);
    res.status(err instanceof LoginError ? 502 : 500).json({
      error: message,
      hint:
        err instanceof LoginError
          ? "ISA_EMAIL/ISA_PASSWORD pruefen; ggf. HEADLESS=false setzen und Login im Fenster beobachten."
          : "Details siehe Worker-Log und debug/-Snapshots.",
    });
  }
});

app.post("/firmenbuch/search-company", async (req, res) => {
  const parsed = SearchFirmenbuchCompanyInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Eingabe", details: parsed.error.flatten().fieldErrors });
    return;
  }

  if (config.mode === "mock") {
    res.json({
      mode: "mock",
      results: [
        {
          fnr: "390820k",
          displayFnr: "390820 k",
          companyName: "Immoexpress KG",
          seat: "Wien",
          legalForm: "KG",
          court: "HG Wien",
          source: "manz",
        },
      ],
    });
    return;
  }

  try {
    const results = await withLock(() => runLiveFirmenbuchCompanySearch(parsed.data));
    res.json({ mode: "live", results });
  } catch (err) {
    const message = (err as Error).message;
    console.error("[worker] /firmenbuch/search-company fehlgeschlagen:", message);
    res.status(err instanceof LoginError ? 502 : 500).json({
      error: message,
      hint:
        err instanceof LoginError
          ? "ISA_EMAIL/ISA_PASSWORD pruefen; ggf. HEADLESS=false setzen und Login im Fenster beobachten."
          : "Details siehe Worker-Log und debug/-Snapshots.",
    });
  }
});

app.post("/firmenbuch/request-extract", async (req, res) => {
  const parsed = RequestFirmenbuchExtractInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Eingabe", details: parsed.error.flatten().fieldErrors });
    return;
  }

  if (config.mode === "mock") {
    res.status(501).json({
      mode: "mock",
      error: "Firmenbuchauszug-Abruf ist im Mock-Modus nicht verfuegbar.",
    });
    return;
  }

  try {
    const extract = await withLock(() => runLiveFirmenbuchExtract(parsed.data));
    res.json(extract);
  } catch (err) {
    const message = (err as Error).message;
    console.error("[worker] /firmenbuch/request-extract fehlgeschlagen:", message);
    res.status(err instanceof LoginError ? 502 : 500).json({
      error: message,
      hint:
        err instanceof LoginError
          ? "ISA_EMAIL/ISA_PASSWORD pruefen; ggf. HEADLESS=false setzen und Login im Fenster beobachten."
          : "Details siehe Worker-Log und debug/-Snapshots.",
    });
  }
});

const server = app.listen(config.port, () => {
  console.log(`Brainy Grundbuch-Worker laeuft auf Port ${config.port} (Modus: ${config.mode})`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${config.port} ist bereits belegt (EADDRINUSE). Laeuft der Worker schon? ` +
        `Alten Prozess beenden oder PORT in der .env aendern.`
    );
    process.exit(1);
  }
  throw err;
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} empfangen - Browser wird geschlossen ...`);
  await session.reset();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
