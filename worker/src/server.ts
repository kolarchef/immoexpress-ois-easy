import { timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { searchAddress } from "./manz/search.js";
import { LoginError, ManzSession } from "./manz/session.js";
import { SearchAddressInputSchema, type GrundbuchHit, type SearchAddressInput } from "./types.js";

const app = express();
app.use(express.json());

// Health-Check ohne Auth (für Monitoring/Reverse-Proxy), gibt nichts preis.
app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: config.mode });
});

/** Jeder Request braucht: Authorization: Bearer <BRAINY_WORKER_SECRET> */
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

// Nur eine Browser-Suche gleichzeitig (eine Session, ein Fenster).
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
  strasse: "Hochstraße",
  hausnummer: "137",
  ez: "330",
  kgEz: "16121",
  grundstuecksnummer: "2546/2",
  kgGst: "16121",
  address: "Hochstraße 137, Perchtoldsdorf",
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
    // Session könnte abgelaufen sein: einmal frisch einloggen und erneut suchen.
    console.warn("[worker] Suche fehlgeschlagen, versuche Re-Login:", (err as Error).message);
    await session.reset();
    const page = await session.getManzPage();
    return await searchAddress(page, goto, input);
  }
}

app.post("/search-address", async (req, res) => {
  const parsed = SearchAddressInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Eingabe", details: parsed.error.flatten().fieldErrors });
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
          ? "ISA_EMAIL/ISA_PASSWORD prüfen; ggf. HEADLESS=false setzen und Login im Fenster beobachten."
          : "Details siehe Worker-Log und debug/-Snapshots.",
    });
  }
});

// Platzhalter: kostenpflichtiger Auszug kommt erst nach Kontingent/Zahlung/Freigabe.
app.post("/request-extract", (_req, res) => {
  res.status(501).json({
    error: "Noch nicht implementiert",
    hint: "Wird erst nach Gratis-Kontingent/Zahlung/Admin-Freigabe freigeschaltet. Die Adresssuche löst bewusst keine kostenpflichtige Abfrage aus.",
  });
});

const server = app.listen(config.port, () => {
  console.log(`Brainy Grundbuch-Worker läuft auf Port ${config.port} (Modus: ${config.mode})`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${config.port} ist bereits belegt (EADDRINUSE). Läuft der Worker schon? ` +
        `Alten Prozess beenden oder PORT in der .env ändern.`
    );
    process.exit(1);
  }
  throw err;
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} empfangen — Browser wird geschlossen …`);
  await session.reset();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
