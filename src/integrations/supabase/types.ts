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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged: boolean
          body: string | null
          created_at: string
          id: string
          patient_id: string
          requires_review: boolean
          review_note: string | null
          review_state: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean
          body?: string | null
          created_at?: string
          id?: string
          patient_id: string
          requires_review?: boolean
          review_note?: string | null
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged?: boolean
          body?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          requires_review?: boolean
          review_note?: string | null
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_reviews: {
        Row: {
          action: string
          alert_id: string | null
          created_at: string
          id: string
          note: string | null
          patient_id: string
          reviewer_id: string | null
          reviewer_name: string | null
        }
        Insert: {
          action?: string
          alert_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          patient_id: string
          reviewer_id?: string | null
          reviewer_name?: string | null
        }
        Update: {
          action?: string
          alert_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          patient_id?: string
          reviewer_id?: string | null
          reviewer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_reviews_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          activity_steps: number | null
          check_date: string
          created_at: string
          deviations: Json
          drift_band: string
          drift_score: number
          id: string
          patient_id: string
          reaction_mean_ms: number | null
          reaction_median_ms: number | null
          source: string
          symptoms: Json
          vitals: Json
          voice_jitter: number | null
          voice_status: string
        }
        Insert: {
          activity_steps?: number | null
          check_date?: string
          created_at?: string
          deviations?: Json
          drift_band?: string
          drift_score?: number
          id?: string
          patient_id: string
          reaction_mean_ms?: number | null
          reaction_median_ms?: number | null
          source?: string
          symptoms?: Json
          vitals?: Json
          voice_jitter?: number | null
          voice_status?: string
        }
        Update: {
          activity_steps?: number | null
          check_date?: string
          created_at?: string
          deviations?: Json
          drift_band?: string
          drift_score?: number
          id?: string
          patient_id?: string
          reaction_mean_ms?: number | null
          reaction_median_ms?: number | null
          source?: string
          symptoms?: Json
          vitals?: Json
          voice_jitter?: number | null
          voice_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          age: number | null
          baseline_profile: string
          created_at: string
          drift_score: number
          id: string
          is_demo: boolean
          last_check_at: string | null
          name: string
          sex: string | null
          status: string
          village: string | null
        }
        Insert: {
          age?: number | null
          baseline_profile?: string
          created_at?: string
          drift_score?: number
          id?: string
          is_demo?: boolean
          last_check_at?: string | null
          name: string
          sex?: string | null
          status?: string
          village?: string | null
        }
        Update: {
          age?: number | null
          baseline_profile?: string
          created_at?: string
          drift_score?: number
          id?: string
          is_demo?: boolean
          last_check_at?: string | null
          name?: string
          sex?: string | null
          status?: string
          village?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          best_streak: number
          consent_given: boolean
          consent_revoked_at: string | null
          created_at: string
          full_name: string | null
          id: string
          language: string
          linked_patient_id: string | null
          reminder_channel: string
          reminder_contact: string | null
          reminder_enabled: boolean
          reminder_time: string
          role: string
        }
        Insert: {
          best_streak?: number
          consent_given?: boolean
          consent_revoked_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          linked_patient_id?: string | null
          reminder_channel?: string
          reminder_contact?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          role?: string
        }
        Update: {
          best_streak?: number
          consent_given?: boolean
          consent_revoked_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          linked_patient_id?: string | null
          reminder_channel?: string
          reminder_contact?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          role?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          facility: string | null
          id: string
          patient_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility?: string | null
          id?: string
          patient_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility?: string | null
          id?: string
          patient_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
