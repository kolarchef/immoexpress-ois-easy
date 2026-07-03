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
