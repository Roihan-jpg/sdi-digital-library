export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      authors: {
        Row: {
          biography: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      book_authors: {
        Row: {
          author_id: string
          author_order: number
          book_title_id: string
        }
        Insert: {
          author_id: string
          author_order?: number
          book_title_id: string
        }
        Update: {
          author_id?: string
          author_order?: number
          book_title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "book_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_catalog_availability"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "book_authors_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_summary"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "book_authors_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "book_authors_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_popular_books"
            referencedColumns: ["book_title_id"]
          },
        ]
      }
      book_copies: {
        Row: {
          acquisition_date: string | null
          acquisition_source: string | null
          barcode_value: string | null
          book_title_id: string
          condition: Database["public"]["Enums"]["book_condition"]
          copy_number: number | null
          created_at: string
          created_by: string | null
          id: string
          inventory_code: string
          is_active: boolean
          notes: string | null
          purchase_price: number | null
          qr_value: string | null
          shelf_id: string | null
          status: Database["public"]["Enums"]["copy_status"]
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_source?: string | null
          barcode_value?: string | null
          book_title_id: string
          condition?: Database["public"]["Enums"]["book_condition"]
          copy_number?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_code: string
          is_active?: boolean
          notes?: string | null
          purchase_price?: number | null
          qr_value?: string | null
          shelf_id?: string | null
          status?: Database["public"]["Enums"]["copy_status"]
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          acquisition_source?: string | null
          barcode_value?: string | null
          book_title_id?: string
          condition?: Database["public"]["Enums"]["book_condition"]
          copy_number?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_code?: string
          is_active?: boolean
          notes?: string | null
          purchase_price?: number | null
          qr_value?: string | null
          shelf_id?: string | null
          status?: Database["public"]["Enums"]["copy_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_copies_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "book_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_copies_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_catalog_availability"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "book_copies_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_summary"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "book_copies_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "book_copies_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_popular_books"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "book_copies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_copies_shelf_id_fkey"
            columns: ["shelf_id"]
            isOneToOne: false
            referencedRelation: "shelves"
            referencedColumns: ["id"]
          },
        ]
      }
      book_titles: {
        Row: {
          catalog_code: string | null
          category_id: string | null
          cover_path: string | null
          created_at: string
          created_by: string | null
          default_shelf_id: string | null
          edition: string | null
          id: string
          is_active: boolean
          is_published: boolean
          is_reference_only: boolean
          isbn: string | null
          language: string
          page_count: number | null
          publication_year: number | null
          publisher_id: string | null
          purchase_price: number | null
          replacement_cost_category_id: string | null
          search_vector: unknown
          subtitle: string | null
          synopsis: string | null
          title: string
          updated_at: string
        }
        Insert: {
          catalog_code?: string | null
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          default_shelf_id?: string | null
          edition?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          is_reference_only?: boolean
          isbn?: string | null
          language?: string
          page_count?: number | null
          publication_year?: number | null
          publisher_id?: string | null
          purchase_price?: number | null
          replacement_cost_category_id?: string | null
          search_vector?: unknown
          subtitle?: string | null
          synopsis?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          catalog_code?: string | null
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          default_shelf_id?: string | null
          edition?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          is_reference_only?: boolean
          isbn?: string | null
          language?: string
          page_count?: number | null
          publication_year?: number | null
          publisher_id?: string | null
          purchase_price?: number | null
          replacement_cost_category_id?: string | null
          search_vector?: unknown
          subtitle?: string | null
          synopsis?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_titles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_titles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_titles_default_shelf_id_fkey"
            columns: ["default_shelf_id"]
            isOneToOne: false
            referencedRelation: "shelves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_titles_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_titles_replacement_cost_category_id_fkey"
            columns: ["replacement_cost_category_id"]
            isOneToOne: false
            referencedRelation: "replacement_cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade_level: number
          id: string
          is_active: boolean
          name: string
          school_year_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_level: number
          id?: string
          is_active?: boolean
          name: string
          school_year_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_level?: number
          id?: string
          is_active?: boolean
          name?: string
          school_year_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_year_id_fkey"
            columns: ["school_year_id"]
            isOneToOne: false
            referencedRelation: "school_years"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_access_logs: {
        Row: {
          action: Database["public"]["Enums"]["digital_action_type"]
          created_at: string
          digital_collection_id: string
          id: number
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["digital_action_type"]
          created_at?: string
          digital_collection_id: string
          id?: never
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["digital_action_type"]
          created_at?: string
          digital_collection_id?: string
          id?: never
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_access_logs_digital_collection_id_fkey"
            columns: ["digital_collection_id"]
            isOneToOne: false
            referencedRelation: "digital_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_collections: {
        Row: {
          author_text: string | null
          category_id: string | null
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          file_path: string
          file_size_bytes: number | null
          id: string
          is_downloadable: boolean
          is_published: boolean
          media_type: Database["public"]["Enums"]["digital_media_type"]
          mime_type: string | null
          preview_path: string | null
          publication_year: number | null
          published_at: string | null
          publisher_text: string | null
          search_vector: unknown
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_text?: string | null
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_downloadable?: boolean
          is_published?: boolean
          media_type: Database["public"]["Enums"]["digital_media_type"]
          mime_type?: string | null
          preview_path?: string | null
          publication_year?: number | null
          published_at?: string | null
          publisher_text?: string | null
          search_vector?: unknown
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_text?: string | null
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_downloadable?: boolean
          is_published?: boolean
          media_type?: Database["public"]["Enums"]["digital_media_type"]
          mime_type?: string | null
          preview_path?: string | null
          publication_year?: number | null
          published_at?: string | null
          publisher_text?: string | null
          search_vector?: unknown
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_collections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fine_payments: {
        Row: {
          amount: number
          created_at: string
          fine_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          received_by: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          fine_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          fine_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fine_payments_fine_id_fkey"
            columns: ["fine_id"]
            isOneToOne: false
            referencedRelation: "fines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fines: {
        Row: {
          amount: number
          assessed_at: string
          created_at: string
          created_by: string | null
          days_late: number
          description: string | null
          fine_type: Database["public"]["Enums"]["fine_type"]
          id: string
          loan_item_id: string | null
          member_id: string
          paid_amount: number
          settled_at: string | null
          status: Database["public"]["Enums"]["fine_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          assessed_at?: string
          created_at?: string
          created_by?: string | null
          days_late?: number
          description?: string | null
          fine_type: Database["public"]["Enums"]["fine_type"]
          id?: string
          loan_item_id?: string | null
          member_id: string
          paid_amount?: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["fine_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          assessed_at?: string
          created_at?: string
          created_by?: string | null
          days_late?: number
          description?: string | null
          fine_type?: Database["public"]["Enums"]["fine_type"]
          id?: string
          loan_item_id?: string | null
          member_id?: string
          paid_amount?: number
          settled_at?: string | null
          status?: Database["public"]["Enums"]["fine_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_loan_item_id_fkey"
            columns: ["loan_item_id"]
            isOneToOne: false
            referencedRelation: "loan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_loan_item_id_fkey"
            columns: ["loan_item_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["loan_item_id"]
          },
          {
            foreignKeyName: "fines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "fines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["member_id"]
          },
        ]
      }
      group_visits: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          notes: string | null
          participant_count: number
          recorded_by: string | null
          study_group_id: string | null
          teacher_name: string
          visited_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          participant_count: number
          recorded_by?: string | null
          study_group_id?: string | null
          teacher_name: string
          visited_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          participant_count?: number
          recorded_by?: string | null
          study_group_id?: string | null
          teacher_name?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_visits_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_visits_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_visits_study_group_id_fkey"
            columns: ["study_group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          id: number
          import_job_id: string
          raw_data: Json | null
          row_number: number
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          id?: never
          import_job_id: string
          raw_data?: Json | null
          row_number: number
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          id?: never
          import_job_id?: string
          raw_data?: Json | null
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          failed_rows: number
          file_name: string
          file_path: string | null
          finished_at: string | null
          id: string
          import_type: Database["public"]["Enums"]["import_type"]
          requested_by: string
          started_at: string | null
          status: Database["public"]["Enums"]["import_status"]
          success_rows: number
          summary: Json
          total_rows: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_rows?: number
          file_name: string
          file_path?: string | null
          finished_at?: string | null
          id?: string
          import_type: Database["public"]["Enums"]["import_type"]
          requested_by: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          success_rows?: number
          summary?: Json
          total_rows?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_rows?: number
          file_name?: string
          file_path?: string | null
          finished_at?: string | null
          id?: string
          import_type?: Database["public"]["Enums"]["import_type"]
          requested_by?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          success_rows?: number
          summary?: Json
          total_rows?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_settings: {
        Row: {
          created_at: string
          currency_code: string
          id: number
          loan_period_days: number
          max_active_loans: number
          max_renewals: number
          overdue_fine_per_day: number
          renewal_days: number
          reservation_hold_hours: number
          timezone_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: number
          loan_period_days?: number
          max_active_loans?: number
          max_renewals?: number
          overdue_fine_per_day?: number
          renewal_days?: number
          reservation_hold_hours?: number
          timezone_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: number
          loan_period_days?: number
          max_active_loans?: number
          max_renewals?: number
          overdue_fine_per_day?: number
          renewal_days?: number
          reservation_hold_hours?: number
          timezone_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_extensions: {
        Row: {
          extended_at: string
          extended_by: string
          id: string
          loan_item_id: string
          new_due_at: string
          previous_due_at: string
          reason: string | null
        }
        Insert: {
          extended_at?: string
          extended_by: string
          id?: string
          loan_item_id: string
          new_due_at: string
          previous_due_at: string
          reason?: string | null
        }
        Update: {
          extended_at?: string
          extended_by?: string
          id?: string
          loan_item_id?: string
          new_due_at?: string
          previous_due_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_extensions_extended_by_fkey"
            columns: ["extended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_extensions_loan_item_id_fkey"
            columns: ["loan_item_id"]
            isOneToOne: false
            referencedRelation: "loan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_extensions_loan_item_id_fkey"
            columns: ["loan_item_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["loan_item_id"]
          },
        ]
      }
      loan_items: {
        Row: {
          book_copy_id: string
          borrowed_at: string
          created_at: string
          due_at: string
          id: string
          loan_id: string
          notes: string | null
          renewal_count: number
          return_condition: Database["public"]["Enums"]["book_condition"] | null
          returned_at: string | null
          returned_by: string | null
          status: Database["public"]["Enums"]["loan_item_status"]
          updated_at: string
        }
        Insert: {
          book_copy_id: string
          borrowed_at?: string
          created_at?: string
          due_at: string
          id?: string
          loan_id: string
          notes?: string | null
          renewal_count?: number
          return_condition?:
            | Database["public"]["Enums"]["book_condition"]
            | null
          returned_at?: string | null
          returned_by?: string | null
          status?: Database["public"]["Enums"]["loan_item_status"]
          updated_at?: string
        }
        Update: {
          book_copy_id?: string
          borrowed_at?: string
          created_at?: string
          due_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          renewal_count?: number
          return_condition?:
            | Database["public"]["Enums"]["book_condition"]
            | null
          returned_at?: string | null
          returned_by?: string | null
          status?: Database["public"]["Enums"]["loan_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_items_book_copy_id_fkey"
            columns: ["book_copy_id"]
            isOneToOne: false
            referencedRelation: "book_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_items_book_copy_id_fkey"
            columns: ["book_copy_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["book_copy_id"]
          },
          {
            foreignKeyName: "loan_items_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_items_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "loan_items_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          borrowed_at: string
          created_at: string
          created_by: string
          id: string
          loan_number: string
          member_id: string
          notes: string | null
          reservation_id: string | null
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
        }
        Insert: {
          borrowed_at?: string
          created_at?: string
          created_by: string
          id?: string
          loan_number: string
          member_id: string
          notes?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Update: {
          borrowed_at?: string
          created_at?: string
          created_by?: string
          id?: string
          loan_number?: string
          member_id?: string
          notes?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "loans_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          card_number: string
          class_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          is_active: boolean
          is_student: boolean
          joined_at: string
          member_code: string
          nis: string | null
          nisn: string | null
          notes: string | null
          phone: string | null
          search_vector: unknown
          student_card_number: string | null
          study_group_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          card_number: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          is_active?: boolean
          is_student?: boolean
          joined_at?: string
          member_code: string
          nis?: string | null
          nisn?: string | null
          notes?: string | null
          phone?: string | null
          search_vector?: unknown
          student_card_number?: string | null
          study_group_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          card_number?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          is_active?: boolean
          is_student?: boolean
          joined_at?: string
          member_code?: string
          nis?: string | null
          nisn?: string | null
          notes?: string | null
          phone?: string | null
          search_vector?: unknown
          student_card_number?: string | null
          study_group_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_study_group_id_fkey"
            columns: ["study_group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      publishers: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      replacement_cost_categories: {
        Row: {
          created_at: string
          damaged_charge_mode: Database["public"]["Enums"]["charge_mode"]
          damaged_fixed_amount: number
          damaged_percentage: number
          id: string
          is_active: boolean
          lost_charge_mode: Database["public"]["Enums"]["charge_mode"]
          lost_fixed_amount: number
          lost_percentage: number
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          damaged_charge_mode?: Database["public"]["Enums"]["charge_mode"]
          damaged_fixed_amount?: number
          damaged_percentage?: number
          id?: string
          is_active?: boolean
          lost_charge_mode?: Database["public"]["Enums"]["charge_mode"]
          lost_fixed_amount?: number
          lost_percentage?: number
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          damaged_charge_mode?: Database["public"]["Enums"]["charge_mode"]
          damaged_fixed_amount?: number
          damaged_percentage?: number
          id?: string
          is_active?: boolean
          lost_charge_mode?: Database["public"]["Enums"]["charge_mode"]
          lost_fixed_amount?: number
          lost_percentage?: number
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_copy_id: string | null
          book_title_id: string
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          member_id: string
          notes: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_at: string
          reservation_number: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_copy_id?: string | null
          book_title_id: string
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          member_id: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reservation_number: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_copy_id?: string | null
          book_title_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reservation_number?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_assigned_copy_id_fkey"
            columns: ["assigned_copy_id"]
            isOneToOne: false
            referencedRelation: "book_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_assigned_copy_id_fkey"
            columns: ["assigned_copy_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["book_copy_id"]
          },
          {
            foreignKeyName: "reservations_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "book_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_catalog_availability"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "reservations_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_inventory_summary"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "reservations_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "reservations_book_title_id_fkey"
            columns: ["book_title_id"]
            isOneToOne: false
            referencedRelation: "v_popular_books"
            referencedColumns: ["book_title_id"]
          },
          {
            foreignKeyName: "reservations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "reservations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "reservations_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_years: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shelves: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          location_description: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_description?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_description?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      study_groups: {
        Row: {
          class_id: string
          created_at: string
          homeroom_teacher_name: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          homeroom_teacher_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          homeroom_teacher_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          card_number_snapshot: string | null
          created_at: string
          entered_at: string
          exited_at: string | null
          guest_name: string | null
          id: string
          member_id: string | null
          method: Database["public"]["Enums"]["visit_method"]
          notes: string | null
          recorded_by: string | null
        }
        Insert: {
          card_number_snapshot?: string | null
          created_at?: string
          entered_at?: string
          exited_at?: string | null
          guest_name?: string | null
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["visit_method"]
          notes?: string | null
          recorded_by?: string | null
        }
        Update: {
          card_number_snapshot?: string | null
          created_at?: string
          entered_at?: string
          exited_at?: string | null
          guest_name?: string | null
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["visit_method"]
          notes?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_active_members"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "visits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "v_overdue_loans"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "visits_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_active_members: {
        Row: {
          active_items: number | null
          class_name: string | null
          full_name: string | null
          last_borrowed_at: string | null
          member_code: string | null
          member_id: string | null
          nis: string | null
          nisn: string | null
          study_group_name: string | null
          total_items_borrowed: number | null
        }
        Relationships: []
      }
      v_catalog_availability: {
        Row: {
          authors: string | null
          available_copies: number | null
          book_title_id: string | null
          catalog_code: string | null
          category_name: string | null
          damaged_copies: number | null
          isbn: string | null
          loaned_copies: number | null
          lost_copies: number | null
          publisher_name: string | null
          subtitle: string | null
          title: string | null
          total_copies: number | null
        }
        Relationships: []
      }
      v_daily_visits: {
        Row: {
          group_participants: number | null
          group_visits: number | null
          individual_visits: number | null
          visit_date: string | null
        }
        Relationships: []
      }
      v_inventory_summary: {
        Row: {
          available: number | null
          book_title_id: string | null
          catalog_code: string | null
          category_name: string | null
          damaged: number | null
          inactive: number | null
          loaned: number | null
          lost: number | null
          maintenance: number | null
          reserved: number | null
          title: string | null
          total_copies: number | null
        }
        Relationships: []
      }
      v_overdue_loans: {
        Row: {
          book_copy_id: string | null
          book_title_id: string | null
          borrowed_at: string | null
          card_number: string | null
          days_late: number | null
          due_at: string | null
          estimated_fine: number | null
          inventory_code: string | null
          loan_id: string | null
          loan_item_id: string | null
          loan_number: string | null
          member_code: string | null
          member_id: string | null
          member_name: string | null
          title: string | null
        }
        Relationships: []
      }
      v_popular_books: {
        Row: {
          book_title_id: string | null
          category_name: string | null
          last_borrowed_at: string | null
          title: string | null
          total_borrowed: number | null
          unique_borrowers: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_reservation: {
        Args: { p_inventory_code?: string; p_reservation_id: string }
        Returns: Json
      }
      bootstrap_master_admin: { Args: { p_email: string }; Returns: string }
      calculate_overdue_days: {
        Args: { p_due_at: string; p_returned_at?: string }
        Returns: number
      }
      calculate_replacement_charge: {
        Args: {
          p_book_copy_id: string
          p_fine_type: Database["public"]["Enums"]["fine_type"]
        }
        Returns: number
      }
      can_view_operations: { Args: never; Returns: boolean }
      cancel_reservation: {
        Args: { p_reservation_id: string }
        Returns: undefined
      }
      create_loan: {
        Args: {
          p_copy_ids: string[]
          p_member_id: string
          p_notes?: string
          p_reservation_id?: string
        }
        Returns: string
      }
      create_loan_by_codes: {
        Args: {
          p_card_number: string
          p_inventory_codes: string[]
          p_notes?: string
          p_reservation_id?: string
        }
        Returns: string
      }
      create_reservation: {
        Args: { p_book_title_id: string; p_notes?: string }
        Returns: string
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      expire_reservations: { Args: never; Returns: number }
      get_fine_payment_receipt: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      get_loan_receipt: { Args: { p_loan_id: string }; Returns: Json }
      import_book_row: {
        Args: { p_created_by: string; p_row: Json }
        Returns: string
      }
      is_library_staff: { Args: never; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      link_member_account: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: undefined
      }
      lookup_book_copy_by_code: {
        Args: { p_inventory_code: string }
        Returns: Json
      }
      lookup_member_by_card: { Args: { p_card_number: string }; Returns: Json }
      mark_overdue_items: { Args: never; Returns: number }
      next_loan_number: { Args: never; Returns: string }
      next_reservation_number: { Args: never; Returns: string }
      record_digital_access: {
        Args: {
          p_action: Database["public"]["Enums"]["digital_action_type"]
          p_collection_id: string
        }
        Returns: boolean
      }
      record_fine_payment: {
        Args: {
          p_amount: number
          p_fine_id: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_notes?: string
          p_reference_number?: string
        }
        Returns: string
      }
      record_group_visit: {
        Args: {
          p_class_id: string
          p_notes?: string
          p_participant_count: number
          p_study_group_id: string
          p_teacher_name: string
        }
        Returns: string
      }
      record_member_visit: {
        Args: { p_card_number: string; p_notes?: string }
        Returns: string
      }
      refresh_loan_status: {
        Args: { p_loan_id: string }
        Returns: Database["public"]["Enums"]["loan_status"]
      }
      reject_reservation: {
        Args: { p_reason: string; p_reservation_id: string }
        Returns: undefined
      }
      renew_loan_item: {
        Args: { p_loan_item_id: string; p_reason?: string }
        Returns: string
      }
      return_book_by_inventory_code: {
        Args: {
          p_condition?: Database["public"]["Enums"]["book_condition"]
          p_inventory_code: string
          p_notes?: string
        }
        Returns: Json
      }
      return_loan_item: {
        Args: {
          p_condition?: Database["public"]["Enums"]["book_condition"]
          p_loan_item_id: string
          p_notes?: string
        }
        Returns: Json
      }
      run_library_maintenance: { Args: never; Returns: Json }
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "master_admin"
        | "head_librarian"
        | "librarian"
        | "member"
        | "guest"
      book_condition: "new" | "good" | "fair" | "damaged" | "lost"
      charge_mode: "fixed" | "percentage_of_price" | "full_book_price"
      copy_status:
        | "available"
        | "reserved"
        | "loaned"
        | "damaged"
        | "lost"
        | "maintenance"
        | "inactive"
      digital_action_type: "view" | "play" | "download"
      digital_media_type: "ebook" | "module" | "video" | "audio"
      fine_status: "unpaid" | "partial" | "paid" | "waived"
      fine_type: "overdue" | "damaged" | "lost" | "other"
      gender_type: "male" | "female" | "unknown"
      import_status:
        | "queued"
        | "processing"
        | "completed"
        | "completed_with_errors"
        | "failed"
      import_type: "members" | "books" | "book_copies"
      loan_item_status: "borrowed" | "overdue" | "returned" | "damaged" | "lost"
      loan_status: "active" | "overdue" | "completed" | "cancelled"
      payment_method: "cash" | "bank_transfer" | "other"
      reservation_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "expired"
        | "completed"
      visit_method: "card_scan" | "manual" | "group"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "master_admin",
        "head_librarian",
        "librarian",
        "member",
        "guest",
      ],
      book_condition: ["new", "good", "fair", "damaged", "lost"],
      charge_mode: ["fixed", "percentage_of_price", "full_book_price"],
      copy_status: [
        "available",
        "reserved",
        "loaned",
        "damaged",
        "lost",
        "maintenance",
        "inactive",
      ],
      digital_action_type: ["view", "play", "download"],
      digital_media_type: ["ebook", "module", "video", "audio"],
      fine_status: ["unpaid", "partial", "paid", "waived"],
      fine_type: ["overdue", "damaged", "lost", "other"],
      gender_type: ["male", "female", "unknown"],
      import_status: [
        "queued",
        "processing",
        "completed",
        "completed_with_errors",
        "failed",
      ],
      import_type: ["members", "books", "book_copies"],
      loan_item_status: ["borrowed", "overdue", "returned", "damaged", "lost"],
      loan_status: ["active", "overdue", "completed", "cancelled"],
      payment_method: ["cash", "bank_transfer", "other"],
      reservation_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "expired",
        "completed",
      ],
      visit_method: ["card_scan", "manual", "group"],
    },
  },
} as const

