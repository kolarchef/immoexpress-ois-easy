import { z } from "zod";

export const SearchAddressInputSchema = z.object({
  city: z.string().trim().min(1, "city ist erforderlich"),
  street: z.string().trim().min(1, "street ist erforderlich"),
  houseNumber: z.string().trim().default(""),
  region: z.string().trim().optional(),
  searchMode: z.enum(["exact", "fuzzy"]).default("exact"),
  // Kosten-Obergrenze in Euro; wird aktuell nur durchgereicht/gespeichert,
  // da die Adresssuche selbst keine kostenpflichtige Abfrage auslöst.
  limitEuro: z.number().nonnegative().optional(),
});

export type SearchAddressInput = z.infer<typeof SearchAddressInputSchema>;

export interface GrundbuchHit {
  politischeGemeinde: string;
  pgNr: string;
  ort: string;
  strasse: string;
  hausnummer: string;
  ez: string;
  kgEz: string;
  grundstuecksnummer: string;
  kgGst: string;
  address: string;
  source: "manz";
}
