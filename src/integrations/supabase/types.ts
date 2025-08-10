export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      dataset_insights: {
        Row: {
          created_at: string | null
          created_by: string | null
          dataset_id: string
          id: string
          kind: string | null
          payload: Json
          severity: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dataset_id: string
          id?: string
          kind?: string | null
          payload: Json
          severity?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dataset_id?: string
          id?: string
          kind?: string | null
          payload?: Json
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_insights_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_models: {
        Row: {
          created_at: string
          created_by: string | null
          dataset_id: string
          id: string
          model: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dataset_id: string
          id?: string
          model?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dataset_id?: string
          id?: string
          model?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_models_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_rows: {
        Row: {
          dataset_id: string | null
          row: Json
        }
        Insert: {
          dataset_id?: string | null
          row: Json
        }
        Update: {
          dataset_id?: string | null
          row?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dataset_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          columns: Json
          created_at: string
          created_by: string | null
          id: string
          last_sync_at: string | null
          name: string
          row_count: number
          source_type: string
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          name: string
          row_count?: number
          source_type?: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_sync_at?: string | null
          name?: string
          row_count?: number
          source_type?: string
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      monday_boards: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          name: string | null
          state: string | null
          updated_at: string
          workspace: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id: number
          name?: string | null
          state?: string | null
          updated_at?: string
          workspace?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: number
          name?: string | null
          state?: string | null
          updated_at?: string
          workspace?: string | null
        }
        Relationships: []
      }
      monday_files: {
        Row: {
          asset_id: number
          board_id: number | null
          created_at: string
          created_by: string | null
          file_size: number | null
          file_type: string | null
          item_id: number
          mime_type: string | null
          name: string | null
          public_url: string | null
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          asset_id: number
          board_id?: number | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_type?: string | null
          item_id: number
          mime_type?: string | null
          name?: string | null
          public_url?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          asset_id?: number
          board_id?: number | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_type?: string | null
          item_id?: number
          mime_type?: string | null
          name?: string | null
          public_url?: string | null
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monday_files_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "monday_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monday_files_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "monday_items_flat"
            referencedColumns: ["item_id"]
          },
        ]
      }
      monday_items: {
        Row: {
          board_id: number
          column_values: Json | null
          created_at: string
          created_by: string | null
          group_id: string | null
          id: number
          monday_created_at: string | null
          monday_updated_at: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          board_id: number
          column_values?: Json | null
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id: number
          monday_created_at?: string | null
          monday_updated_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          board_id?: number
          column_values?: Json | null
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: number
          monday_created_at?: string | null
          monday_updated_at?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monday_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "monday_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      monday_sync_logs: {
        Row: {
          board_ids: number[] | null
          created_at: string
          errors: Json | null
          finished_at: string | null
          id: string
          inserted_rows: number | null
          message: string | null
          meta: Json | null
          started_at: string | null
          status: string
          type: string | null
          unchanged_rows: number | null
          updated_at: string
          updated_rows: number | null
        }
        Insert: {
          board_ids?: number[] | null
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          inserted_rows?: number | null
          message?: string | null
          meta?: Json | null
          started_at?: string | null
          status: string
          type?: string | null
          unchanged_rows?: number | null
          updated_at?: string
          updated_rows?: number | null
        }
        Update: {
          board_ids?: number[] | null
          created_at?: string
          errors?: Json | null
          finished_at?: string | null
          id?: string
          inserted_rows?: number | null
          message?: string | null
          meta?: Json | null
          started_at?: string | null
          status?: string
          type?: string | null
          unchanged_rows?: number | null
          updated_at?: string
          updated_rows?: number | null
        }
        Relationships: []
      }
      semantic_models: {
        Row: {
          board_id: number
          created_at: string
          created_by: string | null
          date_column: string | null
          dimensions: Json
          glossary: Json
          id: string
          metrics: Json
          name: string
          updated_at: string
        }
        Insert: {
          board_id: number
          created_at?: string
          created_by?: string | null
          date_column?: string | null
          dimensions?: Json
          glossary?: Json
          id?: string
          metrics?: Json
          name: string
          updated_at?: string
        }
        Update: {
          board_id?: number
          created_at?: string
          created_by?: string | null
          date_column?: string | null
          dimensions?: Json
          glossary?: Json
          id?: string
          metrics?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_sources: {
        Row: {
          created_at: string | null
          created_by: string | null
          dataset_id: string
          enabled: boolean
          id: string
          kind: string
          ref: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dataset_id: string
          enabled?: boolean
          id?: string
          kind: string
          ref: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dataset_id?: string
          enabled?: boolean
          id?: string
          kind?: string
          ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_sources_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_datasets: {
        Row: {
          columns: string[]
          created_at: string | null
          created_by: string | null
          file_hash: string | null
          id: string
          is_revoked: boolean
          name: string
          row_count: number | null
          source_url: string | null
          storage_path: string
        }
        Insert: {
          columns: string[]
          created_at?: string | null
          created_by?: string | null
          file_hash?: string | null
          id?: string
          is_revoked?: boolean
          name: string
          row_count?: number | null
          source_url?: string | null
          storage_path: string
        }
        Update: {
          columns?: string[]
          created_at?: string | null
          created_by?: string | null
          file_hash?: string | null
          id?: string
          is_revoked?: boolean
          name?: string
          row_count?: number | null
          source_url?: string | null
          storage_path?: string
        }
        Relationships: []
      }
    }
    Views: {
      monday_items_flat: {
        Row: {
          amount: number | null
          board_id: number | null
          brand: string | null
          client: string | null
          country: string | null
          created_at: string | null
          date: string | null
          date_to: string | null
          item_id: number | null
          item_name: string | null
          owner: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: never
          board_id?: number | null
          brand?: never
          client?: never
          country?: never
          created_at?: string | null
          date?: never
          date_to?: never
          item_id?: number | null
          item_name?: string | null
          owner?: never
          status?: never
          updated_at?: string | null
        }
        Update: {
          amount?: never
          board_id?: number | null
          brand?: never
          client?: never
          country?: never
          created_at?: string | null
          date?: never
          date_to?: never
          item_id?: number | null
          item_name?: string | null
          owner?: never
          status?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monday_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "monday_boards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_dataset: {
        Args: {
          p_dataset_id: string
          p_metrics: string[]
          p_dimensions?: string[]
          p_filters?: Json
          p_date_from?: string
          p_date_to?: string
          p_date_field?: string
          p_limit?: number
        }
        Returns: {
          rows: Json
          sql: string
        }[]
      }
      aggregate_items: {
        Args: {
          p_board_id: number
          p_metrics: string[]
          p_dimensions: string[]
          p_filters?: Json
          p_date_from?: string
          p_date_to?: string
          p_date_field?: string
          p_limit?: number
        }
        Returns: {
          rows: Json[]
          sql: string
        }[]
      }
      monday_cv_text: {
        Args: { colvals: Json; col_id: string }
        Returns: string
      }
      monday_cv_value: {
        Args: { colvals: Json; col_id: string }
        Returns: Json
      }
      revoke_dataset_access: {
        Args: { p_dataset_id: string; p_revoke?: boolean }
        Returns: undefined
      }
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
