// Path: src/integrations/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      dashboard_metrics: {
        Row: {
          available_credits: number | null
          id: string
          last_month_ghg_emissions: number | null
          total_ghg_emissions: number | null
          updated_at: string | null
        }
        Insert: {
          available_credits?: number | null
          id: string
          last_month_ghg_emissions?: number | null
          total_ghg_emissions?: number | null
          updated_at?: string | null
        }
        Update: {
          available_credits?: number | null
          id?: string
          last_month_ghg_emissions?: number | null
          total_ghg_emissions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_metrics_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_monitoring_logs: {
        Row: {
          created_at: string
          emission_value_tco2e: number
          id: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emission_value_tco2e: number
          id?: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          emission_value_tco2e?: number
          id?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emission_monitoring_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data: {
        Row: {
          credit_name: string | null
          id: number
          market_price_inr: number | null
          updated_at: string | null
        }
        Insert: {
          credit_name?: string | null
          id?: number
          market_price_inr?: number | null
          updated_at?: string | null
        }
        Update: {
          credit_name?: string | null
          id?: number
          market_price_inr?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      monthly_emissions_history: {
        Row: {
          created_at: string
          current_year_emissions: number | null
          id: number
          month: string
          previous_year_emissions: number | null
          target_emissions: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_year_emissions?: number | null
          id?: number
          month: string
          previous_year_emissions?: number | null
          target_emissions?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_year_emissions?: number | null
          id?: number
          month?: string
          previous_year_emissions?: number | null
          target_emissions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_emissions_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      // --- ADDITION: Define the new onboarding_submissions table ---
      onboarding_submissions: {
        Row: {
          id: number
          user_id: string
          submission_data: Json
          ai_estimated_emissions: number | null
          ai_allocated_credits: number | null
          ai_reasoning: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          submission_data: Json
          ai_estimated_emissions?: number | null
          ai_allocated_credits?: number | null
          ai_reasoning?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          submission_data?: Json
          ai_estimated_emissions?: number | null
          ai_allocated_credits?: number | null
          ai_reasoning?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      open_trades: {
        Row: {
          created_at: string
          current_market_price: number
          id: number
          industry_name: string | null
          no_of_credits: number
          seller_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          current_market_price: number
          id?: number
          industry_name?: string | null
          no_of_credits: number
          seller_id: string
          total_amount: number
        }
        Update: {
          created_at?: string
          current_market_price?: number
          id?: number
          industry_name?: string | null
          no_of_credits?: number
          seller_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "open_trades_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          industry_name: string | null
          updated_at: string | null
          wallet_balance: number | null
          // --- CHANGE: Add the new column ---
          onboarding_completed: boolean
        }
        Insert: {
          id: string
          industry_name?: string | null
          updated_at?: string | null
          wallet_balance?: number | null
          // --- CHANGE: Add the new column ---
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          industry_name?: string | null
          updated_at?: string | null
          wallet_balance?: number | null
          // --- CHANGE: Add the new column ---
          onboarding_completed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          buyer_id: string
          buyer_industry_name: string | null
          created_at: string
          credits: number
          id: number
          seller_id: string
          seller_industry_name: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          buyer_industry_name?: string | null
          created_at?: string
          credits: number
          id?: number
          seller_id: string
          seller_industry_name?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          buyer_industry_name?: string | null
          created_at?: string
          credits?: number
          id?: number
          seller_id?: string
          seller_industry_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never