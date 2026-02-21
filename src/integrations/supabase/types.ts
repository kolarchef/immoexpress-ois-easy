export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      crm_kunden: {
        Row: {
          budget: string | null
          created_at: string
          dsgvo_einwilligung: boolean | null
          einzugsdatum: string | null
          email: string | null
          geburtsdatum: string | null
          id: string
          kaufdatum: string | null
          liste: string | null
          name: string
          newsletter_aktiv: boolean | null
          notiz: string | null
          objekt_id: string | null
          ort: string | null
          phone: string | null
          status: string | null
          sterne: number | null
          typ: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget?: string | null
          created_at?: string
          dsgvo_einwilligung?: boolean | null
          einzugsdatum?: string | null
          email?: string | null
          geburtsdatum?: string | null
          id?: string
          kaufdatum?: string | null
          liste?: string | null
          name: string
          newsletter_aktiv?: boolean | null
          notiz?: string | null
          objekt_id?: string | null
          ort?: string | null
          phone?: string | null
          status?: string | null
          sterne?: number | null
          typ?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget?: string | null
          created_at?: string
          dsgvo_einwilligung?: boolean | null
          einzugsdatum?: string | null
          email?: string | null
          geburtsdatum?: string | null
          id?: string
          kaufdatum?: string | null
          liste?: string | null
          name?: string
          newsletter_aktiv?: boolean | null
          notiz?: string | null
          objekt_id?: string | null
          ort?: string | null
          phone?: string | null
          status?: string | null
          sterne?: number | null
          typ?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_kunden_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekte"
            referencedColumns: ["id"]
          },
        ]
      }
      immoz_exporte: {
        Row: {
          anzahl: number | null
          dateiname: string | null
          erstellt_am: string
          id: string
          objekte_ids: string[] | null
          status: string | null
        }
        Insert: {
          anzahl?: number | null
          dateiname?: string | null
          erstellt_am?: string
          id?: string
          objekte_ids?: string[] | null
          status?: string | null
        }
        Update: {
          anzahl?: number | null
          dateiname?: string | null
          erstellt_am?: string
          id?: string
          objekte_ids?: string[] | null
          status?: string | null
        }
        Relationships: []
      }
      nachrichten: {
        Row: {
          created_at: string
          empfaenger_id: string | null
          gelesen: boolean | null
          id: string
          inhalt: string | null
          titel: string
          typ: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          empfaenger_id?: string | null
          gelesen?: boolean | null
          id?: string
          inhalt?: string | null
          titel: string
          typ?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          empfaenger_id?: string | null
          gelesen?: boolean | null
          id?: string
          inhalt?: string | null
          titel?: string
          typ?: string | null
          user_id?: string
        }
        Relationships: []
      }
      newsletter_kampagnen: {
        Row: {
          betreff: string
          created_at: string
          empfaenger: number | null
          gesendet_am: string | null
          id: string
          liste: string | null
          status: string | null
          text: string | null
          typ: string | null
        }
        Insert: {
          betreff: string
          created_at?: string
          empfaenger?: number | null
          gesendet_am?: string | null
          id?: string
          liste?: string | null
          status?: string | null
          text?: string | null
          typ?: string | null
        }
        Update: {
          betreff?: string
          created_at?: string
          empfaenger?: number | null
          gesendet_am?: string | null
          id?: string
          liste?: string | null
          status?: string | null
          text?: string | null
          typ?: string | null
        }
        Relationships: []
      }
      objekte: {
        Row: {
          beschreibung: string | null
          created_at: string
          flaeche_m2: number | null
          hnr: string | null
          id: string
          immoz_export_datum: string | null
          immoz_exportiert: boolean | null
          interne_notizen: string | null
          kaeufer_provision: number | null
          kaufpreis: number | null
          ki_text: string | null
          kurzinfo: string | null
          objektart: string | null
          objektnummer: string | null
          ort: string | null
          plz: string | null
          provisionsstellung: string | null
          status: string | null
          stock: string | null
          strasse: string | null
          top: string | null
          updated_at: string
          user_id: string | null
          verkaeufer_provision: number | null
          verkaufsart: string | null
          zimmer: number | null
        }
        Insert: {
          beschreibung?: string | null
          created_at?: string
          flaeche_m2?: number | null
          hnr?: string | null
          id?: string
          immoz_export_datum?: string | null
          immoz_exportiert?: boolean | null
          interne_notizen?: string | null
          kaeufer_provision?: number | null
          kaufpreis?: number | null
          ki_text?: string | null
          kurzinfo?: string | null
          objektart?: string | null
          objektnummer?: string | null
          ort?: string | null
          plz?: string | null
          provisionsstellung?: string | null
          status?: string | null
          stock?: string | null
          strasse?: string | null
          top?: string | null
          updated_at?: string
          user_id?: string | null
          verkaeufer_provision?: number | null
          verkaufsart?: string | null
          zimmer?: number | null
        }
        Update: {
          beschreibung?: string | null
          created_at?: string
          flaeche_m2?: number | null
          hnr?: string | null
          id?: string
          immoz_export_datum?: string | null
          immoz_exportiert?: boolean | null
          interne_notizen?: string | null
          kaeufer_provision?: number | null
          kaufpreis?: number | null
          ki_text?: string | null
          kurzinfo?: string | null
          objektart?: string | null
          objektnummer?: string | null
          ort?: string | null
          plz?: string | null
          provisionsstellung?: string | null
          status?: string | null
          stock?: string | null
          strasse?: string | null
          top?: string | null
          updated_at?: string
          user_id?: string | null
          verkaeufer_provision?: number | null
          verkaufsart?: string | null
          zimmer?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          imap_host: string | null
          imap_password: string | null
          imap_port: number | null
          imap_user: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          imap_host?: string | null
          imap_password?: string | null
          imap_port?: number | null
          imap_user?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          imap_host?: string | null
          imap_password?: string | null
          imap_port?: number | null
          imap_user?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      termine: {
        Row: {
          created_at: string
          datum: string
          dauer_min: number
          id: string
          kunde_id: string | null
          notiz: string | null
          ort: string | null
          titel: string
          typ: string | null
          uhrzeit: string
          updated_at: string
          user_id: string
          wichtig: boolean | null
        }
        Insert: {
          created_at?: string
          datum: string
          dauer_min?: number
          id?: string
          kunde_id?: string | null
          notiz?: string | null
          ort?: string | null
          titel: string
          typ?: string | null
          uhrzeit?: string
          updated_at?: string
          user_id: string
          wichtig?: boolean | null
        }
        Update: {
          created_at?: string
          datum?: string
          dauer_min?: number
          id?: string
          kunde_id?: string | null
          notiz?: string | null
          ort?: string | null
          titel?: string
          typ?: string | null
          uhrzeit?: string
          updated_at?: string
          user_id?: string
          wichtig?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "termine_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "crm_kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      unterlagen_anfragen: {
        Row: {
          abgeschlossen: boolean | null
          checkliste: Json
          erstellt_am: string
          id: string
          kunde_name: string
          token: string
        }
        Insert: {
          abgeschlossen?: boolean | null
          checkliste?: Json
          erstellt_am?: string
          id?: string
          kunde_name: string
          token?: string
        }
        Update: {
          abgeschlossen?: boolean | null
          checkliste?: Json
          erstellt_am?: string
          id?: string
          kunde_name?: string
          token?: string
        }
        Relationships: []
      }
      unterlagen_uploads: {
        Row: {
          anfrage_id: string | null
          dateiname: string | null
          dokument_typ: string
          erstellt_am: string
          id: string
          storage_path: string | null
        }
        Insert: {
          anfrage_id?: string | null
          dateiname?: string | null
          dokument_typ: string
          erstellt_am?: string
          id?: string
          storage_path?: string | null
        }
        Update: {
          anfrage_id?: string | null
          dateiname?: string | null
          dokument_typ?: string
          erstellt_am?: string
          id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unterlagen_uploads_anfrage_id_fkey"
            columns: ["anfrage_id"]
            isOneToOne: false
            referencedRelation: "unterlagen_anfragen"
            referencedColumns: ["id"]
          },
        ]
      }
      zinshaeuser: {
        Row: {
          adresse: string
          baujahr: number | null
          bezirk: string | null
          created_at: string
          id: string
          kaufpreis: number | null
          m2_preis: number | null
          notiz: string | null
          rendite_prozent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse: string
          baujahr?: number | null
          bezirk?: string | null
          created_at?: string
          id?: string
          kaufpreis?: number | null
          m2_preis?: number | null
          notiz?: string | null
          rendite_prozent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse?: string
          baujahr?: number | null
          bezirk?: string | null
          created_at?: string
          id?: string
          kaufpreis?: number | null
          m2_preis?: number | null
          notiz?: string | null
          rendite_prozent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
