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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      candidates: {
        Row: {
          application_date: string
          candidate_code: string
          created_at: string
          full_name: string
          hiring_cost: number
          id: string
          interview_status: string
          is_demo: boolean
          job_id: string | null
          joined_date: string | null
          joining_status: string
          offer_status: string
          rejection_reason: string | null
          screening_status: string
          source_id: string | null
          stage: string
        }
        Insert: {
          application_date: string
          candidate_code: string
          created_at?: string
          full_name: string
          hiring_cost?: number
          id?: string
          interview_status?: string
          is_demo?: boolean
          job_id?: string | null
          joined_date?: string | null
          joining_status?: string
          offer_status?: string
          rejection_reason?: string | null
          screening_status?: string
          source_id?: string | null
          stage?: string
        }
        Update: {
          application_date?: string
          candidate_code?: string
          created_at?: string
          full_name?: string
          hiring_cost?: number
          id?: string
          interview_status?: string
          is_demo?: boolean
          job_id?: string | null
          joined_date?: string | null
          joining_status?: string
          offer_status?: string
          rejection_reason?: string | null
          screening_status?: string
          source_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "recruitment_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      column_mappings: {
        Row: {
          created_at: string
          id: string
          source_column: string
          target_column: string
          target_entity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_column: string
          target_column: string
          target_entity: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          source_column?: string
          target_column?: string
          target_entity?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          attrition_status: string
          created_at: string
          department_id: string | null
          employee_code: string
          employment_type: string
          exit_date: string | null
          exit_reason: string | null
          exit_type: string | null
          full_name: string
          hire_date: string
          id: string
          is_demo: boolean
          job_title: string
          location: string
          manager_changes: number
          manager_name: string | null
          overtime_hours: number
          performance_rating: number | null
          promotion_count: number
          salary: number
          satisfaction_score: number | null
          updated_at: string
          workload_score: number | null
        }
        Insert: {
          attrition_status?: string
          created_at?: string
          department_id?: string | null
          employee_code: string
          employment_type?: string
          exit_date?: string | null
          exit_reason?: string | null
          exit_type?: string | null
          full_name: string
          hire_date: string
          id?: string
          is_demo?: boolean
          job_title: string
          location: string
          manager_changes?: number
          manager_name?: string | null
          overtime_hours?: number
          performance_rating?: number | null
          promotion_count?: number
          salary?: number
          satisfaction_score?: number | null
          updated_at?: string
          workload_score?: number | null
        }
        Update: {
          attrition_status?: string
          created_at?: string
          department_id?: string | null
          employee_code?: string
          employment_type?: string
          exit_date?: string | null
          exit_reason?: string | null
          exit_type?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          is_demo?: boolean
          job_title?: string
          location?: string
          manager_changes?: number
          manager_name?: string | null
          overtime_hours?: number
          performance_rating?: number | null
          promotion_count?: number
          salary?: number
          satisfaction_score?: number | null
          updated_at?: string
          workload_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_reports: {
        Row: {
          created_at: string
          filters: Json
          id: string
          insights: Json
          metrics: Json
          report_type: string
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          insights?: Json
          metrics?: Json
          report_type: string
          summary?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          insights?: Json
          metrics?: Json
          report_type?: string
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      job_openings: {
        Row: {
          closing_date: string | null
          created_at: string
          department_id: string | null
          employment_type: string
          id: string
          is_demo: boolean
          job_code: string
          job_title: string
          location: string
          opening_date: string
          status: string
          target_hires: number
        }
        Insert: {
          closing_date?: string | null
          created_at?: string
          department_id?: string | null
          employment_type?: string
          id?: string
          is_demo?: boolean
          job_code: string
          job_title: string
          location: string
          opening_date: string
          status?: string
          target_hires?: number
        }
        Update: {
          closing_date?: string | null
          created_at?: string
          department_id?: string | null
          employment_type?: string
          id?: string
          is_demo?: boolean
          job_code?: string
          job_title?: string
          location?: string
          opening_date?: string
          status?: string
          target_hires?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruitment_sources: {
        Row: {
          channel_type: string
          cost_per_application: number
          created_at: string
          id: string
          name: string
        }
        Insert: {
          channel_type?: string
          cost_per_application?: number
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          channel_type?: string
          cost_per_application?: number
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      uploaded_datasets: {
        Row: {
          column_mapping: Json
          created_at: string
          file_name: string
          file_type: string
          id: string
          imported_rows: number
          row_count: number
          status: string
          target_entity: string
          user_id: string
          validation_report: Json
        }
        Insert: {
          column_mapping?: Json
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          imported_rows?: number
          row_count?: number
          status?: string
          target_entity: string
          user_id?: string
          validation_report?: Json
        }
        Update: {
          column_mapping?: Json
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          imported_rows?: number
          row_count?: number
          status?: string
          target_entity?: string
          user_id?: string
          validation_report?: Json
        }
        Relationships: []
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
      workforce_targets: {
        Row: {
          created_at: string
          department_id: string
          id: string
          period: string
          required_headcount: number
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          period: string
          required_headcount: number
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          period?: string
          required_headcount?: number
        }
        Relationships: [
          {
            foreignKeyName: "workforce_targets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "hr_manager" | "recruiter" | "analyst" | "executive"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "hr_manager", "recruiter", "analyst", "executive"],
    },
  },
} as const
