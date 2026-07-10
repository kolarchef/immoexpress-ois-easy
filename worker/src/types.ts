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

export const RequestExtractInputSchema = z.object({
  kg: z.string().trim().min(1, "kg ist erforderlich"),
  ez: z.string().trim().min(1, "ez ist erforderlich"),
  grundstuecksnummer: z.string().trim().optional(),
  address: z.string().trim().optional(),
  format: z.enum(["html-pdf-with-links", "official-pdf"]).default("html-pdf-with-links"),
  confirmCost: z.literal(true, {
    errorMap: () => ({
      message:
        "confirmCost=true ist erforderlich, weil der Auszug eine kostenpflichtige MANZ-Abfrage ausloesen kann.",
    }),
  }),
});

export type RequestExtractInput = z.infer<typeof RequestExtractInputSchema>;

export const RequestRelatedDocumentInputSchema = z.object({
  documentUrl: z.string().trim().min(1, "documentUrl ist erforderlich"),
  label: z.string().trim().optional(),
  reference: z.string().trim().optional(),
  confirmCost: z.literal(true, {
    errorMap: () => ({
      message:
        "confirmCost=true ist erforderlich, weil ein Zusatzdokument eine weitere kostenpflichtige MANZ-Abfrage ausloesen kann.",
    }),
  }),
});

export type RequestRelatedDocumentInput = z.infer<typeof RequestRelatedDocumentInputSchema>;

export const SearchFirmenbuchCompanyInputSchema = z.object({
  firmenwortlaut: z.string().trim().min(1, "firmenwortlaut ist erforderlich"),
  exact: z.boolean().default(false),
  includeNotFoundConfirmation: z.boolean().default(true),
});

export type SearchFirmenbuchCompanyInput = z.infer<typeof SearchFirmenbuchCompanyInputSchema>;

export const RequestFirmenbuchExtractInputSchema = z.object({
  fnr: z.string().trim().min(1, "fnr ist erforderlich"),
  companyName: z.string().trim().optional(),
  stichtag: z.string().trim().optional(),
  includeHistorical: z.boolean().default(false),
  includeDocumentLinks: z.boolean().default(true),
  signed: z.boolean().default(false),
  confirmCost: z.literal(true, {
    errorMap: () => ({
      message:
        "confirmCost=true ist erforderlich, weil der Firmenbuchauszug eine kostenpflichtige MANZ-Abfrage ausloesen kann.",
    }),
  }),
});

export type RequestFirmenbuchExtractInput = z.infer<typeof RequestFirmenbuchExtractInputSchema>;

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
  /** "Gehe zu"-Link aus der Trefferzeile (auszugsuche?kg=…&ez=…) — wird nur
   *  gemerkt, nie automatisch aufgerufen (kostenpflichtig!). */
  auszugUrl?: string;
}

export interface RelatedDocument {
  id: string;
  label: string;
  reference: string;
  url: string;
  kind: "urkunde" | "tagebuch" | "pdf" | "document" | "unknown";
  requiresPayment: true;
  source: "manz";
}

export interface GrundbuchExtract {
  mode: "live";
  kg: string;
  ez: string;
  grundstuecksnummer?: string;
  address?: string;
  fileName: string;
  contentType: string;
  pdfBase64: string;
  pdfKind: "rendered-html" | "official-pdf";
  officialPdf: boolean;
  pdfUrl?: string;
  extractUrl?: string;
  htmlBase64?: string;
  relatedDocuments: RelatedDocument[];
  relatedDocumentsCount: number;
  warnings?: string[];
  source: "manz";
}

export interface RelatedDocumentResult {
  mode: "live";
  label?: string;
  reference?: string;
  documentUrl: string;
  fileName?: string;
  contentType?: string;
  pdfBase64?: string;
  pdfUrl?: string;
  relatedDocuments?: RelatedDocument[];
  relatedDocumentsCount?: number;
  requiresSelection?: boolean;
  source: "manz";
}

export interface FirmenbuchCompanyHit {
  fnr: string;
  displayFnr: string;
  companyName: string;
  seat?: string;
  legalForm?: string;
  court?: string;
  detailUrl?: string;
  source: "manz";
}

export interface FirmenbuchExtract {
  mode: "live";
  fnr: string;
  displayFnr?: string;
  companyName?: string;
  stichtag?: string;
  fileName: string;
  contentType: string;
  pdfBase64: string;
  pdfKind: "rendered-html" | "official-pdf";
  officialPdf: boolean;
  pdfUrl?: string;
  extractUrl?: string;
  htmlBase64?: string;
  warnings?: string[];
  source: "manz";
}
