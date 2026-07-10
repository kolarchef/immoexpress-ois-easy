import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "playwright";
import { config } from "./config.js";

const DEBUG_DIR = path.resolve(process.cwd(), "debug");

/**
 * Schreibt Screenshot + HTML-Snapshot nach ./debug — aber immer ohne
 * Passwörter: Passwortfelder werden vor dem Snapshot geleert und im
 * HTML zusätzlich per Regex maskiert.
 */
export async function dumpDebug(page: Page, tag: string): Promise<void> {
  if (!config.debugDumps) return;
  try {
    await mkdir(DEBUG_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const base = path.join(DEBUG_DIR, `${ts}-${tag}`);

    // Als String ausführen (kein TS/Bundler-Code in page.evaluate injizieren,
    // sonst droht "ReferenceError: __name is not defined").
    await page
      .evaluate(
        `document.querySelectorAll('input[type="password"]').forEach(function (el) {
          el.value = "";
          el.setAttribute("value", "");
        });`
      )
      .catch(() => {});

    await page.screenshot({ path: `${base}.png`, fullPage: true }).catch(() => {});

    let html = await page.content().catch(() => "");
    if (html) {
      // Sicherheitsnetz: value-Attribute von Passwortfeldern im HTML maskieren.
      html = html.replace(
        /(<input[^>]*type=["']?password["']?[^>]*value=["'])[^"']*(["'])/gi,
        "$1***$2"
      );
      await writeFile(`${base}.html`, html, "utf8");
    }
    console.log(`[debug] Snapshot gespeichert: ${base}.png / .html`);
  } catch (err) {
    console.warn(`[debug] Snapshot fehlgeschlagen (${tag}):`, (err as Error).message);
  }
}

/**
 * Schreibt eine Diagnose-Datei mit allen Links, Formularfeldern und Buttons
 * aller Frames — damit lassen sich fehlschlagende Selektoren direkt anhand
 * der echten Feldnamen nachschärfen. Es werden bewusst KEINE Feld-Werte
 * erfasst (keine E-Mail, kein Passwort).
 */
export async function dumpDiagnostics(page: Page, tag: string): Promise<void> {
  if (!config.debugDumps) return;
  try {
    await mkdir(DEBUG_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const frames: Array<Record<string, unknown>> = [];

    for (const frame of page.frames()) {
      // Als String ausführen (kein Bundler-Code injizieren, siehe oben).
      const info = await frame
        .evaluate(
          `(function () {
            function txt(el) { return (el.innerText || "").trim().slice(0, 80); }
            var links = Array.prototype.slice.call(document.querySelectorAll("a")).slice(0, 150).map(function (a) {
              return { text: txt(a), href: a.getAttribute("href") || "" };
            });
            var fields = Array.prototype.slice.call(document.querySelectorAll("input, select, textarea")).slice(0, 100).map(function (el) {
              return {
                tag: el.tagName.toLowerCase(),
                type: el.getAttribute("type") || "",
                name: el.getAttribute("name") || "",
                id: el.id || "",
                placeholder: el.getAttribute("placeholder") || ""
              };
            });
            var buttons = Array.prototype.slice.call(document.querySelectorAll('button, input[type="submit"]')).slice(0, 50).map(function (el) {
              return { text: txt(el) || el.getAttribute("value") || "", name: el.getAttribute("name") || "", id: el.id || "" };
            });
            return { links: links, fields: fields, buttons: buttons };
          })()`
        )
        .catch(() => null);
      if (info && typeof info === "object") {
        frames.push({ frameUrl: frame.url(), ...(info as Record<string, unknown>) });
      }
    }

    const file = path.join(DEBUG_DIR, `${ts}-${tag}-diagnose.json`);
    await writeFile(file, JSON.stringify(frames, null, 2), "utf8");
    console.log(`[debug] Diagnose gespeichert: ${file}`);
  } catch (err) {
    console.warn(`[debug] Diagnose fehlgeschlagen (${tag}):`, (err as Error).message);
  }
}
