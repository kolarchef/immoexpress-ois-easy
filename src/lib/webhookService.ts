import { sendAction } from "@/lib/sendAction";

/**
 * Centralized Webhook Service for all Make.com actions.
 * Each function maps to a specific actionId and sends a standardized payload.
 *
 * Shape sent to Make.com:
 * { "actionId": "<ID>", "data": { "user_id": "...", "timestamp": "...", ...extra } }
 */

// ─── Types ───────────────────────────────────────────────────────────
export interface ObjektPayload {
  titel?: string;
  objektnummer?: string;
  bezirk?: string;
  plz?: string;
  ort?: string;
  strasse?: string;
  hnr?: string;
  objektart?: string;
  verkaufsart?: string;
  kaufpreis?: string;
  miete?: string;
  flaeche?: string;
  zimmer?: string;
  provisionsstellung?: string;
  kaeufer_provision?: string;
  verkaeufer_provision?: string;
}

export interface TextePayload {
  ki_expose?: string;
  kurzbeschreibung?: string;
  beschreibung?: string;
  sprachnotizen?: string;
  notebook_lm?: string;
}

export interface PdfWebhookParams {
  objekt: ObjektPayload;
  texte: TextePayload;
  image_urls: string[];
  bilder_anzahl: number;
}

export interface VideoWebhookParams extends PdfWebhookParams {
  template: string;
  video_format: "16:9" | "9:16";
}

// ─── Action IDs (single source of truth) ─────────────────────────────
export const ACTION_IDS = {
  PDF_QUICK: "expose_pdf_quick",
  PDF_CLASSIC: "expose_pdf_classic",
  PDF_INVESTMENT: "expose_pdf_investment",
  VIDEO_KI: "expose_video_ki",
  NOTIZ_SPEICHERN: "notiz_speichern",
  GET_DISTRICT_STATS: "get_district_stats",
  GET_SCHOOL_DATA: "get_school_data",
  GET_TRANSIT_LIVE: "get_transit_live",
  FINANCE_TRANSFER: "finance_transfer",
  IMMOZ_SYNC: "immoz_sync",
} as const;

// ─── Webhook Actions ─────────────────────────────────────────────────

/** Send a PDF generation request (Quick-Check) */
export const sendPdfQuick = (params: PdfWebhookParams) =>
  sendAction(ACTION_IDS.PDF_QUICK, params);

/** Send a PDF generation request (Classic / Exposé-Style) */
export const sendPdfClassic = (params: PdfWebhookParams) =>
  sendAction(ACTION_IDS.PDF_CLASSIC, params);

/** Send a PDF generation request (Investment-Analyse) */
export const sendPdfInvestment = (params: PdfWebhookParams) =>
  sendAction(ACTION_IDS.PDF_INVESTMENT, params);

/** Send a KI Video Rundgang request */
export const sendVideoKi = (params: VideoWebhookParams) =>
  sendAction(ACTION_IDS.VIDEO_KI, params);

/** Save a note / analysis text */
export const sendNotizSpeichern = (text: string, quelle = "app") =>
  sendAction(ACTION_IDS.NOTIZ_SPEICHERN, { text, quelle });

/** KiezCheck: fetch district statistics */
export const sendGetDistrictStats = (bezirk: string) =>
  sendAction(ACTION_IDS.GET_DISTRICT_STATS, { bezirk });

/** KiezCheck: fetch school data */
export const sendGetSchoolData = (bezirk: string) =>
  sendAction(ACTION_IDS.GET_SCHOOL_DATA, { bezirk });

/** KiezCheck: fetch live transit data */
export const sendGetTransitLive = (bezirk: string) =>
  sendAction(ACTION_IDS.GET_TRANSIT_LIVE, { bezirk });
