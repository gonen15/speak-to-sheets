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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      aggregate_cache: {
        Row: {
          created_at: string | null
          id: string
          rows: Json
          signature: string
          sql: string | null
          ttl_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rows: Json
          signature: string
          sql?: string | null
          ttl_at: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rows?: Json
          signature?: string
          sql?: string | null
          ttl_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_column_mappings: {
        Row: {
          column_name: string
          confidence: number
          dataset_id: string
          target: string
        }
        Insert: {
          column_name: string
          confidence?: number
          dataset_id: string
          target: string
        }
        Update: {
          column_name?: string
          confidence?: number
          dataset_id?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_column_mappings_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "master_flat"
            referencedColumns: ["dataset_id"]
          },
          {
            foreignKeyName: "ai_column_mappings_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          happened_at: string | null
          id: string
          payload: Json
          rule_id: string | null
        }
        Insert: {
          happened_at?: string | null
          id?: string
          payload: Json
          rule_id?: string | null
        }
        Update: {
          happened_at?: string | null
          id?: string
          payload?: Json
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          channels: Json
          condition: Json
          created_at: string | null
          created_by: string | null
          dimension: string | null
          enabled: boolean
          id: string
          metric: string
          name: string
          ref_id: string
          source: string
        }
        Insert: {
          channels?: Json
          condition?: Json
          created_at?: string | null
          created_by?: string | null
          dimension?: string | null
          enabled?: boolean
          id?: string
          metric: string
          name: string
          ref_id: string
          source: string
        }
        Update: {
          channels?: Json
          condition?: Json
          created_at?: string | null
          created_by?: string | null
          dimension?: string | null
          enabled?: boolean
          id?: string
          metric?: string
          name?: string
          ref_id?: string
          source?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          val: string
        }
        Insert: {
          key: string
          updated_at?: string
          val: string
        }
        Update: {
          key?: string
          updated_at?: string
          val?: string
        }
        Relationships: []
      }
      data_catalog: {
        Row: {
          columns: Json
          dataset_id: string
          updated_at: string | null
        }
        Insert: {
          columns?: Json
          dataset_id: string
          updated_at?: string | null
        }
        Update: {
          columns?: Json
          dataset_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_catalog_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "master_flat"
            referencedColumns: ["dataset_id"]
          },
          {
            foreignKeyName: "data_catalog_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: true
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      data_source_datasets: {
        Row: {
          dataset_id: string
          source_id: string
        }
        Insert: {
          dataset_id: string
          source_id: string
        }
        Update: {
          dataset_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_source_datasets_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "master_flat"
            referencedColumns: ["dataset_id"]
          },
          {
            foreignKeyName: "data_source_datasets_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_source_datasets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string
          id: string
          is_saved: boolean
          kind: string
          last_synced_at: string | null
          name: string
          sync_enabled: boolean
          sync_interval_mins: number
        }
        Insert: {
          config: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_saved?: boolean
          kind: string
          last_synced_at?: string | null
          name: string
          sync_enabled?: boolean
          sync_interval_mins?: number
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_saved?: boolean
          kind?: string
          last_synced_at?: string | null
          name?: string
          sync_enabled?: boolean
          sync_interval_mins?: number
        }
        Relationships: []
      }
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
            referencedRelation: "master_flat"
            referencedColumns: ["dataset_id"]
          },
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
            referencedRelation: "master_flat"
            referencedColumns: ["dataset_id"]
          },
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
      exec_goal_snapshots: {
        Row: {
          computed_at: string | null
          current_value: number
          forecast: number | null
          goal_id: string | null
          id: string
          on_track: boolean | null
          period_end: string
          period_start: string
          target: number
        }
        Insert: {
          computed_at?: string | null
          current_value?: number
          forecast?: number | null
          goal_id?: string | null
          id?: string
          on_track?: boolean | null
          period_end: string
          period_start: string
          target: number
        }
        Update: {
          computed_at?: string | null
          current_value?: number
          forecast?: number | null
          goal_id?: string | null
          id?: string
          on_track?: boolean | null
          period_end?: string
          period_start?: string
          target?: number
        }
        Relationships: [
          {
            foreignKeyName: "exec_goal_snapshots_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "exec_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_field: string | null
          department: string
          end_date: string | null
          id: string
          label: string
          metric_key: string
          notify: boolean | null
          period: string
          ref_id: string
          source: string
          start_date: string | null
          target: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_field?: string | null
          department: string
          end_date?: string | null
          id?: string
          label: string
          metric_key: string
          notify?: boolean | null
          period: string
          ref_id: string
          source: string
          start_date?: string | null
          target: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_field?: string | null
          department?: string
          end_date?: string | null
          id?: string
          label?: string
          metric_key?: string
          notify?: boolean | null
          period?: string
          ref_id?: string
          source?: string
          start_date?: string | null
          target?: number
        }
        Relationships: []
      }
      inventory: {
        Row: {
          average_monthly_sales: number | null
          brand: string | null
          category: string | null
          created_at: string
          created_by: string | null
          current_stock: number
          id: string
          minimum_stock: number
          product_name: string
          updated_at: string
        }
        Insert: {
          average_monthly_sales?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_stock?: number
          id?: string
          minimum_stock?: number
          product_name: string
          updated_at?: string
        }
        Update: {
          average_monthly_sales?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_stock?: number
          id?: string
          minimum_stock?: number
          product_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      monday_board_mappings: {
        Row: {
          board_id: number
          brand_id: string | null
          client_id: string | null
          country_id: string | null
          date_id: string | null
          numbers_id: string | null
          person_id: string | null
          status_id: string | null
          timeline_id: string | null
        }
        Insert: {
          board_id: number
          brand_id?: string | null
          client_id?: string | null
          country_id?: string | null
          date_id?: string | null
          numbers_id?: string | null
          person_id?: string | null
          status_id?: string | null
          timeline_id?: string | null
        }
        Update: {
          board_id?: number
          brand_id?: string | null
          client_id?: string | null
          country_id?: string | null
          date_id?: string | null
          numbers_id?: string | null
          person_id?: string | null
          status_id?: string | null
          timeline_id?: string | null
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
      sales_data: {
        Row: {
          account_manager: string | null
          category: string | null
          customer_id: string | null
          customer_name: string | null
          delivery_date: string | null
          month: number | null
          order_date: string | null
          order_id: string | null
          order_status: string | null
          product_description: string | null
          quantity: number | null
          sku: string | null
          total_after_discount: number | null
          total_eur: number | null
          total_ils: number | null
          total_order_currency: number | null
          unit_price_ils: number | null
          unit_price_raw: number | null
          year: number | null
        }
        Insert: {
          account_manager?: string | null
          category?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivery_date?: string | null
          month?: number | null
          order_date?: string | null
          order_id?: string | null
          order_status?: string | null
          product_description?: string | null
          quantity?: number | null
          sku?: string | null
          total_after_discount?: number | null
          total_eur?: number | null
          total_ils?: number | null
          total_order_currency?: number | null
          unit_price_ils?: number | null
          unit_price_raw?: number | null
          year?: number | null
        }
        Update: {
          account_manager?: string | null
          category?: string | null
          customer_id?: string | null
          customer_name?: string | null
          delivery_date?: string | null
          month?: number | null
          order_date?: string | null
          order_id?: string | null
          order_status?: string | null
          product_description?: string | null
          quantity?: number | null
          sku?: string | null
          total_after_discount?: number | null
          total_eur?: number | null
          total_ils?: number | null
          total_order_currency?: number | null
          unit_price_ils?: number | null
          unit_price_raw?: number | null
          year?: number | null
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          created_at: string
          created_by: string | null
          dashboard_type: string
          filter_data: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dashboard_type?: string
          filter_data?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dashboard_type?: string
          filter_data?: Json
          id?: string
          name?: string
          updated_at?: string
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
            referencedRelation: "master_flat"
            referencedColumns: ["dataset_id"]
          },
          {
            foreignKeyName: "sync_sources_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_job_items: {
        Row: {
          action: string | null
          bytes: number | null
          created_at: string | null
          dataset_id: string | null
          error: string | null
          file_id: string | null
          finished_at: string | null
          id: number
          job_id: string
          mime: string | null
          name: string
          state: string
        }
        Insert: {
          action?: string | null
          bytes?: number | null
          created_at?: string | null
          dataset_id?: string | null
          error?: string | null
          file_id?: string | null
          finished_at?: string | null
          id?: number
          job_id: string
          mime?: string | null
          name: string
          state?: string
        }
        Update: {
          action?: string | null
          bytes?: number | null
          created_at?: string | null
          dataset_id?: string | null
          error?: string | null
          file_id?: string | null
          finished_at?: string | null
          id?: number
          job_id?: string
          mime?: string | null
          name?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "upload_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_job_logs: {
        Row: {
          ctx: Json | null
          id: number
          job_id: string | null
          level: string
          message: string
          ts: string | null
        }
        Insert: {
          ctx?: Json | null
          id?: number
          job_id?: string | null
          level?: string
          message: string
          ts?: string | null
        }
        Update: {
          ctx?: Json | null
          id?: number
          job_id?: string | null
          level?: string
          message?: string
          ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "upload_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_jobs: {
        Row: {
          action: string | null
          created_at: string | null
          current_file: string | null
          dataset_id: string | null
          done_items: number | null
          error: string | null
          finished_at: string | null
          id: string
          mime: string | null
          name: string
          progress: number
          size_bytes: number | null
          source_kind: string
          source_ref: string | null
          started_at: string | null
          stats: Json
          status: string
          total_items: number | null
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          current_file?: string | null
          dataset_id?: string | null
          done_items?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          mime?: string | null
          name: string
          progress?: number
          size_bytes?: number | null
          source_kind: string
          source_ref?: string | null
          started_at?: string | null
          stats?: Json
          status?: string
          total_items?: number | null
          user_id?: string
        }
        Update: {
          action?: string | null
          created_at?: string | null
          current_file?: string | null
          dataset_id?: string | null
          done_items?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          mime?: string | null
          name?: string
          progress?: number
          size_bytes?: number | null
          source_kind?: string
          source_ref?: string | null
          started_at?: string | null
          stats?: Json
          status?: string
          total_items?: number | null
          user_id?: string
        }
        Relationships: []
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
          original_name: string | null
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
          original_name?: string | null
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
          original_name?: string | null
          row_count?: number | null
          source_url?: string | null
          storage_path?: string
        }
        Relationships: []
      }
      user_dashboards: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          owner: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          owner?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          owner?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          user_id: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          user_id?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      dataset_rows_flat: {
        Row: {
          dataset_id: string | null
          row_json: Json | null
        }
        Insert: {
          dataset_id?: string | null
          row_json?: Json | null
        }
        Update: {
          dataset_id?: string | null
          row_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dataset_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "master_flat"
            referencedColumns: ["dataset_id"]
          },
          {
            foreignKeyName: "dataset_rows_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "uploaded_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      master_flat: {
        Row: {
          amount: number | null
          customer: string | null
          dataset_id: string | null
          date: string | null
          department: string | null
          raw_row: Json | null
          source_name: string | null
          status: string | null
        }
        Relationships: []
      }
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
      vw_kpi_totals: {
        Row: {
          amount_total_ils: number | null
          avg_order: number | null
          orders: number | null
          rows_count: number | null
        }
        Relationships: []
      }
      vw_sales_by_month: {
        Row: {
          amount_total_ils: number | null
          month: number | null
          orders: number | null
          year: number | null
        }
        Relationships: []
      }
      vw_sales_by_status: {
        Row: {
          amount_total_ils: number | null
          order_status: string | null
          orders: number | null
        }
        Relationships: []
      }
      vw_sales_src: {
        Row: {
          amount_nis: number | null
          customer_name: string | null
          month: number | null
          order_date: string | null
          order_id: string | null
          order_status: string | null
          sales_owner: string | null
          year: number | null
        }
        Relationships: []
      }
      vw_top_customers: {
        Row: {
          amount_total_ils: number | null
          customer_name: string | null
          orders: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_dataset: {
        Args: {
          p_dataset_id: string
          p_date_field?: string
          p_date_from?: string
          p_date_to?: string
          p_dimensions?: string[]
          p_filters?: Json
          p_limit?: number
          p_metrics: string[]
        }
        Returns: {
          rows: Json
          sql: string
        }[]
      }
      aggregate_items: {
        Args: {
          p_board_id: number
          p_date_field?: string
          p_date_from?: string
          p_date_to?: string
          p_dimensions: string[]
          p_filters?: Json
          p_limit?: number
          p_metrics: string[]
        }
        Returns: {
          rows: Json[]
          sql: string
        }[]
      }
      aggregate_master: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_dimensions?: string[]
          p_filters?: Json
          p_limit?: number
          p_metrics: string[]
        }
        Returns: {
          rows: Json
          sql: string
        }[]
      }
      aggregate_sales: {
        Args: {
          p_dataset: string
          p_date_from?: string
          p_date_to?: string
          p_dimensions?: string[]
          p_filters?: Json
          p_limit?: number
          p_metrics: string[]
        }
        Returns: {
          rows: Json
          sql: string
        }[]
      }
      app_dataset_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dataset_upsert_from_csv: {
        Args: {
          p_csv: string
          p_name: string
          p_replace?: boolean
          p_source_url?: string
        }
        Returns: {
          action: string
          dataset_id: string
        }[]
      }
      fetch_google_sheet: {
        Args: { gid?: string; sheet_id: string }
        Returns: {
          csv_data: string
        }[]
      }
      get_app_setting: {
        Args: { p_key: string }
        Returns: string
      }
      get_default_user_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_last_uploaded_dataset_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_uploaded_dataset_id: {
        Args: { p_name: string }
        Returns: string
      }
      get_user_dashboard: {
        Args: { p_name: string }
        Returns: Json
      }
      has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      list_user_dashboards: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_default: boolean
          name: string
          updated_at: string
        }[]
      }
      master_get: {
        Args: { p_dataset: string; p_row: Json; p_target: string }
        Returns: string
      }
      monday_cv_text: {
        Args: { col_id: string; colvals: Json }
        Returns: string
      }
      monday_cv_value: {
        Args: { col_id: string; colvals: Json }
        Returns: Json
      }
      monthly_by_status: {
        Args: { p_dataset: string }
        Returns: {
          rows: Json
          sql: string
        }[]
      }
      pick_amount: {
        Args: { keys: string[]; p: Json }
        Returns: number
      }
      pick_date: {
        Args: { keys: string[]; p: Json }
        Returns: string
      }
      pick_text: {
        Args: { keys: string[]; p: Json }
        Returns: string
      }
      revoke_dataset_access: {
        Args: { p_dataset_id: string; p_revoke?: boolean }
        Returns: undefined
      }
      save_user_dashboard: {
        Args: { p_config: Json; p_is_default?: boolean; p_name: string }
        Returns: string
      }
      set_app_setting: {
        Args: { p_key: string; p_val: string }
        Returns: undefined
      }
      top_customers: {
        Args: { p_dataset: string; p_limit?: number }
        Returns: {
          rows: Json
          sql: string
        }[]
      }
      try_parse_date: {
        Args: { s: string }
        Returns: string
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
