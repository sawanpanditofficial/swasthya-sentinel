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
      access_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_org: string | null
          actor_role: string
          created_at: string
          detail: string | null
          id: string
          patient_id: string
          scope: string
          via: string
        }
        Insert: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_org?: string | null
          actor_role?: string
          created_at?: string
          detail?: string | null
          id?: string
          patient_id: string
          scope?: string
          via?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_org?: string | null
          actor_role?: string
          created_at?: string
          detail?: string | null
          id?: string
          patient_id?: string
          scope?: string
          via?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      allergies: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          reaction: string | null
          severity: string
          source: string
          substance: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          reaction?: string | null
          severity?: string
          source?: string
          substance: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          reaction?: string | null
          severity?: string
          source?: string
          substance?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_patient_id_fkey"
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
      consent_events: {
        Row: {
          actor: string
          actor_name: string | null
          created_at: string
          granted: boolean
          id: string
          note: string | null
          profile_id: string
          scope: string
        }
        Insert: {
          actor?: string
          actor_name?: string | null
          created_at?: string
          granted: boolean
          id?: string
          note?: string | null
          profile_id: string
          scope?: string
        }
        Update: {
          actor?: string
          actor_name?: string | null
          created_at?: string
          granted?: boolean
          id?: string
          note?: string | null
          profile_id?: string
          scope?: string
        }
        Relationships: []
      }
      delivery_attempts: {
        Row: {
          channel: string
          contact: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel?: string
          contact?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          contact?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      disaster_events: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean
          kind: string
          name: string
          note: string | null
          region: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean
          kind?: string
          name: string
          note?: string | null
          region?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean
          kind?: string
          name?: string
          note?: string | null
          region?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      emergency_access_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          label: string | null
          patient_id: string
          revoked: boolean
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          patient_id: string
          revoked?: boolean
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          patient_id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_access_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          patient_id: string
          phone: string
          priority: number
          relationship: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          patient_id: string
          phone: string
          priority?: number
          relationship?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          patient_id?: string
          phone?: string
          priority?: number
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_profiles: {
        Row: {
          address: string | null
          ai_risk_flags: Json
          ai_summary: string | null
          ai_summary_at: string | null
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          emergency_code: string
          gender: string | null
          id: string
          offline_enabled: boolean
          patient_id: string
          risk_level: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_risk_flags?: Json
          ai_summary?: string | null
          ai_summary_at?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_code?: string
          gender?: string | null
          id?: string
          offline_enabled?: boolean
          patient_id: string
          risk_level?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_risk_flags?: Json
          ai_summary?: string | null
          ai_summary_at?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_code?: string
          gender?: string | null
          id?: string
          offline_enabled?: boolean
          patient_id?: string
          risk_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
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
      hospitals: {
        Row: {
          beds_available: number
          beds_total: number
          created_at: string
          district: string | null
          has_icu: boolean
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          beds_available?: number
          beds_total?: number
          created_at?: string
          district?: string | null
          has_icu?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          beds_available?: number
          beds_total?: number
          created_at?: string
          district?: string | null
          has_icu?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medical_conditions: {
        Row: {
          created_at: string
          diagnosed_on: string | null
          id: string
          name: string
          notes: string | null
          patient_id: string
          severity: string
          source: string
        }
        Insert: {
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          name: string
          notes?: string | null
          patient_id: string
          severity?: string
          source?: string
        }
        Update: {
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          severity?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_documents: {
        Row: {
          created_at: string
          extract_error: string | null
          extracted: Json
          file_name: string
          id: string
          mime_type: string | null
          patient_id: string
          status: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          extract_error?: string | null
          extracted?: Json
          file_name: string
          id?: string
          mime_type?: string | null
          patient_id: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          extract_error?: string | null
          extracted?: Json
          file_name?: string
          id?: string
          mime_type?: string | null
          patient_id?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          dosage: string | null
          frequency: string | null
          id: string
          name: string
          patient_id: string
          source: string
          started_on: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          name: string
          patient_id: string
          source?: string
          started_on?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          id?: string
          name?: string
          patient_id?: string
          source?: string
          started_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_disaster_status: {
        Row: {
          assigned_to: string | null
          created_at: string
          disaster_id: string
          hospital_id: string | null
          id: string
          note: string | null
          patient_id: string
          risk_level: string
          triage_status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          disaster_id: string
          hospital_id?: string | null
          id?: string
          note?: string | null
          patient_id: string
          risk_level?: string
          triage_status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          disaster_id?: string
          hospital_id?: string | null
          id?: string
          note?: string | null
          patient_id?: string
          risk_level?: string
          triage_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_disaster_status_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disaster_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_disaster_status_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_disaster_status_patient_id_fkey"
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
          consent_activity: boolean
          consent_given: boolean
          consent_reaction: boolean
          consent_revoked_at: string | null
          consent_symptoms: boolean
          consent_vitals: boolean
          consent_voice: boolean
          created_at: string
          full_name: string | null
          guardian_name: string | null
          guardian_relation: string | null
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
          consent_activity?: boolean
          consent_given?: boolean
          consent_reaction?: boolean
          consent_revoked_at?: string | null
          consent_symptoms?: boolean
          consent_vitals?: boolean
          consent_voice?: boolean
          created_at?: string
          full_name?: string | null
          guardian_name?: string | null
          guardian_relation?: string | null
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
          consent_activity?: boolean
          consent_given?: boolean
          consent_reaction?: boolean
          consent_revoked_at?: string | null
          consent_symptoms?: boolean
          consent_vitals?: boolean
          consent_voice?: boolean
          created_at?: string
          full_name?: string | null
          guardian_name?: string | null
          guardian_relation?: string | null
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
      surgeries: {
        Row: {
          created_at: string
          hospital: string | null
          id: string
          notes: string | null
          patient_id: string
          performed_on: string | null
          procedure: string
          source: string
        }
        Insert: {
          created_at?: string
          hospital?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          performed_on?: string | null
          procedure: string
          source?: string
        }
        Update: {
          created_at?: string
          hospital?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          performed_on?: string | null
          procedure?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "surgeries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      worker_assignments: {
        Row: {
          can_escalate: boolean
          can_review: boolean
          created_at: string
          id: string
          note: string | null
          updated_at: string
          village: string
          worker_id: string
        }
        Insert: {
          can_escalate?: boolean
          can_review?: boolean
          created_at?: string
          id?: string
          note?: string | null
          updated_at?: string
          village: string
          worker_id: string
        }
        Update: {
          can_escalate?: boolean
          can_review?: boolean
          created_at?: string
          id?: string
          note?: string | null
          updated_at?: string
          village?: string
          worker_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_escalate_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_shadow: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_review_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_emergency_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "patient"
        | "asha"
        | "doctor"
        | "responder"
        | "hospital"
        | "coordinator"
        | "admin"
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
    Enums: {
      app_role: [
        "patient",
        "asha",
        "doctor",
        "responder",
        "hospital",
        "coordinator",
        "admin",
      ],
    },
  },
} as const
