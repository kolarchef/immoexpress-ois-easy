# Brainy Grundbuch-Worker

DSGVO-konformer Node.js-Worker für **ImmoExpress Brainy**: führt über
**Immoservice Austria → MANZ Grundbuch** die Grundstücksadressensuche aus und
liefert die Treffer (KG / EZ / Grundstücksnummer) als JSON zurück.

> **Warum ein eigener Server und keine Supabase Edge Function?**
> Edge Functions laufen auf Deno in einer Sandbox: kein Chromium/Playwright,
> keine stabilen Login-Sessions/Cookies über mehrere Requests, und MANZ
> beantwortet Anfragen aus solchen Cloud-Umgebungen häufig mit 403.
> Deshalb läuft dieser Worker als eigener Node-Prozess — lokal zum Entwickeln,
> später auf einem Hetzner-Server in der EU. Supabase ruft den Worker dann
> serverseitig (Edge Function → Worker, mit Secret) auf.

## Schnellstart (lokal)

```bash
cd worker
npm install
npx playwright install chromium   # einmalig: Browser herunterladen
cp .env.example .env              # Windows: copy .env.example .env
# .env ausfüllen: BRAINY_WORKER_SECRET, ISA_EMAIL, ISA_PASSWORD

npm run dev                       # Windows: npm.cmd run dev
```

Im zweiten Terminal:

```bash
npm run test:search               # Windows: npm.cmd run test:search
```

Erwartung: echte MANZ-Treffer für *Hochstraße 137, Perchtoldsdorf* mit
EZ 330, KG 16121, Gst 2546/2 — dynamisch aus der Tabelle geparst, nicht
hardcoded.

**Tipp zum Testen der App-Anbindung ohne Browser/Zugangsdaten:**
`GRUNDBUCH_MODE=mock` in der .env liefert sofort Beispieldaten.

## API

Jeder Request (außer `GET /health`) braucht den Header:

```
Authorization: Bearer <BRAINY_WORKER_SECRET>
```

Fehlt das Secret oder ist es falsch → **HTTP 401**.

### `POST /search-address`

```json
{
  "city": "Perchtoldsdorf",
  "street": "Hochstraße",
  "houseNumber": "137",
  "region": "Niederösterreich",
  "searchMode": "exact",
  "limitEuro": 25
}
```

Antwort:

```json
{
  "mode": "live",
  "results": [
    {
      "politischeGemeinde": "Perchtoldsdorf",
      "pgNr": "31719",
      "ort": "Perchtoldsdorf",
      "strasse": "Hochstraße",
      "hausnummer": "137",
      "ez": "330",
      "kgEz": "16121",
      "grundstuecksnummer": "2546/2",
      "kgGst": "16121",
      "address": "Hochstraße 137, Perchtoldsdorf",
      "source": "manz"
    }
  ]
}
```

Die Adresssuche löst **keine kostenpflichtige Grundbuch-Abfrage** aus — es
wird nur die Trefferliste gelesen.

### `POST /request-extract`

Bewusst noch **nicht implementiert** (HTTP 501). Kommt erst nach
Gratis-Kontingent / Zahlung / Admin-Freigabe.

Beispiel mit curl:

```bash
curl -s -X POST http://localhost:8787/search-address \
  -H "Authorization: Bearer $BRAINY_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"city":"Perchtoldsdorf","street":"Hochstraße","houseNumber":"137"}'
```

## Ablauf (live)

1. `https://www.immoservice-austria.com/` öffnen, Usercentrics-Cookie-Banner
   schließen.
2. Mit `ISA_EMAIL` / `ISA_PASSWORD` einloggen (robuste Selektoren, klare
   Fehlermeldung bei „Fehler beim Login“).
3. Grundbuch/Grundbuchimmo-Modul öffnen (mehrere Link-Strategien; neuer Tab
   wird erkannt).
4. Zur MANZ-Adresssuche `/ds/suche/grundstuecksadressensuche` navigieren.
5. Formular befüllen, „Suchen“ klicken.
6. Ergebnistabelle **dynamisch** parsen: Die Spalten (Politische Gemeinde,
   PG Nr., Ort, Straße, Hnr., EZ, KG EZ, Gst, KG Gst) werden über die
   Header-Texte zugeordnet — keine festen Spaltenindizes, keine hardcodierten
   Werte.

Die Browser-Session wird zwischen Requests wiederverwendet; bei abgelaufener
Session wird automatisch einmal neu eingeloggt. Es läuft immer nur **eine**
Suche gleichzeitig (interner Lock).

### Wenn ein Selektor nicht greift: Diagnose-Dateien

Schlägt ein Schritt fehl (Login-Feld, Grundbuch-Link, Suchformular,
Ergebnistabelle), schreibt der Worker nach `debug/` neben Screenshot + HTML
auch eine **`…-diagnose.json`**: alle Links (Text + href), Formularfelder
(name/id/type/placeholder) und Buttons — über **alle Frames** hinweg, ohne
Feld-Werte. Damit lässt sich der passende Selektor direkt ablesen und in
`src/manz/session.ts` / `src/manz/search.ts` ergänzen.

Das Suchformular und die Ergebnistabelle werden automatisch auch in
**iframes** gesucht (MANZ-Anwendungen laufen teils in Frames).

### HAR-Dateien

Wenn Selektoren auf der echten Seite nicht greifen: HAR-Dateien
(`Grundbuch webseite auslesen 1.har`, `www.immoservice-austria Grundbuch.har`,
`dienste.manz.at_Grundbuch links.har`, `dienste.manz.at_Archive 2.har`) in
`worker/har/` legen (ist gitignored) und die Selektoren in
`src/manz/session.ts` / `src/manz/search.ts` anhand der echten Feldnamen
nachschärfen. Die Debug-Snapshots in `debug/` zeigen zusätzlich, wo es hakt.

## Sicherheit & DSGVO

- **Keine Zugangsdaten im Code** — nur `.env` (gitignored) bzw. Server-Secrets.
- **Keine Passwörter in Logs.** Konfig-Fehler loggen nur Feldnamen, nie Werte.
- **Debug-Snapshots ohne Passwörter:** Passwortfelder werden vor Screenshot/
  HTML-Snapshot geleert und im HTML zusätzlich maskiert (`src/debug.ts`).
- **Worker nie offen ins Internet:** Bearer-Secret ist Pflicht; zusätzlich per
  Firewall/Reverse-Proxy absichern (siehe unten).
- **EU-Hosting:** Hetzner Nürnberg/Falkenstein (Deutschland).
- **Datenminimierung:** Der Worker speichert nichts dauerhaft; `debug/` nur
  fürs Debugging aktiv lassen (`DEBUG_DUMPS=false` in Produktion) und
  regelmäßig leeren.

## Deployment auf Hetzner (Ubuntu 24.04)

```bash
# Node.js 22 + Abhängigkeiten
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Projekt deployen (z.B. git clone), dann:
cd worker
npm install
npx playwright install --with-deps chromium

# .env anlegen: HEADLESS=true, SLOW_MO_MS=0, DEBUG_DUMPS=false setzen!

# Firewall: Port 8787 NICHT öffnen — nur lokal / hinter Reverse-Proxy
sudo ufw allow OpenSSH
sudo ufw allow 443/tcp
sudo ufw enable
```

Systemd-Service (`/etc/systemd/system/brainy-worker.service`):

```ini
[Unit]
Description=Brainy Grundbuch-Worker
After=network.target

[Service]
WorkingDirectory=/opt/immoexpress/worker
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=brainy
EnvironmentFile=/opt/immoexpress/worker/.env

[Install]
WantedBy=multi-user.target
```

HTTPS davor z.B. mit Caddy (automatisches TLS):

```
worker.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

Der Worker bleibt so nur über HTTPS + Bearer-Secret erreichbar; die Supabase
Edge Function ruft ihn serverseitig mit dem Secret auf, das Frontend nie
direkt.

## Bekannte Fehler & Lösungen

| Problem | Ursache / Lösung |
| --- | --- |
| `EADDRINUSE :::8787` | Worker läuft schon. Alten Prozess beenden (nur **ein** Worker pro Port) oder `PORT` ändern. Nach Codeänderungen Worker neu starten (bei `npm run dev` automatisch). |
| `ReferenceError: __name is not defined` | Kein TypeScript/Bundler-Code in `page.evaluate()` injizieren. Dieser Worker nutzt deshalb Playwright-Locators und übergibt Browser-Skripte nur als **reine JS-Strings**. Beim Erweitern genauso machen. |
| „Fehler beim Login“ | Zugangsdaten in `.env` prüfen. `HEADLESS=false` setzen und zuschauen — oft blockiert der Cookie-Banner; der Worker versucht mehrere Banner-Buttons, Snapshot liegt in `debug/`. |
| MANZ liefert 403 | Passiert v.a. aus Cloud-/Edge-Umgebungen ohne saubere Session. Der Worker hält Login-Session und Cookies im echten Chromium — falls es trotzdem auftritt: Snapshot in `debug/` prüfen. |
| Grundbuch-Link nicht gefunden | Es werden mehrere Strategien probiert (`href` enthält `grundbuchimmo`, Text „GRUNDBUCH“/„Grundbuchimmo“, Modulkarte). Wenn alle scheitern: `debug/`-Snapshot ansehen und Selektor ergänzen. |
