import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const boolFromString = (def: string) =>
  z
    .string()
    .default(def)
    .transform((v) => !["false", "0", "no", "off", ""].includes(v.trim().toLowerCase()));

const EnvSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(8787),
    NODE_ENV: z.string().default("development"),
    BRAINY_WORKER_SECRET: z
      .string()
      .min(16, "BRAINY_WORKER_SECRET muss mindestens 16 Zeichen lang sein"),
    GRUNDBUCH_MODE: z.enum(["live", "mock"]).default("live"),
    ISA_EMAIL: z.string().default(""),
    ISA_PASSWORD: z.string().default(""),
    HEADLESS: boolFromString("true"),
    SLOW_MO_MS: z.coerce.number().int().min(0).default(0),
    DEBUG_DUMPS: boolFromString("true"),
    // Optional: Pfad zu einem vorhandenen Chromium (sonst Playwright-Download)
    CHROMIUM_PATH: z.string().default(""),
  })
  .refine(
    (env) => env.GRUNDBUCH_MODE !== "live" || (env.ISA_EMAIL !== "" && env.ISA_PASSWORD !== ""),
    {
      message:
        "GRUNDBUCH_MODE=live benötigt ISA_EMAIL und ISA_PASSWORD in der .env (oder GRUNDBUCH_MODE=mock zum Testen setzen)",
    }
  );

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Nur Feldnamen/Meldungen ausgeben, niemals Werte (keine Secrets in Logs).
  console.error("Ungültige .env-Konfiguration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(env)"}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = {
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  workerSecret: parsed.data.BRAINY_WORKER_SECRET,
  mode: parsed.data.GRUNDBUCH_MODE,
  isaEmail: parsed.data.ISA_EMAIL,
  isaPassword: parsed.data.ISA_PASSWORD,
  headless: parsed.data.HEADLESS,
  slowMoMs: parsed.data.SLOW_MO_MS,
  debugDumps: parsed.data.DEBUG_DUMPS,
  chromiumPath: parsed.data.CHROMIUM_PATH,
} as const;
