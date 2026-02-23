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
      admin_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          session_token: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          session_token: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_super_admin: boolean | null
          last_login_at: string | null
          name: string | null
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_super_admin?: boolean | null
          last_login_at?: string | null
          name?: string | null
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_super_admin?: boolean | null
          last_login_at?: string | null
          name?: string | null
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          client_timestamp: string | null
          created_at: string
          event_category: string | null
          event_data: Json | null
          event_name: string
          event_type: string
          id: string
          page_url: string | null
          project_id: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string | null
        }
        Insert: {
          client_timestamp?: string | null
          created_at?: string
          event_category?: string | null
          event_data?: Json | null
          event_name: string
          event_type: string
          id?: string
          page_url?: string | null
          project_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
        }
        Update: {
          client_timestamp?: string | null
          created_at?: string
          event_category?: string | null
          event_data?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          page_url?: string | null
          project_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      bid_contractors: {
        Row: {
          address: string | null
          bbb_accredited: boolean | null
          bbb_complaints_3yr: number | null
          bbb_rating: string | null
          bid_id: string
          bonded: boolean | null
          certifications: string[] | null
          company: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          employee_count: number | null
          google_rating: number | null
          google_review_count: number | null
          id: string
          insurance_verified: boolean | null
          license: string | null
          license_expiration_date: string | null
          license_state: string | null
          license_status: string | null
          name: string
          phone: string | null
          research_confidence: number | null
          research_notes: string | null
          service_area: string | null
          total_installs: number | null
          updated_at: string
          verification_date: string | null
          website: string | null
          year_established: number | null
          years_in_business: number | null
          yelp_rating: number | null
          yelp_review_count: number | null
        }
        Insert: {
          address?: string | null
          bbb_accredited?: boolean | null
          bbb_complaints_3yr?: number | null
          bbb_rating?: string | null
          bid_id: string
          bonded?: boolean | null
          certifications?: string[] | null
          company?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          employee_count?: number | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          insurance_verified?: boolean | null
          license?: string | null
          license_expiration_date?: string | null
          license_state?: string | null
          license_status?: string | null
          name: string
          phone?: string | null
          research_confidence?: number | null
          research_notes?: string | null
          service_area?: string | null
          total_installs?: number | null
          updated_at?: string
          verification_date?: string | null
          website?: string | null
          year_established?: number | null
          years_in_business?: number | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Update: {
          address?: string | null
          bbb_accredited?: boolean | null
          bbb_complaints_3yr?: number | null
          bbb_rating?: string | null
          bid_id?: string
          bonded?: boolean | null
          certifications?: string[] | null
          company?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          employee_count?: number | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          insurance_verified?: boolean | null
          license?: string | null
          license_expiration_date?: string | null
          license_state?: string | null
          license_status?: string | null
          name?: string
          phone?: string | null
          research_confidence?: number | null
          research_notes?: string | null
          service_area?: string | null
          total_installs?: number | null
          updated_at?: string
          verification_date?: string | null
          website?: string | null
          year_established?: number | null
          years_in_business?: number | null
          yelp_rating?: number | null
          yelp_review_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_contractors_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_contractors_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_contractors_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_contractors_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_contractors_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_contractors_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_equipment: {
        Row: {
          afue_rating: number | null
          amperage_draw: number | null
          bid_id: string
          brand: string
          capacity_btu: number | null
          capacity_tons: number | null
          compressor_warranty_years: number | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          cop: number | null
          created_at: string
          eer_rating: number | null
          energy_star_certified: boolean | null
          energy_star_most_efficient: boolean | null
          equipment_cost: number | null
          equipment_type: string
          fuel_type: string | null
          hspf_rating: number | null
          hspf2_rating: number | null
          id: string
          minimum_circuit_amperage: number | null
          model_name: string | null
          model_number: string | null
          refrigerant_type: string | null
          seer_rating: number | null
          seer2_rating: number | null
          sound_level_db: number | null
          stages: number | null
          system_role: string | null
          variable_speed: boolean | null
          voltage: number | null
          warranty_years: number | null
        }
        Insert: {
          afue_rating?: number | null
          amperage_draw?: number | null
          bid_id: string
          brand: string
          capacity_btu?: number | null
          capacity_tons?: number | null
          compressor_warranty_years?: number | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          cop?: number | null
          created_at?: string
          eer_rating?: number | null
          energy_star_certified?: boolean | null
          energy_star_most_efficient?: boolean | null
          equipment_cost?: number | null
          equipment_type: string
          fuel_type?: string | null
          hspf_rating?: number | null
          hspf2_rating?: number | null
          id?: string
          minimum_circuit_amperage?: number | null
          model_name?: string | null
          model_number?: string | null
          refrigerant_type?: string | null
          seer_rating?: number | null
          seer2_rating?: number | null
          sound_level_db?: number | null
          stages?: number | null
          system_role?: string | null
          variable_speed?: boolean | null
          voltage?: number | null
          warranty_years?: number | null
        }
        Update: {
          afue_rating?: number | null
          amperage_draw?: number | null
          bid_id?: string
          brand?: string
          capacity_btu?: number | null
          capacity_tons?: number | null
          compressor_warranty_years?: number | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          cop?: number | null
          created_at?: string
          eer_rating?: number | null
          energy_star_certified?: boolean | null
          energy_star_most_efficient?: boolean | null
          equipment_cost?: number | null
          equipment_type?: string
          fuel_type?: string | null
          hspf_rating?: number | null
          hspf2_rating?: number | null
          id?: string
          minimum_circuit_amperage?: number | null
          model_name?: string | null
          model_number?: string | null
          refrigerant_type?: string | null
          seer_rating?: number | null
          seer2_rating?: number | null
          sound_level_db?: number | null
          stages?: number | null
          system_role?: string | null
          variable_speed?: boolean | null
          voltage?: number | null
          warranty_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_equipment_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_equipment_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_equipment_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_equipment_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_equipment_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_equipment_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_faqs: {
        Row: {
          answer: string
          answer_confidence: string | null
          bid_id: string
          category: string | null
          created_at: string
          display_order: number | null
          id: string
          question: string
          sources: string[] | null
          updated_at: string
        }
        Insert: {
          answer: string
          answer_confidence?: string | null
          bid_id: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          question: string
          sources?: string[] | null
          updated_at?: string
        }
        Update: {
          answer?: string
          answer_confidence?: string | null
          bid_id?: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          question?: string
          sources?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_faqs_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_faqs_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_faqs_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_faqs_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_faqs_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_faqs_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_scope: {
        Row: {
          accessories: Json | null
          air_handler_detail: string | null
          air_handler_included: boolean | null
          bid_id: string
          breaker_size_required: number | null
          commissioning_detail: string | null
          commissioning_included: boolean | null
          created_at: string
          dedicated_circuit_included: boolean | null
          disconnect_detail: string | null
          disconnect_included: boolean | null
          disposal_detail: string | null
          disposal_included: boolean | null
          drain_line_detail: string | null
          drain_line_included: boolean | null
          ductwork_detail: string | null
          ductwork_included: boolean | null
          electrical_detail: string | null
          electrical_included: boolean | null
          electrical_notes: string | null
          electrical_permit_included: boolean | null
          exclusions: string[] | null
          existing_panel_amps: number | null
          id: string
          inclusions: string[] | null
          line_items: Json | null
          line_set_detail: string | null
          line_set_included: boolean | null
          load_calculation_included: boolean | null
          manual_j_detail: string | null
          manual_j_included: boolean | null
          pad_detail: string | null
          pad_included: boolean | null
          panel_assessment_included: boolean | null
          panel_upgrade_cost: number | null
          panel_upgrade_included: boolean | null
          permit_detail: string | null
          permit_included: boolean | null
          proposed_panel_amps: number | null
          summary: string | null
          thermostat_detail: string | null
          thermostat_included: boolean | null
          updated_at: string
        }
        Insert: {
          accessories?: Json | null
          air_handler_detail?: string | null
          air_handler_included?: boolean | null
          bid_id: string
          breaker_size_required?: number | null
          commissioning_detail?: string | null
          commissioning_included?: boolean | null
          created_at?: string
          dedicated_circuit_included?: boolean | null
          disconnect_detail?: string | null
          disconnect_included?: boolean | null
          disposal_detail?: string | null
          disposal_included?: boolean | null
          drain_line_detail?: string | null
          drain_line_included?: boolean | null
          ductwork_detail?: string | null
          ductwork_included?: boolean | null
          electrical_detail?: string | null
          electrical_included?: boolean | null
          electrical_notes?: string | null
          electrical_permit_included?: boolean | null
          exclusions?: string[] | null
          existing_panel_amps?: number | null
          id?: string
          inclusions?: string[] | null
          line_items?: Json | null
          line_set_detail?: string | null
          line_set_included?: boolean | null
          load_calculation_included?: boolean | null
          manual_j_detail?: string | null
          manual_j_included?: boolean | null
          pad_detail?: string | null
          pad_included?: boolean | null
          panel_assessment_included?: boolean | null
          panel_upgrade_cost?: number | null
          panel_upgrade_included?: boolean | null
          permit_detail?: string | null
          permit_included?: boolean | null
          proposed_panel_amps?: number | null
          summary?: string | null
          thermostat_detail?: string | null
          thermostat_included?: boolean | null
          updated_at?: string
        }
        Update: {
          accessories?: Json | null
          air_handler_detail?: string | null
          air_handler_included?: boolean | null
          bid_id?: string
          breaker_size_required?: number | null
          commissioning_detail?: string | null
          commissioning_included?: boolean | null
          created_at?: string
          dedicated_circuit_included?: boolean | null
          disconnect_detail?: string | null
          disconnect_included?: boolean | null
          disposal_detail?: string | null
          disposal_included?: boolean | null
          drain_line_detail?: string | null
          drain_line_included?: boolean | null
          ductwork_detail?: string | null
          ductwork_included?: boolean | null
          electrical_detail?: string | null
          electrical_included?: boolean | null
          electrical_notes?: string | null
          electrical_permit_included?: boolean | null
          exclusions?: string[] | null
          existing_panel_amps?: number | null
          id?: string
          inclusions?: string[] | null
          line_items?: Json | null
          line_set_detail?: string | null
          line_set_included?: boolean | null
          load_calculation_included?: boolean | null
          manual_j_detail?: string | null
          manual_j_included?: boolean | null
          pad_detail?: string | null
          pad_included?: boolean | null
          panel_assessment_included?: boolean | null
          panel_upgrade_cost?: number | null
          panel_upgrade_included?: boolean | null
          permit_detail?: string | null
          permit_included?: boolean | null
          proposed_panel_amps?: number | null
          summary?: string | null
          thermostat_detail?: string | null
          thermostat_included?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_scope_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_scope_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_scope_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_scope_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_scope_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_scope_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_scores: {
        Row: {
          bid_id: string
          completeness_score: number | null
          created_at: string
          id: string
          overall_score: number | null
          positive_indicators: Json | null
          quality_score: number | null
          ranking_recommendation: string | null
          red_flags: Json | null
          score_confidence: number | null
          scoring_notes: string | null
          updated_at: string
          value_score: number | null
        }
        Insert: {
          bid_id: string
          completeness_score?: number | null
          created_at?: string
          id?: string
          overall_score?: number | null
          positive_indicators?: Json | null
          quality_score?: number | null
          ranking_recommendation?: string | null
          red_flags?: Json | null
          score_confidence?: number | null
          scoring_notes?: string | null
          updated_at?: string
          value_score?: number | null
        }
        Update: {
          bid_id?: string
          completeness_score?: number | null
          created_at?: string
          id?: string
          overall_score?: number | null
          positive_indicators?: Json | null
          quality_score?: number | null
          ranking_recommendation?: string | null
          red_flags?: Json | null
          score_confidence?: number | null
          scoring_notes?: string | null
          updated_at?: string
          value_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_scores_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_scores_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_scores_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_scores_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "bid_scores_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_scores_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          additional_warranty_details: string | null
          bid_date: string | null
          bid_index: number | null
          compressor_warranty_years: number | null
          contractor_name: string
          created_at: string
          deposit_percentage: number | null
          deposit_required: number | null
          disposal_cost: number | null
          electrical_cost: number | null
          equipment_cost: number | null
          equipment_warranty_years: number | null
          estimated_days: number | null
          estimated_rebates: number | null
          extraction_confidence:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          extraction_notes: string | null
          financing_offered: boolean | null
          financing_terms: string | null
          id: string
          is_favorite: boolean | null
          labor_cost: number | null
          labor_warranty_years: number | null
          materials_cost: number | null
          payment_schedule: string | null
          pdf_upload_id: string | null
          permit_cost: number | null
          project_id: string
          start_date_available: string | null
          system_type: string | null
          total_after_rebates: number | null
          total_before_rebates: number | null
          total_bid_amount: number
          updated_at: string
          user_notes: string | null
          valid_until: string | null
          verified_at: string | null
          verified_by_user: boolean | null
        }
        Insert: {
          additional_warranty_details?: string | null
          bid_date?: string | null
          bid_index?: number | null
          compressor_warranty_years?: number | null
          contractor_name: string
          created_at?: string
          deposit_percentage?: number | null
          deposit_required?: number | null
          disposal_cost?: number | null
          electrical_cost?: number | null
          equipment_cost?: number | null
          equipment_warranty_years?: number | null
          estimated_days?: number | null
          estimated_rebates?: number | null
          extraction_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          extraction_notes?: string | null
          financing_offered?: boolean | null
          financing_terms?: string | null
          id?: string
          is_favorite?: boolean | null
          labor_cost?: number | null
          labor_warranty_years?: number | null
          materials_cost?: number | null
          payment_schedule?: string | null
          pdf_upload_id?: string | null
          permit_cost?: number | null
          project_id: string
          start_date_available?: string | null
          system_type?: string | null
          total_after_rebates?: number | null
          total_before_rebates?: number | null
          total_bid_amount: number
          updated_at?: string
          user_notes?: string | null
          valid_until?: string | null
          verified_at?: string | null
          verified_by_user?: boolean | null
        }
        Update: {
          additional_warranty_details?: string | null
          bid_date?: string | null
          bid_index?: number | null
          compressor_warranty_years?: number | null
          contractor_name?: string
          created_at?: string
          deposit_percentage?: number | null
          deposit_required?: number | null
          disposal_cost?: number | null
          electrical_cost?: number | null
          equipment_cost?: number | null
          equipment_warranty_years?: number | null
          estimated_days?: number | null
          estimated_rebates?: number | null
          extraction_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          extraction_notes?: string | null
          financing_offered?: boolean | null
          financing_terms?: string | null
          id?: string
          is_favorite?: boolean | null
          labor_cost?: number | null
          labor_warranty_years?: number | null
          materials_cost?: number | null
          payment_schedule?: string | null
          pdf_upload_id?: string | null
          permit_cost?: number | null
          project_id?: string
          start_date_available?: string | null
          system_type?: string | null
          total_after_rebates?: number | null
          total_before_rebates?: number | null
          total_bid_amount?: number
          updated_at?: string
          user_notes?: string | null
          valid_until?: string | null
          verified_at?: string | null
          verified_by_user?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_pdf_upload_id_fkey"
            columns: ["pdf_upload_id"]
            isOneToOne: false
            referencedRelation: "pdf_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      community_bids: {
        Row: {
          bid_date: string | null
          community_contractor_id: string | null
          created_at: string
          equipment_cost: number | null
          equipment_type: string | null
          estimated_days: number | null
          id: string
          includes_ductwork: boolean | null
          includes_electrical: boolean | null
          includes_permit: boolean | null
          labor_cost: number | null
          labor_warranty_years: number | null
          primary_capacity_tons: number | null
          primary_seer_rating: number | null
          source_bid_id: string | null
          state: string | null
          total_bid_amount: number | null
          zip_code_area: string | null
        }
        Insert: {
          bid_date?: string | null
          community_contractor_id?: string | null
          created_at?: string
          equipment_cost?: number | null
          equipment_type?: string | null
          estimated_days?: number | null
          id?: string
          includes_ductwork?: boolean | null
          includes_electrical?: boolean | null
          includes_permit?: boolean | null
          labor_cost?: number | null
          labor_warranty_years?: number | null
          primary_capacity_tons?: number | null
          primary_seer_rating?: number | null
          source_bid_id?: string | null
          state?: string | null
          total_bid_amount?: number | null
          zip_code_area?: string | null
        }
        Update: {
          bid_date?: string | null
          community_contractor_id?: string | null
          created_at?: string
          equipment_cost?: number | null
          equipment_type?: string | null
          estimated_days?: number | null
          id?: string
          includes_ductwork?: boolean | null
          includes_electrical?: boolean | null
          includes_permit?: boolean | null
          labor_cost?: number | null
          labor_warranty_years?: number | null
          primary_capacity_tons?: number | null
          primary_seer_rating?: number | null
          source_bid_id?: string | null
          state?: string | null
          total_bid_amount?: number | null
          zip_code_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_bids_community_contractor_id_fkey"
            columns: ["community_contractor_id"]
            isOneToOne: false
            referencedRelation: "community_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_bids_source_bid_id_fkey"
            columns: ["source_bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_bids_source_bid_id_fkey"
            columns: ["source_bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "community_bids_source_bid_id_fkey"
            columns: ["source_bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "community_bids_source_bid_id_fkey"
            columns: ["source_bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "community_bids_source_bid_id_fkey"
            columns: ["source_bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_bids_source_bid_id_fkey"
            columns: ["source_bid_id"]
            isOneToOne: true
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      community_contractors: {
        Row: {
          bbb_accredited: boolean | null
          bbb_rating: string | null
          bidsmart_completed_on_time: boolean | null
          bidsmart_overall_rating: number | null
          bidsmart_would_recommend: boolean | null
          certifications: string[] | null
          created_at: string
          employee_count: number | null
          google_rating: number | null
          id: string
          service_area: string | null
          source_project_id: string | null
          state: string | null
          updated_at: string
          years_in_business: number | null
          yelp_rating: number | null
          zip_code_area: string | null
        }
        Insert: {
          bbb_accredited?: boolean | null
          bbb_rating?: string | null
          bidsmart_completed_on_time?: boolean | null
          bidsmart_overall_rating?: number | null
          bidsmart_would_recommend?: boolean | null
          certifications?: string[] | null
          created_at?: string
          employee_count?: number | null
          google_rating?: number | null
          id?: string
          service_area?: string | null
          source_project_id?: string | null
          state?: string | null
          updated_at?: string
          years_in_business?: number | null
          yelp_rating?: number | null
          zip_code_area?: string | null
        }
        Update: {
          bbb_accredited?: boolean | null
          bbb_rating?: string | null
          bidsmart_completed_on_time?: boolean | null
          bidsmart_overall_rating?: number | null
          bidsmart_would_recommend?: boolean | null
          certifications?: string[] | null
          created_at?: string
          employee_count?: number | null
          google_rating?: number | null
          id?: string
          service_area?: string | null
          source_project_id?: string | null
          state?: string | null
          updated_at?: string
          years_in_business?: number | null
          yelp_rating?: number | null
          zip_code_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_contractors_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_installation_reviews: {
        Row: {
          bid_id: string
          checklist_completeness_rating: number | null
          communication_rating: number
          completed_on_time: boolean
          created_at: string
          critical_items_verified: boolean
          id: string
          improvement_suggestions: string | null
          issues_encountered: string[] | null
          overall_rating: number
          photo_documentation_provided: boolean
          positive_comments: string | null
          professionalism_rating: number
          project_id: string
          quality_of_work_rating: number
          stayed_within_budget: boolean
          timeliness_rating: number
          updated_at: string
          used_checklist: boolean
          user_id: string
          would_recommend: boolean
        }
        Insert: {
          bid_id: string
          checklist_completeness_rating?: number | null
          communication_rating: number
          completed_on_time: boolean
          created_at?: string
          critical_items_verified: boolean
          id?: string
          improvement_suggestions?: string | null
          issues_encountered?: string[] | null
          overall_rating: number
          photo_documentation_provided: boolean
          positive_comments?: string | null
          professionalism_rating: number
          project_id: string
          quality_of_work_rating: number
          stayed_within_budget: boolean
          timeliness_rating: number
          updated_at?: string
          used_checklist?: boolean
          user_id: string
          would_recommend: boolean
        }
        Update: {
          bid_id?: string
          checklist_completeness_rating?: number | null
          communication_rating?: number
          completed_on_time?: boolean
          created_at?: string
          critical_items_verified?: boolean
          id?: string
          improvement_suggestions?: string | null
          issues_encountered?: string[] | null
          overall_rating?: number
          photo_documentation_provided?: boolean
          positive_comments?: string | null
          professionalism_rating?: number
          project_id?: string
          quality_of_work_rating?: number
          stayed_within_budget?: boolean
          timeliness_rating?: number
          updated_at?: string
          used_checklist?: boolean
          user_id?: string
          would_recommend?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "contractor_installation_reviews_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_installation_reviews_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "contractor_installation_reviews_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "contractor_installation_reviews_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "contractor_installation_reviews_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_installation_reviews_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_installation_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_installation_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_ext"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_questions: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          auto_generated: boolean | null
          bid_id: string
          category: string | null
          concerning_answer_looks_like: string | null
          context: string | null
          created_at: string
          display_order: number | null
          generation_notes: string | null
          good_answer_looks_like: string | null
          id: string
          is_answered: boolean | null
          missing_field: string | null
          priority: string | null
          question_category: string | null
          question_text: string
          triggered_by: string | null
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          auto_generated?: boolean | null
          bid_id: string
          category?: string | null
          concerning_answer_looks_like?: string | null
          context?: string | null
          created_at?: string
          display_order?: number | null
          generation_notes?: string | null
          good_answer_looks_like?: string | null
          id?: string
          is_answered?: boolean | null
          missing_field?: string | null
          priority?: string | null
          question_category?: string | null
          question_text: string
          triggered_by?: string | null
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          auto_generated?: boolean | null
          bid_id?: string
          category?: string | null
          concerning_answer_looks_like?: string | null
          context?: string | null
          created_at?: string
          display_order?: number | null
          generation_notes?: string | null
          good_answer_looks_like?: string | null
          id?: string
          is_answered?: boolean | null
          missing_field?: string | null
          priority?: string | null
          question_category?: string | null
          question_text?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_questions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_questions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "contractor_questions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "contractor_questions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "contractor_questions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_questions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      incentive_program_database: {
        Row: {
          application_process: string | null
          application_url: string | null
          available_nationwide: boolean | null
          available_states: string[] | null
          available_utilities: string[] | null
          available_zip_codes: string[] | null
          cannot_stack_with: string[] | null
          created_at: string
          description: string | null
          discovered_by: string | null
          discovery_source_url: string | null
          id: string
          income_limits: Json | null
          income_qualified: boolean | null
          is_active: boolean | null
          last_verified: string | null
          max_rebate: number | null
          program_code: string | null
          program_name: string
          program_type: string | null
          rebate_amount: number | null
          rebate_percentage: number | null
          requirements: Json | null
          stackable: boolean | null
          typical_processing_days: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          application_process?: string | null
          application_url?: string | null
          available_nationwide?: boolean | null
          available_states?: string[] | null
          available_utilities?: string[] | null
          available_zip_codes?: string[] | null
          cannot_stack_with?: string[] | null
          created_at?: string
          description?: string | null
          discovered_by?: string | null
          discovery_source_url?: string | null
          id?: string
          income_limits?: Json | null
          income_qualified?: boolean | null
          is_active?: boolean | null
          last_verified?: string | null
          max_rebate?: number | null
          program_code?: string | null
          program_name: string
          program_type?: string | null
          rebate_amount?: number | null
          rebate_percentage?: number | null
          requirements?: Json | null
          stackable?: boolean | null
          typical_processing_days?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          application_process?: string | null
          application_url?: string | null
          available_nationwide?: boolean | null
          available_states?: string[] | null
          available_utilities?: string[] | null
          available_zip_codes?: string[] | null
          cannot_stack_with?: string[] | null
          created_at?: string
          description?: string | null
          discovered_by?: string | null
          discovery_source_url?: string | null
          id?: string
          income_limits?: Json | null
          income_qualified?: boolean | null
          is_active?: boolean | null
          last_verified?: string | null
          max_rebate?: number | null
          program_code?: string | null
          program_name?: string
          program_type?: string | null
          rebate_amount?: number | null
          rebate_percentage?: number | null
          requirements?: Json | null
          stackable?: boolean | null
          typical_processing_days?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      pdf_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          extracted_bid_id: string | null
          extraction_confidence: number | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mindpal_job_id: string | null
          mindpal_run_id: string | null
          mindpal_status: string | null
          mindpal_workflow_id: string | null
          project_id: string
          retry_count: number | null
          status: Database["public"]["Enums"]["pdf_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          extracted_bid_id?: string | null
          extraction_confidence?: number | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mindpal_job_id?: string | null
          mindpal_run_id?: string | null
          mindpal_status?: string | null
          mindpal_workflow_id?: string | null
          project_id: string
          retry_count?: number | null
          status?: Database["public"]["Enums"]["pdf_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          extracted_bid_id?: string | null
          extraction_confidence?: number | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mindpal_job_id?: string | null
          mindpal_run_id?: string | null
          mindpal_status?: string | null
          mindpal_workflow_id?: string | null
          project_id?: string
          retry_count?: number | null
          status?: Database["public"]["Enums"]["pdf_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pdf_uploads_extracted_bid"
            columns: ["extracted_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pdf_uploads_extracted_bid"
            columns: ["extracted_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "fk_pdf_uploads_extracted_bid"
            columns: ["extracted_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "fk_pdf_uploads_extracted_bid"
            columns: ["extracted_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "fk_pdf_uploads_extracted_bid"
            columns: ["extracted_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pdf_uploads_extracted_bid"
            columns: ["extracted_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          display_order: number | null
          id: string
          project_id: string
          question: string
          sources: string[] | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          project_id: string
          question: string
          sources?: string[] | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          project_id?: string
          question?: string
          sources?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "project_faqs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_incentives: {
        Row: {
          amount_description: string | null
          amount_max: number | null
          amount_min: number | null
          application_process: string | null
          application_status: string | null
          application_url: string | null
          applied_amount: number | null
          can_stack: boolean | null
          confidence: string | null
          created_at: string
          eligibility_requirements: string | null
          equipment_types_eligible: string[] | null
          id: string
          incentive_database_id: string | null
          income_limits: string | null
          income_qualified: boolean | null
          program_name: string
          program_type: string
          project_id: string
          source: string
          stacking_notes: string | null
          still_active: boolean | null
          updated_at: string
          user_plans_to_apply: boolean | null
          verification_source: string | null
        }
        Insert: {
          amount_description?: string | null
          amount_max?: number | null
          amount_min?: number | null
          application_process?: string | null
          application_status?: string | null
          application_url?: string | null
          applied_amount?: number | null
          can_stack?: boolean | null
          confidence?: string | null
          created_at?: string
          eligibility_requirements?: string | null
          equipment_types_eligible?: string[] | null
          id?: string
          incentive_database_id?: string | null
          income_limits?: string | null
          income_qualified?: boolean | null
          program_name: string
          program_type: string
          project_id: string
          source: string
          stacking_notes?: string | null
          still_active?: boolean | null
          updated_at?: string
          user_plans_to_apply?: boolean | null
          verification_source?: string | null
        }
        Update: {
          amount_description?: string | null
          amount_max?: number | null
          amount_min?: number | null
          application_process?: string | null
          application_status?: string | null
          application_url?: string | null
          applied_amount?: number | null
          can_stack?: boolean | null
          confidence?: string | null
          created_at?: string
          eligibility_requirements?: string | null
          equipment_types_eligible?: string[] | null
          id?: string
          incentive_database_id?: string | null
          income_limits?: string | null
          income_qualified?: boolean | null
          program_name?: string
          program_type?: string
          project_id?: string
          source?: string
          stacking_notes?: string | null
          still_active?: boolean | null
          updated_at?: string
          user_plans_to_apply?: boolean | null
          verification_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_incentives_incentive_database_id_fkey"
            columns: ["incentive_database_id"]
            isOneToOne: false
            referencedRelation: "incentive_program_database"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_incentives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_qii_checklist: {
        Row: {
          checklist_item_key: string
          created_at: string
          id: string
          is_verified: boolean | null
          notes: string | null
          photo_url: string | null
          project_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          checklist_item_key: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          photo_url?: string | null
          project_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          checklist_item_key?: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          photo_url?: string | null
          project_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_qii_checklist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requirements: {
        Row: {
          additional_notes: string | null
          budget_range: string | null
          completed_at: string | null
          created_at: string
          id: string
          must_have_features: string[] | null
          nice_to_have_features: string[] | null
          priority_efficiency: number | null
          priority_price: number | null
          priority_reputation: number | null
          priority_timeline: number | null
          priority_warranty: number | null
          project_id: string
          specific_concerns: string[] | null
          timeline_urgency: string | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          budget_range?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          must_have_features?: string[] | null
          nice_to_have_features?: string[] | null
          priority_efficiency?: number | null
          priority_price?: number | null
          priority_reputation?: number | null
          priority_timeline?: number | null
          priority_warranty?: number | null
          project_id: string
          specific_concerns?: string[] | null
          timeline_urgency?: string | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          budget_range?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          must_have_features?: string[] | null
          nice_to_have_features?: string[] | null
          priority_efficiency?: number | null
          priority_price?: number | null
          priority_reputation?: number | null
          priority_timeline?: number | null
          priority_warranty?: number | null
          project_id?: string
          specific_concerns?: string[] | null
          timeline_urgency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          add_zones: number | null
          analysis_queued_at: string | null
          cooling_load_calculated: number | null
          created_at: string
          data_sharing_consent: boolean
          data_sharing_consented_at: string | null
          decision_date: string | null
          decision_notes: string | null
          demo_description: string | null
          desired_hspf: number | null
          desired_seer: number | null
          desired_start_date: string | null
          electrical_panel_amps: number | null
          financing_interested: boolean | null
          flexibility: string | null
          heat_pump_type: Database["public"]["Enums"]["heat_pump_type"] | null
          heating_load_calculated: number | null
          id: string
          min_seer_requirement: number | null
          must_have_features: string[] | null
          notification_email: string | null
          notification_sent_at: string | null
          notify_on_completion: boolean
          project_name: string
          replace_air_handler: boolean | null
          replace_ductwork: boolean | null
          requires_electrical_upgrade: boolean | null
          rerun_count: number
          selected_bid_id: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          system_size_btu: number | null
          system_size_tons: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          add_zones?: number | null
          analysis_queued_at?: string | null
          cooling_load_calculated?: number | null
          created_at?: string
          data_sharing_consent?: boolean
          data_sharing_consented_at?: string | null
          decision_date?: string | null
          decision_notes?: string | null
          demo_description?: string | null
          desired_hspf?: number | null
          desired_seer?: number | null
          desired_start_date?: string | null
          electrical_panel_amps?: number | null
          financing_interested?: boolean | null
          flexibility?: string | null
          heat_pump_type?: Database["public"]["Enums"]["heat_pump_type"] | null
          heating_load_calculated?: number | null
          id?: string
          min_seer_requirement?: number | null
          must_have_features?: string[] | null
          notification_email?: string | null
          notification_sent_at?: string | null
          notify_on_completion?: boolean
          project_name?: string
          replace_air_handler?: boolean | null
          replace_ductwork?: boolean | null
          requires_electrical_upgrade?: boolean | null
          rerun_count?: number
          selected_bid_id?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          system_size_btu?: number | null
          system_size_tons?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          add_zones?: number | null
          analysis_queued_at?: string | null
          cooling_load_calculated?: number | null
          created_at?: string
          data_sharing_consent?: boolean
          data_sharing_consented_at?: string | null
          decision_date?: string | null
          decision_notes?: string | null
          demo_description?: string | null
          desired_hspf?: number | null
          desired_seer?: number | null
          desired_start_date?: string | null
          electrical_panel_amps?: number | null
          financing_interested?: boolean | null
          flexibility?: string | null
          heat_pump_type?: Database["public"]["Enums"]["heat_pump_type"] | null
          heating_load_calculated?: number | null
          id?: string
          min_seer_requirement?: number | null
          must_have_features?: string[] | null
          notification_email?: string | null
          notification_sent_at?: string | null
          notify_on_completion?: boolean
          project_name?: string
          replace_air_handler?: boolean | null
          replace_ductwork?: boolean | null
          requires_electrical_upgrade?: boolean | null
          rerun_count?: number
          selected_bid_id?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          system_size_btu?: number | null
          system_size_tons?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_selected_bid"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_projects_selected_bid"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_contractors"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "fk_projects_selected_bid"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_equipment"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "fk_projects_selected_bid"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_compare_scope"
            referencedColumns: ["bid_id"]
          },
          {
            foreignKeyName: "fk_projects_selected_bid"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_projects_selected_bid"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_ext"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          timestamp: string | null
          type: string
          url: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          timestamp?: string | null
          type: string
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          timestamp?: string | null
          type?: string
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      users_ext: {
        Row: {
          annual_cooling_cost: number | null
          annual_heating_cost: number | null
          auth_user_id: string | null
          created_at: string
          current_cooling_type: string | null
          current_heating_type: string | null
          current_system_age: number | null
          electric_utility: string | null
          email: string
          full_name: string | null
          gas_utility: string | null
          id: string
          partner_code: string | null
          phone: string | null
          property_address: string | null
          property_city: string | null
          property_state: string | null
          property_type: string | null
          property_zip: string | null
          referral_source: string | null
          square_footage: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          annual_cooling_cost?: number | null
          annual_heating_cost?: number | null
          auth_user_id?: string | null
          created_at?: string
          current_cooling_type?: string | null
          current_heating_type?: string | null
          current_system_age?: number | null
          electric_utility?: string | null
          email: string
          full_name?: string | null
          gas_utility?: string | null
          id?: string
          partner_code?: string | null
          phone?: string | null
          property_address?: string | null
          property_city?: string | null
          property_state?: string | null
          property_type?: string | null
          property_zip?: string | null
          referral_source?: string | null
          square_footage?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          annual_cooling_cost?: number | null
          annual_heating_cost?: number | null
          auth_user_id?: string | null
          created_at?: string
          current_cooling_type?: string | null
          current_heating_type?: string | null
          current_system_age?: number | null
          electric_utility?: string | null
          email?: string
          full_name?: string | null
          gas_utility?: string | null
          id?: string
          partner_code?: string | null
          phone?: string | null
          property_address?: string | null
          property_city?: string | null
          property_state?: string | null
          property_type?: string | null
          property_zip?: string | null
          referral_source?: string | null
          square_footage?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      verified_sessions: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_stats: {
        Row: {
          analyzing_projects: number | null
          community_bid_count: number | null
          community_contractor_count: number | null
          comparing_projects: number | null
          completed_projects: number | null
          draft_projects: number | null
          generated_at: string | null
          processed_pdfs: number | null
          total_bids: number | null
          total_pdfs: number | null
          total_projects: number | null
          total_runs: number | null
          total_users: number | null
          unique_contractors: number | null
        }
        Relationships: []
      }
      v_bid_compare_contractors: {
        Row: {
          bbb_accredited: boolean | null
          bbb_complaints_3yr: number | null
          bbb_rating: string | null
          bid_contractor_id: string | null
          bid_id: string | null
          bonded: boolean | null
          certifications: string[] | null
          company: string | null
          contact_name: string | null
          contractor_name: string | null
          email: string | null
          employee_count: number | null
          google_rating: number | null
          google_review_count: number | null
          insurance_verified: boolean | null
          license: string | null
          license_expiration_date: string | null
          license_state: string | null
          license_status: string | null
          name: string | null
          overall_score: number | null
          phone: string | null
          positive_indicators: Json | null
          project_id: string | null
          red_flags: Json | null
          research_confidence: number | null
          research_notes: string | null
          service_area: string | null
          total_installs: number | null
          verification_date: string | null
          website: string | null
          year_established: number | null
          years_in_business: number | null
          yelp_rating: number | null
          yelp_review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_compare_equipment: {
        Row: {
          afue_rating: number | null
          amperage_draw: number | null
          bid_id: string | null
          brand: string | null
          capacity_btu: number | null
          capacity_tons: number | null
          compressor_warranty_years: number | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          contractor_name: string | null
          cop: number | null
          eer_rating: number | null
          energy_star_certified: boolean | null
          energy_star_most_efficient: boolean | null
          equipment_cost: number | null
          equipment_id: string | null
          equipment_type: string | null
          fuel_type: string | null
          hspf_rating: number | null
          hspf2_rating: number | null
          minimum_circuit_amperage: number | null
          model_name: string | null
          model_number: string | null
          project_id: string | null
          refrigerant_type: string | null
          seer_rating: number | null
          seer2_rating: number | null
          sound_level_db: number | null
          stages: number | null
          system_role: string | null
          system_type: string | null
          variable_speed: boolean | null
          voltage: number | null
          warranty_years: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_compare_scope: {
        Row: {
          accessories: Json | null
          air_handler_detail: string | null
          air_handler_included: boolean | null
          bid_id: string | null
          breaker_size_required: number | null
          commissioning_detail: string | null
          commissioning_included: boolean | null
          contractor_name: string | null
          dedicated_circuit_included: boolean | null
          disconnect_detail: string | null
          disconnect_included: boolean | null
          disposal_detail: string | null
          disposal_included: boolean | null
          drain_line_detail: string | null
          drain_line_included: boolean | null
          ductwork_detail: string | null
          ductwork_included: boolean | null
          electrical_detail: string | null
          electrical_included: boolean | null
          electrical_notes: string | null
          electrical_permit_included: boolean | null
          exclusions: string[] | null
          existing_panel_amps: number | null
          inclusions: string[] | null
          line_items: Json | null
          line_set_detail: string | null
          line_set_included: boolean | null
          load_calculation_included: boolean | null
          manual_j_detail: string | null
          manual_j_included: boolean | null
          pad_detail: string | null
          pad_included: boolean | null
          panel_assessment_included: boolean | null
          panel_upgrade_cost: number | null
          panel_upgrade_included: boolean | null
          permit_detail: string | null
          permit_included: boolean | null
          project_id: string | null
          proposed_panel_amps: number | null
          scope_id: string | null
          summary: string | null
          thermostat_detail: string | null
          thermostat_included: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_full: {
        Row: {
          accessories: Json | null
          additional_warranty_details: string | null
          bc_bbb_accredited: boolean | null
          bc_bbb_rating: string | null
          bc_certifications: string[] | null
          bc_company: string | null
          bc_email: string | null
          bc_google_rating: number | null
          bc_google_review_count: number | null
          bc_license: string | null
          bc_license_state: string | null
          bc_license_status: string | null
          bc_name: string | null
          bc_phone: string | null
          bc_research_confidence: number | null
          bc_website: string | null
          bc_years_in_business: number | null
          bid_date: string | null
          bid_index: number | null
          completeness_score: number | null
          compressor_warranty_years: number | null
          contractor_name: string | null
          created_at: string | null
          deposit_percentage: number | null
          deposit_required: number | null
          disposal_cost: number | null
          disposal_included: boolean | null
          ductwork_included: boolean | null
          electrical_cost: number | null
          electrical_included: boolean | null
          electrical_notes: string | null
          equipment_cost: number | null
          equipment_warranty_years: number | null
          estimated_days: number | null
          estimated_rebates: number | null
          existing_panel_amps: number | null
          extraction_confidence:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          extraction_notes: string | null
          financing_offered: boolean | null
          financing_terms: string | null
          id: string | null
          is_favorite: boolean | null
          labor_cost: number | null
          labor_warranty_years: number | null
          line_items: Json | null
          manual_j_included: boolean | null
          materials_cost: number | null
          overall_score: number | null
          panel_upgrade_included: boolean | null
          payment_schedule: string | null
          pdf_upload_id: string | null
          permit_cost: number | null
          permit_included: boolean | null
          positive_indicators: Json | null
          project_id: string | null
          proposed_panel_amps: number | null
          quality_score: number | null
          ranking_recommendation: string | null
          red_flags: Json | null
          scope_summary: string | null
          start_date_available: string | null
          system_type: string | null
          thermostat_included: boolean | null
          total_after_rebates: number | null
          total_before_rebates: number | null
          total_bid_amount: number | null
          updated_at: string | null
          user_notes: string | null
          valid_until: string | null
          value_score: number | null
          verified_at: string | null
          verified_by_user: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_pdf_upload_id_fkey"
            columns: ["pdf_upload_id"]
            isOneToOne: false
            referencedRelation: "pdf_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_summary: {
        Row: {
          bbb_accredited: boolean | null
          bbb_rating: string | null
          certifications: string[] | null
          completeness_score: number | null
          contractor_company: string | null
          contractor_name: string | null
          created_at: string | null
          equipment_warranty_years: number | null
          estimated_days: number | null
          estimated_rebates: number | null
          google_rating: number | null
          google_review_count: number | null
          id: string | null
          insurance_verified: boolean | null
          is_favorite: boolean | null
          labor_warranty_years: number | null
          license_status: string | null
          overall_score: number | null
          positive_indicators: Json | null
          project_id: string | null
          quality_score: number | null
          ranking_recommendation: string | null
          red_flags: Json | null
          system_type: string | null
          total_after_rebates: number | null
          total_bid_amount: number | null
          value_score: number | null
          years_in_business: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_community_pricing: {
        Row: {
          bid_date: string | null
          certifications: string[] | null
          equipment_cost: number | null
          equipment_type: string | null
          estimated_days: number | null
          google_rating: number | null
          includes_ductwork: boolean | null
          includes_electrical: boolean | null
          includes_permit: boolean | null
          labor_cost: number | null
          labor_warranty_years: number | null
          primary_capacity_tons: number | null
          primary_seer_rating: number | null
          state: string | null
          total_bid_amount: number | null
          years_in_business: number | null
          zip_code_area: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      validate_admin_session: {
        Args: { token: string }
        Returns: {
          admin_id: string
          email: string
          is_super_admin: boolean
          name: string
        }[]
      }
      verify_admin_password: {
        Args: { input_password: string; stored_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      confidence_level: "high" | "medium" | "low" | "manual"
      heat_pump_type:
        | "air_source"
        | "ground_source"
        | "water_source"
        | "mini_split"
        | "ducted"
        | "hybrid"
        | "other"
      line_item_type:
        | "equipment"
        | "labor"
        | "materials"
        | "permit"
        | "disposal"
        | "electrical"
        | "ductwork"
        | "thermostat"
        | "rebate_processing"
        | "warranty"
        | "other"
      pdf_status:
        | "uploaded"
        | "processing"
        | "extracted"
        | "review_needed"
        | "failed"
        | "verified"
      project_status:
        | "draft"
        | "specifications"
        | "collecting_bids"
        | "analyzing"
        | "comparing"
        | "decided"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      confidence_level: ["high", "medium", "low", "manual"],
      heat_pump_type: [
        "air_source",
        "ground_source",
        "water_source",
        "mini_split",
        "ducted",
        "hybrid",
        "other",
      ],
      line_item_type: [
        "equipment",
        "labor",
        "materials",
        "permit",
        "disposal",
        "electrical",
        "ductwork",
        "thermostat",
        "rebate_processing",
        "warranty",
        "other",
      ],
      pdf_status: [
        "uploaded",
        "processing",
        "extracted",
        "review_needed",
        "failed",
        "verified",
      ],
      project_status: [
        "draft",
        "specifications",
        "collecting_bids",
        "analyzing",
        "comparing",
        "decided",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
