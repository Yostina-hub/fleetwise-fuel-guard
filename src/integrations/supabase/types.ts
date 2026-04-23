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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accident_claims: {
        Row: {
          accident_date: string
          accident_location: string | null
          actual_repair_cost: number | null
          agreed_amount: number | null
          approved_amount: number | null
          approved_at: string | null
          archived: boolean | null
          archived_at: string | null
          claim_amount: number | null
          claim_number: string
          collected_at: string | null
          collected_from_third_party: number | null
          compensation_requested_at: string | null
          completeness_check: string | null
          completeness_checked_at: string | null
          completeness_checked_by: string | null
          covered_by_policy: boolean | null
          created_at: string
          damage_description: string | null
          description: string | null
          documents: string[] | null
          driver_id: string | null
          estimated_repair_cost: number | null
          fault_determination: string | null
          fault_party: string | null
          filed_at: string | null
          finance_notified_at: string | null
          finance_notified_by: string | null
          forwarded_to_insurance_at: string | null
          forwarded_to_insurance_by: string | null
          id: string
          incident_id: string | null
          incident_type: string
          insurance_id: string | null
          legal_case_number: string | null
          legal_filed_at: string | null
          legal_outcome: string | null
          legal_outcome_at: string | null
          legal_status: string | null
          maintenance_per_wo_ok: boolean | null
          notes: string | null
          notification_letter_sent_at: string | null
          notification_letter_sent_by: string | null
          notification_letter_url: string | null
          organization_id: string
          payment_receipt_url: string | null
          payment_requested_by_garage_at: string | null
          photos: string[] | null
          police_report_number: string | null
          policy_analysis_notes: string | null
          pro_forma_invoice_url: string | null
          quotation_amount: number | null
          quotation_count: number | null
          quotation_selected_at: string | null
          quotations_requested_at: string | null
          receipt_signed_at: string | null
          repair_completion_reported_at: string | null
          repair_end_date: string | null
          repair_start_date: string | null
          repair_status: string | null
          repair_vendor: string | null
          salvage_collected: boolean | null
          salvage_collected_at: string | null
          salvage_notes: string | null
          salvage_value: number | null
          selected_supplier_contact: string | null
          selected_supplier_garage: string | null
          settled_at: string | null
          settlement_amount: number | null
          settlement_reference: string | null
          status: string | null
          third_party_agreed: boolean | null
          third_party_contact: string | null
          third_party_dealt_at: string | null
          third_party_insurance: string | null
          third_party_name: string | null
          third_party_vehicle: string | null
          updated_at: string
          vehicle_handover_at: string | null
          vehicle_id: string
          vehicle_returned_at: string | null
          within_insurance_coverage: boolean | null
          within_limit: boolean | null
          work_order_approved_at: string | null
          work_order_number: string | null
          work_order_url: string | null
          workflow_stage: string
        }
        Insert: {
          accident_date: string
          accident_location?: string | null
          actual_repair_cost?: number | null
          agreed_amount?: number | null
          approved_amount?: number | null
          approved_at?: string | null
          archived?: boolean | null
          archived_at?: string | null
          claim_amount?: number | null
          claim_number: string
          collected_at?: string | null
          collected_from_third_party?: number | null
          compensation_requested_at?: string | null
          completeness_check?: string | null
          completeness_checked_at?: string | null
          completeness_checked_by?: string | null
          covered_by_policy?: boolean | null
          created_at?: string
          damage_description?: string | null
          description?: string | null
          documents?: string[] | null
          driver_id?: string | null
          estimated_repair_cost?: number | null
          fault_determination?: string | null
          fault_party?: string | null
          filed_at?: string | null
          finance_notified_at?: string | null
          finance_notified_by?: string | null
          forwarded_to_insurance_at?: string | null
          forwarded_to_insurance_by?: string | null
          id?: string
          incident_id?: string | null
          incident_type?: string
          insurance_id?: string | null
          legal_case_number?: string | null
          legal_filed_at?: string | null
          legal_outcome?: string | null
          legal_outcome_at?: string | null
          legal_status?: string | null
          maintenance_per_wo_ok?: boolean | null
          notes?: string | null
          notification_letter_sent_at?: string | null
          notification_letter_sent_by?: string | null
          notification_letter_url?: string | null
          organization_id: string
          payment_receipt_url?: string | null
          payment_requested_by_garage_at?: string | null
          photos?: string[] | null
          police_report_number?: string | null
          policy_analysis_notes?: string | null
          pro_forma_invoice_url?: string | null
          quotation_amount?: number | null
          quotation_count?: number | null
          quotation_selected_at?: string | null
          quotations_requested_at?: string | null
          receipt_signed_at?: string | null
          repair_completion_reported_at?: string | null
          repair_end_date?: string | null
          repair_start_date?: string | null
          repair_status?: string | null
          repair_vendor?: string | null
          salvage_collected?: boolean | null
          salvage_collected_at?: string | null
          salvage_notes?: string | null
          salvage_value?: number | null
          selected_supplier_contact?: string | null
          selected_supplier_garage?: string | null
          settled_at?: string | null
          settlement_amount?: number | null
          settlement_reference?: string | null
          status?: string | null
          third_party_agreed?: boolean | null
          third_party_contact?: string | null
          third_party_dealt_at?: string | null
          third_party_insurance?: string | null
          third_party_name?: string | null
          third_party_vehicle?: string | null
          updated_at?: string
          vehicle_handover_at?: string | null
          vehicle_id: string
          vehicle_returned_at?: string | null
          within_insurance_coverage?: boolean | null
          within_limit?: boolean | null
          work_order_approved_at?: string | null
          work_order_number?: string | null
          work_order_url?: string | null
          workflow_stage?: string
        }
        Update: {
          accident_date?: string
          accident_location?: string | null
          actual_repair_cost?: number | null
          agreed_amount?: number | null
          approved_amount?: number | null
          approved_at?: string | null
          archived?: boolean | null
          archived_at?: string | null
          claim_amount?: number | null
          claim_number?: string
          collected_at?: string | null
          collected_from_third_party?: number | null
          compensation_requested_at?: string | null
          completeness_check?: string | null
          completeness_checked_at?: string | null
          completeness_checked_by?: string | null
          covered_by_policy?: boolean | null
          created_at?: string
          damage_description?: string | null
          description?: string | null
          documents?: string[] | null
          driver_id?: string | null
          estimated_repair_cost?: number | null
          fault_determination?: string | null
          fault_party?: string | null
          filed_at?: string | null
          finance_notified_at?: string | null
          finance_notified_by?: string | null
          forwarded_to_insurance_at?: string | null
          forwarded_to_insurance_by?: string | null
          id?: string
          incident_id?: string | null
          incident_type?: string
          insurance_id?: string | null
          legal_case_number?: string | null
          legal_filed_at?: string | null
          legal_outcome?: string | null
          legal_outcome_at?: string | null
          legal_status?: string | null
          maintenance_per_wo_ok?: boolean | null
          notes?: string | null
          notification_letter_sent_at?: string | null
          notification_letter_sent_by?: string | null
          notification_letter_url?: string | null
          organization_id?: string
          payment_receipt_url?: string | null
          payment_requested_by_garage_at?: string | null
          photos?: string[] | null
          police_report_number?: string | null
          policy_analysis_notes?: string | null
          pro_forma_invoice_url?: string | null
          quotation_amount?: number | null
          quotation_count?: number | null
          quotation_selected_at?: string | null
          quotations_requested_at?: string | null
          receipt_signed_at?: string | null
          repair_completion_reported_at?: string | null
          repair_end_date?: string | null
          repair_start_date?: string | null
          repair_status?: string | null
          repair_vendor?: string | null
          salvage_collected?: boolean | null
          salvage_collected_at?: string | null
          salvage_notes?: string | null
          salvage_value?: number | null
          selected_supplier_contact?: string | null
          selected_supplier_garage?: string | null
          settled_at?: string | null
          settlement_amount?: number | null
          settlement_reference?: string | null
          status?: string | null
          third_party_agreed?: boolean | null
          third_party_contact?: string | null
          third_party_dealt_at?: string | null
          third_party_insurance?: string | null
          third_party_name?: string | null
          third_party_vehicle?: string | null
          updated_at?: string
          vehicle_handover_at?: string | null
          vehicle_id?: string
          vehicle_returned_at?: string | null
          within_insurance_coverage?: boolean | null
          within_limit?: boolean | null
          work_order_approved_at?: string | null
          work_order_number?: string | null
          work_order_url?: string | null
          workflow_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "accident_claims_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accident_claims_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "vehicle_insurance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accident_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accident_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_lockouts: {
        Row: {
          created_at: string | null
          email: string | null
          failed_attempts: number | null
          id: string
          ip_address: string | null
          lockout_reason: string | null
          lockout_type: string | null
          lockout_until: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          failed_attempts?: number | null
          id?: string
          ip_address?: string | null
          lockout_reason?: string | null
          lockout_type?: string | null
          lockout_until?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          failed_attempts?: number | null
          id?: string
          ip_address?: string | null
          lockout_reason?: string | null
          lockout_type?: string | null
          lockout_until?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      administrative_localities: {
        Row: {
          admin_region: string
          created_at: string | null
          id: string
          woreda: string
          zone: string
        }
        Insert: {
          admin_region: string
          created_at?: string | null
          id?: string
          woreda: string
          zone: string
        }
        Update: {
          admin_region?: string
          created_at?: string | null
          id?: string
          woreda?: string
          zone?: string
        }
        Relationships: []
      }
      alcohol_fatigue_tests: {
        Row: {
          action_taken: string | null
          created_at: string
          device_name: string | null
          device_serial: string | null
          driver_id: string
          id: string
          location: string | null
          notes: string | null
          organization_id: string
          pass: boolean | null
          reading_value: number | null
          result: string
          test_date: string
          test_type: string
          tested_by: string | null
          threshold_value: number | null
          unit: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          device_name?: string | null
          device_serial?: string | null
          driver_id: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id: string
          pass?: boolean | null
          reading_value?: number | null
          result?: string
          test_date?: string
          test_type?: string
          tested_by?: string | null
          threshold_value?: number | null
          unit?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          device_name?: string | null
          device_serial?: string | null
          driver_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string
          pass?: boolean | null
          reading_value?: number | null
          result?: string
          test_date?: string
          test_type?: string
          tested_by?: string | null
          threshold_value?: number | null
          unit?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alcohol_fatigue_tests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_fatigue_tests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_fatigue_tests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_dashcam_links: {
        Row: {
          alert_id: string
          created_at: string
          dashcam_event_id: string
          id: string
          link_type: string
          linked_by: string | null
          notes: string | null
          organization_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          dashcam_event_id: string
          id?: string
          link_type?: string
          linked_by?: string | null
          notes?: string | null
          organization_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          dashcam_event_id?: string
          id?: string
          link_type?: string
          linked_by?: string | null
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_dashcam_links_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_dashcam_links_dashcam_event_id_fkey"
            columns: ["dashcam_event_id"]
            isOneToOne: false
            referencedRelation: "dash_cam_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_dashcam_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          conditions: Json
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          notification_channels: Json | null
          notification_recipients: Json | null
          organization_id: string
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          conditions: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          notification_channels?: Json | null
          notification_recipients?: Json | null
          organization_id: string
          rule_type: string
          severity: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notification_channels?: Json | null
          notification_recipients?: Json | null
          organization_id?: string
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_data: Json | null
          alert_rule_id: string | null
          alert_time: string
          alert_type: string
          created_at: string
          driver_id: string | null
          id: string
          lat: number | null
          lng: number | null
          location_name: string | null
          message: string
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          title: string
          trip_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_data?: Json | null
          alert_rule_id?: string | null
          alert_time: string
          alert_type: string
          created_at?: string
          driver_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          message: string
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          title: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_data?: Json | null
          alert_rule_id?: string | null
          alert_time?: string
          alert_type?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          message?: string
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          title?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          ip_whitelist: string[] | null
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          rate_limit_per_hour: number | null
          scopes: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          rate_limit_per_hour?: number | null
          scopes?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          rate_limit_per_hour?: number | null
          scopes?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          api_key_id: string
          created_at: string
          id: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          id?: string
          request_count?: number | null
          window_start: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          id?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_levels: {
        Row: {
          auto_approve_below: number | null
          cost_threshold_max: number | null
          cost_threshold_min: number | null
          created_at: string
          id: string
          is_active: boolean | null
          level_name: string
          level_order: number
          organization_id: string
          requires_all_prior: boolean | null
          role: string
          updated_at: string
        }
        Insert: {
          auto_approve_below?: number | null
          cost_threshold_max?: number | null
          cost_threshold_min?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          level_name: string
          level_order?: number
          organization_id: string
          requires_all_prior?: boolean | null
          role: string
          updated_at?: string
        }
        Update: {
          auto_approve_below?: number | null
          cost_threshold_max?: number | null
          cost_threshold_min?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          level_name?: string
          level_order?: number
          organization_id?: string
          requires_all_prior?: boolean | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_fuel_stations: {
        Row: {
          brand: string | null
          created_at: string
          diesel_available: boolean | null
          diesel_price_per_liter: number | null
          diesel_stock_liters: number | null
          geofence_id: string | null
          hours_of_operation: string | null
          id: string
          is_active: boolean | null
          last_stock_update: string | null
          lat: number
          lng: number
          name: string
          organization_id: string
          petrol_available: boolean | null
          petrol_price_per_liter: number | null
          petrol_stock_liters: number | null
          phone: string | null
          radius_meters: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          diesel_available?: boolean | null
          diesel_price_per_liter?: number | null
          diesel_stock_liters?: number | null
          geofence_id?: string | null
          hours_of_operation?: string | null
          id?: string
          is_active?: boolean | null
          last_stock_update?: string | null
          lat: number
          lng: number
          name: string
          organization_id: string
          petrol_available?: boolean | null
          petrol_price_per_liter?: number | null
          petrol_stock_liters?: number | null
          phone?: string | null
          radius_meters?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          diesel_available?: boolean | null
          diesel_price_per_liter?: number | null
          diesel_stock_liters?: number | null
          geofence_id?: string | null
          hours_of_operation?: string | null
          id?: string
          is_active?: boolean | null
          last_stock_update?: string | null
          lat?: number
          lng?: number
          name?: string
          organization_id?: string
          petrol_available?: boolean | null
          petrol_price_per_liter?: number | null
          petrol_stock_liters?: number | null
          phone?: string | null
          radius_meters?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_fuel_stations_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_fuel_stations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_cost_records: {
        Row: {
          amount: number
          asset_id: string
          cost_type: string
          created_at: string
          description: string | null
          id: string
          maintenance_schedule_id: string | null
          organization_id: string
          receipt_url: string | null
          recorded_by: string | null
          recorded_date: string
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          amount?: number
          asset_id: string
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          maintenance_schedule_id?: string | null
          organization_id: string
          receipt_url?: string | null
          recorded_by?: string | null
          recorded_date?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          maintenance_schedule_id?: string | null
          organization_id?: string
          receipt_url?: string | null
          recorded_by?: string | null
          recorded_date?: string
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_cost_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fleet_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_records_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_inventory: {
        Row: {
          asset_id: string
          created_at: string
          current_quantity: number
          id: string
          last_counted_at: string | null
          last_restocked_at: string | null
          minimum_quantity: number | null
          organization_id: string
          reorder_point: number | null
          stock_location: string | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          current_quantity?: number
          id?: string
          last_counted_at?: string | null
          last_restocked_at?: string | null
          minimum_quantity?: number | null
          organization_id: string
          reorder_point?: number | null
          stock_location?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          current_quantity?: number
          id?: string
          last_counted_at?: string | null
          last_restocked_at?: string | null
          minimum_quantity?: number | null
          organization_id?: string
          reorder_point?: number | null
          stock_location?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_inventory_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fleet_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_lifecycle_events: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          documents: string[] | null
          event_date: string
          event_type: string
          from_stage: string | null
          id: string
          notes: string | null
          organization_id: string
          performed_by: string | null
          to_stage: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          documents?: string[] | null
          event_date?: string
          event_type?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          performed_by?: string | null
          to_stage?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          documents?: string[] | null
          event_date?: string
          event_type?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          performed_by?: string | null
          to_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_lifecycle_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fleet_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_lifecycle_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          api_key_id: string | null
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          resource_id: string | null
          resource_type: string
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          api_key_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          resource_id?: string | null
          resource_type: string
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          api_key_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          resource_id?: string | null
          resource_type?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_matrix: {
        Row: {
          approver_role: string
          auto_approve_roles: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          max_duration_days: number | null
          min_amount: number | null
          min_duration_days: number | null
          organization_id: string
          priority: number
          rule_name: string
          scope: string
          step_order: number
          updated_at: string
        }
        Insert: {
          approver_role: string
          auto_approve_roles?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          max_duration_days?: number | null
          min_amount?: number | null
          min_duration_days?: number | null
          organization_id: string
          priority?: number
          rule_name: string
          scope: string
          step_order?: number
          updated_at?: string
        }
        Update: {
          approver_role?: string
          auto_approve_roles?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          max_duration_days?: number | null
          min_amount?: number | null
          min_duration_days?: number | null
          organization_id?: string
          priority?: number
          rule_name?: string
          scope?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authority_matrix_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_integration_configs: {
        Row: {
          api_endpoint: string
          auth_type: string
          billable_entities: Json
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          organization_id: string
          provider: string
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          api_endpoint?: string
          auth_type?: string
          billable_entities?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id: string
          provider?: string
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          api_endpoint?: string
          auth_type?: string
          billable_entities?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_integration_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_sync_events: {
        Row: {
          amount: number | null
          config_id: string | null
          created_at: string
          currency: string
          error_message: string | null
          event_description: string
          id: string
          organization_id: string
          response_code: number | null
          status: string
        }
        Insert: {
          amount?: number | null
          config_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          event_description: string
          id?: string
          organization_id: string
          response_code?: number | null
          status?: string
        }
        Update: {
          amount?: number | null
          config_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          event_description?: string
          id?: string
          organization_id?: string
          response_code?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_sync_events_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "billing_integration_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_sync_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      breach_incidents: {
        Row: {
          affected_data_types: string[] | null
          affected_records_count: number | null
          authority_notified_at: string | null
          breach_type: string
          containment_actions: string | null
          created_at: string
          description: string | null
          discovered_at: string
          dpo_notified: boolean | null
          id: string
          incident_number: string
          notification_deadline: string
          occurred_at: string | null
          organization_id: string
          remediation_actions: string | null
          reported_by: string | null
          risk_to_rights: string | null
          root_cause: string | null
          severity: string
          status: string
          subjects_notified_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_data_types?: string[] | null
          affected_records_count?: number | null
          authority_notified_at?: string | null
          breach_type?: string
          containment_actions?: string | null
          created_at?: string
          description?: string | null
          discovered_at?: string
          dpo_notified?: boolean | null
          id?: string
          incident_number: string
          notification_deadline?: string
          occurred_at?: string | null
          organization_id: string
          remediation_actions?: string | null
          reported_by?: string | null
          risk_to_rights?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          subjects_notified_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_data_types?: string[] | null
          affected_records_count?: number | null
          authority_notified_at?: string | null
          breach_type?: string
          containment_actions?: string | null
          created_at?: string
          description?: string | null
          discovered_at?: string
          dpo_notified?: boolean | null
          id?: string
          incident_number?: string
          notification_deadline?: string
          occurred_at?: string | null
          organization_id?: string
          remediation_actions?: string | null
          reported_by?: string | null
          risk_to_rights?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          subjects_notified_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breach_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          entity_type: string
          error_log: Json | null
          failed_records: number | null
          file_name: string | null
          file_url: string | null
          format: string
          id: string
          job_type: string
          organization_id: string
          processed_records: number | null
          started_at: string | null
          status: string
          total_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          entity_type: string
          error_log?: Json | null
          failed_records?: number | null
          file_name?: string | null
          file_url?: string | null
          format: string
          id?: string
          job_type: string
          organization_id: string
          processed_records?: number | null
          started_at?: string | null
          status?: string
          total_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          entity_type?: string
          error_log?: Json | null
          failed_records?: number | null
          file_name?: string | null
          file_url?: string | null
          format?: string
          id?: string
          job_type?: string
          organization_id?: string
          processed_records?: number | null
          started_at?: string | null
          status?: string
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_units: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      carbon_emissions: {
        Row: {
          calculation_method: string | null
          co2_kg: number
          created_at: string
          distance_km: number | null
          emission_factor: number | null
          emission_source: string | null
          fuel_consumed_liters: number | null
          id: string
          notes: string | null
          offset_credits: number | null
          organization_id: string
          period_end: string
          period_start: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          calculation_method?: string | null
          co2_kg?: number
          created_at?: string
          distance_km?: number | null
          emission_factor?: number | null
          emission_source?: string | null
          fuel_consumed_liters?: number | null
          id?: string
          notes?: string | null
          offset_credits?: number | null
          organization_id: string
          period_end: string
          period_start: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          calculation_method?: string | null
          co2_kg?: number
          created_at?: string
          distance_km?: number | null
          emission_factor?: number | null
          emission_source?: string | null
          fuel_consumed_liters?: number | null
          id?: string
          notes?: string | null
          offset_credits?: number | null
          organization_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carbon_emissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carbon_emissions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_workflow_transitions: {
        Row: {
          claim_id: string
          created_at: string
          decision: string | null
          from_stage: string | null
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          performed_by: string | null
          performed_by_name: string | null
          to_stage: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          decision?: string | null
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          performed_by?: string | null
          performed_by_name?: string | null
          to_stage: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          decision?: string | null
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_workflow_transitions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "accident_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_workflow_transitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cold_chain_readings: {
        Row: {
          alarm_type: string | null
          compressor_status: string | null
          created_at: string
          door_status: string | null
          humidity_percent: number | null
          id: string
          is_alarm: boolean | null
          lat: number | null
          lng: number | null
          max_threshold: number | null
          min_threshold: number | null
          organization_id: string
          power_status: string | null
          recorded_at: string
          sensor_id: string | null
          temperature_celsius: number
          vehicle_id: string
          voltage: number | null
        }
        Insert: {
          alarm_type?: string | null
          compressor_status?: string | null
          created_at?: string
          door_status?: string | null
          humidity_percent?: number | null
          id?: string
          is_alarm?: boolean | null
          lat?: number | null
          lng?: number | null
          max_threshold?: number | null
          min_threshold?: number | null
          organization_id: string
          power_status?: string | null
          recorded_at?: string
          sensor_id?: string | null
          temperature_celsius: number
          vehicle_id: string
          voltage?: number | null
        }
        Update: {
          alarm_type?: string | null
          compressor_status?: string | null
          created_at?: string
          door_status?: string | null
          humidity_percent?: number | null
          id?: string
          is_alarm?: boolean | null
          lat?: number | null
          lng?: number | null
          max_threshold?: number | null
          min_threshold?: number | null
          organization_id?: string
          power_status?: string | null
          recorded_at?: string
          sensor_id?: string | null
          temperature_celsius?: number
          vehicle_id?: string
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cold_chain_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cold_chain_readings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_calendar: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          deadline: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          reminder_days_before: number | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deadline: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          reminder_days_before?: number | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          reminder_days_before?: number | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_calendar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          collected_by: string | null
          consent_given: boolean
          consent_text: string | null
          consent_type: string
          consent_version: string
          created_at: string
          driver_id: string | null
          expires_at: string | null
          given_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string
          updated_at: string
          user_id: string | null
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          collected_by?: string | null
          consent_given?: boolean
          consent_text?: string | null
          consent_type: string
          consent_version?: string
          created_at?: string
          driver_id?: string | null
          expires_at?: string | null
          given_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id: string
          updated_at?: string
          user_id?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          collected_by?: string | null
          consent_given?: boolean
          consent_text?: string | null
          consent_type?: string
          consent_version?: string
          created_at?: string
          driver_id?: string | null
          expires_at?: string | null
          given_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string
          updated_at?: string
          user_id?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_renew: boolean | null
          contract_number: string
          contract_type: string
          created_at: string
          currency: string | null
          description: string | null
          document_url: string | null
          end_date: string | null
          id: string
          notes: string | null
          organization_id: string
          party_name: string
          start_date: string
          status: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          auto_renew?: boolean | null
          contract_number: string
          contract_type?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          party_name: string
          start_date: string
          status?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          auto_renew?: boolean | null
          contract_number?: string
          contract_type?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          party_name?: string
          start_date?: string
          status?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          file_url: string
          id: string
          mime_type: string | null
          organization_id: string
          sort_order: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string
          file_url: string
          id?: string
          mime_type?: string | null
          organization_id: string
          sort_order?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          sort_order?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_history: {
        Row: {
          details: string | null
          duration_ms: number | null
          executed_at: string
          id: string
          job_name: string
          organization_id: string | null
          status: string
        }
        Insert: {
          details?: string | null
          duration_ms?: number | null
          executed_at?: string
          id?: string
          job_name: string
          organization_id?: string | null
          status?: string
        }
        Update: {
          details?: string | null
          duration_ms?: number | null
          executed_at?: string
          id?: string
          job_name?: string
          organization_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cron_job_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_pool_borrow_requests: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reason: string | null
          requested_by: string | null
          requested_driver_id: string | null
          requested_vehicle_id: string | null
          responded_at: string | null
          responded_by: string | null
          response_notes: string | null
          source_pool: string
          status: string
          target_pool: string
          updated_at: string
          vehicle_request_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reason?: string | null
          requested_by?: string | null
          requested_driver_id?: string | null
          requested_vehicle_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_notes?: string | null
          source_pool: string
          status?: string
          target_pool: string
          updated_at?: string
          vehicle_request_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          requested_by?: string | null
          requested_driver_id?: string | null
          requested_vehicle_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_notes?: string | null
          source_pool?: string
          status?: string
          target_pool?: string
          updated_at?: string
          vehicle_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cross_pool_borrow_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_pool_borrow_requests_requested_driver_id_fkey"
            columns: ["requested_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_pool_borrow_requests_requested_vehicle_id_fkey"
            columns: ["requested_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_pool_borrow_requests_vehicle_request_id_fkey"
            columns: ["vehicle_request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_role_permissions: {
        Row: {
          created_at: string
          custom_role_id: string
          id: string
          permission_id: string
        }
        Insert: {
          created_at?: string
          custom_role_id: string
          id?: string
          permission_id: string
        }
        Update: {
          created_at?: string
          custom_role_id?: string
          id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_role_permissions_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          label: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          label?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dash_cam_events: {
        Row: {
          ai_confidence: number | null
          ai_detected: boolean | null
          ai_labels: Json | null
          created_at: string
          driver_id: string | null
          duration_seconds: number | null
          event_time: string
          event_type: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          speed_kmh: number | null
          status: string | null
          thumbnail_url: string | null
          updated_at: string
          vehicle_id: string
          video_url: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_detected?: boolean | null
          ai_labels?: Json | null
          created_at?: string
          driver_id?: string | null
          duration_seconds?: number | null
          event_time?: string
          event_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          speed_kmh?: number | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vehicle_id: string
          video_url?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_detected?: boolean | null
          ai_labels?: Json | null
          created_at?: string
          driver_id?: string | null
          duration_seconds?: number | null
          event_time?: string
          event_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          speed_kmh?: number | null
          status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          vehicle_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dash_cam_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dash_cam_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dash_cam_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id: string
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_cleanup_at: string | null
          organization_id: string
          retention_days: number
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_cleanup_at?: string | null
          organization_id: string
          retention_days: number
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_cleanup_at?: string | null
          organization_id?: string
          retention_days?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity_name: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          scope: string | null
          source_id: string | null
          source_table: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_name?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          scope?: string | null
          source_id?: string | null
          source_table: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity_name?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          scope?: string | null
          source_id?: string | null
          source_table?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_matrix: {
        Row: {
          created_at: string
          delegate_id: string
          delegate_name: string
          delegator_id: string
          delegator_name: string
          id: string
          is_active: boolean | null
          organization_id: string
          reason: string | null
          scope: string | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          delegate_id: string
          delegate_name: string
          delegator_id: string
          delegator_name: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          reason?: string | null
          scope?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          delegate_id?: string
          delegate_name?: string
          delegator_id?: string
          delegator_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          reason?: string | null
          scope?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_matrix_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_rules: {
        Row: {
          activation_trigger: string | null
          auto_activate: boolean | null
          cost_limit: number | null
          created_at: string
          created_by: string | null
          delegate_id: string
          delegate_name: string
          delegator_id: string
          delegator_name: string
          id: string
          is_active: boolean | null
          organization_id: string
          priority_limit: string | null
          reason: string | null
          scope: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          activation_trigger?: string | null
          auto_activate?: boolean | null
          cost_limit?: number | null
          created_at?: string
          created_by?: string | null
          delegate_id: string
          delegate_name: string
          delegator_id: string
          delegator_name: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          priority_limit?: string | null
          reason?: string | null
          scope?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          activation_trigger?: string | null
          auto_activate?: boolean | null
          cost_limit?: number | null
          created_at?: string
          created_by?: string | null
          delegate_id?: string
          delegate_name?: string
          delegator_id?: string
          delegator_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          priority_limit?: string | null
          reason?: string | null
          scope?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      depots: {
        Row: {
          address: string | null
          business_unit_id: string
          created_at: string
          depot_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_unit_id: string
          created_at?: string
          depot_type?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_unit_id?: string
          created_at?: string
          depot_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depots_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      device_commands: {
        Row: {
          acknowledged_at: string | null
          command_payload: Json
          command_type: string
          created_at: string
          created_by: string | null
          device_id: string
          error_message: string | null
          executed_at: string | null
          expires_at: string | null
          id: string
          max_retries: number | null
          organization_id: string
          priority: string
          response_data: Json | null
          retry_count: number | null
          sent_at: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          command_payload?: Json
          command_type: string
          created_at?: string
          created_by?: string | null
          device_id: string
          error_message?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          max_retries?: number | null
          organization_id: string
          priority?: string
          response_data?: Json | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          command_payload?: Json
          command_type?: string
          created_at?: string
          created_by?: string | null
          device_id?: string
          error_message?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          max_retries?: number | null
          organization_id?: string
          priority?: string
          response_data?: Json | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_commands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_commands_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_compatibility_profiles: {
        Row: {
          capabilities: Json | null
          command_templates: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          model_name: string
          notes: string | null
          organization_id: string
          protocol_name: string
          setup_config: Json | null
          supported_commands: string[] | null
          telemetry_fields: string[] | null
          updated_at: string
          vendor: string
        }
        Insert: {
          capabilities?: Json | null
          command_templates?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_name: string
          notes?: string | null
          organization_id: string
          protocol_name: string
          setup_config?: Json | null
          supported_commands?: string[] | null
          telemetry_fields?: string[] | null
          updated_at?: string
          vendor: string
        }
        Update: {
          capabilities?: Json | null
          command_templates?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          model_name?: string
          notes?: string | null
          organization_id?: string
          protocol_name?: string
          setup_config?: Json | null
          supported_commands?: string[] | null
          telemetry_fields?: string[] | null
          updated_at?: string
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_compatibility_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_offline_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          notification_emails: string[]
          notification_sms: string[] | null
          offline_threshold_minutes: number
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_emails: string[]
          notification_sms?: string[] | null
          offline_threshold_minutes?: number
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notification_emails?: string[]
          notification_sms?: string[] | null
          offline_threshold_minutes?: number
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      device_offline_events: {
        Row: {
          back_online_at: string | null
          created_at: string | null
          device_id: string
          id: string
          notification_sent: boolean | null
          notification_sent_at: string | null
          offline_duration_minutes: number | null
          offline_since: string
          organization_id: string
          vehicle_id: string | null
        }
        Insert: {
          back_online_at?: string | null
          created_at?: string | null
          device_id: string
          id?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          offline_duration_minutes?: number | null
          offline_since: string
          organization_id: string
          vehicle_id?: string | null
        }
        Update: {
          back_online_at?: string | null
          created_at?: string | null
          device_id?: string
          id?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          offline_duration_minutes?: number | null
          offline_since?: string
          organization_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_offline_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_offline_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_protocols: {
        Row: {
          created_at: string
          decoder_config: Json
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string
          protocol_name: string
          updated_at: string
          vendor: string
          version: string | null
        }
        Insert: {
          created_at?: string
          decoder_config: Json
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          protocol_name: string
          updated_at?: string
          vendor: string
          version?: string | null
        }
        Update: {
          created_at?: string
          decoder_config?: Json
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          protocol_name?: string
          updated_at?: string
          vendor?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_protocols_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_rate_limits: {
        Row: {
          created_at: string
          device_id: string
          id: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          request_count?: number | null
          window_start: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_rate_limits_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_terminal_settings: {
        Row: {
          acc_notify_off: boolean | null
          acc_notify_on: boolean | null
          alarm_geofence: boolean | null
          alarm_low_battery: boolean | null
          alarm_overspeed: boolean | null
          alarm_power_cut: boolean | null
          alarm_send_times: number | null
          alarm_sos: boolean | null
          alarm_vibration: boolean | null
          auth_number: string | null
          bluetooth_enabled: boolean | null
          created_at: string
          device_id: string
          harsh_acceleration_threshold: number | null
          harsh_braking_threshold: number | null
          id: string
          idling_threshold: number | null
          initial_mileage: number | null
          min_reporting_interval: number
          oil_calibration: number | null
          organization_id: string
          reporting_interval_moving: number
          reporting_interval_stationary: number
          sensitivity: number | null
          sharp_turn_threshold: number | null
          sms_password: string | null
          speaker_enabled: boolean | null
          tank_volume: number | null
          timezone: string | null
          turning_angle: number | null
          unit_system: string | null
          updated_at: string
        }
        Insert: {
          acc_notify_off?: boolean | null
          acc_notify_on?: boolean | null
          alarm_geofence?: boolean | null
          alarm_low_battery?: boolean | null
          alarm_overspeed?: boolean | null
          alarm_power_cut?: boolean | null
          alarm_send_times?: number | null
          alarm_sos?: boolean | null
          alarm_vibration?: boolean | null
          auth_number?: string | null
          bluetooth_enabled?: boolean | null
          created_at?: string
          device_id: string
          harsh_acceleration_threshold?: number | null
          harsh_braking_threshold?: number | null
          id?: string
          idling_threshold?: number | null
          initial_mileage?: number | null
          min_reporting_interval?: number
          oil_calibration?: number | null
          organization_id: string
          reporting_interval_moving?: number
          reporting_interval_stationary?: number
          sensitivity?: number | null
          sharp_turn_threshold?: number | null
          sms_password?: string | null
          speaker_enabled?: boolean | null
          tank_volume?: number | null
          timezone?: string | null
          turning_angle?: number | null
          unit_system?: string | null
          updated_at?: string
        }
        Update: {
          acc_notify_off?: boolean | null
          acc_notify_on?: boolean | null
          alarm_geofence?: boolean | null
          alarm_low_battery?: boolean | null
          alarm_overspeed?: boolean | null
          alarm_power_cut?: boolean | null
          alarm_send_times?: number | null
          alarm_sos?: boolean | null
          alarm_vibration?: boolean | null
          auth_number?: string | null
          bluetooth_enabled?: boolean | null
          created_at?: string
          device_id?: string
          harsh_acceleration_threshold?: number | null
          harsh_braking_threshold?: number | null
          id?: string
          idling_threshold?: number | null
          initial_mileage?: number | null
          min_reporting_interval?: number
          oil_calibration?: number | null
          organization_id?: string
          reporting_interval_moving?: number
          reporting_interval_stationary?: number
          sensitivity?: number | null
          sharp_turn_threshold?: number | null
          sms_password?: string | null
          speaker_enabled?: boolean | null
          tank_volume?: number | null
          timezone?: string | null
          turning_angle?: number | null
          unit_system?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_terminal_settings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_terminal_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          apn: string | null
          auth_token: string | null
          auth_token_created_at: string | null
          compatibility_profile_id: string | null
          created_at: string
          firmware_version: string | null
          id: string
          imei: string
          install_date: string | null
          installed_by: string | null
          last_firmware_update: string | null
          last_heartbeat: string | null
          notes: string | null
          organization_id: string
          protocol_id: string | null
          serial_number: string | null
          sim_iccid: string | null
          sim_msisdn: string | null
          status: string
          tracker_model: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          apn?: string | null
          auth_token?: string | null
          auth_token_created_at?: string | null
          compatibility_profile_id?: string | null
          created_at?: string
          firmware_version?: string | null
          id?: string
          imei: string
          install_date?: string | null
          installed_by?: string | null
          last_firmware_update?: string | null
          last_heartbeat?: string | null
          notes?: string | null
          organization_id: string
          protocol_id?: string | null
          serial_number?: string | null
          sim_iccid?: string | null
          sim_msisdn?: string | null
          status?: string
          tracker_model: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          apn?: string | null
          auth_token?: string | null
          auth_token_created_at?: string | null
          compatibility_profile_id?: string | null
          created_at?: string
          firmware_version?: string | null
          id?: string
          imei?: string
          install_date?: string | null
          installed_by?: string | null
          last_firmware_update?: string | null
          last_heartbeat?: string | null
          notes?: string | null
          organization_id?: string
          protocol_id?: string | null
          serial_number?: string | null
          sim_iccid?: string | null
          sim_msisdn?: string | null
          status?: string
          tracker_model?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_compatibility_profile_id_fkey"
            columns: ["compatibility_profile_id"]
            isOneToOne: false
            referencedRelation: "device_compatibility_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "device_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_jobs: {
        Row: {
          actual_dropoff_at: string | null
          actual_pickup_at: string | null
          cargo_description: string | null
          cargo_weight_kg: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          dispatched_at: string | null
          distance_traveled_km: number | null
          driver_id: string | null
          dropoff_geofence_id: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_location_name: string | null
          id: string
          job_number: string
          job_type: string
          odometer_end: number | null
          odometer_start: number | null
          organization_id: string
          pickup_geofence_id: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location_name: string | null
          priority: string | null
          scheduled_dropoff_at: string | null
          scheduled_pickup_at: string | null
          sla_deadline_at: string | null
          sla_met: boolean | null
          special_instructions: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_dropoff_at?: string | null
          actual_pickup_at?: string | null
          cargo_description?: string | null
          cargo_weight_kg?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          dispatched_at?: string | null
          distance_traveled_km?: number | null
          driver_id?: string | null
          dropoff_geofence_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location_name?: string | null
          id?: string
          job_number: string
          job_type?: string
          odometer_end?: number | null
          odometer_start?: number | null
          organization_id: string
          pickup_geofence_id?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location_name?: string | null
          priority?: string | null
          scheduled_dropoff_at?: string | null
          scheduled_pickup_at?: string | null
          sla_deadline_at?: string | null
          sla_met?: boolean | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_dropoff_at?: string | null
          actual_pickup_at?: string | null
          cargo_description?: string | null
          cargo_weight_kg?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          dispatched_at?: string | null
          distance_traveled_km?: number | null
          driver_id?: string | null
          dropoff_geofence_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location_name?: string | null
          id?: string
          job_number?: string
          job_type?: string
          odometer_end?: number | null
          odometer_start?: number | null
          organization_id?: string
          pickup_geofence_id?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location_name?: string | null
          priority?: string | null
          scheduled_dropoff_at?: string | null
          scheduled_pickup_at?: string | null
          sla_deadline_at?: string | null
          sla_met?: boolean | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_jobs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_dropoff_geofence_id_fkey"
            columns: ["dropoff_geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_pickup_geofence_id_fkey"
            columns: ["pickup_geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_pod: {
        Row: {
          captured_at: string
          captured_by: string | null
          created_at: string
          id: string
          job_id: string
          lat: number | null
          lng: number | null
          notes: string | null
          organization_id: string
          photo_urls: string[] | null
          recipient_name: string | null
          signature_url: string | null
          status: string | null
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          created_at?: string
          id?: string
          job_id: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id: string
          photo_urls?: string[] | null
          recipient_name?: string | null
          signature_url?: string | null
          status?: string | null
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          created_at?: string
          id?: string
          job_id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id?: string
          photo_urls?: string[] | null
          recipient_name?: string | null
          signature_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_pod_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_pod_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_number: string | null
          document_type: string
          entity_id: string
          entity_type: string
          expiry_date: string | null
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          is_verified: boolean | null
          issue_date: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_type: string
          entity_id: string
          entity_type: string
          expiry_date?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          expiry_date?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      door_sensor_events: {
        Row: {
          alert_triggered: boolean | null
          created_at: string
          door_label: string | null
          duration_seconds: number | null
          event_time: string
          event_type: string
          geofence_id: string | null
          id: string
          in_approved_zone: boolean | null
          lat: number | null
          lng: number | null
          notes: string | null
          organization_id: string
          sensor_id: string | null
          vehicle_id: string
        }
        Insert: {
          alert_triggered?: boolean | null
          created_at?: string
          door_label?: string | null
          duration_seconds?: number | null
          event_time?: string
          event_type: string
          geofence_id?: string | null
          id?: string
          in_approved_zone?: boolean | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id: string
          sensor_id?: string | null
          vehicle_id: string
        }
        Update: {
          alert_triggered?: boolean | null
          created_at?: string
          door_label?: string | null
          duration_seconds?: number | null
          event_time?: string
          event_type?: string
          geofence_id?: string | null
          id?: string
          in_approved_zone?: boolean | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id?: string
          sensor_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "door_sensor_events_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "door_sensor_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "door_sensor_events_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "iot_sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "door_sensor_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_achievements: {
        Row: {
          badge_color: string | null
          badge_emoji: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          requirements: Json | null
          xp_reward: number
        }
        Insert: {
          badge_color?: string | null
          badge_emoji?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          requirements?: Json | null
          xp_reward?: number
        }
        Update: {
          badge_color?: string | null
          badge_emoji?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          requirements?: Json | null
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_ai_insights: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_items: Json | null
          confidence_score: number | null
          created_at: string
          data_points_used: number | null
          description: string
          driver_id: string
          id: string
          insight_type: string
          is_acknowledged: boolean | null
          organization_id: string
          severity: string | null
          title: string
          valid_until: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_items?: Json | null
          confidence_score?: number | null
          created_at?: string
          data_points_used?: number | null
          description: string
          driver_id: string
          id?: string
          insight_type: string
          is_acknowledged?: boolean | null
          organization_id: string
          severity?: string | null
          title: string
          valid_until?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_items?: Json | null
          confidence_score?: number | null
          created_at?: string
          data_points_used?: number | null
          description?: string
          driver_id?: string
          id?: string
          insight_type?: string
          is_acknowledged?: boolean | null
          organization_id?: string
          severity?: string | null
          title?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_ai_insights_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_ai_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_attendance: {
        Row: {
          approved_by: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date: string
          driver_id: string
          employee_id: string | null
          id: string
          notes: string | null
          organization_id: string
          overtime_hours: number | null
          shift_type: string | null
          source: string
          status: string
          total_hours: number | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date: string
          driver_id: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          overtime_hours?: number | null
          shift_type?: string | null
          source?: string
          status?: string
          total_hours?: number | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          driver_id?: string
          employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          overtime_hours?: number | null
          shift_type?: string | null
          source?: string
          status?: string
          total_hours?: number | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_attendance_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_attendance_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_availability: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          organization_id: string
          shift_end: string | null
          shift_start: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          organization_id: string
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          shift_end?: string | null
          shift_start?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_availability_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_behavior_scores: {
        Row: {
          acceleration_score: number
          braking_score: number
          created_at: string
          driver_id: string
          harsh_acceleration_events: number
          harsh_braking_events: number
          id: string
          idle_score: number
          organization_id: string
          overall_score: number
          recommendations: string[] | null
          risk_factors: string[] | null
          safety_rating: string
          score_period_end: string
          score_period_start: string
          speed_violations: number
          speeding_score: number
          total_distance: number
          total_drive_time: number
          total_idle_time: number
          trend: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          acceleration_score?: number
          braking_score?: number
          created_at?: string
          driver_id: string
          harsh_acceleration_events?: number
          harsh_braking_events?: number
          id?: string
          idle_score?: number
          organization_id: string
          overall_score: number
          recommendations?: string[] | null
          risk_factors?: string[] | null
          safety_rating: string
          score_period_end: string
          score_period_start: string
          speed_violations?: number
          speeding_score?: number
          total_distance?: number
          total_drive_time?: number
          total_idle_time?: number
          trend?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          acceleration_score?: number
          braking_score?: number
          created_at?: string
          driver_id?: string
          harsh_acceleration_events?: number
          harsh_braking_events?: number
          id?: string
          idle_score?: number
          organization_id?: string
          overall_score?: number
          recommendations?: string[] | null
          risk_factors?: string[] | null
          safety_rating?: string
          score_period_end?: string
          score_period_start?: string
          speed_violations?: number
          speeding_score?: number
          total_distance?: number
          total_drive_time?: number
          total_idle_time?: number
          trend?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_behavior_scores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_behavior_scores_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_calendar: {
        Row: {
          created_at: string
          driver_id: string
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          start_time: string
          status: string | null
          trip_assignment_id: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          start_time: string
          status?: string | null
          trip_assignment_id?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          start_time?: string
          status?: string | null
          trip_assignment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_calendar_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_calendar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_calendar_trip_assignment_id_fkey"
            columns: ["trip_assignment_id"]
            isOneToOne: false
            referencedRelation: "trip_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_coaching_acknowledgements: {
        Row: {
          acknowledged_at: string | null
          acknowledgement_method: string | null
          coaching_note: string
          created_at: string
          created_by: string
          driver_id: string
          id: string
          organization_id: string
          score_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgement_method?: string | null
          coaching_note: string
          created_at?: string
          created_by: string
          driver_id: string
          id?: string
          organization_id: string
          score_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgement_method?: string | null
          coaching_note?: string
          created_at?: string
          created_by?: string
          driver_id?: string
          id?: string
          organization_id?: string
          score_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_coaching_acknowledgements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_acknowledgements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_acknowledgements_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "driver_behavior_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_acknowledgements_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "latest_driver_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_coaching_queue: {
        Row: {
          coached_at: string | null
          coached_by: string | null
          coaching_notes: string | null
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          driver_id: string | null
          id: string
          metadata: Json
          organization_id: string
          recommendation: string | null
          reroute_suggestion: string | null
          severity: string
          source_alert_id: string | null
          source_type: string
          status: string
          suggested_assignment_id: string | null
          title: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          coached_at?: string | null
          coached_by?: string | null
          coaching_notes?: string | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          driver_id?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          recommendation?: string | null
          reroute_suggestion?: string | null
          severity?: string
          source_alert_id?: string | null
          source_type?: string
          status?: string
          suggested_assignment_id?: string | null
          title: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          coached_at?: string | null
          coached_by?: string | null
          coaching_notes?: string | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          driver_id?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          recommendation?: string | null
          reroute_suggestion?: string | null
          severity?: string
          source_alert_id?: string | null
          source_type?: string
          status?: string
          suggested_assignment_id?: string | null
          title?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_coaching_queue_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_queue_source_alert_id_fkey"
            columns: ["source_alert_id"]
            isOneToOne: true
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_queue_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_coaching_workflows: {
        Row: {
          action_items: Json | null
          assigned_coach_id: string | null
          assigned_coach_name: string | null
          coaching_type: string | null
          completed_date: string | null
          created_at: string
          driver_id: string
          effectiveness_rating: number | null
          follow_up_date: string | null
          id: string
          improvement_pct: number | null
          organization_id: string
          scheduled_date: string | null
          score_after: number | null
          score_before: number | null
          session_notes: string | null
          status: string | null
          trigger_details: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          assigned_coach_id?: string | null
          assigned_coach_name?: string | null
          coaching_type?: string | null
          completed_date?: string | null
          created_at?: string
          driver_id: string
          effectiveness_rating?: number | null
          follow_up_date?: string | null
          id?: string
          improvement_pct?: number | null
          organization_id: string
          scheduled_date?: string | null
          score_after?: number | null
          score_before?: number | null
          session_notes?: string | null
          status?: string | null
          trigger_details?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          assigned_coach_id?: string | null
          assigned_coach_name?: string | null
          coaching_type?: string | null
          completed_date?: string | null
          created_at?: string
          driver_id?: string
          effectiveness_rating?: number | null
          follow_up_date?: string | null
          id?: string
          improvement_pct?: number | null
          organization_id?: string
          scheduled_date?: string | null
          score_after?: number | null
          score_before?: number | null
          session_notes?: string | null
          status?: string | null
          trigger_details?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_coaching_workflows_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_communications: {
        Row: {
          acknowledged_at: string | null
          content: string
          created_at: string
          driver_id: string | null
          expires_at: string | null
          id: string
          message_type: string
          organization_id: string
          priority: string | null
          read_at: string | null
          requires_acknowledgement: boolean | null
          sender_id: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          content: string
          created_at?: string
          driver_id?: string | null
          expires_at?: string | null
          id?: string
          message_type: string
          organization_id: string
          priority?: string | null
          read_at?: string | null
          requires_acknowledgement?: boolean | null
          sender_id?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          content?: string
          created_at?: string
          driver_id?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          organization_id?: string
          priority?: string | null
          read_at?: string | null
          requires_acknowledgement?: boolean | null
          sender_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_communications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_compliance_events: {
        Row: {
          assigned_to: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          driver_id: string
          due_date: string
          event_type: string
          id: string
          last_reminder_sent: string | null
          organization_id: string
          priority: string | null
          reminder_days: number[] | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          driver_id: string
          due_date: string
          event_type: string
          id?: string
          last_reminder_sent?: string | null
          organization_id: string
          priority?: string | null
          reminder_days?: number[] | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          driver_id?: string
          due_date?: string
          event_type?: string
          id?: string
          last_reminder_sent?: string | null
          organization_id?: string
          priority?: string | null
          reminder_days?: number[] | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_compliance_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_compliance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_contracts: {
        Row: {
          benefits: Json | null
          contract_number: string | null
          created_at: string
          department: string | null
          document_url: string | null
          driver_id: string
          employee_id: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          organization_id: string
          pay_currency: string | null
          pay_frequency: string | null
          pay_rate: number | null
          position_title: string | null
          probation_end_date: string | null
          renewal_alert_days: number | null
          start_date: string
          status: string | null
          supervisor_name: string | null
          termination_date: string | null
          termination_reason: string | null
          terms_summary: string | null
          updated_at: string
          work_location: string | null
        }
        Insert: {
          benefits?: Json | null
          contract_number?: string | null
          created_at?: string
          department?: string | null
          document_url?: string | null
          driver_id: string
          employee_id?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          organization_id: string
          pay_currency?: string | null
          pay_frequency?: string | null
          pay_rate?: number | null
          position_title?: string | null
          probation_end_date?: string | null
          renewal_alert_days?: number | null
          start_date: string
          status?: string | null
          supervisor_name?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          terms_summary?: string | null
          updated_at?: string
          work_location?: string | null
        }
        Update: {
          benefits?: Json | null
          contract_number?: string | null
          created_at?: string
          department?: string | null
          document_url?: string | null
          driver_id?: string
          employee_id?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          organization_id?: string
          pay_currency?: string | null
          pay_frequency?: string | null
          pay_rate?: number | null
          position_title?: string | null
          probation_end_date?: string | null
          renewal_alert_days?: number | null
          start_date?: string
          status?: string | null
          supervisor_name?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          terms_summary?: string | null
          updated_at?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_cost_allocations: {
        Row: {
          cost_per_km: number | null
          created_at: string
          driver_id: string
          employee_id: string | null
          fine_cost: number | null
          fuel_cost: number | null
          id: string
          insurance_cost: number | null
          maintenance_cost: number | null
          notes: string | null
          organization_id: string
          other_cost: number | null
          period_end: string
          period_start: string
          toll_cost: number | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          cost_per_km?: number | null
          created_at?: string
          driver_id: string
          employee_id?: string | null
          fine_cost?: number | null
          fuel_cost?: number | null
          id?: string
          insurance_cost?: number | null
          maintenance_cost?: number | null
          notes?: string | null
          organization_id: string
          other_cost?: number | null
          period_end: string
          period_start: string
          toll_cost?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          cost_per_km?: number | null
          created_at?: string
          driver_id?: string
          employee_id?: string | null
          fine_cost?: number | null
          fuel_cost?: number | null
          id?: string
          insurance_cost?: number | null
          maintenance_cost?: number | null
          notes?: string | null
          organization_id?: string
          other_cost?: number | null
          period_end?: string
          period_start?: string
          toll_cost?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_cost_allocations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_cost_allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_cost_allocations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_dvir_reports: {
        Row: {
          certified_safe: boolean
          created_at: string
          defect_count: number
          defects_found: Json | null
          driver_id: string
          driver_signature: string | null
          id: string
          inspection_date: string
          inspection_type: string
          items_inspected: Json
          mechanic_notes: string | null
          mechanic_review_status: string | null
          notes: string | null
          odometer_reading: number | null
          organization_id: string
          overall_status: string
          photos: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          certified_safe?: boolean
          created_at?: string
          defect_count?: number
          defects_found?: Json | null
          driver_id: string
          driver_signature?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          items_inspected?: Json
          mechanic_notes?: string | null
          mechanic_review_status?: string | null
          notes?: string | null
          odometer_reading?: number | null
          organization_id: string
          overall_status?: string
          photos?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          certified_safe?: boolean
          created_at?: string
          defect_count?: number
          defects_found?: Json | null
          driver_id?: string
          driver_signature?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          items_inspected?: Json
          mechanic_notes?: string | null
          mechanic_review_status?: string | null
          notes?: string | null
          odometer_reading?: number | null
          organization_id?: string
          overall_status?: string
          photos?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_dvir_reports_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_dvir_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_dvir_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earned_achievements: {
        Row: {
          achievement_id: string
          driver_id: string
          earned_at: string
          id: string
          organization_id: string
          xp_earned: number
        }
        Insert: {
          achievement_id: string
          driver_id: string
          earned_at?: string
          id?: string
          organization_id: string
          xp_earned?: number
        }
        Update: {
          achievement_id?: string
          driver_id?: string
          earned_at?: string
          id?: string
          organization_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_earned_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "driver_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earned_achievements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earned_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_events: {
        Row: {
          acceleration_g: number | null
          address: string | null
          created_at: string
          driver_id: string | null
          event_time: string
          event_type: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          organization_id: string
          severity: string
          speed_kmh: number | null
          speed_limit_kmh: number | null
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          acceleration_g?: number | null
          address?: string | null
          created_at?: string
          driver_id?: string | null
          event_time: string
          event_type: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id: string
          severity: string
          speed_kmh?: number | null
          speed_limit_kmh?: number | null
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          acceleration_g?: number | null
          address?: string | null
          created_at?: string
          driver_id?: string | null
          event_time?: string
          event_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id?: string
          severity?: string
          speed_kmh?: number | null
          speed_limit_kmh?: number | null
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_fatigue_indicators: {
        Row: {
          consecutive_driving_minutes: number | null
          created_at: string
          data_source: string | null
          driver_id: string
          driving_hours_24h: number | null
          driving_hours_8_days: number | null
          eye_closure_events: number | null
          fatigue_risk_level: string
          hard_braking_events: number | null
          hours_since_rest: number | null
          id: string
          lane_departure_events: number | null
          organization_id: string
          reaction_time_ms: number | null
          recommendations: Json | null
          recorded_at: string
          risk_score: number
          yawning_detected: number | null
        }
        Insert: {
          consecutive_driving_minutes?: number | null
          created_at?: string
          data_source?: string | null
          driver_id: string
          driving_hours_24h?: number | null
          driving_hours_8_days?: number | null
          eye_closure_events?: number | null
          fatigue_risk_level: string
          hard_braking_events?: number | null
          hours_since_rest?: number | null
          id?: string
          lane_departure_events?: number | null
          organization_id: string
          reaction_time_ms?: number | null
          recommendations?: Json | null
          recorded_at?: string
          risk_score: number
          yawning_detected?: number | null
        }
        Update: {
          consecutive_driving_minutes?: number | null
          created_at?: string
          data_source?: string | null
          driver_id?: string
          driving_hours_24h?: number | null
          driving_hours_8_days?: number | null
          eye_closure_events?: number | null
          fatigue_risk_level?: string
          hard_braking_events?: number | null
          hours_since_rest?: number | null
          id?: string
          lane_departure_events?: number | null
          organization_id?: string
          reaction_time_ms?: number | null
          recommendations?: Json | null
          recorded_at?: string
          risk_score?: number
          yawning_detected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_fatigue_indicators_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fatigue_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_fuel_cards: {
        Row: {
          card_number: string
          card_provider: string | null
          card_type: string | null
          created_at: string
          current_month_spent: number | null
          daily_limit: number | null
          driver_id: string
          expiry_date: string | null
          id: string
          issued_date: string | null
          last_transaction_at: string | null
          monthly_limit: number | null
          organization_id: string
          pin_last_changed: string | null
          status: string | null
          suspicious_activity_flag: boolean | null
          suspicious_activity_notes: string | null
          updated_at: string
        }
        Insert: {
          card_number: string
          card_provider?: string | null
          card_type?: string | null
          created_at?: string
          current_month_spent?: number | null
          daily_limit?: number | null
          driver_id: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          last_transaction_at?: string | null
          monthly_limit?: number | null
          organization_id: string
          pin_last_changed?: string | null
          status?: string | null
          suspicious_activity_flag?: boolean | null
          suspicious_activity_notes?: string | null
          updated_at?: string
        }
        Update: {
          card_number?: string
          card_provider?: string | null
          card_type?: string | null
          created_at?: string
          current_month_spent?: number | null
          daily_limit?: number | null
          driver_id?: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          last_transaction_at?: string | null
          monthly_limit?: number | null
          organization_id?: string
          pin_last_changed?: string | null
          status?: string | null
          suspicious_activity_flag?: boolean | null
          suspicious_activity_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_fuel_cards_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fuel_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_gamification_stats: {
        Row: {
          achievements_count: number
          all_time_rank: number | null
          current_level: number
          current_streak_days: number
          driver_id: string
          eco_score: number | null
          last_active_date: string | null
          longest_streak_days: number
          monthly_rank: number | null
          organization_id: string
          perfect_trips: number
          reliability_score: number | null
          total_xp: number
          updated_at: string
          weekly_rank: number | null
        }
        Insert: {
          achievements_count?: number
          all_time_rank?: number | null
          current_level?: number
          current_streak_days?: number
          driver_id: string
          eco_score?: number | null
          last_active_date?: string | null
          longest_streak_days?: number
          monthly_rank?: number | null
          organization_id: string
          perfect_trips?: number
          reliability_score?: number | null
          total_xp?: number
          updated_at?: string
          weekly_rank?: number | null
        }
        Update: {
          achievements_count?: number
          all_time_rank?: number | null
          current_level?: number
          current_streak_days?: number
          driver_id?: string
          eco_score?: number | null
          last_active_date?: string | null
          longest_streak_days?: number
          monthly_rank?: number | null
          organization_id?: string
          perfect_trips?: number
          reliability_score?: number | null
          total_xp?: number
          updated_at?: string
          weekly_rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_gamification_stats_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_gamification_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number | null
          description: string | null
          driver_id: string | null
          end_date: string
          goal_type: string
          id: string
          metric: string
          organization_id: string
          start_date: string
          status: string | null
          target_value: number
          title: string
          xp_reward: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          driver_id?: string | null
          end_date: string
          goal_type: string
          id?: string
          metric: string
          organization_id: string
          start_date: string
          status?: string | null
          target_value: number
          title: string
          xp_reward?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          driver_id?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          metric?: string
          organization_id?: string
          start_date?: string
          status?: string | null
          target_value?: number
          title?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_goals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_group_members: {
        Row: {
          created_at: string
          driver_id: string
          group_id: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          group_id: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          group_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_group_members_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "driver_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_group_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_groups: {
        Row: {
          created_at: string
          description: string | null
          group_type: string
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          organization_id: string
          parent_group_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_type?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          organization_id: string
          parent_group_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_type?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          organization_id?: string
          parent_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_groups_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "driver_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_hos_logs: {
        Row: {
          created_at: string
          driver_id: string
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_violation: boolean | null
          lat_end: number | null
          lat_start: number | null
          lng_end: number | null
          lng_start: number | null
          location_end: string | null
          location_start: string | null
          log_date: string
          notes: string | null
          odometer_end: number | null
          odometer_start: number | null
          organization_id: string
          start_time: string
          status: string
          vehicle_id: string | null
          violation_type: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_violation?: boolean | null
          lat_end?: number | null
          lat_start?: number | null
          lng_end?: number | null
          lng_start?: number | null
          location_end?: string | null
          location_start?: string | null
          log_date?: string
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          organization_id: string
          start_time: string
          status: string
          vehicle_id?: string | null
          violation_type?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_violation?: boolean | null
          lat_end?: number | null
          lat_start?: number | null
          lng_end?: number | null
          lng_start?: number | null
          location_end?: string | null
          location_start?: string | null
          log_date?: string
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          organization_id?: string
          start_time?: string
          status?: string
          vehicle_id?: string | null
          violation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_hos_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_hos_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_hos_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_id_events: {
        Row: {
          auth_method: string
          authenticated: boolean | null
          created_at: string
          driver_id: string | null
          event_time: string
          event_type: string
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          organization_id: string
          sensor_id: string | null
          tag_id: string | null
          vehicle_id: string
        }
        Insert: {
          auth_method: string
          authenticated?: boolean | null
          created_at?: string
          driver_id?: string | null
          event_time?: string
          event_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id: string
          sensor_id?: string | null
          tag_id?: string | null
          vehicle_id: string
        }
        Update: {
          auth_method?: string
          authenticated?: boolean | null
          created_at?: string
          driver_id?: string | null
          event_time?: string
          event_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id?: string
          sensor_id?: string | null
          tag_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_id_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_id_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_id_events_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "iot_sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_id_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_incidents: {
        Row: {
          created_at: string
          damage_estimate_cost: number | null
          description: string
          driver_id: string
          evidence_urls: string[] | null
          fault_determination: string | null
          id: string
          incident_date: string
          incident_type: string
          injuries: boolean
          injury_details: string | null
          insurance_claim_number: string | null
          lat: number | null
          lng: number | null
          location_name: string | null
          organization_id: string
          police_report_number: string | null
          property_damage: boolean
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
          vehicle_id: string | null
          witnesses: Json | null
        }
        Insert: {
          created_at?: string
          damage_estimate_cost?: number | null
          description: string
          driver_id: string
          evidence_urls?: string[] | null
          fault_determination?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          injuries?: boolean
          injury_details?: string | null
          insurance_claim_number?: string | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id: string
          police_report_number?: string | null
          property_damage?: boolean
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          witnesses?: Json | null
        }
        Update: {
          created_at?: string
          damage_estimate_cost?: number | null
          description?: string
          driver_id?: string
          evidence_urls?: string[] | null
          fault_determination?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          injuries?: boolean
          injury_details?: string | null
          insurance_claim_number?: string | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id?: string
          police_report_number?: string | null
          property_damage?: boolean
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          witnesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_incidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          driver_id: string
          employee_id: string | null
          end_date: string
          id: string
          leave_type: string
          organization_id: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          total_days: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          driver_id: string
          employee_id?: string | null
          end_date: string
          id?: string
          leave_type?: string
          organization_id: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          total_days?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          driver_id?: string
          employee_id?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          organization_id?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_leave_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_license_alerts: {
        Row: {
          alert_type: string
          created_at: string
          days_until_expiry: number | null
          document_type: string | null
          driver_id: string
          expiry_date: string
          id: string
          notes: string | null
          notified_at: string | null
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          days_until_expiry?: number | null
          document_type?: string | null
          driver_id: string
          expiry_date: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          days_until_expiry?: number | null
          document_type?: string | null
          driver_id?: string
          expiry_date?: string
          id?: string
          notes?: string | null
          notified_at?: string | null
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_license_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_license_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_logbooks: {
        Row: {
          break_count: number | null
          compliance_status: string | null
          created_at: string
          distance_km: number | null
          driver_id: string
          driving_hours: number | null
          end_odometer: number | null
          id: string
          log_date: string
          notes: string | null
          organization_id: string
          rest_hours: number | null
          route_summary: string | null
          shift_end: string | null
          shift_start: string | null
          start_odometer: number | null
          supervisor_approved: boolean | null
          supervisor_id: string | null
          total_break_minutes: number | null
          updated_at: string
          vehicle_id: string | null
          violations: Json | null
        }
        Insert: {
          break_count?: number | null
          compliance_status?: string | null
          created_at?: string
          distance_km?: number | null
          driver_id: string
          driving_hours?: number | null
          end_odometer?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          organization_id: string
          rest_hours?: number | null
          route_summary?: string | null
          shift_end?: string | null
          shift_start?: string | null
          start_odometer?: number | null
          supervisor_approved?: boolean | null
          supervisor_id?: string | null
          total_break_minutes?: number | null
          updated_at?: string
          vehicle_id?: string | null
          violations?: Json | null
        }
        Update: {
          break_count?: number | null
          compliance_status?: string | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string
          driving_hours?: number | null
          end_odometer?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          organization_id?: string
          rest_hours?: number | null
          route_summary?: string | null
          shift_end?: string | null
          shift_start?: string | null
          start_odometer?: number | null
          supervisor_approved?: boolean | null
          supervisor_id?: string | null
          total_break_minutes?: number | null
          updated_at?: string
          vehicle_id?: string | null
          violations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_logbooks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_logbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_logbooks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_messages: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string
          organization_id: string
          parent_message_id: string | null
          priority: string
          read_at: string | null
          recipient_driver_id: string | null
          sender_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          organization_id: string
          parent_message_id?: string | null
          priority?: string
          read_at?: string | null
          recipient_driver_id?: string | null
          sender_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string
          organization_id?: string
          parent_message_id?: string | null
          priority?: string
          read_at?: string | null
          recipient_driver_id?: string | null
          sender_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "driver_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_messages_recipient_driver_id_fkey"
            columns: ["recipient_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_mvr_records: {
        Row: {
          created_at: string
          driver_id: string
          dui_found: boolean | null
          id: string
          next_pull_date: string | null
          notes: string | null
          organization_id: string
          points_total: number | null
          pull_date: string
          report_source: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          suspensions_found: boolean | null
          updated_at: string
          violation_count: number | null
          violations: Json | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          dui_found?: boolean | null
          id?: string
          next_pull_date?: string | null
          notes?: string | null
          organization_id: string
          points_total?: number | null
          pull_date?: string
          report_source?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          suspensions_found?: boolean | null
          updated_at?: string
          violation_count?: number | null
          violations?: Json | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          dui_found?: boolean | null
          id?: string
          next_pull_date?: string | null
          notes?: string | null
          organization_id?: string
          points_total?: number | null
          pull_date?: string
          report_source?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          suspensions_found?: boolean | null
          updated_at?: string
          violation_count?: number | null
          violations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_mvr_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_mvr_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_notifications: {
        Row: {
          body: string | null
          created_at: string
          driver_id: string
          id: string
          kind: string
          link: string | null
          organization_id: string
          payload: Json
          read_at: string | null
          title: string
          user_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          driver_id: string
          id?: string
          kind: string
          link?: string | null
          organization_id: string
          payload?: Json
          read_at?: string | null
          title: string
          user_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          kind?: string
          link?: string | null
          organization_id?: string
          payload?: Json
          read_at?: string | null
          title?: string
          user_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_notifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_notifications_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_onboarding_checklists: {
        Row: {
          checklist_type: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          driver_id: string
          due_date: string | null
          id: string
          is_completed: boolean
          notes: string | null
          organization_id: string
          step_name: string
          step_order: number
          updated_at: string
        }
        Insert: {
          checklist_type?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          driver_id: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          organization_id: string
          step_name: string
          step_order?: number
          updated_at?: string
        }
        Update: {
          checklist_type?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          driver_id?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          organization_id?: string
          step_name?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_onboarding_checklists_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_onboarding_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payroll: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_salary: number | null
          created_at: string
          currency: string | null
          deductions: Json | null
          driver_id: string
          employee_id: string | null
          gross_pay: number | null
          id: string
          km_bonus: number | null
          net_pay: number | null
          notes: string | null
          organization_id: string
          other_earnings: number | null
          overtime_pay: number | null
          paid_at: string | null
          pay_period_end: string
          pay_period_start: string
          payment_method: string | null
          payment_reference: string | null
          status: string
          total_deductions: number | null
          trip_bonus: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number | null
          created_at?: string
          currency?: string | null
          deductions?: Json | null
          driver_id: string
          employee_id?: string | null
          gross_pay?: number | null
          id?: string
          km_bonus?: number | null
          net_pay?: number | null
          notes?: string | null
          organization_id: string
          other_earnings?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          pay_period_end: string
          pay_period_start: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          total_deductions?: number | null
          trip_bonus?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number | null
          created_at?: string
          currency?: string | null
          deductions?: Json | null
          driver_id?: string
          employee_id?: string | null
          gross_pay?: number | null
          id?: string
          km_bonus?: number | null
          net_pay?: number | null
          notes?: string | null
          organization_id?: string
          other_earnings?: number | null
          overtime_pay?: number | null
          paid_at?: string | null
          pay_period_end?: string
          pay_period_start?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          total_deductions?: number | null
          trip_bonus?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_payroll_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_payroll_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payroll_config: {
        Row: {
          base_monthly_salary: number | null
          created_at: string
          driver_id: string
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean | null
          night_shift_multiplier: number | null
          organization_id: string
          overtime_hourly_rate: number | null
          per_km_rate: number | null
          per_trip_rate: number | null
          updated_at: string
          weekend_multiplier: number | null
        }
        Insert: {
          base_monthly_salary?: number | null
          created_at?: string
          driver_id: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          night_shift_multiplier?: number | null
          organization_id: string
          overtime_hourly_rate?: number | null
          per_km_rate?: number | null
          per_trip_rate?: number | null
          updated_at?: string
          weekend_multiplier?: number | null
        }
        Update: {
          base_monthly_salary?: number | null
          created_at?: string
          driver_id?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          night_shift_multiplier?: number | null
          organization_id?: string
          overtime_hourly_rate?: number | null
          per_km_rate?: number | null
          per_trip_rate?: number | null
          updated_at?: string
          weekend_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payroll_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_payroll_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_penalties: {
        Row: {
          appeal_reason: string | null
          appeal_submitted_at: string | null
          created_at: string
          driver_id: string
          geofence_id: string | null
          geofence_name: string | null
          id: string
          is_auto_applied: boolean | null
          lat: number | null
          lng: number | null
          location_name: string | null
          monetary_fine: number | null
          organization_id: string
          penalty_config_id: string | null
          penalty_points: number
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          speed_kmh: number | null
          speed_limit_kmh: number | null
          status: string
          updated_at: string
          vehicle_id: string | null
          violation_details: Json | null
          violation_time: string
          violation_type: string
        }
        Insert: {
          appeal_reason?: string | null
          appeal_submitted_at?: string | null
          created_at?: string
          driver_id: string
          geofence_id?: string | null
          geofence_name?: string | null
          id?: string
          is_auto_applied?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          monetary_fine?: number | null
          organization_id: string
          penalty_config_id?: string | null
          penalty_points?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          speed_kmh?: number | null
          speed_limit_kmh?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          violation_details?: Json | null
          violation_time: string
          violation_type: string
        }
        Update: {
          appeal_reason?: string | null
          appeal_submitted_at?: string | null
          created_at?: string
          driver_id?: string
          geofence_id?: string | null
          geofence_name?: string | null
          id?: string
          is_auto_applied?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          monetary_fine?: number | null
          organization_id?: string
          penalty_config_id?: string | null
          penalty_points?: number
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          speed_kmh?: number | null
          speed_limit_kmh?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          violation_details?: Json | null
          violation_time?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_penalties_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_penalties_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_penalties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_penalties_penalty_config_id_fkey"
            columns: ["penalty_config_id"]
            isOneToOne: false
            referencedRelation: "penalty_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_penalties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_penalty_summary: {
        Row: {
          created_at: string
          driver_id: string
          geofence_count: number
          id: string
          is_suspended: boolean | null
          last_violation_at: string | null
          organization_id: string
          overspeed_count: number
          suspension_count: number
          suspension_end_date: string | null
          suspension_start_date: string | null
          total_fines: number
          total_penalty_points: number
          total_violations: number
          updated_at: string
          warning_count: number
        }
        Insert: {
          created_at?: string
          driver_id: string
          geofence_count?: number
          id?: string
          is_suspended?: boolean | null
          last_violation_at?: string | null
          organization_id: string
          overspeed_count?: number
          suspension_count?: number
          suspension_end_date?: string | null
          suspension_start_date?: string | null
          total_fines?: number
          total_penalty_points?: number
          total_violations?: number
          updated_at?: string
          warning_count?: number
        }
        Update: {
          created_at?: string
          driver_id?: string
          geofence_count?: number
          id?: string
          is_suspended?: boolean | null
          last_violation_at?: string | null
          organization_id?: string
          overspeed_count?: number
          suspension_count?: number
          suspension_end_date?: string | null
          suspension_start_date?: string | null
          total_fines?: number
          total_penalty_points?: number
          total_violations?: number
          updated_at?: string
          warning_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_penalty_summary_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_penalty_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_performance_kpis: {
        Row: {
          attendance_rate: number | null
          complaint_count: number | null
          composite_score: number | null
          created_at: string
          driver_id: string
          employee_id: string | null
          fuel_efficiency_score: number | null
          id: string
          incident_count: number | null
          on_time_percentage: number | null
          organization_id: string
          period: string
          total_km: number | null
          trips_completed: number | null
          updated_at: string
        }
        Insert: {
          attendance_rate?: number | null
          complaint_count?: number | null
          composite_score?: number | null
          created_at?: string
          driver_id: string
          employee_id?: string | null
          fuel_efficiency_score?: number | null
          id?: string
          incident_count?: number | null
          on_time_percentage?: number | null
          organization_id: string
          period: string
          total_km?: number | null
          trips_completed?: number | null
          updated_at?: string
        }
        Update: {
          attendance_rate?: number | null
          complaint_count?: number | null
          composite_score?: number | null
          created_at?: string
          driver_id?: string
          employee_id?: string | null
          fuel_efficiency_score?: number | null
          id?: string
          incident_count?: number | null
          on_time_percentage?: number | null
          organization_id?: string
          period?: string
          total_km?: number | null
          trips_completed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_performance_kpis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_performance_kpis_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_performance_kpis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_performance_reviews: {
        Row: {
          acknowledged_at: string | null
          completed_at: string | null
          compliance_score: number | null
          created_at: string
          customer_score: number | null
          driver_comments: string | null
          driver_id: string
          efficiency_score: number | null
          employee_id: string | null
          goals: Json | null
          id: string
          improvement_areas: string[] | null
          improvement_plan: string | null
          manager_comments: string | null
          next_review_date: string | null
          organization_id: string
          overall_score: number | null
          review_period_end: string
          review_period_start: string
          review_type: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          safety_score: number | null
          status: string | null
          strengths: string[] | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          completed_at?: string | null
          compliance_score?: number | null
          created_at?: string
          customer_score?: number | null
          driver_comments?: string | null
          driver_id: string
          efficiency_score?: number | null
          employee_id?: string | null
          goals?: Json | null
          id?: string
          improvement_areas?: string[] | null
          improvement_plan?: string | null
          manager_comments?: string | null
          next_review_date?: string | null
          organization_id: string
          overall_score?: number | null
          review_period_end: string
          review_period_start: string
          review_type?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          safety_score?: number | null
          status?: string | null
          strengths?: string[] | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          completed_at?: string | null
          compliance_score?: number | null
          created_at?: string
          customer_score?: number | null
          driver_comments?: string | null
          driver_id?: string
          efficiency_score?: number | null
          employee_id?: string | null
          goals?: Json | null
          id?: string
          improvement_areas?: string[] | null
          improvement_plan?: string | null
          manager_comments?: string | null
          next_review_date?: string | null
          organization_id?: string
          overall_score?: number | null
          review_period_end?: string
          review_period_start?: string
          review_type?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          safety_score?: number | null
          status?: string | null
          strengths?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_performance_reviews_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_rewards: {
        Row: {
          currency: string | null
          description: string | null
          driver_id: string
          expires_at: string | null
          id: string
          issued_at: string
          issued_by: string | null
          organization_id: string
          redeemed_at: string | null
          reward_type: string
          status: string | null
          title: string
          value_amount: number | null
        }
        Insert: {
          currency?: string | null
          description?: string | null
          driver_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          organization_id: string
          redeemed_at?: string | null
          reward_type: string
          status?: string | null
          title: string
          value_amount?: number | null
        }
        Update: {
          currency?: string | null
          description?: string | null
          driver_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          organization_id?: string
          redeemed_at?: string | null
          reward_type?: string
          status?: string | null
          title?: string
          value_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_rewards_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_rewards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_risk_scores: {
        Row: {
          accident_probability: number | null
          behavior_component: number | null
          compliance_component: number | null
          composite_score: number
          created_at: string
          driver_id: string
          fatigue_component: number | null
          id: string
          incident_component: number | null
          mvr_component: number | null
          on_watchlist: boolean | null
          organization_id: string
          previous_score: number | null
          recommended_interventions: Json | null
          risk_factors: Json | null
          risk_tier: string | null
          score_date: string
          trend: string | null
          updated_at: string
          watchlist_reason: string | null
        }
        Insert: {
          accident_probability?: number | null
          behavior_component?: number | null
          compliance_component?: number | null
          composite_score: number
          created_at?: string
          driver_id: string
          fatigue_component?: number | null
          id?: string
          incident_component?: number | null
          mvr_component?: number | null
          on_watchlist?: boolean | null
          organization_id: string
          previous_score?: number | null
          recommended_interventions?: Json | null
          risk_factors?: Json | null
          risk_tier?: string | null
          score_date?: string
          trend?: string | null
          updated_at?: string
          watchlist_reason?: string | null
        }
        Update: {
          accident_probability?: number | null
          behavior_component?: number | null
          compliance_component?: number | null
          composite_score?: number
          created_at?: string
          driver_id?: string
          fatigue_component?: number | null
          id?: string
          incident_component?: number | null
          mvr_component?: number | null
          on_watchlist?: boolean | null
          organization_id?: string
          previous_score?: number | null
          recommended_interventions?: Json | null
          risk_factors?: Json | null
          risk_tier?: string | null
          score_date?: string
          trend?: string | null
          updated_at?: string
          watchlist_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_risk_scores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_risk_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_shift_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          driver_id: string
          end_time: string
          id: string
          is_active: boolean | null
          organization_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          driver_id: string
          end_time: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          driver_id?: string
          end_time?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_shift_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_shift_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_training: {
        Row: {
          certificate_url: string | null
          certification_name: string
          completion_date: string | null
          created_at: string
          driver_id: string
          expiry_date: string | null
          id: string
          notes: string | null
          organization_id: string
          provider: string | null
          score: number | null
          status: string
          training_type: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          certification_name: string
          completion_date?: string | null
          created_at?: string
          driver_id: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          provider?: string | null
          score?: number | null
          status?: string
          training_type?: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          certification_name?: string
          completion_date?: string | null
          created_at?: string
          driver_id?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          provider?: string | null
          score?: number | null
          status?: string
          training_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_training_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_training_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_training_courses: {
        Row: {
          category: string
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          expires_months: number | null
          id: string
          is_required: boolean | null
          organization_id: string
          pass_score: number | null
          title: string
          updated_at: string
          xp_reward: number | null
        }
        Insert: {
          category: string
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          expires_months?: number | null
          id?: string
          is_required?: boolean | null
          organization_id: string
          pass_score?: number | null
          title: string
          updated_at?: string
          xp_reward?: number | null
        }
        Update: {
          category?: string
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          expires_months?: number | null
          id?: string
          is_required?: boolean | null
          organization_id?: string
          pass_score?: number | null
          title?: string
          updated_at?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_training_courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_training_progress: {
        Row: {
          attempts: number | null
          completed_at: string | null
          course_id: string
          created_at: string
          driver_id: string
          expires_at: string | null
          id: string
          organization_id: string
          progress_percent: number | null
          score: number | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          driver_id: string
          expires_at?: string | null
          id?: string
          organization_id: string
          progress_percent?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          driver_id?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          progress_percent?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_training_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_training_progress_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_training_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicle_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          driver_id: string
          id: string
          is_current: boolean
          organization_id: string
          reason: string | null
          unassigned_at: string | null
          unassigned_by: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          driver_id: string
          id?: string
          is_current?: boolean
          organization_id: string
          reason?: string | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          is_current?: boolean
          organization_id?: string
          reason?: string | null
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_weekly_stats: {
        Row: {
          created_at: string
          distance_km: number | null
          driver_id: string
          driving_hours: number | null
          fuel_consumed_liters: number | null
          fuel_efficiency_km_per_liter: number | null
          harsh_events_count: number | null
          id: string
          idle_time_minutes: number | null
          on_time_deliveries: number | null
          organization_id: string
          rank_change: number | null
          revenue_generated: number | null
          safety_score: number | null
          total_deliveries: number | null
          trips_completed: number | null
          week_end: string
          week_start: string
          xp_earned: number | null
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          driver_id: string
          driving_hours?: number | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_km_per_liter?: number | null
          harsh_events_count?: number | null
          id?: string
          idle_time_minutes?: number | null
          on_time_deliveries?: number | null
          organization_id: string
          rank_change?: number | null
          revenue_generated?: number | null
          safety_score?: number | null
          total_deliveries?: number | null
          trips_completed?: number | null
          week_end: string
          week_start: string
          xp_earned?: number | null
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          driver_id?: string
          driving_hours?: number | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_km_per_liter?: number | null
          harsh_events_count?: number | null
          id?: string
          idle_time_minutes?: number | null
          on_time_deliveries?: number | null
          organization_id?: string
          rank_change?: number | null
          revenue_generated?: number | null
          safety_score?: number | null
          total_deliveries?: number | null
          trips_completed?: number | null
          week_end?: string
          week_start?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_weekly_stats_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_weekly_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wellness_checks: {
        Row: {
          check_time: string
          created_at: string
          driver_id: string
          fatigue_level: number
          feeling_well: boolean
          hours_slept: number | null
          id: string
          is_fit_to_drive: boolean
          lat: number | null
          lng: number | null
          notes: string | null
          organization_id: string
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sobriety_confirmed: boolean
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          check_time?: string
          created_at?: string
          driver_id: string
          fatigue_level: number
          feeling_well?: boolean
          hours_slept?: number | null
          id?: string
          is_fit_to_drive?: boolean
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sobriety_confirmed?: boolean
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          check_time?: string
          created_at?: string
          driver_id?: string
          fatigue_level?: number
          feeling_well?: boolean
          hours_slept?: number | null
          id?: string
          is_fit_to_drive?: boolean
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sobriety_confirmed?: boolean
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_wellness_checks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_wellness_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_wellness_checks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_xp_ledger: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          organization_id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
          xp_amount: number
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          organization_id: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          xp_amount: number
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          organization_id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_xp_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_xp_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address_region: string | null
          address_specific: string | null
          address_woreda: string | null
          address_zone: string | null
          assigned_pool: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_name: string | null
          blood_type: string | null
          bluetooth_id: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          driver_type: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string | null
          employment_type: string | null
          experience_years: number | null
          first_name: string
          gender: string | null
          govt_id_type: string | null
          hire_date: string | null
          ibutton_id: string | null
          id: string
          joining_date: string | null
          last_name: string
          license_back_url: string | null
          license_class: string | null
          license_expiry: string | null
          license_front_url: string | null
          license_issue_date: string | null
          license_number: string
          license_type: string | null
          license_verified: boolean | null
          medical_certificate_expiry: string | null
          medical_info: Json | null
          middle_name: string | null
          national_id: string | null
          national_id_url: string | null
          national_id_verified: boolean | null
          notes: string | null
          organization_id: string
          outsource_company: string | null
          phone: string | null
          processing_restricted: boolean | null
          processing_restricted_at: string | null
          processing_restricted_reason: string | null
          rfid_tag: string | null
          route_type: string | null
          safety_score: number | null
          status: string | null
          telebirr_account: string | null
          total_distance_km: number | null
          total_trips: number | null
          updated_at: string
          user_id: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address_region?: string | null
          address_specific?: string | null
          address_woreda?: string | null
          address_zone?: string | null
          assigned_pool?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          blood_type?: string | null
          bluetooth_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          driver_type?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          employment_type?: string | null
          experience_years?: number | null
          first_name: string
          gender?: string | null
          govt_id_type?: string | null
          hire_date?: string | null
          ibutton_id?: string | null
          id?: string
          joining_date?: string | null
          last_name: string
          license_back_url?: string | null
          license_class?: string | null
          license_expiry?: string | null
          license_front_url?: string | null
          license_issue_date?: string | null
          license_number: string
          license_type?: string | null
          license_verified?: boolean | null
          medical_certificate_expiry?: string | null
          medical_info?: Json | null
          middle_name?: string | null
          national_id?: string | null
          national_id_url?: string | null
          national_id_verified?: boolean | null
          notes?: string | null
          organization_id: string
          outsource_company?: string | null
          phone?: string | null
          processing_restricted?: boolean | null
          processing_restricted_at?: string | null
          processing_restricted_reason?: string | null
          rfid_tag?: string | null
          route_type?: string | null
          safety_score?: number | null
          status?: string | null
          telebirr_account?: string | null
          total_distance_km?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address_region?: string | null
          address_specific?: string | null
          address_woreda?: string | null
          address_zone?: string | null
          assigned_pool?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_name?: string | null
          blood_type?: string | null
          bluetooth_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          driver_type?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          employment_type?: string | null
          experience_years?: number | null
          first_name?: string
          gender?: string | null
          govt_id_type?: string | null
          hire_date?: string | null
          ibutton_id?: string | null
          id?: string
          joining_date?: string | null
          last_name?: string
          license_back_url?: string | null
          license_class?: string | null
          license_expiry?: string | null
          license_front_url?: string | null
          license_issue_date?: string | null
          license_number?: string
          license_type?: string | null
          license_verified?: boolean | null
          medical_certificate_expiry?: string | null
          medical_info?: Json | null
          middle_name?: string | null
          national_id?: string | null
          national_id_url?: string | null
          national_id_verified?: boolean | null
          notes?: string | null
          organization_id?: string
          outsource_company?: string | null
          phone?: string | null
          processing_restricted?: boolean | null
          processing_restricted_at?: string | null
          processing_restricted_reason?: string | null
          rfid_tag?: string | null
          route_type?: string | null
          safety_score?: number | null
          status?: string | null
          telebirr_account?: string | null
          total_distance_km?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      e2e_test_runs: {
        Row: {
          detail: string | null
          flow: string | null
          id: string
          run_at: string
          status: string | null
          step: string | null
        }
        Insert: {
          detail?: string | null
          flow?: string | null
          id?: string
          run_at?: string
          status?: string | null
          step?: string | null
        }
        Update: {
          detail?: string | null
          flow?: string | null
          id?: string
          run_at?: string
          status?: string | null
          step?: string | null
        }
        Relationships: []
      }
      email_report_configs: {
        Row: {
          created_at: string
          created_by: string
          day_of_week: number | null
          frequency: string
          id: string
          include_trend_analysis: boolean
          is_active: boolean
          name: string
          organization_id: string
          recipient_emails: string[]
          time_of_day: string
          updated_at: string
          vehicle_ids: string[]
        }
        Insert: {
          created_at?: string
          created_by: string
          day_of_week?: number | null
          frequency: string
          id?: string
          include_trend_analysis?: boolean
          is_active?: boolean
          name: string
          organization_id: string
          recipient_emails: string[]
          time_of_day?: string
          updated_at?: string
          vehicle_ids: string[]
        }
        Update: {
          created_at?: string
          created_by?: string
          day_of_week?: number | null
          frequency?: string
          id?: string
          include_trend_analysis?: boolean
          is_active?: boolean
          name?: string
          organization_id?: string
          recipient_emails?: string[]
          time_of_day?: string
          updated_at?: string
          vehicle_ids?: string[]
        }
        Relationships: []
      }
      employees: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          driver_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_id: string | null
          employee_type: Database["public"]["Enums"]["employee_type"]
          first_name: string
          hire_date: string | null
          id: string
          job_title: string | null
          last_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          driver_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          employee_type?: Database["public"]["Enums"]["employee_type"]
          first_name: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          driver_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_id?: string | null
          employee_type?: Database["public"]["Enums"]["employee_type"]
          first_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_cost_rates: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_until: string | null
          energy_type: string
          fuel_type: string | null
          id: string
          notes: string | null
          organization_id: string
          rate_per_unit: number
          source: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from: string
          effective_until?: string | null
          energy_type?: string
          fuel_type?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          rate_per_unit: number
          source?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_until?: string | null
          energy_type?: string
          fuel_type?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          rate_per_unit?: number
          source?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_cost_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_configs: {
        Row: {
          cache_geocoding_results: boolean | null
          config_name: string
          created_at: string
          driver_id_methods: Json | null
          driver_timeout_minutes: number | null
          enable_driver_binding: boolean | null
          enable_geofence_matching: boolean | null
          enable_map_matching: boolean | null
          enable_reverse_geocoding: boolean | null
          enable_speed_limit_lookup: boolean | null
          geocoding_provider: string | null
          geofence_buffer_meters: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          map_provider: string | null
          organization_id: string
          road_tolerance_meters: number | null
          snap_to_roads: boolean | null
          speed_limit_provider: string | null
          updated_at: string
        }
        Insert: {
          cache_geocoding_results?: boolean | null
          config_name: string
          created_at?: string
          driver_id_methods?: Json | null
          driver_timeout_minutes?: number | null
          enable_driver_binding?: boolean | null
          enable_geofence_matching?: boolean | null
          enable_map_matching?: boolean | null
          enable_reverse_geocoding?: boolean | null
          enable_speed_limit_lookup?: boolean | null
          geocoding_provider?: string | null
          geofence_buffer_meters?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          map_provider?: string | null
          organization_id: string
          road_tolerance_meters?: number | null
          snap_to_roads?: boolean | null
          speed_limit_provider?: string | null
          updated_at?: string
        }
        Update: {
          cache_geocoding_results?: boolean | null
          config_name?: string
          created_at?: string
          driver_id_methods?: Json | null
          driver_timeout_minutes?: number | null
          enable_driver_binding?: boolean | null
          enable_geofence_matching?: boolean | null
          enable_map_matching?: boolean | null
          enable_reverse_geocoding?: boolean | null
          enable_speed_limit_lookup?: boolean | null
          geocoding_provider?: string | null
          geofence_buffer_meters?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          map_provider?: string | null
          organization_id?: string
          road_tolerance_meters?: number | null
          snap_to_roads?: boolean | null
          speed_limit_provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_outbox: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          organization_id: string
          payload: Json
          pushed_at: string | null
          response_body: string | null
          response_code: number | null
          status: string
          target_system: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          organization_id: string
          payload?: Json
          pushed_at?: string | null
          response_body?: string | null
          response_code?: number | null
          status?: string
          target_system?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          organization_id?: string
          payload?: Json
          pushed_at?: string | null
          response_body?: string | null
          response_code?: number | null
          status?: string
          target_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_outbox_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_sync_log: {
        Row: {
          attempt_number: number | null
          created_at: string
          error_message: string | null
          id: string
          organization_id: string
          request_payload: Json | null
          response_payload: Json | null
          response_status_code: number | null
          status: string
          sync_type: string
          triggered_by: string | null
          work_order_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id: string
          request_payload?: Json | null
          response_payload?: Json | null
          response_status_code?: number | null
          status?: string
          sync_type?: string
          triggered_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          response_status_code?: number | null
          status?: string
          sync_type?: string
          triggered_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_webhook_bridges: {
        Row: {
          auth_token: string | null
          auth_type: string
          created_at: string
          events: string[]
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          organization_id: string
          success_count: number | null
          target_url: string
          transform_template: Json | null
          updated_at: string
        }
        Insert: {
          auth_token?: string | null
          auth_type?: string
          created_at?: string
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          organization_id: string
          success_count?: number | null
          target_url: string
          transform_template?: Json | null
          updated_at?: string
        }
        Update: {
          auth_token?: string | null
          auth_type?: string
          created_at?: string
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          success_count?: number | null
          target_url?: string
          transform_template?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_webhook_bridges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      erpnext_config: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string | null
          erpnext_url: string
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          organization_id: string
          sync_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string | null
          erpnext_url: string
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          organization_id: string
          sync_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string | null
          erpnext_url?: string
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          organization_id?: string
          sync_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erpnext_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      erpnext_sync_logs: {
        Row: {
          completed_at: string | null
          config_id: string
          created_at: string | null
          entity_type: string
          error_details: Json | null
          id: string
          organization_id: string
          records_failed: number | null
          records_synced: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          config_id: string
          created_at?: string | null
          entity_type: string
          error_details?: Json | null
          id?: string
          organization_id: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          config_id?: string
          created_at?: string | null
          entity_type?: string
          error_details?: Json | null
          id?: string
          organization_id?: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "erpnext_sync_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "erpnext_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erpnext_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_charging_sessions: {
        Row: {
          charging_type: string | null
          cost_per_kwh: number | null
          created_at: string
          driver_id: string | null
          end_time: string | null
          energy_consumed_kwh: number | null
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          organization_id: string
          soc_end_percent: number | null
          soc_start_percent: number | null
          start_time: string
          station_id: string | null
          station_name: string | null
          status: string | null
          total_cost: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          charging_type?: string | null
          cost_per_kwh?: number | null
          created_at?: string
          driver_id?: string | null
          end_time?: string | null
          energy_consumed_kwh?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id: string
          soc_end_percent?: number | null
          soc_start_percent?: number | null
          start_time: string
          station_id?: string | null
          station_name?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          charging_type?: string | null
          cost_per_kwh?: number | null
          created_at?: string
          driver_id?: string | null
          end_time?: string | null
          energy_consumed_kwh?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          organization_id?: string
          soc_end_percent?: number | null
          soc_start_percent?: number | null
          start_time?: string
          station_id?: string | null
          station_name?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_charging_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_charging_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_charging_sessions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "ev_charging_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_charging_sessions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_charging_stations: {
        Row: {
          address: string | null
          connector_types: string[] | null
          cost_per_kwh: number | null
          created_at: string
          id: string
          is_active: boolean | null
          is_available: boolean | null
          lat: number
          lng: number
          max_power_kw: number | null
          name: string
          num_ports: number | null
          operator_name: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          connector_types?: string[] | null
          cost_per_kwh?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          lat: number
          lng: number
          max_power_kw?: number | null
          name: string
          num_ports?: number | null
          operator_name?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          connector_types?: string[] | null
          cost_per_kwh?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          lat?: number
          lng?: number
          max_power_kw?: number | null
          name?: string
          num_ports?: number | null
          operator_name?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_charging_stations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_vehicle_data: {
        Row: {
          battery_capacity_kwh: number | null
          battery_health_percent: number | null
          battery_type: string | null
          charging_connector_type: string | null
          created_at: string
          current_soc_percent: number | null
          estimated_range_km: number | null
          id: string
          last_soc_update: string | null
          max_charging_rate_kw: number | null
          odometer_at_last_charge: number | null
          organization_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          battery_capacity_kwh?: number | null
          battery_health_percent?: number | null
          battery_type?: string | null
          charging_connector_type?: string | null
          created_at?: string
          current_soc_percent?: number | null
          estimated_range_km?: number | null
          id?: string
          last_soc_update?: string | null
          max_charging_rate_kw?: number | null
          odometer_at_last_charge?: number | null
          organization_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          battery_capacity_kwh?: number | null
          battery_health_percent?: number | null
          battery_type?: string | null
          charging_connector_type?: string | null
          created_at?: string
          current_soc_percent?: number | null
          estimated_range_km?: number | null
          id?: string
          last_soc_update?: string | null
          max_charging_rate_kw?: number | null
          odometer_at_last_charge?: number | null
          organization_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_vehicle_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_vehicle_data_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_work_orders: {
        Row: {
          activity_cause: string | null
          activity_source: string | null
          activity_type: string | null
          actual_cost: number | null
          additional_description: string | null
          agreement_number: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          asset_activity: string | null
          asset_group: string | null
          asset_number: string | null
          assigned_to: string | null
          charging_session_id: string | null
          charging_type: string | null
          connector_type: string | null
          context: string | null
          cost_per_kwh: number | null
          created_at: string
          created_by_user_id: string | null
          current_soc_percent: number | null
          department: string | null
          department_description: string | null
          description: string | null
          duration: number | null
          enable_material_issue_request: boolean | null
          energy_delivered_kwh: number | null
          energy_required_kwh: number | null
          estimated_cost: number | null
          failure_cause: string | null
          failure_code: string | null
          final_approved_at: string | null
          final_approved_by: string | null
          firm: boolean | null
          id: string
          notes: string | null
          notification_required: boolean | null
          organization_id: string
          planned: boolean | null
          planner_id: string | null
          planner_name: string | null
          priority: string | null
          project: string | null
          rebuild_parent: string | null
          remark1: string | null
          remark2: string | null
          remark3: string | null
          remark4: string | null
          request_number: string | null
          resolution: string | null
          scheduled_completion_date: string | null
          scheduled_start_date: string | null
          shutdown_type: string | null
          station_id: string | null
          status: string
          supplier_name: string | null
          tagout_required: boolean | null
          target_soc_percent: number | null
          task: string | null
          updated_at: string
          vehicle_id: string | null
          warranty_active: boolean | null
          warranty_expiration_date: string | null
          warranty_status: string | null
          wip_accounting_class: string | null
          wo_status: string | null
          work_order_number: string
          work_order_type: string | null
        }
        Insert: {
          activity_cause?: string | null
          activity_source?: string | null
          activity_type?: string | null
          actual_cost?: number | null
          additional_description?: string | null
          agreement_number?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_activity?: string | null
          asset_group?: string | null
          asset_number?: string | null
          assigned_to?: string | null
          charging_session_id?: string | null
          charging_type?: string | null
          connector_type?: string | null
          context?: string | null
          cost_per_kwh?: number | null
          created_at?: string
          created_by_user_id?: string | null
          current_soc_percent?: number | null
          department?: string | null
          department_description?: string | null
          description?: string | null
          duration?: number | null
          enable_material_issue_request?: boolean | null
          energy_delivered_kwh?: number | null
          energy_required_kwh?: number | null
          estimated_cost?: number | null
          failure_cause?: string | null
          failure_code?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          firm?: boolean | null
          id?: string
          notes?: string | null
          notification_required?: boolean | null
          organization_id: string
          planned?: boolean | null
          planner_id?: string | null
          planner_name?: string | null
          priority?: string | null
          project?: string | null
          rebuild_parent?: string | null
          remark1?: string | null
          remark2?: string | null
          remark3?: string | null
          remark4?: string | null
          request_number?: string | null
          resolution?: string | null
          scheduled_completion_date?: string | null
          scheduled_start_date?: string | null
          shutdown_type?: string | null
          station_id?: string | null
          status?: string
          supplier_name?: string | null
          tagout_required?: boolean | null
          target_soc_percent?: number | null
          task?: string | null
          updated_at?: string
          vehicle_id?: string | null
          warranty_active?: boolean | null
          warranty_expiration_date?: string | null
          warranty_status?: string | null
          wip_accounting_class?: string | null
          wo_status?: string | null
          work_order_number: string
          work_order_type?: string | null
        }
        Update: {
          activity_cause?: string | null
          activity_source?: string | null
          activity_type?: string | null
          actual_cost?: number | null
          additional_description?: string | null
          agreement_number?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_activity?: string | null
          asset_group?: string | null
          asset_number?: string | null
          assigned_to?: string | null
          charging_session_id?: string | null
          charging_type?: string | null
          connector_type?: string | null
          context?: string | null
          cost_per_kwh?: number | null
          created_at?: string
          created_by_user_id?: string | null
          current_soc_percent?: number | null
          department?: string | null
          department_description?: string | null
          description?: string | null
          duration?: number | null
          enable_material_issue_request?: boolean | null
          energy_delivered_kwh?: number | null
          energy_required_kwh?: number | null
          estimated_cost?: number | null
          failure_cause?: string | null
          failure_code?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          firm?: boolean | null
          id?: string
          notes?: string | null
          notification_required?: boolean | null
          organization_id?: string
          planned?: boolean | null
          planner_id?: string | null
          planner_name?: string | null
          priority?: string | null
          project?: string | null
          rebuild_parent?: string | null
          remark1?: string | null
          remark2?: string | null
          remark3?: string | null
          remark4?: string | null
          request_number?: string | null
          resolution?: string | null
          scheduled_completion_date?: string | null
          scheduled_start_date?: string | null
          shutdown_type?: string | null
          station_id?: string | null
          status?: string
          supplier_name?: string | null
          tagout_required?: boolean | null
          target_soc_percent?: number | null
          task?: string | null
          updated_at?: string
          vehicle_id?: string | null
          warranty_active?: boolean | null
          warranty_expiration_date?: string | null
          warranty_status?: string | null
          wip_accounting_class?: string | null
          wo_status?: string | null
          work_order_number?: string
          work_order_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ev_work_orders_charging_session_id_fkey"
            columns: ["charging_session_id"]
            isOneToOne: false
            referencedRelation: "ev_charging_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_work_orders_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "ev_charging_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_assets: {
        Row: {
          asset_code: string
          assigned_to_depot: string | null
          assigned_to_user: string | null
          category: string
          condition: string | null
          created_at: string
          current_value: number | null
          depreciation_method: string | null
          depreciation_rate: number | null
          id: string
          is_active: boolean | null
          lifecycle_stage: string
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          organization_id: string
          photo_url: string | null
          purchase_cost: number | null
          purchase_date: string | null
          salvage_value: number | null
          serial_number: string | null
          sub_category: string | null
          updated_at: string
          useful_life_years: number | null
          vehicle_id: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_code: string
          assigned_to_depot?: string | null
          assigned_to_user?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          current_value?: number | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          id?: string
          is_active?: boolean | null
          lifecycle_stage?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          organization_id: string
          photo_url?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          sub_category?: string | null
          updated_at?: string
          useful_life_years?: number | null
          vehicle_id?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_code?: string
          assigned_to_depot?: string | null
          assigned_to_user?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          current_value?: number | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          id?: string
          is_active?: boolean | null
          lifecycle_stage?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          photo_url?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          sub_category?: string | null
          updated_at?: string
          useful_life_years?: number | null
          vehicle_id?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_assets_assigned_to_depot_fkey"
            columns: ["assigned_to_depot"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_assets_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_pools: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_pools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          driver_id: string | null
          form_id: string
          form_version_id: string
          id: string
          organization_id: string
          status: string
          submitted_at: string | null
          submitted_by: string
          updated_at: string
          vehicle_id: string | null
          workflow_instance_id: string | null
          workflow_task_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          driver_id?: string | null
          form_id: string
          form_version_id: string
          id?: string
          organization_id: string
          status?: string
          submitted_at?: string | null
          submitted_by: string
          updated_at?: string
          vehicle_id?: string | null
          workflow_instance_id?: string | null
          workflow_task_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          driver_id?: string | null
          form_id?: string
          form_version_id?: string
          id?: string
          organization_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          updated_at?: string
          vehicle_id?: string | null
          workflow_instance_id?: string | null
          workflow_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_form_version_id_fkey"
            columns: ["form_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_versions: {
        Row: {
          created_at: string
          created_by: string
          form_id: string
          id: string
          organization_id: string
          published_at: string | null
          published_by: string | null
          schema: Json
          settings: Json
          status: string
          updated_at: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          form_id: string
          id?: string
          organization_id: string
          published_at?: string | null
          published_by?: string | null
          schema?: Json
          settings?: Json
          status?: string
          updated_at?: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          form_id?: string
          id?: string
          organization_id?: string
          published_at?: string | null
          published_by?: string | null
          schema?: Json
          settings?: Json
          status?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          created_by: string
          current_published_version_id: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_default: boolean
          key: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string
          created_at?: string
          created_by: string
          current_published_version_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          key: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          created_by?: string
          current_published_version_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          key?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_current_published_version_fk"
            columns: ["current_published_version_id"]
            isOneToOne: false
            referencedRelation: "form_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_alert_settings: {
        Row: {
          consumption_alert_enabled: boolean | null
          consumption_variance_percent: number | null
          created_at: string
          fuel_theft_alert_enabled: boolean | null
          fuel_theft_threshold_liters: number | null
          id: string
          low_fuel_alert_enabled: boolean | null
          low_fuel_threshold_percent: number | null
          organization_id: string
          refueling_alert_enabled: boolean | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          consumption_alert_enabled?: boolean | null
          consumption_variance_percent?: number | null
          created_at?: string
          fuel_theft_alert_enabled?: boolean | null
          fuel_theft_threshold_liters?: number | null
          id?: string
          low_fuel_alert_enabled?: boolean | null
          low_fuel_threshold_percent?: number | null
          organization_id: string
          refueling_alert_enabled?: boolean | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          consumption_alert_enabled?: boolean | null
          consumption_variance_percent?: number | null
          created_at?: string
          fuel_theft_alert_enabled?: boolean | null
          fuel_theft_threshold_liters?: number | null
          id?: string
          low_fuel_alert_enabled?: boolean | null
          low_fuel_threshold_percent?: number | null
          organization_id?: string
          refueling_alert_enabled?: boolean | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_alert_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_alert_settings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_card_providers: {
        Row: {
          account_id: string | null
          api_endpoint: string | null
          api_key_encrypted: string | null
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          organization_id: string
          provider_name: string
          settings: Json | null
          sync_interval_minutes: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id: string
          provider_name: string
          settings?: Json | null
          sync_interval_minutes?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          organization_id?: string
          provider_name?: string
          settings?: Json | null
          sync_interval_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_card_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_clarification_requests: {
        Row: {
          auto_created: boolean
          created_at: string
          fuel_request_id: string
          id: string
          justification: string | null
          justified_at: string | null
          justified_by: string | null
          organization_id: string
          question: string
          requested_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auto_created?: boolean
          created_at?: string
          fuel_request_id: string
          id?: string
          justification?: string | null
          justified_at?: string | null
          justified_by?: string | null
          organization_id: string
          question: string
          requested_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auto_created?: boolean
          created_at?: string
          fuel_request_id?: string
          id?: string
          justification?: string | null
          justified_at?: string | null
          justified_by?: string | null
          organization_id?: string
          question?: string
          requested_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_clarification_requests_fuel_request_id_fkey"
            columns: ["fuel_request_id"]
            isOneToOne: false
            referencedRelation: "fuel_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_clarification_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_consumption_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_value: number | null
          alert_type: string
          created_at: string
          expected_value: number | null
          id: string
          is_acknowledged: boolean | null
          is_resolved: boolean | null
          message: string
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          trip_id: string | null
          variance_percent: number | null
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type: string
          created_at?: string
          expected_value?: number | null
          id?: string
          is_acknowledged?: boolean | null
          is_resolved?: boolean | null
          message: string
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
          trip_id?: string | null
          variance_percent?: number | null
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type?: string
          created_at?: string
          expected_value?: number | null
          id?: string
          is_acknowledged?: boolean | null
          is_resolved?: boolean | null
          message?: string
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          trip_id?: string | null
          variance_percent?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_consumption_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_consumption_alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_consumption_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_depot_dispensing: {
        Row: {
          attendant_id: string | null
          authorization_code: string | null
          created_at: string
          depot_id: string
          dispensed_at: string
          driver_id: string | null
          id: string
          liters_dispensed: number
          notes: string | null
          odometer_km: number | null
          organization_id: string
          pump_number: string | null
          stock_after_liters: number | null
          stock_before_liters: number | null
          vehicle_id: string | null
        }
        Insert: {
          attendant_id?: string | null
          authorization_code?: string | null
          created_at?: string
          depot_id: string
          dispensed_at?: string
          driver_id?: string | null
          id?: string
          liters_dispensed: number
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          pump_number?: string | null
          stock_after_liters?: number | null
          stock_before_liters?: number | null
          vehicle_id?: string | null
        }
        Update: {
          attendant_id?: string | null
          authorization_code?: string | null
          created_at?: string
          depot_id?: string
          dispensed_at?: string
          driver_id?: string | null
          id?: string
          liters_dispensed?: number
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          pump_number?: string | null
          stock_after_liters?: number | null
          stock_before_liters?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_depot_dispensing_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "fuel_depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_depot_dispensing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_depot_dispensing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_depot_dispensing_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_depot_receiving: {
        Row: {
          created_at: string
          delivery_note_number: string | null
          density: number | null
          depot_id: string
          id: string
          liters_received: number
          notes: string | null
          organization_id: string
          received_at: string
          received_by: string | null
          stock_after_liters: number | null
          stock_before_liters: number | null
          supplier_name: string
          temperature_celsius: number | null
          total_cost: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          delivery_note_number?: string | null
          density?: number | null
          depot_id: string
          id?: string
          liters_received: number
          notes?: string | null
          organization_id: string
          received_at?: string
          received_by?: string | null
          stock_after_liters?: number | null
          stock_before_liters?: number | null
          supplier_name: string
          temperature_celsius?: number | null
          total_cost?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          delivery_note_number?: string | null
          density?: number | null
          depot_id?: string
          id?: string
          liters_received?: number
          notes?: string | null
          organization_id?: string
          received_at?: string
          received_by?: string | null
          stock_after_liters?: number | null
          stock_before_liters?: number | null
          supplier_name?: string
          temperature_celsius?: number | null
          total_cost?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_depot_receiving_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "fuel_depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_depot_receiving_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_depots: {
        Row: {
          capacity_liters: number
          created_at: string
          current_stock_liters: number
          fuel_type: string
          geofence_id: string | null
          id: string
          is_active: boolean | null
          lat: number
          lng: number
          location_name: string | null
          min_stock_threshold: number | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          capacity_liters?: number
          created_at?: string
          current_stock_liters?: number
          fuel_type?: string
          geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          lat: number
          lng: number
          location_name?: string | null
          min_stock_threshold?: number | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          capacity_liters?: number
          created_at?: string
          current_stock_liters?: number
          fuel_type?: string
          geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number
          lng?: number
          location_name?: string | null
          min_stock_threshold?: number | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_depots_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_depots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_detection_configs: {
        Row: {
          cornering_threshold_degrees: number | null
          created_at: string
          hill_gradient_threshold_percent: number | null
          id: string
          ignore_cornering: boolean | null
          ignore_hill_gradient: boolean | null
          ignore_vibration_spikes: boolean | null
          is_active: boolean | null
          min_samples_for_detection: number | null
          moving_average_window: number | null
          notes: string | null
          organization_id: string
          refuel_speed_threshold_kmh: number | null
          refuel_threshold_percent: number | null
          refuel_time_window_seconds: number | null
          require_fuel_card_validation: boolean | null
          sensor_fault_threshold_hours: number | null
          sensor_id: string | null
          theft_speed_threshold_kmh: number | null
          theft_threshold_percent: number | null
          theft_time_window_seconds: number | null
          updated_at: string
          use_kalman_filter: boolean | null
          use_temperature_compensation: boolean | null
          validation_time_window_hours: number | null
          vehicle_id: string
        }
        Insert: {
          cornering_threshold_degrees?: number | null
          created_at?: string
          hill_gradient_threshold_percent?: number | null
          id?: string
          ignore_cornering?: boolean | null
          ignore_hill_gradient?: boolean | null
          ignore_vibration_spikes?: boolean | null
          is_active?: boolean | null
          min_samples_for_detection?: number | null
          moving_average_window?: number | null
          notes?: string | null
          organization_id: string
          refuel_speed_threshold_kmh?: number | null
          refuel_threshold_percent?: number | null
          refuel_time_window_seconds?: number | null
          require_fuel_card_validation?: boolean | null
          sensor_fault_threshold_hours?: number | null
          sensor_id?: string | null
          theft_speed_threshold_kmh?: number | null
          theft_threshold_percent?: number | null
          theft_time_window_seconds?: number | null
          updated_at?: string
          use_kalman_filter?: boolean | null
          use_temperature_compensation?: boolean | null
          validation_time_window_hours?: number | null
          vehicle_id: string
        }
        Update: {
          cornering_threshold_degrees?: number | null
          created_at?: string
          hill_gradient_threshold_percent?: number | null
          id?: string
          ignore_cornering?: boolean | null
          ignore_hill_gradient?: boolean | null
          ignore_vibration_spikes?: boolean | null
          is_active?: boolean | null
          min_samples_for_detection?: number | null
          moving_average_window?: number | null
          notes?: string | null
          organization_id?: string
          refuel_speed_threshold_kmh?: number | null
          refuel_threshold_percent?: number | null
          refuel_time_window_seconds?: number | null
          require_fuel_card_validation?: boolean | null
          sensor_fault_threshold_hours?: number | null
          sensor_id?: string | null
          theft_speed_threshold_kmh?: number | null
          theft_threshold_percent?: number | null
          theft_time_window_seconds?: number | null
          updated_at?: string
          use_kalman_filter?: boolean | null
          use_temperature_compensation?: boolean | null
          validation_time_window_hours?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_detection_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_detection_configs_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_detection_configs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_emoney_approvals: {
        Row: {
          acted_at: string | null
          amount: number
          approver_id: string
          approver_role: string
          comment: string | null
          created_at: string | null
          fuel_work_order_id: string
          id: string
          initiated_by: string | null
          is_delegated: boolean | null
          organization_id: string
          original_approver_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          acted_at?: string | null
          amount: number
          approver_id: string
          approver_role: string
          comment?: string | null
          created_at?: string | null
          fuel_work_order_id: string
          id?: string
          initiated_by?: string | null
          is_delegated?: boolean | null
          organization_id: string
          original_approver_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          acted_at?: string | null
          amount?: number
          approver_id?: string
          approver_role?: string
          comment?: string | null
          created_at?: string | null
          fuel_work_order_id?: string
          id?: string
          initiated_by?: string | null
          is_delegated?: boolean | null
          organization_id?: string
          original_approver_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_emoney_approvals_fuel_work_order_id_fkey"
            columns: ["fuel_work_order_id"]
            isOneToOne: false
            referencedRelation: "fuel_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_emoney_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_event_processing_logs: {
        Row: {
          config_snapshot: Json | null
          created_at: string
          detection_confidence: number | null
          event_detected: string | null
          false_positive_checks: Json | null
          filters_applied: Json | null
          fuel_card_validation: Json | null
          fuel_change_liters: number | null
          fuel_change_percent: number | null
          fuel_event_id: string | null
          id: string
          ignition_status: boolean | null
          organization_id: string
          processing_time: string
          raw_readings: Json | null
          sensor_id: string | null
          smoothed_readings: Json | null
          speed_at_event: number | null
          time_window_seconds: number | null
          vehicle_id: string
        }
        Insert: {
          config_snapshot?: Json | null
          created_at?: string
          detection_confidence?: number | null
          event_detected?: string | null
          false_positive_checks?: Json | null
          filters_applied?: Json | null
          fuel_card_validation?: Json | null
          fuel_change_liters?: number | null
          fuel_change_percent?: number | null
          fuel_event_id?: string | null
          id?: string
          ignition_status?: boolean | null
          organization_id: string
          processing_time?: string
          raw_readings?: Json | null
          sensor_id?: string | null
          smoothed_readings?: Json | null
          speed_at_event?: number | null
          time_window_seconds?: number | null
          vehicle_id: string
        }
        Update: {
          config_snapshot?: Json | null
          created_at?: string
          detection_confidence?: number | null
          event_detected?: string | null
          false_positive_checks?: Json | null
          filters_applied?: Json | null
          fuel_card_validation?: Json | null
          fuel_change_liters?: number | null
          fuel_change_percent?: number | null
          fuel_event_id?: string | null
          id?: string
          ignition_status?: boolean | null
          organization_id?: string
          processing_time?: string
          raw_readings?: Json | null
          sensor_id?: string | null
          smoothed_readings?: Json | null
          speed_at_event?: number | null
          time_window_seconds?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_event_processing_logs_fuel_event_id_fkey"
            columns: ["fuel_event_id"]
            isOneToOne: false
            referencedRelation: "fuel_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_event_processing_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_event_processing_logs_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_event_processing_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_events: {
        Row: {
          confidence_score: number | null
          created_at: string
          event_time: string
          event_type: string
          fuel_after_liters: number | null
          fuel_before_liters: number | null
          fuel_change_liters: number
          fuel_change_percent: number
          id: string
          ignition_status: boolean | null
          investigated_at: string | null
          investigated_by: string | null
          investigation_notes: string | null
          lat: number | null
          lng: number | null
          location_name: string | null
          organization_id: string
          speed_kmh: number | null
          status: string | null
          trip_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          event_time: string
          event_type: string
          fuel_after_liters?: number | null
          fuel_before_liters?: number | null
          fuel_change_liters: number
          fuel_change_percent: number
          id?: string
          ignition_status?: boolean | null
          investigated_at?: string | null
          investigated_by?: string | null
          investigation_notes?: string | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id: string
          speed_kmh?: number | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          event_time?: string
          event_type?: string
          fuel_after_liters?: number | null
          fuel_before_liters?: number | null
          fuel_change_liters?: number
          fuel_change_percent?: number
          id?: string
          ignition_status?: boolean | null
          investigated_at?: string | null
          investigated_by?: string | null
          investigation_notes?: string | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id?: string
          speed_kmh?: number | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_probe_calibrations: {
        Row: {
          calibrated_by: string | null
          calibration_date: string | null
          calibration_points: Json | null
          created_at: string
          empty_voltage: number | null
          full_voltage: number | null
          id: string
          next_calibration_due: string | null
          notes: string | null
          organization_id: string
          probe_model: string | null
          probe_serial: string | null
          status: string | null
          tank_capacity_liters: number | null
          tank_shape: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          calibrated_by?: string | null
          calibration_date?: string | null
          calibration_points?: Json | null
          created_at?: string
          empty_voltage?: number | null
          full_voltage?: number | null
          id?: string
          next_calibration_due?: string | null
          notes?: string | null
          organization_id: string
          probe_model?: string | null
          probe_serial?: string | null
          status?: string | null
          tank_capacity_liters?: number | null
          tank_shape?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          calibrated_by?: string | null
          calibration_date?: string | null
          calibration_points?: Json | null
          created_at?: string
          empty_voltage?: number | null
          full_voltage?: number | null
          id?: string
          next_calibration_due?: string | null
          notes?: string | null
          organization_id?: string
          probe_model?: string | null
          probe_serial?: string | null
          status?: string | null
          tank_capacity_liters?: number | null
          tank_shape?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_probe_calibrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_probe_calibrations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_reconciliations: {
        Row: {
          actual_consumption_liters: number | null
          created_at: string
          distance_km: number | null
          expected_consumption_liters: number | null
          fuel_event_id: string | null
          id: string
          mismatch_severity: string | null
          mismatch_type: string | null
          organization_id: string
          reconciliation_date: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          sensor_change_liters: number | null
          status: string
          transaction_id: string | null
          transaction_liters: number | null
          updated_at: string
          variance_liters: number | null
          variance_percent: number | null
          vehicle_id: string
        }
        Insert: {
          actual_consumption_liters?: number | null
          created_at?: string
          distance_km?: number | null
          expected_consumption_liters?: number | null
          fuel_event_id?: string | null
          id?: string
          mismatch_severity?: string | null
          mismatch_type?: string | null
          organization_id: string
          reconciliation_date?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sensor_change_liters?: number | null
          status?: string
          transaction_id?: string | null
          transaction_liters?: number | null
          updated_at?: string
          variance_liters?: number | null
          variance_percent?: number | null
          vehicle_id: string
        }
        Update: {
          actual_consumption_liters?: number | null
          created_at?: string
          distance_km?: number | null
          expected_consumption_liters?: number | null
          fuel_event_id?: string | null
          id?: string
          mismatch_severity?: string | null
          mismatch_type?: string | null
          organization_id?: string
          reconciliation_date?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sensor_change_liters?: number | null
          status?: string
          transaction_id?: string | null
          transaction_liters?: number | null
          updated_at?: string
          variance_liters?: number | null
          variance_percent?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_reconciliations_fuel_event_id_fkey"
            columns: ["fuel_event_id"]
            isOneToOne: false
            referencedRelation: "fuel_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_reconciliations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_reconciliations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "fuel_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_reconciliations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_request_approvals: {
        Row: {
          acted_at: string | null
          action: string
          approver_id: string
          approver_role: string
          comment: string | null
          created_at: string
          fuel_request_id: string
          id: string
          organization_id: string
          step: number
          updated_at: string
        }
        Insert: {
          acted_at?: string | null
          action?: string
          approver_id: string
          approver_role?: string
          comment?: string | null
          created_at?: string
          fuel_request_id: string
          id?: string
          organization_id: string
          step?: number
          updated_at?: string
        }
        Update: {
          acted_at?: string | null
          action?: string
          approver_id?: string
          approver_role?: string
          comment?: string | null
          created_at?: string
          fuel_request_id?: string
          id?: string
          organization_id?: string
          step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_request_approvals_fuel_request_id_fkey"
            columns: ["fuel_request_id"]
            isOneToOne: false
            referencedRelation: "fuel_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_request_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_requests: {
        Row: {
          actual_cost: number | null
          actual_liters: number | null
          additional_description: string | null
          adjustment_wo_number: string | null
          approved_at: string | null
          approved_by: string | null
          asset_criticality: string | null
          assigned_department: string | null
          attachments: string[] | null
          auto_trigger_efficiency: number | null
          auto_triggered_at: string | null
          clarification_status: string | null
          clearance_approved_at: string | null
          clearance_approved_by: string | null
          clearance_status: string
          contact_preference: string | null
          context_value: string | null
          cost_center: string | null
          created_at: string
          current_odometer: number | null
          deviation_justification: string | null
          deviation_percent: number | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          driver_type: string | null
          efficiency_km_per_liter: number | null
          email: string | null
          emoney_amount: number | null
          emoney_status: string | null
          employee_id_no: string | null
          estimated_cost: number | null
          fuel_by_cash_coupon: number | null
          fuel_in_telebirr: number | null
          fuel_request_type: string | null
          fuel_type: string | null
          fuel_work_order_id: string | null
          fulfilled_at: string | null
          generator_id: string | null
          id: string
          liters_approved: number | null
          liters_requested: number
          notes: string | null
          notify_user: boolean | null
          organization_id: string
          phone_number: string | null
          previous_odometer: number | null
          priority: string | null
          project_number: string | null
          purpose: string | null
          rejected_reason: string | null
          remark: string | null
          request_by_completion_date: string | null
          request_by_start_date: string | null
          request_number: string
          request_type: string
          requested_at: string
          requested_by: string
          requested_for: string | null
          requestor_department: string | null
          route: string | null
          running_hours: number | null
          security_name: string | null
          station_id: string | null
          status: string
          task_number: string | null
          technician_employee_id: string | null
          technician_name: string | null
          trigger_source: string
          updated_at: string
          vehicle_driver_name: string | null
          vehicle_id: string
          wallet_transfer_ref: string | null
          work_request_type: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_liters?: number | null
          additional_description?: string | null
          adjustment_wo_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_criticality?: string | null
          assigned_department?: string | null
          attachments?: string[] | null
          auto_trigger_efficiency?: number | null
          auto_triggered_at?: string | null
          clarification_status?: string | null
          clearance_approved_at?: string | null
          clearance_approved_by?: string | null
          clearance_status?: string
          contact_preference?: string | null
          context_value?: string | null
          cost_center?: string | null
          created_at?: string
          current_odometer?: number | null
          deviation_justification?: string | null
          deviation_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          efficiency_km_per_liter?: number | null
          email?: string | null
          emoney_amount?: number | null
          emoney_status?: string | null
          employee_id_no?: string | null
          estimated_cost?: number | null
          fuel_by_cash_coupon?: number | null
          fuel_in_telebirr?: number | null
          fuel_request_type?: string | null
          fuel_type?: string | null
          fuel_work_order_id?: string | null
          fulfilled_at?: string | null
          generator_id?: string | null
          id?: string
          liters_approved?: number | null
          liters_requested: number
          notes?: string | null
          notify_user?: boolean | null
          organization_id: string
          phone_number?: string | null
          previous_odometer?: number | null
          priority?: string | null
          project_number?: string | null
          purpose?: string | null
          rejected_reason?: string | null
          remark?: string | null
          request_by_completion_date?: string | null
          request_by_start_date?: string | null
          request_number: string
          request_type?: string
          requested_at?: string
          requested_by: string
          requested_for?: string | null
          requestor_department?: string | null
          route?: string | null
          running_hours?: number | null
          security_name?: string | null
          station_id?: string | null
          status?: string
          task_number?: string | null
          technician_employee_id?: string | null
          technician_name?: string | null
          trigger_source?: string
          updated_at?: string
          vehicle_driver_name?: string | null
          vehicle_id: string
          wallet_transfer_ref?: string | null
          work_request_type?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_liters?: number | null
          additional_description?: string | null
          adjustment_wo_number?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_criticality?: string | null
          assigned_department?: string | null
          attachments?: string[] | null
          auto_trigger_efficiency?: number | null
          auto_triggered_at?: string | null
          clarification_status?: string | null
          clearance_approved_at?: string | null
          clearance_approved_by?: string | null
          clearance_status?: string
          contact_preference?: string | null
          context_value?: string | null
          cost_center?: string | null
          created_at?: string
          current_odometer?: number | null
          deviation_justification?: string | null
          deviation_percent?: number | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          efficiency_km_per_liter?: number | null
          email?: string | null
          emoney_amount?: number | null
          emoney_status?: string | null
          employee_id_no?: string | null
          estimated_cost?: number | null
          fuel_by_cash_coupon?: number | null
          fuel_in_telebirr?: number | null
          fuel_request_type?: string | null
          fuel_type?: string | null
          fuel_work_order_id?: string | null
          fulfilled_at?: string | null
          generator_id?: string | null
          id?: string
          liters_approved?: number | null
          liters_requested?: number
          notes?: string | null
          notify_user?: boolean | null
          organization_id?: string
          phone_number?: string | null
          previous_odometer?: number | null
          priority?: string | null
          project_number?: string | null
          purpose?: string | null
          rejected_reason?: string | null
          remark?: string | null
          request_by_completion_date?: string | null
          request_by_start_date?: string | null
          request_number?: string
          request_type?: string
          requested_at?: string
          requested_by?: string
          requested_for?: string | null
          requestor_department?: string | null
          route?: string | null
          running_hours?: number | null
          security_name?: string | null
          station_id?: string | null
          status?: string
          task_number?: string | null
          technician_employee_id?: string | null
          technician_name?: string | null
          trigger_source?: string
          updated_at?: string
          vehicle_driver_name?: string | null
          vehicle_id?: string
          wallet_transfer_ref?: string | null
          work_request_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_requests_fuel_work_order_id_fkey"
            columns: ["fuel_work_order_id"]
            isOneToOne: false
            referencedRelation: "fuel_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_requests_generator_id_fkey"
            columns: ["generator_id"]
            isOneToOne: false
            referencedRelation: "generators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_requests_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "approved_fuel_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_telebirr_transactions: {
        Row: {
          amount: number | null
          created_at: string
          driver_phone: string | null
          error_message: string | null
          external_ref: string | null
          fuel_request_id: string | null
          fuel_work_order_id: string | null
          id: string
          organization_id: string
          provider: string
          request_payload: Json | null
          response_payload: Json | null
          status: string
          txn_type: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          driver_phone?: string | null
          error_message?: string | null
          external_ref?: string | null
          fuel_request_id?: string | null
          fuel_work_order_id?: string | null
          id?: string
          organization_id: string
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          txn_type: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          driver_phone?: string | null
          error_message?: string | null
          external_ref?: string | null
          fuel_request_id?: string | null
          fuel_work_order_id?: string | null
          id?: string
          organization_id?: string
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          txn_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_telebirr_transactions_fuel_request_id_fkey"
            columns: ["fuel_request_id"]
            isOneToOne: false
            referencedRelation: "fuel_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_telebirr_transactions_fuel_work_order_id_fkey"
            columns: ["fuel_work_order_id"]
            isOneToOne: false
            referencedRelation: "fuel_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_telebirr_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_theft_cases: {
        Row: {
          assigned_to: string | null
          case_number: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          detected_at: string
          driver_id: string | null
          estimated_value: number | null
          event_type: string
          evidence_data: Json | null
          fuel_event_id: string | null
          fuel_lost_liters: number
          id: string
          investigation_notes: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          organization_id: string
          outcome: string | null
          priority: string | null
          recovery_amount: number | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          assigned_to?: string | null
          case_number: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          detected_at: string
          driver_id?: string | null
          estimated_value?: number | null
          event_type: string
          evidence_data?: Json | null
          fuel_event_id?: string | null
          fuel_lost_liters: number
          id?: string
          investigation_notes?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          organization_id: string
          outcome?: string | null
          priority?: string | null
          recovery_amount?: number | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          assigned_to?: string | null
          case_number?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          detected_at?: string
          driver_id?: string | null
          estimated_value?: number | null
          event_type?: string
          evidence_data?: Json | null
          fuel_event_id?: string | null
          fuel_lost_liters?: number
          id?: string
          investigation_notes?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          organization_id?: string
          outcome?: string | null
          priority?: string | null
          recovery_amount?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_theft_cases_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_theft_cases_fuel_event_id_fkey"
            columns: ["fuel_event_id"]
            isOneToOne: false
            referencedRelation: "fuel_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_theft_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_theft_cases_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_transactions: {
        Row: {
          card_number: string | null
          created_at: string
          fuel_amount_liters: number
          fuel_cost: number
          fuel_price_per_liter: number
          id: string
          is_reconciled: boolean | null
          lat: number | null
          lng: number | null
          location_name: string | null
          notes: string | null
          odometer_km: number | null
          organization_id: string
          receipt_number: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          variance_liters: number | null
          vehicle_id: string
          vendor_name: string | null
        }
        Insert: {
          card_number?: string | null
          created_at?: string
          fuel_amount_liters: number
          fuel_cost?: number
          fuel_price_per_liter?: number
          id?: string
          is_reconciled?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string
          variance_liters?: number | null
          vehicle_id: string
          vendor_name?: string | null
        }
        Update: {
          card_number?: string | null
          created_at?: string
          fuel_amount_liters?: number
          fuel_cost?: number
          fuel_price_per_liter?: number
          id?: string
          is_reconciled?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          variance_liters?: number | null
          vehicle_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_transactions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_wo_approvals: {
        Row: {
          acted_at: string | null
          action: string
          approver_id: string | null
          approver_role: string
          comment: string | null
          created_at: string | null
          fuel_work_order_id: string
          id: string
          is_delegated: boolean | null
          organization_id: string
          original_approver_id: string | null
          step: number
          updated_at: string | null
        }
        Insert: {
          acted_at?: string | null
          action?: string
          approver_id?: string | null
          approver_role: string
          comment?: string | null
          created_at?: string | null
          fuel_work_order_id: string
          id?: string
          is_delegated?: boolean | null
          organization_id: string
          original_approver_id?: string | null
          step: number
          updated_at?: string | null
        }
        Update: {
          acted_at?: string | null
          action?: string
          approver_id?: string | null
          approver_role?: string
          comment?: string | null
          created_at?: string | null
          fuel_work_order_id?: string
          id?: string
          is_delegated?: boolean | null
          organization_id?: string
          original_approver_id?: string | null
          step?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_wo_approvals_fuel_work_order_id_fkey"
            columns: ["fuel_work_order_id"]
            isOneToOne: false
            referencedRelation: "fuel_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_wo_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_work_orders: {
        Row: {
          activity_cause: string | null
          activity_source: string | null
          activity_type: string | null
          additional_description: string | null
          agreement_number: string | null
          amount_remaining: number | null
          amount_used: number | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          asset_activity: string | null
          asset_group: string | null
          asset_number: string | null
          assigned_to: string | null
          context: string | null
          created_at: string
          created_by_user_id: string | null
          department: string | null
          department_description: string | null
          description: string | null
          driver_wallet_id: string | null
          duration: number | null
          emoney_amount: number | null
          emoney_approved_at: string | null
          emoney_approved_by: string | null
          emoney_initiated: boolean
          emoney_transfer_ref: string | null
          emoney_transfer_status: string | null
          enable_material_issue_request: boolean | null
          failure_cause: string | null
          failure_code: string | null
          final_approved_at: string | null
          final_approved_by: string | null
          firm: boolean | null
          fuel_request_id: string
          id: string
          notes: string | null
          notification_required: boolean | null
          organization_id: string
          pin_confirmation_ref: string | null
          pin_confirmed_at: string | null
          planned: boolean | null
          planner_id: string | null
          planner_name: string | null
          priority: string | null
          project: string | null
          pullback_amount: number | null
          pullback_completed_at: string | null
          pullback_initiated_at: string | null
          pullback_ref: string | null
          rebuild_parent: string | null
          remark1: string | null
          remark2: string | null
          remark3: string | null
          remark4: string | null
          request_number: string | null
          resolution: string | null
          scheduled_completion_date: string | null
          scheduled_start_date: string | null
          shutdown_type: string | null
          sms_receipt_sent_at: string | null
          sms_receipt_text: string | null
          station_id: string | null
          status: string
          supplier_name: string | null
          tagout_required: boolean | null
          task: string | null
          telebirr_provider: string | null
          telebirr_request_id: string | null
          updated_at: string
          warranty_active: boolean | null
          warranty_expiration_date: string | null
          warranty_status: string | null
          wip_accounting_class: string | null
          wo_status: string | null
          work_order_number: string
          work_order_type: string | null
        }
        Insert: {
          activity_cause?: string | null
          activity_source?: string | null
          activity_type?: string | null
          additional_description?: string | null
          agreement_number?: string | null
          amount_remaining?: number | null
          amount_used?: number | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_activity?: string | null
          asset_group?: string | null
          asset_number?: string | null
          assigned_to?: string | null
          context?: string | null
          created_at?: string
          created_by_user_id?: string | null
          department?: string | null
          department_description?: string | null
          description?: string | null
          driver_wallet_id?: string | null
          duration?: number | null
          emoney_amount?: number | null
          emoney_approved_at?: string | null
          emoney_approved_by?: string | null
          emoney_initiated?: boolean
          emoney_transfer_ref?: string | null
          emoney_transfer_status?: string | null
          enable_material_issue_request?: boolean | null
          failure_cause?: string | null
          failure_code?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          firm?: boolean | null
          fuel_request_id: string
          id?: string
          notes?: string | null
          notification_required?: boolean | null
          organization_id: string
          pin_confirmation_ref?: string | null
          pin_confirmed_at?: string | null
          planned?: boolean | null
          planner_id?: string | null
          planner_name?: string | null
          priority?: string | null
          project?: string | null
          pullback_amount?: number | null
          pullback_completed_at?: string | null
          pullback_initiated_at?: string | null
          pullback_ref?: string | null
          rebuild_parent?: string | null
          remark1?: string | null
          remark2?: string | null
          remark3?: string | null
          remark4?: string | null
          request_number?: string | null
          resolution?: string | null
          scheduled_completion_date?: string | null
          scheduled_start_date?: string | null
          shutdown_type?: string | null
          sms_receipt_sent_at?: string | null
          sms_receipt_text?: string | null
          station_id?: string | null
          status?: string
          supplier_name?: string | null
          tagout_required?: boolean | null
          task?: string | null
          telebirr_provider?: string | null
          telebirr_request_id?: string | null
          updated_at?: string
          warranty_active?: boolean | null
          warranty_expiration_date?: string | null
          warranty_status?: string | null
          wip_accounting_class?: string | null
          wo_status?: string | null
          work_order_number: string
          work_order_type?: string | null
        }
        Update: {
          activity_cause?: string | null
          activity_source?: string | null
          activity_type?: string | null
          additional_description?: string | null
          agreement_number?: string | null
          amount_remaining?: number | null
          amount_used?: number | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_activity?: string | null
          asset_group?: string | null
          asset_number?: string | null
          assigned_to?: string | null
          context?: string | null
          created_at?: string
          created_by_user_id?: string | null
          department?: string | null
          department_description?: string | null
          description?: string | null
          driver_wallet_id?: string | null
          duration?: number | null
          emoney_amount?: number | null
          emoney_approved_at?: string | null
          emoney_approved_by?: string | null
          emoney_initiated?: boolean
          emoney_transfer_ref?: string | null
          emoney_transfer_status?: string | null
          enable_material_issue_request?: boolean | null
          failure_cause?: string | null
          failure_code?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          firm?: boolean | null
          fuel_request_id?: string
          id?: string
          notes?: string | null
          notification_required?: boolean | null
          organization_id?: string
          pin_confirmation_ref?: string | null
          pin_confirmed_at?: string | null
          planned?: boolean | null
          planner_id?: string | null
          planner_name?: string | null
          priority?: string | null
          project?: string | null
          pullback_amount?: number | null
          pullback_completed_at?: string | null
          pullback_initiated_at?: string | null
          pullback_ref?: string | null
          rebuild_parent?: string | null
          remark1?: string | null
          remark2?: string | null
          remark3?: string | null
          remark4?: string | null
          request_number?: string | null
          resolution?: string | null
          scheduled_completion_date?: string | null
          scheduled_start_date?: string | null
          shutdown_type?: string | null
          sms_receipt_sent_at?: string | null
          sms_receipt_text?: string | null
          station_id?: string | null
          status?: string
          supplier_name?: string | null
          tagout_required?: boolean | null
          task?: string | null
          telebirr_provider?: string | null
          telebirr_request_id?: string | null
          updated_at?: string
          warranty_active?: boolean | null
          warranty_expiration_date?: string | null
          warranty_status?: string | null
          wip_accounting_class?: string | null
          wo_status?: string | null
          work_order_number?: string
          work_order_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_work_orders_fuel_request_id_fkey"
            columns: ["fuel_request_id"]
            isOneToOne: false
            referencedRelation: "fuel_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_work_orders_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "approved_fuel_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_requests: {
        Row: {
          expires_at: string | null
          id: string
          notes: string | null
          organization_id: string
          processed_at: string | null
          processed_by: string | null
          request_data: Json | null
          request_type: string
          requested_at: string
          requested_by: string
          response_data: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          processed_at?: string | null
          processed_by?: string | null
          request_data?: Json | null
          request_type: string
          requested_at?: string
          requested_by: string
          response_data?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          processed_at?: string | null
          processed_by?: string | null
          request_data?: Json | null
          request_type?: string
          requested_at?: string
          requested_by?: string
          response_data?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generators: {
        Row: {
          address: string | null
          area: string | null
          asset_category: string | null
          asset_group: string | null
          asset_number: string | null
          asset_serial_number: string | null
          asset_status: string
          asset_type: string
          checked_out: boolean
          commission_date: string | null
          created_at: string
          criticality: string
          current_fuel_level_percent: number | null
          custom_attributes: Json | null
          fuel_type: string
          hazard_class: string | null
          id: string
          inspection_frequency_days: number | null
          is_gis_asset: boolean
          is_maintainable: boolean
          last_refuel_date: string | null
          latitude: number | null
          location: string | null
          lockout_tagout_required: boolean
          longitude: number | null
          manufacture_date: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          operation_log_enabled: boolean
          organization_id: string
          owning_department: string | null
          parent_asset_id: string | null
          ppe_required: string[] | null
          purchase_cost: number | null
          safety_notes: string | null
          serial_number: string | null
          status: string
          supplier: string | null
          tank_capacity_liters: number | null
          updated_at: string
          warranty_expiration: string | null
          wip_accounting_class: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          asset_category?: string | null
          asset_group?: string | null
          asset_number?: string | null
          asset_serial_number?: string | null
          asset_status?: string
          asset_type?: string
          checked_out?: boolean
          commission_date?: string | null
          created_at?: string
          criticality?: string
          current_fuel_level_percent?: number | null
          custom_attributes?: Json | null
          fuel_type?: string
          hazard_class?: string | null
          id?: string
          inspection_frequency_days?: number | null
          is_gis_asset?: boolean
          is_maintainable?: boolean
          last_refuel_date?: string | null
          latitude?: number | null
          location?: string | null
          lockout_tagout_required?: boolean
          longitude?: number | null
          manufacture_date?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          operation_log_enabled?: boolean
          organization_id: string
          owning_department?: string | null
          parent_asset_id?: string | null
          ppe_required?: string[] | null
          purchase_cost?: number | null
          safety_notes?: string | null
          serial_number?: string | null
          status?: string
          supplier?: string | null
          tank_capacity_liters?: number | null
          updated_at?: string
          warranty_expiration?: string | null
          wip_accounting_class?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          asset_category?: string | null
          asset_group?: string | null
          asset_number?: string | null
          asset_serial_number?: string | null
          asset_status?: string
          asset_type?: string
          checked_out?: boolean
          commission_date?: string | null
          created_at?: string
          criticality?: string
          current_fuel_level_percent?: number | null
          custom_attributes?: Json | null
          fuel_type?: string
          hazard_class?: string | null
          id?: string
          inspection_frequency_days?: number | null
          is_gis_asset?: boolean
          is_maintainable?: boolean
          last_refuel_date?: string | null
          latitude?: number | null
          location?: string | null
          lockout_tagout_required?: boolean
          longitude?: number | null
          manufacture_date?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          operation_log_enabled?: boolean
          organization_id?: string
          owning_department?: string | null
          parent_asset_id?: string | null
          ppe_required?: string[] | null
          purchase_cost?: number | null
          safety_notes?: string | null
          serial_number?: string | null
          status?: string
          supplier?: string | null
          tank_capacity_liters?: number | null
          updated_at?: string
          warranty_expiration?: string | null
          wip_accounting_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generators_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "generators"
            referencedColumns: ["id"]
          },
        ]
      }
      geofence_events: {
        Row: {
          created_at: string
          dwell_time_minutes: number | null
          event_time: string
          event_type: string
          geofence_id: string
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          speed_kmh: number | null
          speed_limit_kmh: number | null
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          dwell_time_minutes?: number | null
          event_time: string
          event_type: string
          geofence_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          speed_kmh?: number | null
          speed_limit_kmh?: number | null
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          dwell_time_minutes?: number | null
          event_time?: string
          event_type?: string
          geofence_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          speed_kmh?: number | null
          speed_limit_kmh?: number | null
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_events_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          active_days: number[] | null
          active_end_time: string | null
          active_start_time: string | null
          address: string | null
          category: string
          center_lat: number | null
          center_lng: number | null
          color: string | null
          created_at: string
          description: string | null
          enable_entry_alarm: boolean | null
          enable_exit_alarm: boolean | null
          enable_speed_alarm: boolean | null
          geometry_type: string
          id: string
          is_active: boolean | null
          max_dwell_minutes: number | null
          name: string
          notes: string | null
          organization_id: string
          polygon_points: Json | null
          radius_meters: number | null
          schedule_days: number[] | null
          schedule_enabled: boolean | null
          schedule_end_time: string | null
          schedule_start_time: string | null
          speed_limit: number | null
          updated_at: string
        }
        Insert: {
          active_days?: number[] | null
          active_end_time?: string | null
          active_start_time?: string | null
          address?: string | null
          category: string
          center_lat?: number | null
          center_lng?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          enable_entry_alarm?: boolean | null
          enable_exit_alarm?: boolean | null
          enable_speed_alarm?: boolean | null
          geometry_type: string
          id?: string
          is_active?: boolean | null
          max_dwell_minutes?: number | null
          name: string
          notes?: string | null
          organization_id: string
          polygon_points?: Json | null
          radius_meters?: number | null
          schedule_days?: number[] | null
          schedule_enabled?: boolean | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          speed_limit?: number | null
          updated_at?: string
        }
        Update: {
          active_days?: number[] | null
          active_end_time?: string | null
          active_start_time?: string | null
          address?: string | null
          category?: string
          center_lat?: number | null
          center_lng?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          enable_entry_alarm?: boolean | null
          enable_exit_alarm?: boolean | null
          enable_speed_alarm?: boolean | null
          geometry_type?: string
          id?: string
          is_active?: boolean | null
          max_dwell_minutes?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          polygon_points?: Json | null
          radius_meters?: number | null
          schedule_days?: number[] | null
          schedule_enabled?: boolean | null
          schedule_end_time?: string | null
          schedule_start_time?: string | null
          speed_limit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      governor_command_logs: {
        Row: {
          acknowledged_at: string | null
          command_data: Json | null
          command_type: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          organization_id: string
          phone_number: string | null
          sent_at: string | null
          sms_content: string | null
          status: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          command_data?: Json | null
          command_type: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          phone_number?: string | null
          sent_at?: string | null
          sms_content?: string | null
          status?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          command_data?: Json | null
          command_type?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          phone_number?: string | null
          sent_at?: string | null
          sms_content?: string | null
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "governor_command_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governor_command_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      hardware_sensor_data: {
        Row: {
          alert_message: string | null
          alert_type: string | null
          created_at: string
          id: string
          is_alert: boolean | null
          organization_id: string
          readings: Json
          recorded_at: string
          sensor_id: string | null
          sensor_type: string
          status: string | null
          vehicle_id: string
        }
        Insert: {
          alert_message?: string | null
          alert_type?: string | null
          created_at?: string
          id?: string
          is_alert?: boolean | null
          organization_id: string
          readings?: Json
          recorded_at?: string
          sensor_id?: string | null
          sensor_type: string
          status?: string | null
          vehicle_id: string
        }
        Update: {
          alert_message?: string | null
          alert_type?: string | null
          created_at?: string
          id?: string
          is_alert?: boolean | null
          organization_id?: string
          readings?: Json
          recorded_at?: string
          sensor_id?: string | null
          sensor_type?: string
          status?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hardware_sensor_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hardware_sensor_data_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      immobilization_sequences: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          current_step_index: number
          geofence_id: string | null
          id: string
          initiated_at: string
          initiated_by: string | null
          notes: string | null
          organization_id: string
          sequence_status: string
          speed_steps: Json
          step_interval_seconds: number
          trigger_alert_id: string | null
          trigger_type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_step_index?: number
          geofence_id?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          notes?: string | null
          organization_id: string
          sequence_status?: string
          speed_steps?: Json
          step_interval_seconds?: number
          trigger_alert_id?: string | null
          trigger_type: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          current_step_index?: number
          geofence_id?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          notes?: string | null
          organization_id?: string
          sequence_status?: string
          speed_steps?: Json
          step_interval_seconds?: number
          trigger_alert_id?: string | null
          trigger_type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "immobilization_sequences_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilization_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilization_sequences_trigger_alert_id_fkey"
            columns: ["trigger_alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilization_sequences_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      immobilization_steps: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          device_command_id: string | null
          error_message: string | null
          id: string
          organization_id: string
          scheduled_at: string | null
          sent_at: string | null
          sequence_id: string
          status: string
          step_number: number
          target_speed_kmh: number
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          device_command_id?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          sequence_id: string
          status?: string
          step_number: number
          target_speed_kmh: number
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          device_command_id?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sequence_id?: string
          status?: string
          step_number?: number
          target_speed_kmh?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "immobilization_steps_device_command_id_fkey"
            columns: ["device_command_id"]
            isOneToOne: false
            referencedRelation: "device_commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilization_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilization_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "immobilization_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_activity_logs: {
        Row: {
          action: string
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          impersonated_user_id: string
          impersonation_session_id: string
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          super_admin_id: string
        }
        Insert: {
          action: string
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          impersonated_user_id: string
          impersonation_session_id: string
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          super_admin_id: string
        }
        Update: {
          action?: string
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          impersonated_user_id?: string
          impersonation_session_id?: string
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          super_admin_id?: string
        }
        Relationships: []
      }
      impersonation_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          impersonated_user_id: string
          ip_address: string | null
          organization_id: string | null
          super_admin_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          impersonated_user_id: string
          ip_address?: string | null
          organization_id?: string | null
          super_admin_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          impersonated_user_id?: string
          ip_address?: string | null
          organization_id?: string | null
          super_admin_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      incident_tickets: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          driver_id: string | null
          due_date: string | null
          id: string
          incident_id: string | null
          organization_id: string
          priority: string
          related_claim_id: string | null
          related_violation_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          ticket_number: string
          ticket_type: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_id?: string | null
          due_date?: string | null
          id?: string
          incident_id?: string | null
          organization_id: string
          priority?: string
          related_claim_id?: string | null
          related_violation_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          ticket_number: string
          ticket_type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          driver_id?: string | null
          due_date?: string | null
          id?: string
          incident_id?: string | null
          organization_id?: string
          priority?: string
          related_claim_id?: string | null
          related_violation_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          ticket_type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_tickets_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_tickets_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_tickets_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          assigned_to_name: string | null
          attachments: string[] | null
          created_at: string
          description: string
          driver_id: string | null
          estimated_cost: number | null
          fault_party: string | null
          id: string
          incident_number: string
          incident_time: string
          incident_type: string
          km_reading: number | null
          location: string | null
          organization_id: string
          reason: string | null
          reported_via: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          trip_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          attachments?: string[] | null
          created_at?: string
          description: string
          driver_id?: string | null
          estimated_cost?: number | null
          fault_party?: string | null
          id?: string
          incident_number: string
          incident_time: string
          incident_type: string
          km_reading?: number | null
          location?: string | null
          organization_id: string
          reason?: string | null
          reported_via?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          attachments?: string[] | null
          created_at?: string
          description?: string
          driver_id?: string | null
          estimated_cost?: number | null
          fault_party?: string | null
          id?: string
          incident_number?: string
          incident_time?: string
          incident_type?: string
          km_reading?: number | null
          location?: string | null
          organization_id?: string
          reason?: string | null
          reported_via?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_checklists: {
        Row: {
          checklist_items: Json
          created_at: string
          description: string | null
          id: string
          inspection_type: string | null
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          updated_at: string
          vehicle_class: string | null
        }
        Insert: {
          checklist_items?: Json
          created_at?: string
          description?: string | null
          id?: string
          inspection_type?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
          vehicle_class?: string | null
        }
        Update: {
          checklist_items?: Json
          created_at?: string
          description?: string | null
          id?: string
          inspection_type?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
          vehicle_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_due_dates: {
        Row: {
          id: string
          inspection_type: string
          last_inspection_id: string | null
          last_status: string | null
          next_due_date: string | null
          organization_id: string
          source: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          id?: string
          inspection_type: string
          last_inspection_id?: string | null
          last_status?: string | null
          next_due_date?: string | null
          organization_id: string
          source?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          id?: string
          inspection_type?: string
          last_inspection_id?: string | null
          last_status?: string | null
          next_due_date?: string | null
          organization_id?: string
          source?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_due_dates_last_inspection_id_fkey"
            columns: ["last_inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_due_dates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_due_dates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_reminder_log: {
        Row: {
          channels: Json
          due_date: string
          fired_at: string
          id: string
          inspection_type: string
          lead_bucket: number
          organization_id: string
          vehicle_id: string
        }
        Insert: {
          channels?: Json
          due_date: string
          fired_at?: string
          id?: string
          inspection_type: string
          lead_bucket: number
          organization_id: string
          vehicle_id: string
        }
        Update: {
          channels?: Json
          due_date?: string
          fired_at?: string
          id?: string
          inspection_type?: string
          lead_bucket?: number
          organization_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_reminder_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_reminder_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_settings: {
        Row: {
          annual_lead_days: number[]
          created_at: string
          email_recipients: string[]
          id: string
          organization_id: string
          posttrip_auto_create: boolean
          pretrip_required_for_dispatch: boolean
          updated_at: string
        }
        Insert: {
          annual_lead_days?: number[]
          created_at?: string
          email_recipients?: string[]
          id?: string
          organization_id: string
          posttrip_auto_create?: boolean
          pretrip_required_for_dispatch?: boolean
          updated_at?: string
        }
        Update: {
          annual_lead_days?: number[]
          created_at?: string
          email_recipients?: string[]
          id?: string
          organization_id?: string
          posttrip_auto_create?: boolean
          pretrip_required_for_dispatch?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          adjuster_email: string | null
          adjuster_name: string | null
          adjuster_phone: string | null
          approved_amount: number | null
          claim_amount: number | null
          claim_number: string
          claim_type: string
          created_at: string
          deductible: number | null
          document_urls: string[] | null
          filed_date: string | null
          id: string
          incident_id: string | null
          insurance_provider: string | null
          notes: string | null
          organization_id: string
          policy_number: string | null
          settlement_amount: number | null
          settlement_date: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          adjuster_email?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          approved_amount?: number | null
          claim_amount?: number | null
          claim_number: string
          claim_type: string
          created_at?: string
          deductible?: number | null
          document_urls?: string[] | null
          filed_date?: string | null
          id?: string
          incident_id?: string | null
          insurance_provider?: string | null
          notes?: string | null
          organization_id: string
          policy_number?: string | null
          settlement_amount?: number | null
          settlement_date?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          adjuster_email?: string | null
          adjuster_name?: string | null
          adjuster_phone?: string | null
          approved_amount?: number | null
          claim_amount?: number | null
          claim_number?: string
          claim_type?: string
          created_at?: string
          deductible?: number | null
          document_urls?: string[] | null
          filed_date?: string | null
          id?: string
          incident_id?: string | null
          insurance_provider?: string | null
          notes?: string | null
          organization_id?: string
          policy_number?: string | null
          settlement_amount?: number | null
          settlement_date?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          completed_at: string | null
          error_details: Json | null
          id: string
          integration_id: string
          records_failed: number | null
          records_processed: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_details?: Json | null
          id?: string
          integration_id: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_details?: Json | null
          id?: string
          integration_id?: string
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          credentials: Json
          id: string
          integration_type: string
          is_active: boolean | null
          last_sync_at: string | null
          name: string
          organization_id: string
          provider: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by: string
          credentials?: Json
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name: string
          organization_id: string
          provider: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          credentials?: Json
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          name?: string
          organization_id?: string
          provider?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_accident_claims: {
        Row: {
          accident_date: string
          accident_location: string | null
          approved_cost: number | null
          claim_number: string
          closed_at: string | null
          consolidated_at: string | null
          consolidation_notes: string | null
          contract_id: string | null
          coverage_notes: string | null
          covered_by_insurance: boolean | null
          created_at: string
          created_by: string | null
          damage_description: string | null
          damaged_parts: string[] | null
          description: string | null
          discipline_action_at: string | null
          discipline_action_reference: string | null
          document_analyzed_at: string | null
          document_analyzed_by: string | null
          driver_id: string | null
          estimated_cost: number | null
          existing_contract_check_at: string | null
          existing_contract_found: boolean | null
          follow_up_notes: string | null
          id: string
          is_complete: boolean | null
          maintenance_completed_at: string | null
          maintenance_started_at: string | null
          negligence_check_at: string | null
          negligence_found: boolean | null
          negligence_notes: string | null
          organization_id: string
          photos: string[] | null
          po_approved_at: string | null
          po_number: string | null
          po_url: string | null
          procurement_request_number: string | null
          procurement_requested_at: string | null
          report_document_url: string | null
          scd_confirmation_at: string | null
          scd_confirmation_url: string | null
          scm_short_list: Json | null
          selected_supplier: string | null
          selected_supplier_contact: string | null
          status: string
          supervisor_name: string | null
          supplier_notified_at: string | null
          third_party_claim_id: string | null
          updated_at: string
          vehicle_id: string
          workflow_stage: string
        }
        Insert: {
          accident_date: string
          accident_location?: string | null
          approved_cost?: number | null
          claim_number: string
          closed_at?: string | null
          consolidated_at?: string | null
          consolidation_notes?: string | null
          contract_id?: string | null
          coverage_notes?: string | null
          covered_by_insurance?: boolean | null
          created_at?: string
          created_by?: string | null
          damage_description?: string | null
          damaged_parts?: string[] | null
          description?: string | null
          discipline_action_at?: string | null
          discipline_action_reference?: string | null
          document_analyzed_at?: string | null
          document_analyzed_by?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          existing_contract_check_at?: string | null
          existing_contract_found?: boolean | null
          follow_up_notes?: string | null
          id?: string
          is_complete?: boolean | null
          maintenance_completed_at?: string | null
          maintenance_started_at?: string | null
          negligence_check_at?: string | null
          negligence_found?: boolean | null
          negligence_notes?: string | null
          organization_id: string
          photos?: string[] | null
          po_approved_at?: string | null
          po_number?: string | null
          po_url?: string | null
          procurement_request_number?: string | null
          procurement_requested_at?: string | null
          report_document_url?: string | null
          scd_confirmation_at?: string | null
          scd_confirmation_url?: string | null
          scm_short_list?: Json | null
          selected_supplier?: string | null
          selected_supplier_contact?: string | null
          status?: string
          supervisor_name?: string | null
          supplier_notified_at?: string | null
          third_party_claim_id?: string | null
          updated_at?: string
          vehicle_id: string
          workflow_stage?: string
        }
        Update: {
          accident_date?: string
          accident_location?: string | null
          approved_cost?: number | null
          claim_number?: string
          closed_at?: string | null
          consolidated_at?: string | null
          consolidation_notes?: string | null
          contract_id?: string | null
          coverage_notes?: string | null
          covered_by_insurance?: boolean | null
          created_at?: string
          created_by?: string | null
          damage_description?: string | null
          damaged_parts?: string[] | null
          description?: string | null
          discipline_action_at?: string | null
          discipline_action_reference?: string | null
          document_analyzed_at?: string | null
          document_analyzed_by?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          existing_contract_check_at?: string | null
          existing_contract_found?: boolean | null
          follow_up_notes?: string | null
          id?: string
          is_complete?: boolean | null
          maintenance_completed_at?: string | null
          maintenance_started_at?: string | null
          negligence_check_at?: string | null
          negligence_found?: boolean | null
          negligence_notes?: string | null
          organization_id?: string
          photos?: string[] | null
          po_approved_at?: string | null
          po_number?: string | null
          po_url?: string | null
          procurement_request_number?: string | null
          procurement_requested_at?: string | null
          report_document_url?: string | null
          scd_confirmation_at?: string | null
          scd_confirmation_url?: string | null
          scm_short_list?: Json | null
          selected_supplier?: string | null
          selected_supplier_contact?: string | null
          status?: string
          supervisor_name?: string | null
          supplier_notified_at?: string | null
          third_party_claim_id?: string | null
          updated_at?: string
          vehicle_id?: string
          workflow_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_accident_claims_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_accident_claims_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_accident_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_accident_claims_third_party_claim_id_fkey"
            columns: ["third_party_claim_id"]
            isOneToOne: false
            referencedRelation: "accident_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_accident_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_claim_transitions: {
        Row: {
          claim_id: string
          created_at: string
          decision: string | null
          from_stage: string | null
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          performed_by: string | null
          performed_by_name: string | null
          to_stage: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          decision?: string | null
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          performed_by?: string | null
          performed_by_name?: string | null
          to_stage: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          decision?: string | null
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_claim_transitions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "internal_accident_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_claim_transitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          average_monthly_usage: number | null
          barcode: string | null
          category: string
          created_at: string
          current_quantity: number
          id: string
          last_ordered_at: string | null
          last_reorder_date: string | null
          lead_time_days: number | null
          location: string | null
          minimum_quantity: number | null
          organization_id: string
          part_name: string
          part_number: string
          preferred_vendor_id: string | null
          reorder_point: number | null
          reorder_quantity: number | null
          supplier_id: string | null
          unit_cost: number | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          average_monthly_usage?: number | null
          barcode?: string | null
          category: string
          created_at?: string
          current_quantity?: number
          id?: string
          last_ordered_at?: string | null
          last_reorder_date?: string | null
          lead_time_days?: number | null
          location?: string | null
          minimum_quantity?: number | null
          organization_id: string
          part_name: string
          part_number: string
          preferred_vendor_id?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          average_monthly_usage?: number | null
          barcode?: string | null
          category?: string
          created_at?: string
          current_quantity?: number
          id?: string
          last_ordered_at?: string | null
          last_reorder_date?: string | null
          lead_time_days?: number | null
          location?: string | null
          minimum_quantity?: number | null
          organization_id?: string
          part_name?: string
          part_number?: string
          preferred_vendor_id?: string | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_preferred_vendor_id_fkey"
            columns: ["preferred_vendor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_sensors: {
        Row: {
          config: Json | null
          created_at: string
          device_id: string | null
          firmware_version: string | null
          id: string
          installation_date: string | null
          last_calibration_date: string | null
          manufacturer: string | null
          next_calibration_date: string | null
          notes: string | null
          organization_id: string
          position_label: string | null
          protocol: string | null
          sensor_model: string
          sensor_serial: string | null
          sensor_type: string
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          device_id?: string | null
          firmware_version?: string | null
          id?: string
          installation_date?: string | null
          last_calibration_date?: string | null
          manufacturer?: string | null
          next_calibration_date?: string | null
          notes?: string | null
          organization_id: string
          position_label?: string | null
          protocol?: string | null
          sensor_model: string
          sensor_serial?: string | null
          sensor_type: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          device_id?: string | null
          firmware_version?: string | null
          id?: string
          installation_date?: string | null
          last_calibration_date?: string | null
          manufacturer?: string | null
          next_calibration_date?: string | null
          notes?: string | null
          organization_id?: string
          position_label?: string | null
          protocol?: string | null
          sensor_model?: string
          sensor_serial?: string | null
          sensor_type?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iot_sensors_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iot_sensors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iot_sensors_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_allowlists: {
        Row: {
          applies_to: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_allowlists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_delivery_time: string | null
          actual_pickup_time: string | null
          cargo_description: string | null
          cargo_volume_m3: number | null
          cargo_weight_kg: number | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_location: Json | null
          driver_id: string | null
          id: string
          job_number: string
          job_type: string
          notes: string | null
          organization_id: string
          pickup_location: Json | null
          pod_completed_at: string | null
          pod_notes: string | null
          pod_photos: Json | null
          pod_signature_url: string | null
          priority: string | null
          scheduled_delivery_time: string | null
          scheduled_pickup_time: string | null
          status: string | null
          trip_id: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          cargo_description?: string | null
          cargo_volume_m3?: number | null
          cargo_weight_kg?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_location?: Json | null
          driver_id?: string | null
          id?: string
          job_number: string
          job_type: string
          notes?: string | null
          organization_id: string
          pickup_location?: Json | null
          pod_completed_at?: string | null
          pod_notes?: string | null
          pod_photos?: Json | null
          pod_signature_url?: string | null
          priority?: string | null
          scheduled_delivery_time?: string | null
          scheduled_pickup_time?: string | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          cargo_description?: string | null
          cargo_volume_m3?: number | null
          cargo_weight_kg?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_location?: Json | null
          driver_id?: string | null
          id?: string
          job_number?: string
          job_type?: string
          notes?: string | null
          organization_id?: string
          pickup_location?: Json | null
          pod_completed_at?: string | null
          pod_notes?: string | null
          pod_photos?: Json | null
          pod_signature_url?: string | null
          priority?: string | null
          scheduled_delivery_time?: string | null
          scheduled_pickup_time?: string | null
          status?: string | null
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_scorecards: {
        Row: {
          actual_value: number | null
          category: string
          created_at: string
          id: string
          kpi_name: string
          notes: string | null
          organization_id: string
          period_end: string
          period_start: string
          target_value: number
          trend: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          category?: string
          created_at?: string
          id?: string
          kpi_name: string
          notes?: string | null
          organization_id: string
          period_end: string
          period_start: string
          target_value?: number
          trend?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          category?: string
          created_at?: string
          id?: string
          kpi_name?: string
          notes?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          target_value?: number
          trend?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_scorecards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ldap_configs: {
        Row: {
          base_dn: string
          bind_dn: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_count: number | null
          last_sync_status: string | null
          name: string
          organization_id: string
          search_filter: string | null
          server_url: string
          tls_enabled: boolean | null
          updated_at: string
          user_attributes: Json | null
        }
        Insert: {
          base_dn: string
          bind_dn?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_count?: number | null
          last_sync_status?: string | null
          name?: string
          organization_id: string
          search_filter?: string | null
          server_url: string
          tls_enabled?: boolean | null
          updated_at?: string
          user_attributes?: Json | null
        }
        Update: {
          base_dn?: string
          bind_dn?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_count?: number | null
          last_sync_status?: string | null
          name?: string
          organization_id?: string
          search_filter?: string | null
          server_url?: string
          tls_enabled?: boolean | null
          updated_at?: string
          user_attributes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ldap_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ldap_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json | null
          id: string
          ldap_config_id: string
          organization_id: string
          started_at: string | null
          status: string
          users_created: number | null
          users_skipped: number | null
          users_synced: number | null
          users_updated: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id?: string
          ldap_config_id: string
          organization_id: string
          started_at?: string | null
          status?: string
          users_created?: number | null
          users_skipped?: number | null
          users_synced?: number | null
          users_updated?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id?: string
          ldap_config_id?: string
          organization_id?: string
          started_at?: string | null
          status?: string
          users_created?: number | null
          users_skipped?: number | null
          users_synced?: number | null
          users_updated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ldap_sync_logs_ldap_config_id_fkey"
            columns: ["ldap_config_id"]
            isOneToOne: false
            referencedRelation: "ldap_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ldap_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_holds: {
        Row: {
          case_number: string | null
          created_at: string
          data_types: string[] | null
          description: string
          hold_name: string
          hold_type: string
          id: string
          issued_at: string
          issued_by: string | null
          notes: string | null
          organization_id: string
          released_at: string | null
          released_by: string | null
          scope_data: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          case_number?: string | null
          created_at?: string
          data_types?: string[] | null
          description: string
          hold_name: string
          hold_type: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          organization_id: string
          released_at?: string | null
          released_by?: string | null
          scope_data?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          case_number?: string | null
          created_at?: string
          data_types?: string[] | null
          description?: string
          hold_name?: string
          hold_type?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          organization_id?: string
          released_at?: string | null
          released_by?: string | null
          scope_data?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_holds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      license_category_validity: {
        Row: {
          category: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          updated_at: string
          valid_years: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          updated_at?: string
          valid_years?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
          valid_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "license_category_validity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          created_at: string
          device_type: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown
          location_city: string | null
          location_country: string | null
          login_time: string
          organization_id: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          login_time?: string
          organization_id?: string | null
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          login_time?: string
          organization_id?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_alert_settings: {
        Row: {
          created_at: string
          days_before_alert: number | null
          id: string
          notify_email: boolean | null
          notify_push: boolean | null
          notify_sms: boolean | null
          organization_id: string
          overdue_maintenance_enabled: boolean | null
          upcoming_maintenance_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_before_alert?: number | null
          id?: string
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          organization_id: string
          overdue_maintenance_enabled?: boolean | null
          upcoming_maintenance_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_before_alert?: number | null
          id?: string
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          organization_id?: string
          overdue_maintenance_enabled?: boolean | null
          upcoming_maintenance_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_alert_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_budgets: {
        Row: {
          budget_amount: number
          budget_month: number | null
          budget_year: number
          category: string | null
          created_at: string
          id: string
          organization_id: string
          spent_amount: number | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          budget_amount?: number
          budget_month?: number | null
          budget_year: number
          category?: string | null
          created_at?: string
          id?: string
          organization_id: string
          spent_amount?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          budget_amount?: number
          budget_month?: number | null
          budget_year?: number
          category?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          spent_amount?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_budgets_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_checklists: {
        Row: {
          checklist_type: string
          created_at: string
          id: string
          is_active: boolean | null
          items: Json
          name: string
          organization_id: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          checklist_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          items?: Json
          name: string
          organization_id: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          checklist_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          organization_id?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_class_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          mtbf_days: number | null
          notes: string | null
          organization_id: string
          priority: string | null
          reminder_days_before: number | null
          reminder_hours_before: number | null
          reminder_km_before: number | null
          service_type: string | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mtbf_days?: number | null
          notes?: string | null
          organization_id: string
          priority?: string | null
          reminder_days_before?: number | null
          reminder_hours_before?: number | null
          reminder_km_before?: number | null
          service_type?: string | null
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mtbf_days?: number | null
          notes?: string | null
          organization_id?: string
          priority?: string | null
          reminder_days_before?: number | null
          reminder_hours_before?: number | null
          reminder_km_before?: number | null
          service_type?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_class_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_contracts: {
        Row: {
          auto_renew: boolean | null
          contract_number: string
          contract_type: string
          covered_service_types: string[] | null
          covered_vehicles: string[] | null
          created_at: string
          currency: string | null
          description: string | null
          documents: string[] | null
          end_date: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          renewal_notice_days: number | null
          sla_terms: Json | null
          start_date: string
          status: string | null
          total_value: number | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string
          warranty_terms: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          contract_number: string
          contract_type?: string
          covered_service_types?: string[] | null
          covered_vehicles?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          documents?: string[] | null
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          renewal_notice_days?: number | null
          sla_terms?: Json | null
          start_date: string
          status?: string | null
          total_value?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name: string
          warranty_terms?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          contract_number?: string
          contract_type?: string
          covered_service_types?: string[] | null
          covered_vehicles?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          documents?: string[] | null
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          renewal_notice_days?: number | null
          sla_terms?: Json | null
          start_date?: string
          status?: string | null
          total_value?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_cost_tracking: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          budget_amount: number | null
          contract_id: string | null
          cost_center_id: string | null
          cost_type: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_status: string | null
          notes: string | null
          organization_id: string
          period_month: number | null
          period_year: number | null
          ticket_id: string | null
          updated_at: string
          variance: number | null
          vehicle_id: string | null
          vendor_id: string | null
          work_order_id: string | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_amount?: number | null
          contract_id?: string | null
          cost_center_id?: string | null
          cost_type?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_status?: string | null
          notes?: string | null
          organization_id: string
          period_month?: number | null
          period_year?: number | null
          ticket_id?: string | null
          updated_at?: string
          variance?: number | null
          vehicle_id?: string | null
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_amount?: number | null
          contract_id?: string | null
          cost_center_id?: string | null
          cost_type?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_status?: string | null
          notes?: string | null
          organization_id?: string
          period_month?: number | null
          period_year?: number | null
          ticket_id?: string | null
          updated_at?: string
          variance?: number | null
          vehicle_id?: string | null
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_cost_tracking_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_cost_tracking_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_cost_tracking_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_cost_tracking_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_cost_tracking_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_cost_tracking_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_costs: {
        Row: {
          amount: number
          cost_category: string
          cost_date: string
          cost_type: string
          created_at: string
          description: string | null
          id: string
          is_warranty_covered: boolean | null
          organization_id: string
          service_history_id: string | null
          vehicle_id: string
          vendor_id: string | null
          work_order_id: string | null
        }
        Insert: {
          amount?: number
          cost_category: string
          cost_date?: string
          cost_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_warranty_covered?: boolean | null
          organization_id: string
          service_history_id?: string | null
          vehicle_id: string
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          amount?: number
          cost_category?: string
          cost_date?: string
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_warranty_covered?: boolean | null
          organization_id?: string
          service_history_id?: string | null
          vehicle_id?: string
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_costs_service_history_id_fkey"
            columns: ["service_history_id"]
            isOneToOne: false
            referencedRelation: "service_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_costs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          additional_description: string | null
          approval_routed_at: string | null
          approved_at: string | null
          approved_by: string | null
          approver_role: string | null
          approver_user_id: string | null
          asset_criticality: string | null
          assigned_to_role: string | null
          attachments: Json | null
          auto_trigger_actual_value: number | null
          auto_trigger_reason: string | null
          auto_trigger_threshold_type: string | null
          auto_trigger_threshold_value: number | null
          auto_triggered_at: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_preference: string | null
          context_value: string | null
          correction_notes: string | null
          created_at: string
          delivery_acceptable: boolean | null
          delivery_checked_at: string | null
          delivery_document_url: string | null
          description: string | null
          driver_id: string | null
          driver_phone: string | null
          driver_type: string | null
          files_updated: boolean | null
          fuel_level: number | null
          geofence_verified_delivery: boolean | null
          geofence_verified_receipt: boolean | null
          id: string
          inspection_id: string | null
          inspector_assigned_at: string | null
          inspector_id: string | null
          km_reading: number | null
          maintenance_accepted: boolean | null
          maintenance_accepted_at: string | null
          maintenance_accepted_by: string | null
          needs_maintenance: boolean | null
          notes: string | null
          notify_user: boolean | null
          organization_id: string
          pdr_number: string | null
          photo_urls: string[] | null
          po_id: string | null
          post_inspection_at: string | null
          post_inspection_notes: string | null
          post_inspection_result: string | null
          pre_inspection_at: string | null
          pre_inspection_by: string | null
          pre_inspection_done: boolean | null
          pre_inspection_notes: string | null
          priority: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          remark: string | null
          request_by_completion_date: string | null
          request_number: string
          request_start_date: string | null
          request_subtype: string | null
          request_type: string
          requested_by: string | null
          requested_completion_date: string | null
          requestor_department: string | null
          requestor_employee_id: string | null
          requestor_pool: string | null
          running_hours: number | null
          schedule_id: string | null
          scrap_return_form_url: string | null
          sourcing_status: string | null
          spare_parts_collected: boolean | null
          status: string | null
          supplier_geofence_id: string | null
          supplier_id: string | null
          supplier_invoice_url: string | null
          supplier_name: string | null
          supplier_report_url: string | null
          trigger_source: string
          updated_at: string
          variation_accepted: boolean | null
          variation_accepted_at: string | null
          variation_accepted_by: string | null
          variation_notes: string | null
          variation_requested: boolean | null
          vehicle_delivered_at: string | null
          vehicle_delivered_by: string | null
          vehicle_delivered_lat: number | null
          vehicle_delivered_lng: number | null
          vehicle_id: string
          vehicle_received_at: string | null
          vehicle_received_by: string | null
          vehicle_received_lat: number | null
          vehicle_received_lng: number | null
          work_order_id: string | null
          workflow_stage: string | null
        }
        Insert: {
          additional_description?: string | null
          approval_routed_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          asset_criticality?: string | null
          assigned_to_role?: string | null
          attachments?: Json | null
          auto_trigger_actual_value?: number | null
          auto_trigger_reason?: string | null
          auto_trigger_threshold_type?: string | null
          auto_trigger_threshold_value?: number | null
          auto_triggered_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_preference?: string | null
          context_value?: string | null
          correction_notes?: string | null
          created_at?: string
          delivery_acceptable?: boolean | null
          delivery_checked_at?: string | null
          delivery_document_url?: string | null
          description?: string | null
          driver_id?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          files_updated?: boolean | null
          fuel_level?: number | null
          geofence_verified_delivery?: boolean | null
          geofence_verified_receipt?: boolean | null
          id?: string
          inspection_id?: string | null
          inspector_assigned_at?: string | null
          inspector_id?: string | null
          km_reading?: number | null
          maintenance_accepted?: boolean | null
          maintenance_accepted_at?: string | null
          maintenance_accepted_by?: string | null
          needs_maintenance?: boolean | null
          notes?: string | null
          notify_user?: boolean | null
          organization_id: string
          pdr_number?: string | null
          photo_urls?: string[] | null
          po_id?: string | null
          post_inspection_at?: string | null
          post_inspection_notes?: string | null
          post_inspection_result?: string | null
          pre_inspection_at?: string | null
          pre_inspection_by?: string | null
          pre_inspection_done?: boolean | null
          pre_inspection_notes?: string | null
          priority?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remark?: string | null
          request_by_completion_date?: string | null
          request_number: string
          request_start_date?: string | null
          request_subtype?: string | null
          request_type?: string
          requested_by?: string | null
          requested_completion_date?: string | null
          requestor_department?: string | null
          requestor_employee_id?: string | null
          requestor_pool?: string | null
          running_hours?: number | null
          schedule_id?: string | null
          scrap_return_form_url?: string | null
          sourcing_status?: string | null
          spare_parts_collected?: boolean | null
          status?: string | null
          supplier_geofence_id?: string | null
          supplier_id?: string | null
          supplier_invoice_url?: string | null
          supplier_name?: string | null
          supplier_report_url?: string | null
          trigger_source?: string
          updated_at?: string
          variation_accepted?: boolean | null
          variation_accepted_at?: string | null
          variation_accepted_by?: string | null
          variation_notes?: string | null
          variation_requested?: boolean | null
          vehicle_delivered_at?: string | null
          vehicle_delivered_by?: string | null
          vehicle_delivered_lat?: number | null
          vehicle_delivered_lng?: number | null
          vehicle_id: string
          vehicle_received_at?: string | null
          vehicle_received_by?: string | null
          vehicle_received_lat?: number | null
          vehicle_received_lng?: number | null
          work_order_id?: string | null
          workflow_stage?: string | null
        }
        Update: {
          additional_description?: string | null
          approval_routed_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approver_role?: string | null
          approver_user_id?: string | null
          asset_criticality?: string | null
          assigned_to_role?: string | null
          attachments?: Json | null
          auto_trigger_actual_value?: number | null
          auto_trigger_reason?: string | null
          auto_trigger_threshold_type?: string | null
          auto_trigger_threshold_value?: number | null
          auto_triggered_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_preference?: string | null
          context_value?: string | null
          correction_notes?: string | null
          created_at?: string
          delivery_acceptable?: boolean | null
          delivery_checked_at?: string | null
          delivery_document_url?: string | null
          description?: string | null
          driver_id?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          files_updated?: boolean | null
          fuel_level?: number | null
          geofence_verified_delivery?: boolean | null
          geofence_verified_receipt?: boolean | null
          id?: string
          inspection_id?: string | null
          inspector_assigned_at?: string | null
          inspector_id?: string | null
          km_reading?: number | null
          maintenance_accepted?: boolean | null
          maintenance_accepted_at?: string | null
          maintenance_accepted_by?: string | null
          needs_maintenance?: boolean | null
          notes?: string | null
          notify_user?: boolean | null
          organization_id?: string
          pdr_number?: string | null
          photo_urls?: string[] | null
          po_id?: string | null
          post_inspection_at?: string | null
          post_inspection_notes?: string | null
          post_inspection_result?: string | null
          pre_inspection_at?: string | null
          pre_inspection_by?: string | null
          pre_inspection_done?: boolean | null
          pre_inspection_notes?: string | null
          priority?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          remark?: string | null
          request_by_completion_date?: string | null
          request_number?: string
          request_start_date?: string | null
          request_subtype?: string | null
          request_type?: string
          requested_by?: string | null
          requested_completion_date?: string | null
          requestor_department?: string | null
          requestor_employee_id?: string | null
          requestor_pool?: string | null
          running_hours?: number | null
          schedule_id?: string | null
          scrap_return_form_url?: string | null
          sourcing_status?: string | null
          spare_parts_collected?: boolean | null
          status?: string | null
          supplier_geofence_id?: string | null
          supplier_id?: string | null
          supplier_invoice_url?: string | null
          supplier_name?: string | null
          supplier_report_url?: string | null
          trigger_source?: string
          updated_at?: string
          variation_accepted?: boolean | null
          variation_accepted_at?: string | null
          variation_accepted_by?: string | null
          variation_notes?: string | null
          variation_requested?: boolean | null
          vehicle_delivered_at?: string | null
          vehicle_delivered_by?: string | null
          vehicle_delivered_lat?: number | null
          vehicle_delivered_lng?: number | null
          vehicle_id?: string
          vehicle_received_at?: string | null
          vehicle_received_by?: string | null
          vehicle_received_lat?: number | null
          vehicle_received_lng?: number | null
          work_order_id?: string | null
          workflow_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_supplier_geofence_id_fkey"
            columns: ["supplier_geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          checklist_template_id: string | null
          created_at: string
          id: string
          interval_type: string
          interval_value: number
          is_active: boolean | null
          last_service_date: string | null
          last_service_hours: number | null
          last_service_odometer: number | null
          next_due_date: string | null
          next_due_hours: number | null
          next_due_odometer: number | null
          organization_id: string
          priority: string | null
          reminder_days_before: number | null
          reminder_km_before: number | null
          service_type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          checklist_template_id?: string | null
          created_at?: string
          id?: string
          interval_type: string
          interval_value: number
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_hours?: number | null
          last_service_odometer?: number | null
          next_due_date?: string | null
          next_due_hours?: number | null
          next_due_odometer?: number | null
          organization_id: string
          priority?: string | null
          reminder_days_before?: number | null
          reminder_km_before?: number | null
          service_type: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          checklist_template_id?: string | null
          created_at?: string
          id?: string
          interval_type?: string
          interval_value?: number
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_hours?: number | null
          last_service_odometer?: number | null
          next_due_date?: string | null
          next_due_hours?: number | null
          next_due_odometer?: number | null
          organization_id?: string
          priority?: string | null
          reminder_days_before?: number | null
          reminder_km_before?: number | null
          service_type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_supplier_assignments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          supplier_user_id: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          supplier_user_id: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          supplier_user_id?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_supplier_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_supplier_assignments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          assigned_to: string | null
          assigned_to_user_id: string | null
          attachments: string[] | null
          category: string | null
          closed_at: string | null
          contract_id: string | null
          created_at: string
          description: string | null
          escalated_to: string | null
          escalation_level: number | null
          escalation_reason: string | null
          id: string
          notes: string | null
          organization_id: string
          priority: string
          reported_by: string | null
          reported_by_user_id: string | null
          resolution_time_minutes: number | null
          resolved_at: string | null
          response_time_minutes: number | null
          sla_resolution_breached: boolean | null
          sla_resolution_deadline: string | null
          sla_resolution_hours: number | null
          sla_response_breached: boolean | null
          sla_response_deadline: string | null
          sla_response_hours: number | null
          status: string
          tags: string[] | null
          ticket_number: string
          title: string
          updated_at: string
          vehicle_id: string | null
          vendor_id: string | null
          work_order_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          attachments?: string[] | null
          category?: string | null
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          escalation_reason?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          priority?: string
          reported_by?: string | null
          reported_by_user_id?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          sla_resolution_breached?: boolean | null
          sla_resolution_deadline?: string | null
          sla_resolution_hours?: number | null
          sla_response_breached?: boolean | null
          sla_response_deadline?: string | null
          sla_response_hours?: number | null
          status?: string
          tags?: string[] | null
          ticket_number: string
          title: string
          updated_at?: string
          vehicle_id?: string | null
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          attachments?: string[] | null
          category?: string | null
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          escalated_to?: string | null
          escalation_level?: number | null
          escalation_reason?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          priority?: string
          reported_by?: string | null
          reported_by_user_id?: string | null
          resolution_time_minutes?: number | null
          resolved_at?: string | null
          response_time_minutes?: number | null
          sla_resolution_breached?: boolean | null
          sla_resolution_deadline?: string | null
          sla_resolution_hours?: number | null
          sla_response_breached?: boolean | null
          sla_response_deadline?: string | null
          sla_response_hours?: number | null
          status?: string
          tags?: string[] | null
          ticket_number?: string
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          vendor_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_vendors: {
        Row: {
          address: string | null
          avg_turnaround_hours: number | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          rating: number | null
          total_jobs: number | null
          updated_at: string
          vendor_type: string | null
        }
        Insert: {
          address?: string | null
          avg_turnaround_hours?: number | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          total_jobs?: number | null
          updated_at?: string
          vendor_type?: string | null
        }
        Update: {
          address?: string | null
          avg_turnaround_hours?: number | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          total_jobs?: number | null
          updated_at?: string
          vendor_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_workflow_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          created_at: string
          from_stage: string | null
          id: string
          metadata: Json | null
          notes: string | null
          organization_id: string
          request_id: string
          step_number: string | null
          to_stage: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id: string
          request_id: string
          step_number?: string | null
          to_stage: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          organization_id?: string
          request_id?: string
          step_number?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_workflow_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_workflow_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanics: {
        Row: {
          avg_job_rating: number | null
          certifications: Json | null
          created_at: string
          email: string | null
          employee_id: string | null
          first_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          last_name: string
          organization_id: string
          phone: string | null
          specializations: string[] | null
          total_jobs_completed: number | null
          updated_at: string
        }
        Insert: {
          avg_job_rating?: number | null
          certifications?: Json | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          first_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name: string
          organization_id: string
          phone?: string | null
          specializations?: string[] | null
          total_jobs_completed?: number | null
          updated_at?: string
        }
        Update: {
          avg_job_rating?: number | null
          certifications?: Json | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          first_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          organization_id?: string
          phone?: string | null
          specializations?: string[] | null
          total_jobs_completed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_center: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string
          organization_id: string
          priority: string | null
          read_at: string | null
          recipient_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message: string
          organization_id: string
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string
          organization_id?: string
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_center_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          notification_types: Json | null
          organization_id: string | null
          push_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notification_types?: Json | null
          organization_id?: string | null
          push_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notification_types?: Json | null
          organization_id?: string | null
          push_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          organization_id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          organization_id: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          avg_insurance_per_vehicle_annual: number
          avg_maintenance_per_vehicle_annual: number
          avg_vehicle_value: number
          co2_per_liter_diesel: number
          co2_per_liter_petrol: number
          company_name: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          date_format: string | null
          default_language: string | null
          default_map_style: string
          default_timezone: string | null
          depreciation_rate_percent: number
          distance_unit: string | null
          enable_2fa: boolean | null
          enable_api_access: boolean | null
          enable_mobile_access: boolean | null
          enable_sso: boolean | null
          enforce_2fa: boolean | null
          favicon_url: string | null
          from_email: string | null
          from_name: string | null
          fuel_auto_request_enabled: boolean | null
          fuel_efficiency_threshold: number | null
          fuel_price_per_liter: number
          fuel_unit: string
          id: string
          logo_url: string | null
          mapbox_token: string | null
          organization_id: string
          primary_color: string | null
          push_notifications_enabled: boolean | null
          requester_rating_required: boolean
          secondary_color: string | null
          sms_gateway_config: Json | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          time_format: string | null
          updated_at: string
          vapid_private_key: string | null
          vapid_public_key: string | null
          vr_working_days: number[]
          vr_working_end_time: string
          vr_working_start_time: string
        }
        Insert: {
          avg_insurance_per_vehicle_annual?: number
          avg_maintenance_per_vehicle_annual?: number
          avg_vehicle_value?: number
          co2_per_liter_diesel?: number
          co2_per_liter_petrol?: number
          company_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          date_format?: string | null
          default_language?: string | null
          default_map_style?: string
          default_timezone?: string | null
          depreciation_rate_percent?: number
          distance_unit?: string | null
          enable_2fa?: boolean | null
          enable_api_access?: boolean | null
          enable_mobile_access?: boolean | null
          enable_sso?: boolean | null
          enforce_2fa?: boolean | null
          favicon_url?: string | null
          from_email?: string | null
          from_name?: string | null
          fuel_auto_request_enabled?: boolean | null
          fuel_efficiency_threshold?: number | null
          fuel_price_per_liter?: number
          fuel_unit?: string
          id?: string
          logo_url?: string | null
          mapbox_token?: string | null
          organization_id: string
          primary_color?: string | null
          push_notifications_enabled?: boolean | null
          requester_rating_required?: boolean
          secondary_color?: string | null
          sms_gateway_config?: Json | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          time_format?: string | null
          updated_at?: string
          vapid_private_key?: string | null
          vapid_public_key?: string | null
          vr_working_days?: number[]
          vr_working_end_time?: string
          vr_working_start_time?: string
        }
        Update: {
          avg_insurance_per_vehicle_annual?: number
          avg_maintenance_per_vehicle_annual?: number
          avg_vehicle_value?: number
          co2_per_liter_diesel?: number
          co2_per_liter_petrol?: number
          company_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          date_format?: string | null
          default_language?: string | null
          default_map_style?: string
          default_timezone?: string | null
          depreciation_rate_percent?: number
          distance_unit?: string | null
          enable_2fa?: boolean | null
          enable_api_access?: boolean | null
          enable_mobile_access?: boolean | null
          enable_sso?: boolean | null
          enforce_2fa?: boolean | null
          favicon_url?: string | null
          from_email?: string | null
          from_name?: string | null
          fuel_auto_request_enabled?: boolean | null
          fuel_efficiency_threshold?: number | null
          fuel_price_per_liter?: number
          fuel_unit?: string
          id?: string
          logo_url?: string | null
          mapbox_token?: string | null
          organization_id?: string
          primary_color?: string | null
          push_notifications_enabled?: boolean | null
          requester_rating_required?: boolean
          secondary_color?: string | null
          sms_gateway_config?: Json | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          time_format?: string | null
          updated_at?: string
          vapid_private_key?: string | null
          vapid_public_key?: string | null
          vr_working_days?: number[]
          vr_working_end_time?: string
          vr_working_start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean | null
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          slug: string | null
          suspended: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspended_reason: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspended_reason?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outsource_capacity_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          organization_id: string
          recommendation: string | null
          resolved_at: string | null
          resource_count_current: number | null
          resource_count_optimal: number | null
          severity: string
          status: string
          updated_at: string
          utilization_pct: number | null
          zone_region: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          organization_id: string
          recommendation?: string | null
          resolved_at?: string | null
          resource_count_current?: number | null
          resource_count_optimal?: number | null
          severity?: string
          status?: string
          updated_at?: string
          utilization_pct?: number | null
          zone_region?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          organization_id?: string
          recommendation?: string | null
          resolved_at?: string | null
          resource_count_current?: number | null
          resource_count_optimal?: number | null
          severity?: string
          status?: string
          updated_at?: string
          utilization_pct?: number | null
          zone_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outsource_capacity_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_contracts: {
        Row: {
          auto_renew: boolean | null
          contract_number: string
          contract_type: string
          contractor_contact: string | null
          contractor_email: string | null
          contractor_name: string
          created_at: string
          currency: string | null
          documents: string[] | null
          drivers_included: Json | null
          end_date: string | null
          id: string
          monthly_cost: number | null
          notes: string | null
          organization_id: string
          payment_terms: string | null
          penalty_terms: string | null
          performance_metrics: Json | null
          sla_terms: string | null
          start_date: string
          status: string
          total_contract_value: number | null
          updated_at: string
          vehicles_included: Json | null
        }
        Insert: {
          auto_renew?: boolean | null
          contract_number: string
          contract_type?: string
          contractor_contact?: string | null
          contractor_email?: string | null
          contractor_name: string
          created_at?: string
          currency?: string | null
          documents?: string[] | null
          drivers_included?: Json | null
          end_date?: string | null
          id?: string
          monthly_cost?: number | null
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          penalty_terms?: string | null
          performance_metrics?: Json | null
          sla_terms?: string | null
          start_date: string
          status?: string
          total_contract_value?: number | null
          updated_at?: string
          vehicles_included?: Json | null
        }
        Update: {
          auto_renew?: boolean | null
          contract_number?: string
          contract_type?: string
          contractor_contact?: string | null
          contractor_email?: string | null
          contractor_name?: string
          created_at?: string
          currency?: string | null
          documents?: string[] | null
          drivers_included?: Json | null
          end_date?: string | null
          id?: string
          monthly_cost?: number | null
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          penalty_terms?: string | null
          performance_metrics?: Json | null
          sla_terms?: string | null
          start_date?: string
          status?: string
          total_contract_value?: number | null
          updated_at?: string
          vehicles_included?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "outsource_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_driver_attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          organization_id: string
          status: string | null
          verified_by: string | null
        }
        Insert: {
          attendance_date: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          organization_id: string
          status?: string | null
          verified_by?: string | null
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outsource_driver_attendance_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_driver_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_payment_approvals: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          approver_role: string
          comments: string | null
          created_at: string
          id: string
          organization_id: string
          payment_request_id: string
          rule_name: string | null
          status: string
          step_order: number
          updated_at: string
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          approver_role: string
          comments?: string | null
          created_at?: string
          id?: string
          organization_id: string
          payment_request_id: string
          rule_name?: string | null
          status?: string
          step_order: number
          updated_at?: string
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          approver_role?: string
          comments?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          payment_request_id?: string
          rule_name?: string | null
          status?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outsource_payment_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_payment_approvals_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "outsource_payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_payment_request_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_type: string
          organization_id: string
          payment_request_id: string
          quantity: number
          reference_id: string | null
          reference_table: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_type: string
          organization_id: string
          payment_request_id: string
          quantity?: number
          reference_id?: string | null
          reference_table?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_type?: string
          organization_id?: string
          payment_request_id?: string
          quantity?: number
          reference_id?: string | null
          reference_table?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "outsource_payment_request_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_payment_request_items_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "outsource_payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_payment_requests: {
        Row: {
          amount_approved: number | null
          amount_requested: number
          approval_chain: Json | null
          approved_at: string | null
          approver_id: string | null
          attachments: string[] | null
          consolidated_at: string | null
          consolidated_by: string | null
          contract_check_at: string | null
          contract_check_by: string | null
          contract_check_result: string | null
          contract_id: string | null
          created_at: string
          currency: string
          current_approval_step: number | null
          deductions: number | null
          driver_id: string | null
          fuel_cost: number | null
          fuel_info_provided_at: string | null
          fuel_info_provided_by: string | null
          id: string
          lubricant_cost: number | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          rejection_reason: string | null
          rental_vehicle_id: string | null
          request_number: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          supplier_id: string | null
          total_approval_steps: number | null
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_requested?: number
          approval_chain?: Json | null
          approved_at?: string | null
          approver_id?: string | null
          attachments?: string[] | null
          consolidated_at?: string | null
          consolidated_by?: string | null
          contract_check_at?: string | null
          contract_check_by?: string | null
          contract_check_result?: string | null
          contract_id?: string | null
          created_at?: string
          currency?: string
          current_approval_step?: number | null
          deductions?: number | null
          driver_id?: string | null
          fuel_cost?: number | null
          fuel_info_provided_at?: string | null
          fuel_info_provided_by?: string | null
          id?: string
          lubricant_cost?: number | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          rejection_reason?: string | null
          rental_vehicle_id?: string | null
          request_number: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string | null
          total_approval_steps?: number | null
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number
          approval_chain?: Json | null
          approved_at?: string | null
          approver_id?: string | null
          attachments?: string[] | null
          consolidated_at?: string | null
          consolidated_by?: string | null
          contract_check_at?: string | null
          contract_check_by?: string | null
          contract_check_result?: string | null
          contract_id?: string | null
          created_at?: string
          currency?: string
          current_approval_step?: number | null
          deductions?: number | null
          driver_id?: string | null
          fuel_cost?: number | null
          fuel_info_provided_at?: string | null
          fuel_info_provided_by?: string | null
          id?: string
          lubricant_cost?: number | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          rejection_reason?: string | null
          rental_vehicle_id?: string | null
          request_number?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string | null
          total_approval_steps?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outsource_payment_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "outsource_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_payment_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_payment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_payment_requests_rental_vehicle_id_fkey"
            columns: ["rental_vehicle_id"]
            isOneToOne: false
            referencedRelation: "rental_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_payment_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_date: string
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_date: string
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_date?: string
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outsource_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "outsource_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_price_catalogs: {
        Row: {
          base_rate: number
          catalog_name: string
          created_at: string
          currency: string
          driver_grade: string | null
          driver_included: boolean
          effective_from: string
          effective_to: string | null
          fuel_included: boolean
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          overtime_rate: number | null
          resource_type: string
          unit: string
          updated_at: string
          vehicle_class: string | null
          zone_region: string | null
        }
        Insert: {
          base_rate?: number
          catalog_name: string
          created_at?: string
          currency?: string
          driver_grade?: string | null
          driver_included?: boolean
          effective_from?: string
          effective_to?: string | null
          fuel_included?: boolean
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          overtime_rate?: number | null
          resource_type: string
          unit?: string
          updated_at?: string
          vehicle_class?: string | null
          zone_region?: string | null
        }
        Update: {
          base_rate?: number
          catalog_name?: string
          created_at?: string
          currency?: string
          driver_grade?: string | null
          driver_included?: boolean
          effective_from?: string
          effective_to?: string | null
          fuel_included?: boolean
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          overtime_rate?: number | null
          resource_type?: string
          unit?: string
          updated_at?: string
          vehicle_class?: string | null
          zone_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outsource_price_catalogs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      outsource_vehicle_attendance: {
        Row: {
          attendance_date: string
          created_at: string
          fuel_consumed_liters: number | null
          hours_active: number | null
          id: string
          km_driven: number | null
          notes: string | null
          organization_id: string
          rental_vehicle_id: string | null
          source: string
          status: string
          updated_at: string
          vehicle_id: string | null
          verified_by: string | null
        }
        Insert: {
          attendance_date: string
          created_at?: string
          fuel_consumed_liters?: number | null
          hours_active?: number | null
          id?: string
          km_driven?: number | null
          notes?: string | null
          organization_id: string
          rental_vehicle_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          verified_by?: string | null
        }
        Update: {
          attendance_date?: string
          created_at?: string
          fuel_consumed_liters?: number | null
          hours_active?: number | null
          id?: string
          km_driven?: number | null
          notes?: string | null
          organization_id?: string
          rental_vehicle_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outsource_vehicle_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_vehicle_attendance_rental_vehicle_id_fkey"
            columns: ["rental_vehicle_id"]
            isOneToOne: false
            referencedRelation: "rental_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsource_vehicle_attendance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      overspeed_cutoff_events: {
        Row: {
          created_at: string
          cutoff_command_id: string | null
          cutoff_reason: string | null
          cutoff_triggered: boolean | null
          device_id: string | null
          driver_id: string | null
          event_time: string
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          speed_kmh: number
          speed_limit_kmh: number
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          cutoff_command_id?: string | null
          cutoff_reason?: string | null
          cutoff_triggered?: boolean | null
          device_id?: string | null
          driver_id?: string | null
          event_time?: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          speed_kmh: number
          speed_limit_kmh: number
          vehicle_id: string
        }
        Update: {
          created_at?: string
          cutoff_command_id?: string | null
          cutoff_reason?: string | null
          cutoff_triggered?: boolean | null
          device_id?: string | null
          driver_id?: string | null
          event_time?: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          speed_kmh?: number
          speed_limit_kmh?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overspeed_cutoff_events_cutoff_command_id_fkey"
            columns: ["cutoff_command_id"]
            isOneToOne: false
            referencedRelation: "device_commands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overspeed_cutoff_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overspeed_cutoff_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overspeed_cutoff_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overspeed_cutoff_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      panic_button_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          activation_type: string | null
          created_at: string
          driver_id: string | null
          event_time: string
          id: string
          lat: number | null
          lng: number | null
          notifications_sent: Json | null
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          response_time_seconds: number | null
          sensor_id: string | null
          speed_kmh: number | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          activation_type?: string | null
          created_at?: string
          driver_id?: string | null
          event_time?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notifications_sent?: Json | null
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_seconds?: number | null
          sensor_id?: string | null
          speed_kmh?: number | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          activation_type?: string | null
          created_at?: string
          driver_id?: string | null
          event_time?: string
          id?: string
          lat?: number | null
          lng?: number | null
          notifications_sent?: Json | null
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_time_seconds?: number | null
          sensor_id?: string | null
          speed_kmh?: number | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panic_button_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panic_button_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panic_button_events_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "iot_sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panic_button_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_inventory: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_restock_date: string | null
          location: string | null
          min_stock_level: number | null
          organization_id: string
          part_name: string
          part_number: string
          quantity: number
          supplier: string | null
          unit_cost: number | null
          updated_at: string
          vehicle_compatibility: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          location?: string | null
          min_stock_level?: number | null
          organization_id: string
          part_name: string
          part_number: string
          quantity?: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          vehicle_compatibility?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          location?: string | null
          min_stock_level?: number | null
          organization_id?: string
          part_name?: string
          part_number?: string
          quantity?: number
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          vehicle_compatibility?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      passenger_boardings: {
        Row: {
          alighting_stop: string | null
          alighting_time: string | null
          boarding_stop: string | null
          boarding_time: string
          created_at: string
          fare_amount: number | null
          fare_paid: boolean | null
          id: string
          manifest_id: string
          organization_id: string
          passenger_name: string | null
          passenger_phone: string | null
          seat_number: string | null
          ticket_number: string | null
        }
        Insert: {
          alighting_stop?: string | null
          alighting_time?: string | null
          boarding_stop?: string | null
          boarding_time?: string
          created_at?: string
          fare_amount?: number | null
          fare_paid?: boolean | null
          id?: string
          manifest_id: string
          organization_id: string
          passenger_name?: string | null
          passenger_phone?: string | null
          seat_number?: string | null
          ticket_number?: string | null
        }
        Update: {
          alighting_stop?: string | null
          alighting_time?: string | null
          boarding_stop?: string | null
          boarding_time?: string
          created_at?: string
          fare_amount?: number | null
          fare_paid?: boolean | null
          id?: string
          manifest_id?: string
          organization_id?: string
          passenger_name?: string | null
          passenger_phone?: string | null
          seat_number?: string | null
          ticket_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passenger_boardings_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "passenger_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passenger_boardings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      passenger_manifests: {
        Row: {
          arrival_time: string | null
          created_at: string
          departure_time: string
          driver_id: string | null
          id: string
          max_capacity: number | null
          notes: string | null
          organization_id: string
          route_name: string | null
          status: string
          total_passengers: number
          trip_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string
          driver_id?: string | null
          id?: string
          max_capacity?: number | null
          notes?: string | null
          organization_id: string
          route_name?: string | null
          status?: string
          total_passengers?: number
          trip_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string
          driver_id?: string | null
          id?: string
          max_capacity?: number | null
          notes?: string | null
          organization_id?: string
          route_name?: string | null
          status?: string
          total_passengers?: number
          trip_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passenger_manifests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passenger_manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passenger_manifests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passenger_manifests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_policies: {
        Row: {
          created_at: string
          id: string
          lockout_duration_minutes: number | null
          max_login_attempts: number | null
          min_length: number | null
          organization_id: string
          password_expiry_days: number | null
          prevent_password_reuse: number | null
          require_lowercase: boolean | null
          require_numbers: boolean | null
          require_special_chars: boolean | null
          require_uppercase: boolean | null
          session_absolute_timeout_minutes: number | null
          session_timeout_minutes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lockout_duration_minutes?: number | null
          max_login_attempts?: number | null
          min_length?: number | null
          organization_id: string
          password_expiry_days?: number | null
          prevent_password_reuse?: number | null
          require_lowercase?: boolean | null
          require_numbers?: boolean | null
          require_special_chars?: boolean | null
          require_uppercase?: boolean | null
          session_absolute_timeout_minutes?: number | null
          session_timeout_minutes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lockout_duration_minutes?: number | null
          max_login_attempts?: number | null
          min_length?: number | null
          organization_id?: string
          password_expiry_days?: number | null
          prevent_password_reuse?: number | null
          require_lowercase?: boolean | null
          require_numbers?: boolean | null
          require_special_chars?: boolean | null
          require_uppercase?: boolean | null
          session_absolute_timeout_minutes?: number | null
          session_timeout_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          email: string
          id: string
          ip_address: string | null
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          attempted_at?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      penalties_fines: {
        Row: {
          amount: number
          created_at: string
          driver_id: string | null
          due_date: string | null
          fine_number: string
          id: string
          location: string | null
          notes: string | null
          organization_id: string
          paid_amount: number | null
          paid_date: string | null
          payment_status: string | null
          receipt_url: string | null
          updated_at: string
          vehicle_id: string | null
          violation_date: string
          violation_type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          driver_id?: string | null
          due_date?: string | null
          fine_number: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          updated_at?: string
          vehicle_id?: string | null
          violation_date: string
          violation_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: string | null
          due_date?: string | null
          fine_number?: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_status?: string | null
          receipt_url?: string | null
          updated_at?: string
          vehicle_id?: string | null
          violation_date?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_fines_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_fines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_fines_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_configurations: {
        Row: {
          auto_apply: boolean | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          monetary_fine: number | null
          organization_id: string
          penalty_points: number
          severity: string
          speed_threshold_kmh: number | null
          suspension_days: number | null
          updated_at: string
          violation_type: string
          warning_count_before_suspension: number | null
        }
        Insert: {
          auto_apply?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          monetary_fine?: number | null
          organization_id: string
          penalty_points?: number
          severity?: string
          speed_threshold_kmh?: number | null
          suspension_days?: number | null
          updated_at?: string
          violation_type: string
          warning_count_before_suspension?: number | null
        }
        Update: {
          auto_apply?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          monetary_fine?: number | null
          organization_id?: string
          penalty_points?: number
          severity?: string
          speed_threshold_kmh?: number | null
          suspension_days?: number | null
          updated_at?: string
          violation_type?: string
          warning_count_before_suspension?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "penalty_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      post_maintenance_inspections: {
        Row: {
          checklist: Json | null
          corrective_actions: string | null
          created_at: string
          findings: string | null
          id: string
          inspection_date: string
          inspector_id: string | null
          inspector_name: string | null
          notes: string | null
          organization_id: string
          overall_result: string | null
          parts_replaced: Json | null
          scrap_form_url: string | null
          scrap_returned: boolean | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          checklist?: Json | null
          corrective_actions?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          inspector_name?: string | null
          notes?: string | null
          organization_id: string
          overall_result?: string | null
          parts_replaced?: Json | null
          scrap_form_url?: string | null
          scrap_returned?: boolean | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          checklist?: Json | null
          corrective_actions?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          inspector_name?: string | null
          notes?: string | null
          organization_id?: string
          overall_result?: string | null
          parts_replaced?: Json | null
          scrap_form_url?: string | null
          scrap_returned?: boolean | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_maintenance_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_maintenance_inspections_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_health_snapshots: {
        Row: {
          analysis_method: string | null
          avg_health_score: number
          created_at: string
          critical_count: number
          high_count: number
          id: string
          low_count: number
          medium_count: number
          organization_id: string
          snapshot_date: string
          total_estimated_cost_etb: number | null
          vehicles_analyzed: number
        }
        Insert: {
          analysis_method?: string | null
          avg_health_score: number
          created_at?: string
          critical_count?: number
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          organization_id: string
          snapshot_date?: string
          total_estimated_cost_etb?: number | null
          vehicles_analyzed?: number
        }
        Update: {
          analysis_method?: string | null
          avg_health_score?: number
          created_at?: string
          critical_count?: number
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          organization_id?: string
          snapshot_date?: string
          total_estimated_cost_etb?: number | null
          vehicles_analyzed?: number
        }
        Relationships: [
          {
            foreignKeyName: "predictive_health_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_maintenance_scores: {
        Row: {
          ai_confidence: number | null
          ai_model: string | null
          ai_reasoning: string | null
          analysis_method: string | null
          component_health: Json | null
          computed_at: string
          contributing_factors: Json | null
          created_at: string
          dismiss_reason: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          estimated_cost_impact_etb: number | null
          estimated_downtime_days: number | null
          health_score: number
          id: string
          organization_id: string
          predicted_failure_component: string | null
          predicted_failure_window_days: number | null
          recommended_action: string | null
          recommended_parts: string[] | null
          recommended_priority: string | null
          risk_level: string
          status: string
          updated_at: string
          vehicle_id: string
          work_order_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_reasoning?: string | null
          analysis_method?: string | null
          component_health?: Json | null
          computed_at?: string
          contributing_factors?: Json | null
          created_at?: string
          dismiss_reason?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          estimated_cost_impact_etb?: number | null
          estimated_downtime_days?: number | null
          health_score?: number
          id?: string
          organization_id: string
          predicted_failure_component?: string | null
          predicted_failure_window_days?: number | null
          recommended_action?: string | null
          recommended_parts?: string[] | null
          recommended_priority?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
          vehicle_id: string
          work_order_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_reasoning?: string | null
          analysis_method?: string | null
          component_health?: Json | null
          computed_at?: string
          contributing_factors?: Json | null
          created_at?: string
          dismiss_reason?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          estimated_cost_impact_etb?: number | null
          estimated_downtime_days?: number | null
          health_score?: number
          id?: string
          organization_id?: string
          predicted_failure_component?: string | null
          predicted_failure_window_days?: number | null
          recommended_action?: string | null
          recommended_parts?: string[] | null
          recommended_priority?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictive_maintenance_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_maintenance_scores_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_maintenance_scores_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_activities: {
        Row: {
          activity_name: string
          created_at: string
          data_categories: string[]
          data_subjects: string[]
          dpia_completed_at: string | null
          dpia_required: boolean | null
          id: string
          is_active: boolean | null
          lawful_basis: string
          notes: string | null
          organization_id: string
          purpose: string
          recipients: string[] | null
          responsible_person: string | null
          retention_period: string | null
          security_measures: string | null
          third_country_transfers: string | null
          updated_at: string
        }
        Insert: {
          activity_name: string
          created_at?: string
          data_categories?: string[]
          data_subjects?: string[]
          dpia_completed_at?: string | null
          dpia_required?: boolean | null
          id?: string
          is_active?: boolean | null
          lawful_basis: string
          notes?: string | null
          organization_id: string
          purpose: string
          recipients?: string[] | null
          responsible_person?: string | null
          retention_period?: string | null
          security_measures?: string | null
          third_country_transfers?: string | null
          updated_at?: string
        }
        Update: {
          activity_name?: string
          created_at?: string
          data_categories?: string[]
          data_subjects?: string[]
          dpia_completed_at?: string | null
          dpia_required?: boolean | null
          id?: string
          is_active?: boolean | null
          lawful_basis?: string
          notes?: string | null
          organization_id?: string
          purpose?: string
          recipients?: string[] | null
          responsible_person?: string | null
          retention_period?: string | null
          security_measures?: string | null
          third_country_transfers?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_code: string | null
          employee_type: string | null
          first_name: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          job_title: string | null
          last_name: string | null
          linked_driver_id: string | null
          linked_employee_id: string | null
          middle_name: string | null
          organization_id: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_code?: string | null
          employee_type?: string | null
          first_name?: string | null
          full_name?: string | null
          hire_date?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          linked_driver_id?: string | null
          linked_employee_id?: string | null
          middle_name?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_code?: string | null
          employee_type?: string | null
          first_name?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          linked_driver_id?: string | null
          linked_employee_id?: string | null
          middle_name?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_linked_driver_id_fkey"
            columns: ["linked_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_linked_employee_id_fkey"
            columns: ["linked_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          acknowledged_at: string | null
          actual_delivery_date: string | null
          approval_level: number | null
          approved_at: string | null
          approved_by: string | null
          attachments: string[] | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          delivery_address: string | null
          expected_delivery_date: string | null
          fulfilled_at: string | null
          id: string
          invoice_number: string | null
          invoiced_at: string | null
          line_items: Json | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_terms: string | null
          po_number: string
          priority: string | null
          sent_at: string | null
          shipping_cost: number | null
          status: string
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          ticket_id: string | null
          total_amount: number | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          actual_delivery_date?: string | null
          approval_level?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: string[] | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_address?: string | null
          expected_delivery_date?: string | null
          fulfilled_at?: string | null
          id?: string
          invoice_number?: string | null
          invoiced_at?: string | null
          line_items?: Json | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_terms?: string | null
          po_number: string
          priority?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          ticket_id?: string | null
          total_amount?: number | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          actual_delivery_date?: string | null
          approval_level?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: string[] | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_address?: string | null
          expected_delivery_date?: string | null
          fulfilled_at?: string | null
          id?: string
          invoice_number?: string | null
          invoiced_at?: string | null
          line_items?: Json | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_terms?: string | null
          po_number?: string
          priority?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          ticket_id?: string | null
          total_amount?: number | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_name: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          organization_id: string
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_name?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id: string
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_name?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id?: string
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_configs: {
        Row: {
          block_duration_minutes: number | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_inserts_per_minute: number | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          block_duration_minutes?: number | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_inserts_per_minute?: number | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          block_duration_minutes?: number | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_inserts_per_minute?: number | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          action_type: string
          blocked: boolean | null
          created_at: string | null
          id: string
          ip_address: string | null
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          action_type: string
          blocked?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          action_type?: string
          blocked?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      rate_limit_violations: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          endpoint: string | null
          id: string
          request_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string | null
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string | null
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      rental_vehicles: {
        Row: {
          contract_end: string
          contract_number: string | null
          contract_start: string
          created_at: string
          daily_rate: number | null
          driver_name: string | null
          driver_phone: string | null
          driver_type: string | null
          id: string
          make: string | null
          model: string | null
          monthly_cost: number | null
          notes: string | null
          organization_id: string
          plate_number: string
          provider_name: string
          status: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          contract_end: string
          contract_number?: string | null
          contract_start: string
          created_at?: string
          daily_rate?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          id?: string
          make?: string | null
          model?: string | null
          monthly_cost?: number | null
          notes?: string | null
          organization_id: string
          plate_number: string
          provider_name: string
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          contract_end?: string
          contract_number?: string | null
          contract_start?: string
          created_at?: string
          daily_rate?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          id?: string
          make?: string | null
          model?: string | null
          monthly_cost?: number | null
          notes?: string | null
          organization_id?: string
          plate_number?: string
          provider_name?: string
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          columns: string[] | null
          created_at: string
          created_by: string
          date_range_type: string | null
          description: string | null
          filters: Json | null
          group_by: string | null
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          organization_id: string
          report_category: string
          report_type: string
          sort_by: string | null
          sort_order: string | null
          updated_at: string
        }
        Insert: {
          columns?: string[] | null
          created_at?: string
          created_by: string
          date_range_type?: string | null
          description?: string | null
          filters?: Json | null
          group_by?: string | null
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          organization_id: string
          report_category: string
          report_type: string
          sort_by?: string | null
          sort_order?: string | null
          updated_at?: string
        }
        Update: {
          columns?: string[] | null
          created_at?: string
          created_by?: string
          date_range_type?: string | null
          description?: string | null
          filters?: Json | null
          group_by?: string | null
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          organization_id?: string
          report_category?: string
          report_type?: string
          sort_by?: string | null
          sort_order?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      restricted_hours_violations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_time: string
          allowed_end_time: string
          allowed_start_time: string
          created_at: string
          distance_km: number | null
          driver_id: string | null
          duration_minutes: number | null
          end_location: string | null
          id: string
          is_acknowledged: boolean | null
          notes: string | null
          organization_id: string
          restriction_id: string | null
          start_location: string | null
          trip_id: string | null
          vehicle_id: string
          violation_time: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_time: string
          allowed_end_time: string
          allowed_start_time: string
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          duration_minutes?: number | null
          end_location?: string | null
          id?: string
          is_acknowledged?: boolean | null
          notes?: string | null
          organization_id: string
          restriction_id?: string | null
          start_location?: string | null
          trip_id?: string | null
          vehicle_id: string
          violation_time: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_time?: string
          allowed_end_time?: string
          allowed_start_time?: string
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          duration_minutes?: number | null
          end_location?: string | null
          id?: string
          is_acknowledged?: boolean | null
          notes?: string | null
          organization_id?: string
          restriction_id?: string | null
          start_location?: string | null
          trip_id?: string | null
          vehicle_id?: string
          violation_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "restricted_hours_violations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restricted_hours_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restricted_hours_violations_restriction_id_fkey"
            columns: ["restriction_id"]
            isOneToOne: false
            referencedRelation: "vehicle_restricted_hours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restricted_hours_violations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restricted_hours_violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfid_pairings: {
        Row: {
          created_at: string
          device_id: string
          driver_id: string
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          paired_at: string
          paired_by: string | null
          rfid_tag: string
          unpaired_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          driver_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          paired_at?: string
          paired_by?: string | null
          rfid_tag: string
          unpaired_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          paired_at?: string
          paired_by?: string | null
          rfid_tag?: string
          unpaired_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfid_pairings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfid_pairings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfid_pairings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_assistance_requests: {
        Row: {
          actual_cost: number | null
          breakdown_type: string
          created_at: string
          description: string | null
          driver_id: string | null
          estimated_cost: number | null
          id: string
          lat: number | null
          lng: number | null
          location_name: string | null
          organization_id: string
          priority: string | null
          provider_eta_minutes: number | null
          provider_phone: string | null
          request_number: string
          requested_at: string
          resolution_notes: string | null
          resolved_at: string | null
          responded_at: string | null
          service_provider: string | null
          status: string
          tow_required: boolean | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          actual_cost?: number | null
          breakdown_type?: string
          created_at?: string
          description?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id: string
          priority?: string | null
          provider_eta_minutes?: number | null
          provider_phone?: string | null
          request_number: string
          requested_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          service_provider?: string | null
          status?: string
          tow_required?: boolean | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          actual_cost?: number | null
          breakdown_type?: string
          created_at?: string
          description?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id?: string
          priority?: string | null
          provider_eta_minutes?: number | null
          provider_phone?: string | null
          request_number?: string
          requested_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          responded_at?: string | null
          service_provider?: string | null
          status?: string
          tow_required?: boolean | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadside_assistance_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_assistance_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_assistance_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_location_access: {
        Row: {
          access_level: string
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          location_type: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          location_type?: string
          organization_id: string
          role: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          location_type?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_location_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      route_plans: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          created_at: string
          created_by: string | null
          description: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          driver_id: string | null
          estimated_duration_minutes: number | null
          id: string
          name: string
          optimization_params: Json | null
          organization_id: string
          origin_lat: number | null
          origin_lng: number | null
          origin_name: string | null
          planned_arrival: string | null
          planned_departure: string | null
          route_geojson: Json | null
          status: string | null
          total_distance_km: number | null
          updated_at: string
          vehicle_id: string | null
          vehicle_type: string | null
          waypoints: Json | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          driver_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name: string
          optimization_params?: Json | null
          organization_id: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          route_geojson?: Json | null
          status?: string | null
          total_distance_km?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: string | null
          waypoints?: Json | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          driver_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name?: string
          optimization_params?: Json | null
          organization_id?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          route_geojson?: Json | null
          status?: string | null
          total_distance_km?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: string | null
          waypoints?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "route_plans_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_plans_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean | null
          organization_id: string
          route_code: string | null
          route_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          route_code?: string | null
          route_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          route_code?: string | null
          route_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      safety_comfort_issuances: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          issued_at: string
          issued_by: string | null
          issued_by_name: string | null
          item_key: string
          item_label: string
          notes: string | null
          organization_id: string
          qty: number
          request_id: string | null
          request_item_id: string | null
          source: string
          total_cost: number | null
          unit_cost: number | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          issued_at?: string
          issued_by?: string | null
          issued_by_name?: string | null
          item_key: string
          item_label: string
          notes?: string | null
          organization_id: string
          qty?: number
          request_id?: string | null
          request_item_id?: string | null
          source?: string
          total_cost?: number | null
          unit_cost?: number | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          issued_at?: string
          issued_by?: string | null
          issued_by_name?: string | null
          item_key?: string
          item_label?: string
          notes?: string | null
          organization_id?: string
          qty?: number
          request_id?: string | null
          request_item_id?: string | null
          source?: string
          total_cost?: number | null
          unit_cost?: number | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_comfort_issuances_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_issuances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_issuances_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "safety_comfort_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_issuances_request_item_id_fkey"
            columns: ["request_item_id"]
            isOneToOne: false
            referencedRelation: "safety_comfort_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_issuances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_comfort_procurement_requests: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          items: Json
          notes: string | null
          organization_id: string
          pr_number: string
          request_id: string | null
          status: string
          total_estimated_cost: number | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          organization_id: string
          pr_number: string
          request_id?: string | null
          status?: string
          total_estimated_cost?: number | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          organization_id?: string
          pr_number?: string
          request_id?: string | null
          status?: string
          total_estimated_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_comfort_procurement_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_procurement_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "safety_comfort_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_comfort_request_eligibility: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          item_key: string
          max_qty_per_period: number | null
          notes: string | null
          organization_id: string
          scope_type: string
          scope_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_key: string
          max_qty_per_period?: number | null
          notes?: string | null
          organization_id: string
          scope_type: string
          scope_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          item_key?: string
          max_qty_per_period?: number | null
          notes?: string | null
          organization_id?: string
          scope_type?: string
          scope_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_comfort_request_eligibility_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_comfort_request_items: {
        Row: {
          approved_qty: number | null
          available_qty: number | null
          category: string
          created_at: string
          estimated_cost: number | null
          id: string
          inventory_item_id: string | null
          issued_at: string | null
          issued_by: string | null
          issued_qty: number | null
          item_key: string
          item_label: string
          last_issued_at: string | null
          line_status: string
          notes: string | null
          organization_id: string
          reason_for_replacement: string | null
          request_id: string
          requested_qty: number
          required_qty: string | null
          unit_cost: number | null
          updated_at: string
          usability_check_message: string | null
          usability_check_passed: boolean | null
          usability_period: string | null
        }
        Insert: {
          approved_qty?: number | null
          available_qty?: number | null
          category: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          inventory_item_id?: string | null
          issued_at?: string | null
          issued_by?: string | null
          issued_qty?: number | null
          item_key: string
          item_label: string
          last_issued_at?: string | null
          line_status?: string
          notes?: string | null
          organization_id: string
          reason_for_replacement?: string | null
          request_id: string
          requested_qty?: number
          required_qty?: string | null
          unit_cost?: number | null
          updated_at?: string
          usability_check_message?: string | null
          usability_check_passed?: boolean | null
          usability_period?: string | null
        }
        Update: {
          approved_qty?: number | null
          available_qty?: number | null
          category?: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          inventory_item_id?: string | null
          issued_at?: string | null
          issued_by?: string | null
          issued_qty?: number | null
          item_key?: string
          item_label?: string
          last_issued_at?: string | null
          line_status?: string
          notes?: string | null
          organization_id?: string
          reason_for_replacement?: string | null
          request_id?: string
          requested_qty?: number
          required_qty?: string | null
          unit_cost?: number | null
          updated_at?: string
          usability_check_message?: string | null
          usability_check_passed?: boolean | null
          usability_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_comfort_request_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_request_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "safety_comfort_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_comfort_requests: {
        Row: {
          approval_comments: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          created_at: string
          eligibility_check: string | null
          eligibility_notes: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          notes: string | null
          organization_id: string
          procurement_request_id: string | null
          reason: string | null
          rejected_at: string | null
          rejection_reason: string | null
          request_number: string
          requester_id: string
          requester_name: string | null
          status: string
          stock_status: string | null
          total_estimated_cost: number | null
          updated_at: string
          vehicle_group: string | null
          vehicle_id: string | null
          warehouse_checked_at: string | null
          warehouse_checked_by: string | null
          work_order_id: string | null
        }
        Insert: {
          approval_comments?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string
          eligibility_check?: string | null
          eligibility_notes?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          procurement_request_id?: string | null
          reason?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_number: string
          requester_id: string
          requester_name?: string | null
          status?: string
          stock_status?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          vehicle_group?: string | null
          vehicle_id?: string | null
          warehouse_checked_at?: string | null
          warehouse_checked_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          approval_comments?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string
          eligibility_check?: string | null
          eligibility_notes?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          procurement_request_id?: string | null
          reason?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          request_number?: string
          requester_id?: string
          requester_name?: string | null
          status?: string
          stock_status?: string | null
          total_estimated_cost?: number | null
          updated_at?: string
          vehicle_group?: string | null
          vehicle_id?: string | null
          warehouse_checked_at?: string | null
          warehouse_checked_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_comfort_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_comfort_requests_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string
          filter_config: Json
          filter_name: string
          filter_type: string
          id: string
          is_default: boolean | null
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_config: Json
          filter_name: string
          filter_type: string
          id?: string
          is_default?: boolean | null
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_config?: Json
          filter_name?: string
          filter_type?: string
          id?: string
          is_default?: boolean | null
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          asset_type: string | null
          at_time: string
          category: string
          created_at: string
          created_by: string | null
          data_period: string | null
          export_format: string
          from_time: string | null
          id: string
          is_active: boolean
          is_scheduled: boolean
          last_run_at: string | null
          next_run_at: string | null
          organization_id: string
          recipients: string[]
          report_description: string | null
          report_id: string
          report_name: string
          schedule_rate: string
          selected_assets: string[] | null
          selected_days: number[] | null
          starting_date: string
          sub_id: string
          to_time: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: string | null
          at_time?: string
          category: string
          created_at?: string
          created_by?: string | null
          data_period?: string | null
          export_format?: string
          from_time?: string | null
          id?: string
          is_active?: boolean
          is_scheduled?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id: string
          recipients?: string[]
          report_description?: string | null
          report_id: string
          report_name: string
          schedule_rate?: string
          selected_assets?: string[] | null
          selected_days?: number[] | null
          starting_date?: string
          sub_id: string
          to_time?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: string | null
          at_time?: string
          category?: string
          created_at?: string
          created_by?: string | null
          data_period?: string | null
          export_format?: string
          from_time?: string | null
          id?: string
          is_active?: boolean
          is_scheduled?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id?: string
          recipients?: string[]
          report_description?: string | null
          report_id?: string
          report_name?: string
          schedule_rate?: string
          selected_assets?: string[] | null
          selected_days?: number[] | null
          starting_date?: string
          sub_id?: string
          to_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          created_at: string | null
          description: string | null
          event_category: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_category?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_category?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sensor_calibrations: {
        Row: {
          alert_thresholds: Json | null
          calibrated_by: string | null
          calibration_data: Json | null
          calibration_date: string
          created_at: string
          id: string
          next_calibration_date: string | null
          notes: string | null
          organization_id: string
          sensor_id: string | null
          sensor_type: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          alert_thresholds?: Json | null
          calibrated_by?: string | null
          calibration_data?: Json | null
          calibration_date?: string
          created_at?: string
          id?: string
          next_calibration_date?: string | null
          notes?: string | null
          organization_id: string
          sensor_id?: string | null
          sensor_type: string
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          alert_thresholds?: Json | null
          calibrated_by?: string | null
          calibration_data?: Json | null
          calibration_date?: string
          created_at?: string
          id?: string
          next_calibration_date?: string | null
          notes?: string | null
          organization_id?: string
          sensor_id?: string | null
          sensor_type?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensor_calibrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensor_calibrations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sensors: {
        Row: {
          calibration_curve: Json | null
          created_at: string
          id: string
          install_date: string | null
          install_location: string | null
          last_reading: string | null
          notes: string | null
          organization_id: string
          sensor_subtype: string | null
          sensor_type: string
          status: string
          temperature_compensation: boolean | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          calibration_curve?: Json | null
          created_at?: string
          id?: string
          install_date?: string | null
          install_location?: string | null
          last_reading?: string | null
          notes?: string | null
          organization_id: string
          sensor_subtype?: string | null
          sensor_type: string
          status?: string
          temperature_compensation?: boolean | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          calibration_curve?: Json | null
          created_at?: string
          id?: string
          install_date?: string | null
          install_location?: string | null
          last_reading?: string | null
          notes?: string | null
          organization_id?: string
          sensor_subtype?: string | null
          sensor_type?: string
          status?: string
          temperature_compensation?: boolean | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sensors_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_history: {
        Row: {
          attachments: Json | null
          created_at: string
          description: string | null
          downtime_hours: number | null
          engine_hours: number | null
          id: string
          inspection_id: string | null
          labor_cost: number | null
          maintenance_schedule_id: string | null
          mechanic_id: string | null
          notes: string | null
          odometer_km: number | null
          organization_id: string
          parts_cost: number | null
          service_category: string | null
          service_date: string
          service_type: string
          technician_name: string | null
          total_cost: number | null
          updated_at: string
          vehicle_id: string
          vendor_id: string | null
          warranty_amount: number | null
          warranty_claim: boolean | null
          work_order_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          downtime_hours?: number | null
          engine_hours?: number | null
          id?: string
          inspection_id?: string | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          mechanic_id?: string | null
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          parts_cost?: number | null
          service_category?: string | null
          service_date?: string
          service_type: string
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id: string
          vendor_id?: string | null
          warranty_amount?: number | null
          warranty_claim?: boolean | null
          work_order_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          description?: string | null
          downtime_hours?: number | null
          engine_hours?: number | null
          id?: string
          inspection_id?: string | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          mechanic_id?: string | null
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          parts_cost?: number | null
          service_category?: string | null
          service_date?: string
          service_type?: string
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string
          vendor_id?: string | null
          warranty_amount?: number | null
          warranty_claim?: boolean | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_history_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_history_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      siem_configs: {
        Row: {
          auth_token: string | null
          auth_type: string
          batch_size: number | null
          created_at: string
          endpoint_url: string
          event_types: string[] | null
          format: string
          forward_interval_seconds: number | null
          id: string
          is_active: boolean | null
          last_forward_at: string | null
          last_forward_count: number | null
          last_forward_status: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          auth_token?: string | null
          auth_type?: string
          batch_size?: number | null
          created_at?: string
          endpoint_url: string
          event_types?: string[] | null
          format?: string
          forward_interval_seconds?: number | null
          id?: string
          is_active?: boolean | null
          last_forward_at?: string | null
          last_forward_count?: number | null
          last_forward_status?: string | null
          name?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          auth_token?: string | null
          auth_type?: string
          batch_size?: number | null
          created_at?: string
          endpoint_url?: string
          event_types?: string[] | null
          format?: string
          forward_interval_seconds?: number | null
          id?: string
          is_active?: boolean | null
          last_forward_at?: string | null
          last_forward_count?: number | null
          last_forward_status?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "siem_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      siem_forward_logs: {
        Row: {
          created_at: string
          error_message: string | null
          events_failed: number | null
          events_forwarded: number | null
          id: string
          organization_id: string
          response_code: number | null
          siem_config_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          events_failed?: number | null
          events_forwarded?: number | null
          id?: string
          organization_id: string
          response_code?: number | null
          siem_config_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          events_failed?: number | null
          events_forwarded?: number | null
          id?: string
          organization_id?: string
          response_code?: number | null
          siem_config_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "siem_forward_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "siem_forward_logs_siem_config_id_fkey"
            columns: ["siem_config_id"]
            isOneToOne: false
            referencedRelation: "siem_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_scenarios: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          parameters: Json
          results: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          parameters?: Json
          results?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          parameters?: Json
          results?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_gateway_config: {
        Row: {
          api_key: string
          api_secret: string | null
          created_at: string
          environment: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          organization_id: string
          provider: string
          sender_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          api_key: string
          api_secret?: string | null
          created_at?: string
          environment?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          organization_id: string
          provider?: string
          sender_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_key?: string
          api_secret?: string | null
          created_at?: string
          environment?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          organization_id?: string
          provider?: string
          sender_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_gateway_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_configurations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_test_status: string | null
          last_tested_at: string | null
          name: string
          organization_id: string
          smtp_from_email: string
          smtp_from_name: string | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_user: string
          updated_at: string
          use_tls: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name?: string
          organization_id: string
          smtp_from_email: string
          smtp_from_name?: string | null
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_user: string
          updated_at?: string
          use_tls?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_test_status?: string | null
          last_tested_at?: string | null
          name?: string
          organization_id?: string
          smtp_from_email?: string
          smtp_from_name?: string | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_user?: string
          updated_at?: string
          use_tls?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "smtp_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_time: string
          created_at: string
          driver_id: string | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          vehicle_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_time?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_time?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_governor_config: {
        Row: {
          created_at: string
          device_id: string | null
          device_model: string | null
          firmware_version: string | null
          governor_active: boolean
          id: string
          last_config_update: string | null
          max_speed_limit: number
          organization_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          device_model?: string | null
          firmware_version?: string | null
          governor_active?: boolean
          id?: string
          last_config_update?: string | null
          max_speed_limit?: number
          organization_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          device_model?: string | null
          firmware_version?: string | null
          governor_active?: boolean
          id?: string
          last_config_update?: string | null
          max_speed_limit?: number
          organization_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_governor_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_governor_config_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_governor_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_id: string | null
          created_at: string
          device_id: string | null
          driver_id: string | null
          event_time: string
          event_type: string
          id: string
          lat: number | null
          lng: number | null
          location_name: string | null
          notes: string | null
          organization_id: string
          speed_at_event: number | null
          speed_limit_set: number | null
          vehicle_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_id?: string | null
          created_at?: string
          device_id?: string | null
          driver_id?: string | null
          event_time?: string
          event_type: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          notes?: string | null
          organization_id: string
          speed_at_event?: number | null
          speed_limit_set?: number | null
          vehicle_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_id?: string | null
          created_at?: string
          device_id?: string | null
          driver_id?: string | null
          event_time?: string
          event_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          notes?: string | null
          organization_id?: string
          speed_at_event?: number | null
          speed_limit_set?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_governor_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_governor_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_governor_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_governor_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_governor_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_limit_zones: {
        Row: {
          created_at: string
          days_active: number[] | null
          description: string | null
          end_time: string | null
          geofence_id: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          speed_limit_kmh: number
          start_time: string | null
          updated_at: string
          zone_type: string
        }
        Insert: {
          created_at?: string
          days_active?: number[] | null
          description?: string | null
          end_time?: string | null
          geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          speed_limit_kmh?: number
          start_time?: string | null
          updated_at?: string
          zone_type?: string
        }
        Update: {
          created_at?: string
          days_active?: number[] | null
          description?: string | null
          end_time?: string | null
          geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          speed_limit_kmh?: number
          start_time?: string | null
          updated_at?: string
          zone_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_limit_zones_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_limit_zones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_violations: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          driver_id: string | null
          duration_seconds: number | null
          id: string
          is_acknowledged: boolean | null
          lat: number | null
          lng: number | null
          location_name: string | null
          organization_id: string
          severity: string
          speed_kmh: number
          speed_limit_kmh: number
          vehicle_id: string
          violation_time: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          driver_id?: string | null
          duration_seconds?: number | null
          id?: string
          is_acknowledged?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id: string
          severity?: string
          speed_kmh: number
          speed_limit_kmh: number
          vehicle_id: string
          violation_time: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          driver_id?: string | null
          duration_seconds?: number | null
          id?: string
          is_acknowledged?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          organization_id?: string
          severity?: string
          speed_kmh?: number
          speed_limit_kmh?: number
          vehicle_id?: string
          violation_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_violations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speed_violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_configurations: {
        Row: {
          attribute_mapping: Json | null
          auto_provision_users: boolean | null
          created_at: string
          default_role: string | null
          id: string
          is_active: boolean | null
          oidc_authorization_endpoint: string | null
          oidc_client_id: string | null
          oidc_client_secret: string | null
          oidc_issuer_url: string | null
          oidc_token_endpoint: string | null
          oidc_userinfo_endpoint: string | null
          organization_id: string
          provider_name: string
          saml_certificate: string | null
          saml_entity_id: string | null
          saml_sso_url: string | null
          updated_at: string
        }
        Insert: {
          attribute_mapping?: Json | null
          auto_provision_users?: boolean | null
          created_at?: string
          default_role?: string | null
          id?: string
          is_active?: boolean | null
          oidc_authorization_endpoint?: string | null
          oidc_client_id?: string | null
          oidc_client_secret?: string | null
          oidc_issuer_url?: string | null
          oidc_token_endpoint?: string | null
          oidc_userinfo_endpoint?: string | null
          organization_id: string
          provider_name: string
          saml_certificate?: string | null
          saml_entity_id?: string | null
          saml_sso_url?: string | null
          updated_at?: string
        }
        Update: {
          attribute_mapping?: Json | null
          auto_provision_users?: boolean | null
          created_at?: string
          default_role?: string | null
          id?: string
          is_active?: boolean | null
          oidc_authorization_endpoint?: string | null
          oidc_client_id?: string | null
          oidc_client_secret?: string | null
          oidc_issuer_url?: string | null
          oidc_token_endpoint?: string | null
          oidc_userinfo_endpoint?: string | null
          organization_id?: string
          provider_name?: string
          saml_certificate?: string | null
          saml_entity_id?: string | null
          saml_sso_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_bids: {
        Row: {
          attachments: string[] | null
          awarded_at: string | null
          awarded_by: string | null
          bid_amount: number | null
          bid_status: string | null
          commercial_score: number | null
          comparison_notes: string | null
          created_at: string
          id: string
          is_awarded: boolean | null
          lead_time_days: number | null
          notes: string | null
          organization_id: string
          overall_score: number | null
          quantity: number | null
          rfq_deadline: string | null
          rfq_description: string | null
          rfq_number: string
          rfq_status: string | null
          rfq_title: string
          supplier_id: string | null
          technical_score: number | null
          unit_price: number | null
          updated_at: string
          warranty_terms: string | null
        }
        Insert: {
          attachments?: string[] | null
          awarded_at?: string | null
          awarded_by?: string | null
          bid_amount?: number | null
          bid_status?: string | null
          commercial_score?: number | null
          comparison_notes?: string | null
          created_at?: string
          id?: string
          is_awarded?: boolean | null
          lead_time_days?: number | null
          notes?: string | null
          organization_id: string
          overall_score?: number | null
          quantity?: number | null
          rfq_deadline?: string | null
          rfq_description?: string | null
          rfq_number: string
          rfq_status?: string | null
          rfq_title: string
          supplier_id?: string | null
          technical_score?: number | null
          unit_price?: number | null
          updated_at?: string
          warranty_terms?: string | null
        }
        Update: {
          attachments?: string[] | null
          awarded_at?: string | null
          awarded_by?: string | null
          bid_amount?: number | null
          bid_status?: string | null
          commercial_score?: number | null
          comparison_notes?: string | null
          created_at?: string
          id?: string
          is_awarded?: boolean | null
          lead_time_days?: number | null
          notes?: string | null
          organization_id?: string
          overall_score?: number | null
          quantity?: number | null
          rfq_deadline?: string | null
          rfq_description?: string | null
          rfq_number?: string
          rfq_status?: string | null
          rfq_title?: string
          supplier_id?: string | null
          technical_score?: number | null
          unit_price?: number | null
          updated_at?: string
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bids_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bids_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payment_requests: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          notes: string | null
          organization_id: string
          payment_reference: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          supporting_documents: Json
          updated_at: string
          work_order_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          organization_id: string
          payment_reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supporting_documents?: Json
          updated_at?: string
          work_order_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          organization_id?: string
          payment_reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supporting_documents?: Json
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_requests_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profiles: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          average_lead_days: number | null
          bank_details: Json | null
          business_license: string | null
          certifications: string[] | null
          city: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          cost_variance_percentage: number | null
          country: string | null
          created_at: string
          documents: string[] | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          notes: string | null
          on_time_percentage: number | null
          organization_id: string
          payment_terms: string | null
          preferred_currency: string | null
          quality_rating: number | null
          service_categories: string[] | null
          supplier_code: string
          tax_id: string | null
          total_orders: number | null
          total_spend: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          average_lead_days?: number | null
          bank_details?: Json | null
          business_license?: string | null
          certifications?: string[] | null
          city?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_variance_percentage?: number | null
          country?: string | null
          created_at?: string
          documents?: string[] | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          notes?: string | null
          on_time_percentage?: number | null
          organization_id: string
          payment_terms?: string | null
          preferred_currency?: string | null
          quality_rating?: number | null
          service_categories?: string[] | null
          supplier_code: string
          tax_id?: string | null
          total_orders?: number | null
          total_spend?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          average_lead_days?: number | null
          bank_details?: Json | null
          business_license?: string | null
          certifications?: string[] | null
          city?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cost_variance_percentage?: number | null
          country?: string | null
          created_at?: string
          documents?: string[] | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          notes?: string | null
          on_time_percentage?: number | null
          organization_id?: string
          payment_terms?: string | null
          preferred_currency?: string | null
          quality_rating?: number | null
          service_categories?: string[] | null
          supplier_code?: string
          tax_id?: string | null
          total_orders?: number | null
          total_spend?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          organization_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry: {
        Row: {
          altitude: number | null
          battery_voltage: number | null
          created_at: string
          device_id: string | null
          engine_rpm: number | null
          engine_temp_celsius: number | null
          external_voltage: number | null
          fuel_level_liters: number | null
          fuel_level_percent: number | null
          heading: number | null
          id: string
          ignition: boolean | null
          lat: number
          lng: number
          organization_id: string
          raw_data: Json | null
          recorded_at: string
          speed_kmh: number | null
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          altitude?: number | null
          battery_voltage?: number | null
          created_at?: string
          device_id?: string | null
          engine_rpm?: number | null
          engine_temp_celsius?: number | null
          external_voltage?: number | null
          fuel_level_liters?: number | null
          fuel_level_percent?: number | null
          heading?: number | null
          id?: string
          ignition?: boolean | null
          lat: number
          lng: number
          organization_id: string
          raw_data?: Json | null
          recorded_at: string
          speed_kmh?: number | null
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          altitude?: number | null
          battery_voltage?: number | null
          created_at?: string
          device_id?: string | null
          engine_rpm?: number | null
          engine_temp_celsius?: number | null
          external_voltage?: number | null
          fuel_level_liters?: number | null
          fuel_level_percent?: number | null
          heading?: number | null
          id?: string
          ignition?: boolean | null
          lat?: number
          lng?: number
          organization_id?: string
          raw_data?: Json | null
          recorded_at?: string
          speed_kmh?: number | null
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_events: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_events_2025_01: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_02: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_03: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_04: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_05: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_06: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_07: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_08: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_09: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_10: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_11: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2025_12: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_01: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_02: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_03: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_04: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_05: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_06: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_07: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_08: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_09: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_10: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_11: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_events_2026_12: {
        Row: {
          created_at: string
          device_id: string | null
          event_id: string
          event_time: string
          event_type: string
          heading: number | null
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          payload: Json
          source: string | null
          speed_kmh: number | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          event_id: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          heading?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
          payload?: Json
          source?: string | null
          speed_kmh?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      telemetry_raw: {
        Row: {
          created_at: string
          created_telemetry_ids: string[] | null
          device_id: string | null
          id: string
          organization_id: string
          parsed_payload: Json | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string | null
          protocol: string | null
          raw_hex: string | null
          raw_payload: string | null
          received_at: string
          source_ip: unknown
        }
        Insert: {
          created_at?: string
          created_telemetry_ids?: string[] | null
          device_id?: string | null
          id?: string
          organization_id: string
          parsed_payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          protocol?: string | null
          raw_hex?: string | null
          raw_payload?: string | null
          received_at?: string
          source_ip?: unknown
        }
        Update: {
          created_at?: string
          created_telemetry_ids?: string[] | null
          device_id?: string | null
          id?: string
          organization_id?: string
          parsed_payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string | null
          protocol?: string | null
          raw_hex?: string | null
          raw_payload?: string | null
          received_at?: string
          source_ip?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_raw_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_raw_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_changes: {
        Row: {
          change_date: string
          change_type: string | null
          cost: number | null
          created_at: string
          id: string
          notes: string | null
          odometer_km: number | null
          organization_id: string
          performed_by: string | null
          position: string
          reason: string | null
          tire_id: string
          tread_depth_mm: number | null
          vehicle_id: string
        }
        Insert: {
          change_date?: string
          change_type?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          performed_by?: string | null
          position: string
          reason?: string | null
          tire_id: string
          tread_depth_mm?: number | null
          vehicle_id: string
        }
        Update: {
          change_date?: string
          change_type?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          performed_by?: string | null
          position?: string
          reason?: string | null
          tire_id?: string
          tread_depth_mm?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tire_changes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_changes_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tire_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_changes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_inventory: {
        Row: {
          brand: string
          created_at: string
          current_tread_depth_mm: number | null
          current_vehicle_id: string | null
          id: string
          install_date: string | null
          install_odometer_km: number | null
          max_distance_km: number | null
          model: string | null
          organization_id: string
          position: string | null
          purchase_cost: number | null
          purchase_date: string | null
          retired_date: string | null
          retired_reason: string | null
          serial_number: string | null
          size: string
          status: string | null
          tire_type: string | null
          total_distance_km: number | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          brand: string
          created_at?: string
          current_tread_depth_mm?: number | null
          current_vehicle_id?: string | null
          id?: string
          install_date?: string | null
          install_odometer_km?: number | null
          max_distance_km?: number | null
          model?: string | null
          organization_id: string
          position?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          retired_date?: string | null
          retired_reason?: string | null
          serial_number?: string | null
          size: string
          status?: string | null
          tire_type?: string | null
          total_distance_km?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          brand?: string
          created_at?: string
          current_tread_depth_mm?: number | null
          current_vehicle_id?: string | null
          id?: string
          install_date?: string | null
          install_odometer_km?: number | null
          max_distance_km?: number | null
          model?: string | null
          organization_id?: string
          position?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          retired_date?: string | null
          retired_reason?: string | null
          serial_number?: string | null
          size?: string
          status?: string | null
          tire_type?: string | null
          total_distance_km?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_inventory_current_vehicle_id_fkey"
            columns: ["current_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_request_items: {
        Row: {
          created_at: string
          id: string
          iproc_received_by: string | null
          iproc_return_reference: string | null
          iproc_return_status: string
          iproc_returned_at: string | null
          iproc_warehouse: string | null
          new_tire_id: string | null
          notes: string | null
          organization_id: string
          position: string
          preferred_brand: string | null
          preferred_model: string | null
          previous_tire_id: string | null
          request_id: string
          return_skip_reason: string | null
          tire_size: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          iproc_received_by?: string | null
          iproc_return_reference?: string | null
          iproc_return_status?: string
          iproc_returned_at?: string | null
          iproc_warehouse?: string | null
          new_tire_id?: string | null
          notes?: string | null
          organization_id: string
          position: string
          preferred_brand?: string | null
          preferred_model?: string | null
          previous_tire_id?: string | null
          request_id: string
          return_skip_reason?: string | null
          tire_size?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          iproc_received_by?: string | null
          iproc_return_reference?: string | null
          iproc_return_status?: string
          iproc_returned_at?: string | null
          iproc_warehouse?: string | null
          new_tire_id?: string | null
          notes?: string | null
          organization_id?: string
          position?: string
          preferred_brand?: string | null
          preferred_model?: string | null
          previous_tire_id?: string | null
          request_id?: string
          return_skip_reason?: string | null
          tire_size?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tire_request_items_new_tire_id_fkey"
            columns: ["new_tire_id"]
            isOneToOne: false
            referencedRelation: "tire_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_request_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_request_items_previous_tire_id_fkey"
            columns: ["previous_tire_id"]
            isOneToOne: false
            referencedRelation: "tire_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "tire_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_requests: {
        Row: {
          additional_description: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          approved_quantity: number | null
          assigned_department_id: string | null
          attachments: Json
          contact_email: string | null
          contact_phone: string | null
          contact_preference: string | null
          created_at: string
          documents: string[] | null
          driver_id: string | null
          driver_name: string | null
          driver_phone: string | null
          driver_type: string | null
          estimated_cost: number | null
          fuel_level_in_tank: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          iproc_mr_number: string | null
          iproc_old_tire_serials: Json | null
          iproc_onhand_balance: Json | null
          km_reading: number | null
          notes: string | null
          notify_user: boolean
          organization_id: string
          priority: string
          reason: string | null
          rejected_reason: string | null
          request_by_completion_date: string | null
          request_by_start_date: string | null
          request_number: string
          request_type: string
          requested_by: string | null
          requested_by_name: string | null
          requested_by_role: string | null
          requestor_department_id: string | null
          status: string
          updated_at: string
          vehicle_id: string
          workflow_instance_id: string | null
        }
        Insert: {
          additional_description?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_quantity?: number | null
          assigned_department_id?: string | null
          attachments?: Json
          contact_email?: string | null
          contact_phone?: string | null
          contact_preference?: string | null
          created_at?: string
          documents?: string[] | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          estimated_cost?: number | null
          fuel_level_in_tank?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          iproc_mr_number?: string | null
          iproc_old_tire_serials?: Json | null
          iproc_onhand_balance?: Json | null
          km_reading?: number | null
          notes?: string | null
          notify_user?: boolean
          organization_id: string
          priority?: string
          reason?: string | null
          rejected_reason?: string | null
          request_by_completion_date?: string | null
          request_by_start_date?: string | null
          request_number: string
          request_type?: string
          requested_by?: string | null
          requested_by_name?: string | null
          requested_by_role?: string | null
          requestor_department_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
          workflow_instance_id?: string | null
        }
        Update: {
          additional_description?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          approved_quantity?: number | null
          assigned_department_id?: string | null
          attachments?: Json
          contact_email?: string | null
          contact_phone?: string | null
          contact_preference?: string | null
          created_at?: string
          documents?: string[] | null
          driver_id?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          estimated_cost?: number | null
          fuel_level_in_tank?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          iproc_mr_number?: string | null
          iproc_old_tire_serials?: Json | null
          iproc_onhand_balance?: Json | null
          km_reading?: number | null
          notes?: string | null
          notify_user?: boolean
          organization_id?: string
          priority?: string
          reason?: string | null
          rejected_reason?: string | null
          request_by_completion_date?: string | null
          request_by_start_date?: string | null
          request_number?: string
          request_type?: string
          requested_by?: string | null
          requested_by_name?: string | null
          requested_by_role?: string | null
          requestor_department_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_requests_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_requests_requestor_department_id_fkey"
            columns: ["requestor_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_requests_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_utilization_records: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          installed_at: string
          km_at_install: number | null
          km_at_removal: number | null
          km_lifetime: number | null
          notes: string | null
          organization_id: string
          position: string
          removed_at: string | null
          status: string
          tire_id: string | null
          tire_request_id: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          installed_at?: string
          km_at_install?: number | null
          km_at_removal?: number | null
          km_lifetime?: number | null
          notes?: string | null
          organization_id: string
          position: string
          removed_at?: string | null
          status?: string
          tire_id?: string | null
          tire_request_id?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          installed_at?: string
          km_at_install?: number | null
          km_at_removal?: number | null
          km_lifetime?: number | null
          notes?: string | null
          organization_id?: string
          position?: string
          removed_at?: string | null
          status?: string
          tire_id?: string | null
          tire_request_id?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tire_utilization_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_utilization_records_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tire_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_utilization_records_tire_request_id_fkey"
            columns: ["tire_request_id"]
            isOneToOne: false
            referencedRelation: "tire_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_utilization_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tpl_invoices: {
        Row: {
          created_at: string
          currency: string | null
          document_url: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          line_items: Json | null
          notes: string | null
          organization_id: string
          partner_id: string
          payment_date: string | null
          payment_reference: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          line_items?: Json | null
          notes?: string | null
          organization_id: string
          partner_id: string
          payment_date?: string | null
          payment_reference?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json | null
          notes?: string | null
          organization_id?: string
          partner_id?: string
          payment_date?: string | null
          payment_reference?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpl_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpl_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "tpl_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      tpl_partners: {
        Row: {
          address: string | null
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_end: string | null
          contract_start: string | null
          contract_value: number | null
          coverage_areas: string[] | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          rating: number | null
          service_types: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contract_value?: number | null
          coverage_areas?: string[] | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          rating?: number | null
          service_types?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_end?: string | null
          contract_start?: string | null
          contract_value?: number | null
          coverage_areas?: string[] | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          rating?: number | null
          service_types?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpl_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tpl_performance_metrics: {
        Row: {
          avg_transit_hours: number | null
          cost_per_shipment: number | null
          created_at: string
          customer_complaints: number | null
          damage_rate: number | null
          damaged_shipments: number | null
          id: string
          late_deliveries: number | null
          lost_shipments: number | null
          notes: string | null
          on_time_deliveries: number | null
          on_time_percentage: number | null
          organization_id: string
          overall_score: number | null
          partner_id: string
          period_end: string
          period_start: string
          total_cost: number | null
          total_shipments: number | null
          updated_at: string
        }
        Insert: {
          avg_transit_hours?: number | null
          cost_per_shipment?: number | null
          created_at?: string
          customer_complaints?: number | null
          damage_rate?: number | null
          damaged_shipments?: number | null
          id?: string
          late_deliveries?: number | null
          lost_shipments?: number | null
          notes?: string | null
          on_time_deliveries?: number | null
          on_time_percentage?: number | null
          organization_id: string
          overall_score?: number | null
          partner_id: string
          period_end: string
          period_start: string
          total_cost?: number | null
          total_shipments?: number | null
          updated_at?: string
        }
        Update: {
          avg_transit_hours?: number | null
          cost_per_shipment?: number | null
          created_at?: string
          customer_complaints?: number | null
          damage_rate?: number | null
          damaged_shipments?: number | null
          id?: string
          late_deliveries?: number | null
          lost_shipments?: number | null
          notes?: string | null
          on_time_deliveries?: number | null
          on_time_percentage?: number | null
          organization_id?: string
          overall_score?: number | null
          partner_id?: string
          period_end?: string
          period_start?: string
          total_cost?: number | null
          total_shipments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpl_performance_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpl_performance_metrics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "tpl_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      tpl_rate_cards: {
        Row: {
          created_at: string
          currency: string | null
          destination_zone: string | null
          effective_from: string | null
          effective_until: string | null
          flat_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          origin_zone: string | null
          partner_id: string
          rate_per_kg: number | null
          service_type: string | null
          updated_at: string
          weight_max_kg: number | null
          weight_min_kg: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          destination_zone?: string | null
          effective_from?: string | null
          effective_until?: string | null
          flat_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          origin_zone?: string | null
          partner_id: string
          rate_per_kg?: number | null
          service_type?: string | null
          updated_at?: string
          weight_max_kg?: number | null
          weight_min_kg?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          destination_zone?: string | null
          effective_from?: string | null
          effective_until?: string | null
          flat_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          origin_zone?: string | null
          partner_id?: string
          rate_per_kg?: number | null
          service_type?: string | null
          updated_at?: string
          weight_max_kg?: number | null
          weight_min_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tpl_rate_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpl_rate_cards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "tpl_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      tpl_shipments: {
        Row: {
          actual_cost: number | null
          cargo_description: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_actual_at: string | null
          delivery_scheduled_at: string | null
          destination_address: string | null
          dispatch_job_id: string | null
          estimated_cost: number | null
          id: string
          notes: string | null
          organization_id: string
          origin_address: string | null
          partner_id: string
          partner_reference: string | null
          partner_tracking_number: string | null
          pickup_actual_at: string | null
          pickup_scheduled_at: string | null
          proof_of_delivery_url: string | null
          rate_card_id: string | null
          shipment_number: string
          special_instructions: string | null
          status: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          actual_cost?: number | null
          cargo_description?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_actual_at?: string | null
          delivery_scheduled_at?: string | null
          destination_address?: string | null
          dispatch_job_id?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          origin_address?: string | null
          partner_id: string
          partner_reference?: string | null
          partner_tracking_number?: string | null
          pickup_actual_at?: string | null
          pickup_scheduled_at?: string | null
          proof_of_delivery_url?: string | null
          rate_card_id?: string | null
          shipment_number: string
          special_instructions?: string | null
          status?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          actual_cost?: number | null
          cargo_description?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_actual_at?: string | null
          delivery_scheduled_at?: string | null
          destination_address?: string | null
          dispatch_job_id?: string | null
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          origin_address?: string | null
          partner_id?: string
          partner_reference?: string | null
          partner_tracking_number?: string | null
          pickup_actual_at?: string | null
          pickup_scheduled_at?: string | null
          proof_of_delivery_url?: string | null
          rate_card_id?: string | null
          shipment_number?: string
          special_instructions?: string | null
          status?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tpl_shipments_dispatch_job_id_fkey"
            columns: ["dispatch_job_id"]
            isOneToOne: false
            referencedRelation: "dispatch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpl_shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpl_shipments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "tpl_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpl_shipments_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "tpl_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      tpms_readings: {
        Row: {
          alarm_type: string | null
          battery_percent: number | null
          created_at: string
          id: string
          is_alarm: boolean | null
          organization_id: string
          pressure_bar: number | null
          pressure_psi: number | null
          recorded_at: string
          sensor_id: string | null
          temperature_celsius: number | null
          tire_position: string
          vehicle_id: string
        }
        Insert: {
          alarm_type?: string | null
          battery_percent?: number | null
          created_at?: string
          id?: string
          is_alarm?: boolean | null
          organization_id: string
          pressure_bar?: number | null
          pressure_psi?: number | null
          recorded_at?: string
          sensor_id?: string | null
          temperature_celsius?: number | null
          tire_position: string
          vehicle_id: string
        }
        Update: {
          alarm_type?: string | null
          battery_percent?: number | null
          created_at?: string
          id?: string
          is_alarm?: boolean | null
          organization_id?: string
          pressure_bar?: number | null
          pressure_psi?: number | null
          recorded_at?: string
          sensor_id?: string | null
          temperature_celsius?: number | null
          tire_position?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tpms_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpms_readings_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "iot_sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tpms_readings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_violations: {
        Row: {
          created_at: string
          document_url: string | null
          driver_id: string | null
          fine_amount: number | null
          id: string
          issuing_authority: string | null
          location_name: string | null
          notes: string | null
          organization_id: string
          paid_by: string | null
          payment_date: string | null
          payment_status: string | null
          points_assigned: number | null
          ticket_number: string | null
          updated_at: string
          vehicle_id: string
          violation_date: string
          violation_type: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          driver_id?: string | null
          fine_amount?: number | null
          id?: string
          issuing_authority?: string | null
          location_name?: string | null
          notes?: string | null
          organization_id: string
          paid_by?: string | null
          payment_date?: string | null
          payment_status?: string | null
          points_assigned?: number | null
          ticket_number?: string | null
          updated_at?: string
          vehicle_id: string
          violation_date: string
          violation_type: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          driver_id?: string | null
          fine_amount?: number | null
          id?: string
          issuing_authority?: string | null
          location_name?: string | null
          notes?: string | null
          organization_id?: string
          paid_by?: string | null
          payment_date?: string | null
          payment_status?: string | null
          points_assigned?: number | null
          ticket_number?: string | null
          updated_at?: string
          vehicle_id?: string
          violation_date?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_violations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_violations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_approvals: {
        Row: {
          acted_at: string | null
          action: string
          approver_id: string
          comment: string | null
          created_at: string
          id: string
          step: number
          trip_request_id: string
        }
        Insert: {
          acted_at?: string | null
          action?: string
          approver_id: string
          comment?: string | null
          created_at?: string
          id?: string
          step: number
          trip_request_id: string
        }
        Update: {
          acted_at?: string | null
          action?: string
          approver_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          step?: number
          trip_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_approvals_trip_request_id_fkey"
            columns: ["trip_request_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          dispatched_at: string | null
          driver_id: string
          id: string
          notes: string | null
          organization_id: string
          started_at: string | null
          status: string
          trip_request_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          driver_id: string
          id?: string
          notes?: string | null
          organization_id: string
          started_at?: string | null
          status?: string
          trip_request_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          driver_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          started_at?: string | null
          status?: string
          trip_request_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assignments_trip_request_id_fkey"
            columns: ["trip_request_id"]
            isOneToOne: true
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_requests: {
        Row: {
          approved_at: string | null
          cargo_description: string | null
          cargo_volume_m3: number | null
          cargo_weight_kg: number | null
          cost_center_id: string | null
          created_at: string
          drop_geofence_id: string | null
          id: string
          notes: string | null
          organization_id: string
          passenger_count: number
          pickup_at: string
          pickup_geofence_id: string | null
          preferred_driver_id: string | null
          priority: string | null
          purpose: string
          rejected_at: string | null
          rejection_reason: string | null
          request_number: string
          requester_id: string
          required_class: string | null
          return_at: string
          sla_deadline_at: string | null
          special_requirements: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          cargo_description?: string | null
          cargo_volume_m3?: number | null
          cargo_weight_kg?: number | null
          cost_center_id?: string | null
          created_at?: string
          drop_geofence_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          passenger_count?: number
          pickup_at: string
          pickup_geofence_id?: string | null
          preferred_driver_id?: string | null
          priority?: string | null
          purpose: string
          rejected_at?: string | null
          rejection_reason?: string | null
          request_number: string
          requester_id: string
          required_class?: string | null
          return_at: string
          sla_deadline_at?: string | null
          special_requirements?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          cargo_description?: string | null
          cargo_volume_m3?: number | null
          cargo_weight_kg?: number | null
          cost_center_id?: string | null
          created_at?: string
          drop_geofence_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          passenger_count?: number
          pickup_at?: string
          pickup_geofence_id?: string | null
          preferred_driver_id?: string | null
          priority?: string | null
          purpose?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          request_number?: string
          requester_id?: string
          required_class?: string | null
          return_at?: string
          sla_deadline_at?: string | null
          special_requirements?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_requests_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_drop_geofence_id_fkey"
            columns: ["drop_geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_pickup_geofence_id_fkey"
            columns: ["pickup_geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_preferred_driver_id_fkey"
            columns: ["preferred_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          drop_geofence_id: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          notes: string | null
          organization_id: string
          passengers: number | null
          pickup_geofence_id: string | null
          purpose: string
          recurrence_pattern: Json | null
          required_class: string | null
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          drop_geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          organization_id: string
          passengers?: number | null
          pickup_geofence_id?: string | null
          purpose: string
          recurrence_pattern?: Json | null
          required_class?: string | null
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          drop_geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          organization_id?: string
          passengers?: number | null
          pickup_geofence_id?: string | null
          purpose?: string
          recurrence_pattern?: Json | null
          required_class?: string | null
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avg_speed_kmh: number | null
          created_at: string
          distance_km: number | null
          driver_id: string | null
          duration_minutes: number | null
          end_fuel_level: number | null
          end_location: Json | null
          end_odometer: number | null
          end_time: string | null
          exception_notes: string | null
          fuel_consumed_liters: number | null
          fuel_efficiency_kmpl: number | null
          harsh_events_count: number | null
          id: string
          idle_time_minutes: number | null
          max_speed_kmh: number | null
          notes: string | null
          organization_id: string
          speeding_events_count: number | null
          start_fuel_level: number | null
          start_location: Json | null
          start_odometer: number | null
          start_time: string
          status: string | null
          stops_count: number | null
          trip_type: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          duration_minutes?: number | null
          end_fuel_level?: number | null
          end_location?: Json | null
          end_odometer?: number | null
          end_time?: string | null
          exception_notes?: string | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_kmpl?: number | null
          harsh_events_count?: number | null
          id?: string
          idle_time_minutes?: number | null
          max_speed_kmh?: number | null
          notes?: string | null
          organization_id: string
          speeding_events_count?: number | null
          start_fuel_level?: number | null
          start_location?: Json | null
          start_odometer?: number | null
          start_time: string
          status?: string | null
          stops_count?: number | null
          trip_type?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          duration_minutes?: number | null
          end_fuel_level?: number | null
          end_location?: Json | null
          end_odometer?: number | null
          end_time?: string | null
          exception_notes?: string | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_kmpl?: number | null
          harsh_events_count?: number | null
          id?: string
          idle_time_minutes?: number | null
          max_speed_kmh?: number | null
          notes?: string | null
          organization_id?: string
          speeding_events_count?: number | null
          start_fuel_level?: number | null
          start_location?: Json | null
          start_odometer?: number | null
          start_time?: string
          status?: string | null
          stops_count?: number | null
          trip_type?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_settings: {
        Row: {
          backup_codes: Json | null
          created_at: string
          id: string
          is_enabled: boolean
          last_used_at: string | null
          method: string
          organization_id: string
          secret_encrypted: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_used_at?: string | null
          method?: string
          organization_id: string
          secret_encrypted?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_used_at?: string | null
          method?: string
          organization_id?: string
          secret_encrypted?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          is_enabled: boolean | null
          last_verified_at: string | null
          method: string | null
          phone_number: string | null
          secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          phone_number?: string | null
          secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          last_verified_at?: string | null
          method?: string | null
          phone_number?: string | null
          secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          effect: string
          id: string
          organization_id: string | null
          permission_id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effect: string
          id?: string
          organization_id?: string | null
          permission_id: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effect?: string
          id?: string
          organization_id?: string | null
          permission_id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_unit_id: string | null
          created_at: string
          depot_id: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_unit_id?: string | null
          created_at?: string
          depot_id?: string | null
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_unit_id?: string | null
          created_at?: string
          depot_id?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active_at: string | null
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vehicle_calendar: {
        Row: {
          created_at: string
          end_time: string
          id: string
          notes: string | null
          organization_id: string
          start_time: string
          status: string | null
          trip_assignment_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          organization_id: string
          start_time: string
          status?: string | null
          trip_assignment_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          organization_id?: string
          start_time?: string
          status?: string | null
          trip_assignment_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_calendar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_calendar_trip_assignment_id_fkey"
            columns: ["trip_assignment_id"]
            isOneToOne: false
            referencedRelation: "trip_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_calendar_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_costs: {
        Row: {
          amount: number
          category: string | null
          cost_center_id: string | null
          cost_date: string
          cost_type: string
          created_at: string
          description: string | null
          id: string
          notes: string | null
          odometer_km: number | null
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          vehicle_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          cost_center_id?: string | null
          cost_date: string
          cost_type: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          vehicle_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          cost_center_id?: string | null
          cost_date?: string
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_costs_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_dtc_codes: {
        Row: {
          cleared_at: string | null
          cleared_by: string | null
          created_at: string
          description: string | null
          dtc_code: string
          first_detected_at: string
          id: string
          is_active: boolean | null
          last_detected_at: string
          notes: string | null
          occurrence_count: number | null
          organization_id: string
          severity: string
          system: string | null
          vehicle_id: string
          work_order_id: string | null
        }
        Insert: {
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          description?: string | null
          dtc_code: string
          first_detected_at?: string
          id?: string
          is_active?: boolean | null
          last_detected_at?: string
          notes?: string | null
          occurrence_count?: number | null
          organization_id: string
          severity?: string
          system?: string | null
          vehicle_id: string
          work_order_id?: string | null
        }
        Update: {
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          description?: string | null
          dtc_code?: string
          first_detected_at?: string
          id?: string
          is_active?: boolean | null
          last_detected_at?: string
          notes?: string | null
          occurrence_count?: number | null
          organization_id?: string
          severity?: string
          system?: string | null
          vehicle_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_dtc_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_dtc_codes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_dtc_codes_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_geofence_states: {
        Row: {
          created_at: string
          entered_at: string
          geofence_id: string
          id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          entered_at?: string
          geofence_id: string
          id?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          entered_at?: string
          geofence_id?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_geofence_states_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_geofence_states_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_handover_catalog_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          default_qty: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_qty?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_qty?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_handover_catalog_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_health_scores: {
        Row: {
          body_score: number | null
          brakes_score: number | null
          created_at: string
          days_until_next_service: number | null
          electrical_score: number | null
          engine_score: number | null
          id: string
          organization_id: string
          overall_score: number
          predicted_issues: string[] | null
          recommendations: string[] | null
          risk_level: string
          score_date: string
          tires_score: number | null
          transmission_score: number | null
          vehicle_id: string
        }
        Insert: {
          body_score?: number | null
          brakes_score?: number | null
          created_at?: string
          days_until_next_service?: number | null
          electrical_score?: number | null
          engine_score?: number | null
          id?: string
          organization_id: string
          overall_score?: number
          predicted_issues?: string[] | null
          recommendations?: string[] | null
          risk_level?: string
          score_date?: string
          tires_score?: number | null
          transmission_score?: number | null
          vehicle_id: string
        }
        Update: {
          body_score?: number | null
          brakes_score?: number | null
          created_at?: string
          days_until_next_service?: number | null
          electrical_score?: number | null
          engine_score?: number | null
          id?: string
          organization_id?: string
          overall_score?: number
          predicted_issues?: string[] | null
          recommendations?: string[] | null
          risk_level?: string
          score_date?: string
          tires_score?: number | null
          transmission_score?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_health_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_health_scores_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          bolo_certificate_url: string | null
          certified_safe: boolean | null
          checklist_data: Json | null
          closed_by_initiator: string | null
          closed_by_initiator_at: string | null
          created_at: string
          defects_found: Json | null
          driver_id: string | null
          id: string
          inspection_center: string | null
          inspection_center_supplier_id: string | null
          inspection_date: string
          inspection_type: string
          inspector_signature_url: string | null
          location_lat: number | null
          location_lng: number | null
          maintenance_request_id: string | null
          mechanic_notes: string | null
          mechanic_signature_url: string | null
          odometer_km: number | null
          official_receipt_url: string | null
          organization_id: string
          outsource_po_id: string | null
          outsource_stage: string | null
          overall_condition: string | null
          photo_urls: string[] | null
          plate_sticker_number: string | null
          registration_cost: number | null
          registration_date: string | null
          registration_valid_until: string | null
          repaired_at: string | null
          status: string
          updated_at: string
          vehicle_id: string
          work_order_created: boolean | null
          work_order_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          bolo_certificate_url?: string | null
          certified_safe?: boolean | null
          checklist_data?: Json | null
          closed_by_initiator?: string | null
          closed_by_initiator_at?: string | null
          created_at?: string
          defects_found?: Json | null
          driver_id?: string | null
          id?: string
          inspection_center?: string | null
          inspection_center_supplier_id?: string | null
          inspection_date?: string
          inspection_type?: string
          inspector_signature_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          maintenance_request_id?: string | null
          mechanic_notes?: string | null
          mechanic_signature_url?: string | null
          odometer_km?: number | null
          official_receipt_url?: string | null
          organization_id: string
          outsource_po_id?: string | null
          outsource_stage?: string | null
          overall_condition?: string | null
          photo_urls?: string[] | null
          plate_sticker_number?: string | null
          registration_cost?: number | null
          registration_date?: string | null
          registration_valid_until?: string | null
          repaired_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
          work_order_created?: boolean | null
          work_order_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          bolo_certificate_url?: string | null
          certified_safe?: boolean | null
          checklist_data?: Json | null
          closed_by_initiator?: string | null
          closed_by_initiator_at?: string | null
          created_at?: string
          defects_found?: Json | null
          driver_id?: string | null
          id?: string
          inspection_center?: string | null
          inspection_center_supplier_id?: string | null
          inspection_date?: string
          inspection_type?: string
          inspector_signature_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          maintenance_request_id?: string | null
          mechanic_notes?: string | null
          mechanic_signature_url?: string | null
          odometer_km?: number | null
          official_receipt_url?: string | null
          organization_id?: string
          outsource_po_id?: string | null
          outsource_stage?: string | null
          overall_condition?: string | null
          photo_urls?: string[] | null
          plate_sticker_number?: string | null
          registration_cost?: number | null
          registration_date?: string | null
          registration_valid_until?: string | null
          repaired_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
          work_order_created?: boolean | null
          work_order_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_insurance: {
        Row: {
          auto_renewal: boolean | null
          coverage_amount: number | null
          created_at: string
          expiry_date: string
          id: string
          insurance_type: string | null
          notes: string | null
          organization_id: string
          policy_number: string
          premium_amount: number | null
          provider: string
          start_date: string
          status: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          auto_renewal?: boolean | null
          coverage_amount?: number | null
          created_at?: string
          expiry_date: string
          id?: string
          insurance_type?: string | null
          notes?: string | null
          organization_id: string
          policy_number: string
          premium_amount?: number | null
          provider: string
          start_date: string
          status?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          auto_renewal?: boolean | null
          coverage_amount?: number | null
          created_at?: string
          expiry_date?: string
          id?: string
          insurance_type?: string | null
          notes?: string | null
          organization_id?: string
          policy_number?: string
          premium_amount?: number | null
          provider?: string
          start_date?: string
          status?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_insurance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_insurance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_owners: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          contact_person: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          govt_id_business_reg: string | null
          id: string
          organization_id: string
          owner_type: string
          phone: string | null
          region: string | null
          risk_level: string | null
          status: string | null
          tax_id_vat: string | null
          updated_at: string
          woreda: string | null
          zone: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          govt_id_business_reg?: string | null
          id?: string
          organization_id: string
          owner_type?: string
          phone?: string | null
          region?: string | null
          risk_level?: string | null
          status?: string | null
          tax_id_vat?: string | null
          updated_at?: string
          woreda?: string | null
          zone?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          contact_person?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          govt_id_business_reg?: string | null
          id?: string
          organization_id?: string
          owner_type?: string
          phone?: string | null
          region?: string | null
          risk_level?: string | null
          status?: string | null
          tax_id_vat?: string | null
          updated_at?: string
          woreda?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_owners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_recall_status: {
        Row: {
          completed_date: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          recall_id: string
          scheduled_date: string | null
          status: string
          updated_at: string
          vehicle_id: string
          work_order_id: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          recall_id: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
          work_order_id?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          recall_id?: string
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_recall_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recall_status_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "vehicle_recalls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recall_status_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recall_status_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_recalls: {
        Row: {
          affected_component: string | null
          campaign_name: string
          completed_date: string | null
          created_at: string
          deadline_date: string | null
          description: string | null
          id: string
          manufacturer: string | null
          notes: string | null
          organization_id: string
          recall_date: string | null
          recall_number: string
          severity: string | null
          status: string | null
          updated_at: string
          vehicle_id: string | null
          work_order_id: string | null
        }
        Insert: {
          affected_component?: string | null
          campaign_name: string
          completed_date?: string | null
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          id?: string
          manufacturer?: string | null
          notes?: string | null
          organization_id: string
          recall_date?: string | null
          recall_number: string
          severity?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          affected_component?: string | null
          campaign_name?: string
          completed_date?: string | null
          created_at?: string
          deadline_date?: string | null
          description?: string | null
          id?: string
          manufacturer?: string | null
          notes?: string | null
          organization_id?: string
          recall_date?: string | null
          recall_number?: string
          severity?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_recalls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recalls_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recalls_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_request_approvals: {
        Row: {
          approval_level: number | null
          approver_id: string
          approver_name: string
          comments: string | null
          created_at: string
          decision_at: string | null
          delegated_from: string | null
          delegated_from_name: string | null
          id: string
          notification_channel: string | null
          notification_sent: boolean | null
          organization_id: string
          request_id: string
          status: string | null
        }
        Insert: {
          approval_level?: number | null
          approver_id: string
          approver_name: string
          comments?: string | null
          created_at?: string
          decision_at?: string | null
          delegated_from?: string | null
          delegated_from_name?: string | null
          id?: string
          notification_channel?: string | null
          notification_sent?: boolean | null
          organization_id: string
          request_id: string
          status?: string | null
        }
        Update: {
          approval_level?: number | null
          approver_id?: string
          approver_name?: string
          comments?: string | null
          created_at?: string
          decision_at?: string | null
          delegated_from?: string | null
          delegated_from_name?: string | null
          id?: string
          notification_channel?: string | null
          notification_sent?: boolean | null
          organization_id?: string
          request_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_request_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_request_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          checkin_odometer: number | null
          checkout_odometer: number | null
          created_at: string
          driver_checked_in_at: string | null
          driver_checked_out_at: string | null
          driver_id: string | null
          id: string
          notes: string | null
          organization_id: string
          status: string
          updated_at: string
          vehicle_id: string
          vehicle_request_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          checkin_odometer?: number | null
          checkout_odometer?: number | null
          created_at?: string
          driver_checked_in_at?: string | null
          driver_checked_out_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          vehicle_id: string
          vehicle_request_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          checkin_odometer?: number | null
          checkout_odometer?: number | null
          created_at?: string
          driver_checked_in_at?: string | null
          driver_checked_out_at?: string | null
          driver_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_request_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_assignments_vehicle_request_id_fkey"
            columns: ["vehicle_request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_request_comments: {
        Row: {
          author_id: string
          author_name: string | null
          author_role: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          organization_id: string
          request_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          author_role?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          organization_id: string
          request_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          author_role?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          organization_id?: string
          request_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_request_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_comments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_request_ratings: {
        Row: {
          comment: string | null
          created_at: string
          dispute_flagged: boolean
          dispute_reason: string | null
          dispute_resolution_notes: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by: string | null
          driver_id: string | null
          driver_score: number | null
          id: string
          organization_id: string
          overall_score: number | null
          punctuality_score: number | null
          rated_by: string
          updated_at: string
          vehicle_id: string | null
          vehicle_request_id: string
          vehicle_score: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dispute_flagged?: boolean
          dispute_reason?: string | null
          dispute_resolution_notes?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          driver_id?: string | null
          driver_score?: number | null
          id?: string
          organization_id: string
          overall_score?: number | null
          punctuality_score?: number | null
          rated_by: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_request_id: string
          vehicle_score?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          dispute_flagged?: boolean
          dispute_reason?: string | null
          dispute_resolution_notes?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          driver_id?: string | null
          driver_score?: number | null
          id?: string
          organization_id?: string
          overall_score?: number | null
          punctuality_score?: number | null
          rated_by?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_request_id?: string
          vehicle_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_request_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_ratings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_ratings_vehicle_request_id_fkey"
            columns: ["vehicle_request_id"]
            isOneToOne: true
            referencedRelation: "vehicle_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_request_stops: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          organization_id: string
          sequence: number
          updated_at: string
          vehicle_request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          organization_id: string
          sequence: number
          updated_at?: string
          vehicle_request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          sequence?: number
          updated_at?: string
          vehicle_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_request_stops_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_request_stops_vehicle_request_id_fkey"
            columns: ["vehicle_request_id"]
            isOneToOne: false
            referencedRelation: "vehicle_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_requests: {
        Row: {
          actual_assignment_minutes: number | null
          approval_routed_to: string | null
          approval_status: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_driver_id: string | null
          assigned_vehicle_id: string | null
          auto_closed: boolean | null
          auto_closed_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cargo_load: string | null
          cargo_weight_kg: number | null
          check_in_at: string | null
          check_in_by: string | null
          completed_at: string | null
          created_at: string
          cross_pool_assignment: boolean | null
          current_workflow_stage: string | null
          deallocated_at: string | null
          deallocated_by: string | null
          deallocation_count: number
          deallocation_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          department_id: string | null
          department_name: string | null
          departure_lat: number | null
          departure_lng: number | null
          departure_place: string | null
          destination: string | null
          destination_geofence_id: string | null
          destination_lat: number | null
          destination_lng: number | null
          dispatcher_notes: string | null
          distance_estimate_km: number | null
          distance_log_km: number | null
          driver_checked_in_at: string | null
          driver_checked_out_at: string | null
          driver_checkin_notes: string | null
          driver_checkin_odometer: number | null
          driver_checkout_notes: string | null
          driver_checkout_odometer: number | null
          driver_rating: number | null
          end_time: string | null
          filed_by_name: string | null
          filed_by_user_id: string | null
          filed_on_behalf: boolean
          id: string
          kpi_target_minutes: number | null
          needed_from: string
          needed_until: string | null
          num_vehicles: number | null
          organization_id: string
          original_pool_name: string | null
          passengers: number | null
          pool_category: string | null
          pool_location: string | null
          pool_name: string | null
          pool_review_conditions: string | null
          pool_review_decision: string | null
          pool_review_notes: string | null
          pool_review_status: string | null
          pool_reviewed_at: string | null
          pool_reviewer_id: string | null
          priority: string | null
          project_number: string | null
          punctuality_rating: number | null
          purpose: string
          purpose_category: string | null
          rated_at: string | null
          rating_comment: string | null
          recommended_vehicle_type: string | null
          rejection_reason: string | null
          request_number: string
          request_type: string | null
          requester_confirmation_notes: string | null
          requester_confirmed_at: string | null
          requester_confirmed_by: string | null
          requester_feedback: string | null
          requester_id: string
          requester_name: string
          requester_rating: number | null
          sms_notification_sent: boolean | null
          sms_sent_at: string | null
          start_time: string | null
          status: string | null
          trip_duration_days: number | null
          trip_type: string | null
          updated_at: string
          vehicle_rating: number | null
          vehicle_type: string | null
          vehicle_type_justification: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          actual_assignment_minutes?: number | null
          approval_routed_to?: string | null
          approval_status?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          auto_closed?: boolean | null
          auto_closed_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cargo_load?: string | null
          cargo_weight_kg?: number | null
          check_in_at?: string | null
          check_in_by?: string | null
          completed_at?: string | null
          created_at?: string
          cross_pool_assignment?: boolean | null
          current_workflow_stage?: string | null
          deallocated_at?: string | null
          deallocated_by?: string | null
          deallocation_count?: number
          deallocation_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department_id?: string | null
          department_name?: string | null
          departure_lat?: number | null
          departure_lng?: number | null
          departure_place?: string | null
          destination?: string | null
          destination_geofence_id?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          dispatcher_notes?: string | null
          distance_estimate_km?: number | null
          distance_log_km?: number | null
          driver_checked_in_at?: string | null
          driver_checked_out_at?: string | null
          driver_checkin_notes?: string | null
          driver_checkin_odometer?: number | null
          driver_checkout_notes?: string | null
          driver_checkout_odometer?: number | null
          driver_rating?: number | null
          end_time?: string | null
          filed_by_name?: string | null
          filed_by_user_id?: string | null
          filed_on_behalf?: boolean
          id?: string
          kpi_target_minutes?: number | null
          needed_from: string
          needed_until?: string | null
          num_vehicles?: number | null
          organization_id: string
          original_pool_name?: string | null
          passengers?: number | null
          pool_category?: string | null
          pool_location?: string | null
          pool_name?: string | null
          pool_review_conditions?: string | null
          pool_review_decision?: string | null
          pool_review_notes?: string | null
          pool_review_status?: string | null
          pool_reviewed_at?: string | null
          pool_reviewer_id?: string | null
          priority?: string | null
          project_number?: string | null
          punctuality_rating?: number | null
          purpose: string
          purpose_category?: string | null
          rated_at?: string | null
          rating_comment?: string | null
          recommended_vehicle_type?: string | null
          rejection_reason?: string | null
          request_number: string
          request_type?: string | null
          requester_confirmation_notes?: string | null
          requester_confirmed_at?: string | null
          requester_confirmed_by?: string | null
          requester_feedback?: string | null
          requester_id: string
          requester_name: string
          requester_rating?: number | null
          sms_notification_sent?: boolean | null
          sms_sent_at?: string | null
          start_time?: string | null
          status?: string | null
          trip_duration_days?: number | null
          trip_type?: string | null
          updated_at?: string
          vehicle_rating?: number | null
          vehicle_type?: string | null
          vehicle_type_justification?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          actual_assignment_minutes?: number | null
          approval_routed_to?: string | null
          approval_status?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_driver_id?: string | null
          assigned_vehicle_id?: string | null
          auto_closed?: boolean | null
          auto_closed_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cargo_load?: string | null
          cargo_weight_kg?: number | null
          check_in_at?: string | null
          check_in_by?: string | null
          completed_at?: string | null
          created_at?: string
          cross_pool_assignment?: boolean | null
          current_workflow_stage?: string | null
          deallocated_at?: string | null
          deallocated_by?: string | null
          deallocation_count?: number
          deallocation_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department_id?: string | null
          department_name?: string | null
          departure_lat?: number | null
          departure_lng?: number | null
          departure_place?: string | null
          destination?: string | null
          destination_geofence_id?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          dispatcher_notes?: string | null
          distance_estimate_km?: number | null
          distance_log_km?: number | null
          driver_checked_in_at?: string | null
          driver_checked_out_at?: string | null
          driver_checkin_notes?: string | null
          driver_checkin_odometer?: number | null
          driver_checkout_notes?: string | null
          driver_checkout_odometer?: number | null
          driver_rating?: number | null
          end_time?: string | null
          filed_by_name?: string | null
          filed_by_user_id?: string | null
          filed_on_behalf?: boolean
          id?: string
          kpi_target_minutes?: number | null
          needed_from?: string
          needed_until?: string | null
          num_vehicles?: number | null
          organization_id?: string
          original_pool_name?: string | null
          passengers?: number | null
          pool_category?: string | null
          pool_location?: string | null
          pool_name?: string | null
          pool_review_conditions?: string | null
          pool_review_decision?: string | null
          pool_review_notes?: string | null
          pool_review_status?: string | null
          pool_reviewed_at?: string | null
          pool_reviewer_id?: string | null
          priority?: string | null
          project_number?: string | null
          punctuality_rating?: number | null
          purpose?: string
          purpose_category?: string | null
          rated_at?: string | null
          rating_comment?: string | null
          recommended_vehicle_type?: string | null
          rejection_reason?: string | null
          request_number?: string
          request_type?: string | null
          requester_confirmation_notes?: string | null
          requester_confirmed_at?: string | null
          requester_confirmed_by?: string | null
          requester_feedback?: string | null
          requester_id?: string
          requester_name?: string
          requester_rating?: number | null
          sms_notification_sent?: boolean | null
          sms_sent_at?: string | null
          start_time?: string | null
          status?: string | null
          trip_duration_days?: number | null
          trip_type?: string | null
          updated_at?: string
          vehicle_rating?: number | null
          vehicle_type?: string | null
          vehicle_type_justification?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_requests_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_requests_destination_geofence_id_fkey"
            columns: ["destination_geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_requests_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_restricted_hours: {
        Row: {
          active_days: number[]
          allowed_end_time: string
          allowed_start_time: string
          created_at: string
          created_by: string | null
          engine_lock_enabled: boolean | null
          id: string
          is_enabled: boolean
          lock_delay_seconds: number | null
          notes: string | null
          organization_id: string
          send_warning_first: boolean | null
          updated_at: string
          vehicle_id: string
          warning_message: string | null
        }
        Insert: {
          active_days?: number[]
          allowed_end_time?: string
          allowed_start_time?: string
          created_at?: string
          created_by?: string | null
          engine_lock_enabled?: boolean | null
          id?: string
          is_enabled?: boolean
          lock_delay_seconds?: number | null
          notes?: string | null
          organization_id: string
          send_warning_first?: boolean | null
          updated_at?: string
          vehicle_id: string
          warning_message?: string | null
        }
        Update: {
          active_days?: number[]
          allowed_end_time?: string
          allowed_start_time?: string
          created_at?: string
          created_by?: string | null
          engine_lock_enabled?: boolean | null
          id?: string
          is_enabled?: boolean
          lock_delay_seconds?: number | null
          notes?: string | null
          organization_id?: string
          send_warning_first?: boolean | null
          updated_at?: string
          vehicle_id?: string
          warning_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_restricted_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_restricted_hours_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_telemetry: {
        Row: {
          altitude_meters: number | null
          battery_voltage: number | null
          can_data: Json | null
          created_at: string
          device_connected: boolean | null
          driver_rfid: string | null
          dtc_codes: Json | null
          engine_hours: number | null
          engine_on: boolean | null
          external_voltage: number | null
          fuel_level_percent: number | null
          gps_fix_type: string | null
          gps_hdop: number | null
          gps_jamming_detected: boolean | null
          gps_satellites_count: number | null
          gps_signal_strength: number | null
          gps_spoofing_detected: boolean | null
          gsm_signal_strength: number | null
          harsh_acceleration: boolean | null
          harsh_braking: boolean | null
          harsh_cornering: boolean | null
          heading: number | null
          id: string
          ignition_on: boolean | null
          io_elements: Json | null
          last_communication_at: string | null
          latitude: number | null
          longitude: number | null
          odometer_km: number | null
          organization_id: string
          speed_kmh: number | null
          temperature_1: number | null
          temperature_2: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          altitude_meters?: number | null
          battery_voltage?: number | null
          can_data?: Json | null
          created_at?: string
          device_connected?: boolean | null
          driver_rfid?: string | null
          dtc_codes?: Json | null
          engine_hours?: number | null
          engine_on?: boolean | null
          external_voltage?: number | null
          fuel_level_percent?: number | null
          gps_fix_type?: string | null
          gps_hdop?: number | null
          gps_jamming_detected?: boolean | null
          gps_satellites_count?: number | null
          gps_signal_strength?: number | null
          gps_spoofing_detected?: boolean | null
          gsm_signal_strength?: number | null
          harsh_acceleration?: boolean | null
          harsh_braking?: boolean | null
          harsh_cornering?: boolean | null
          heading?: number | null
          id?: string
          ignition_on?: boolean | null
          io_elements?: Json | null
          last_communication_at?: string | null
          latitude?: number | null
          longitude?: number | null
          odometer_km?: number | null
          organization_id: string
          speed_kmh?: number | null
          temperature_1?: number | null
          temperature_2?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          altitude_meters?: number | null
          battery_voltage?: number | null
          can_data?: Json | null
          created_at?: string
          device_connected?: boolean | null
          driver_rfid?: string | null
          dtc_codes?: Json | null
          engine_hours?: number | null
          engine_on?: boolean | null
          external_voltage?: number | null
          fuel_level_percent?: number | null
          gps_fix_type?: string | null
          gps_hdop?: number | null
          gps_jamming_detected?: boolean | null
          gps_satellites_count?: number | null
          gps_signal_strength?: number | null
          gps_spoofing_detected?: boolean | null
          gsm_signal_strength?: number | null
          harsh_acceleration?: boolean | null
          harsh_braking?: boolean | null
          harsh_cornering?: boolean | null
          heading?: number | null
          id?: string
          ignition_on?: boolean | null
          io_elements?: Json | null
          last_communication_at?: string | null
          latitude?: number | null
          longitude?: number | null
          odometer_km?: number | null
          organization_id?: string
          speed_kmh?: number | null
          temperature_1?: number | null
          temperature_2?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_telemetry_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_tires: {
        Row: {
          brand: string | null
          condition: string | null
          created_at: string
          dot_code: string | null
          expected_life_km: number | null
          id: string
          install_date: string | null
          install_odometer: number | null
          last_inspection_date: string | null
          model: string | null
          notes: string | null
          organization_id: string
          position: string
          pressure_psi: number | null
          size: string | null
          tread_depth_mm: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          dot_code?: string | null
          expected_life_km?: number | null
          id?: string
          install_date?: string | null
          install_odometer?: number | null
          last_inspection_date?: string | null
          model?: string | null
          notes?: string | null
          organization_id: string
          position: string
          pressure_psi?: number | null
          size?: string | null
          tread_depth_mm?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          brand?: string | null
          condition?: string | null
          created_at?: string
          dot_code?: string | null
          expected_life_km?: number | null
          id?: string
          install_date?: string | null
          install_odometer?: number | null
          last_inspection_date?: string | null
          model?: string | null
          notes?: string | null
          organization_id?: string
          position?: string
          pressure_psi?: number | null
          size?: string | null
          tread_depth_mm?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_tires_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_tires_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_warranties: {
        Row: {
          coverage_details: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          max_mileage_km: number | null
          organization_id: string
          policy_number: string | null
          provider: string | null
          start_date: string | null
          updated_at: string
          vehicle_id: string
          warranty_type: string
        }
        Insert: {
          coverage_details?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_mileage_km?: number | null
          organization_id: string
          policy_number?: string | null
          provider?: string | null
          start_date?: string | null
          updated_at?: string
          vehicle_id: string
          warranty_type: string
        }
        Update: {
          coverage_details?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_mileage_km?: number | null
          organization_id?: string
          policy_number?: string | null
          provider?: string | null
          start_date?: string | null
          updated_at?: string
          vehicle_id?: string
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_warranties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_warranties_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          assigned_driver_id: string | null
          assigned_location: string | null
          awaiting_post_trip_inspection_id: string | null
          capacity_kg: number | null
          capacity_volume: number | null
          color: string | null
          commercial_permit: boolean | null
          created_at: string
          current_condition: string | null
          current_market_price: number | null
          current_value: number | null
          depot_id: string | null
          depreciation_rate: number | null
          drive_type: string | null
          engine_cc: number | null
          engine_hours: number | null
          engine_number: string | null
          fuel_standard_km_per_liter: number | null
          fuel_type: string
          gps_device_id: string | null
          gps_installed: boolean | null
          id: string
          insurance_cert_url: string | null
          insurance_expiry: string | null
          insurance_policy_no: string | null
          is_active: boolean | null
          lifecycle_stage: string | null
          loading_capacity_quintal: number | null
          make: string
          mfg_date: string | null
          model: string
          model_code: string | null
          notes: string | null
          odometer_km: number | null
          organization_id: string
          owner_certificate_url: string | null
          owner_id: string | null
          ownership_type: string | null
          permit_expiry: string | null
          photo_back_url: string | null
          photo_extras_urls: string[]
          photo_front_url: string | null
          photo_left_url: string | null
          photo_right_url: string | null
          plate_number: string
          purchasing_price: number | null
          purpose_for: string | null
          registration_cert_no: string | null
          registration_expiry: string | null
          rental_contract_number: string | null
          rental_daily_rate: number | null
          rental_end_date: string | null
          rental_provider: string | null
          rental_start_date: string | null
          route_type: string | null
          safety_comfort_category: string | null
          seating_capacity: number | null
          specific_location: string | null
          specific_pool: string | null
          speed_cutoff_enabled: boolean | null
          speed_cutoff_grace_seconds: number | null
          speed_cutoff_limit_kmh: number | null
          speed_governor_bypass_alert: boolean | null
          status: string
          tank_capacity_liters: number | null
          tax_clearance_url: string | null
          temperature_control: string | null
          total_downtime_hours: number | null
          total_fuel_cost: number | null
          total_maintenance_cost: number | null
          transmission_type: string | null
          updated_at: string
          vehicle_category: string | null
          vehicle_group: string | null
          vehicle_type: string | null
          vin: string | null
          year: number
          year_of_ownership: number | null
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          assigned_driver_id?: string | null
          assigned_location?: string | null
          awaiting_post_trip_inspection_id?: string | null
          capacity_kg?: number | null
          capacity_volume?: number | null
          color?: string | null
          commercial_permit?: boolean | null
          created_at?: string
          current_condition?: string | null
          current_market_price?: number | null
          current_value?: number | null
          depot_id?: string | null
          depreciation_rate?: number | null
          drive_type?: string | null
          engine_cc?: number | null
          engine_hours?: number | null
          engine_number?: string | null
          fuel_standard_km_per_liter?: number | null
          fuel_type: string
          gps_device_id?: string | null
          gps_installed?: boolean | null
          id?: string
          insurance_cert_url?: string | null
          insurance_expiry?: string | null
          insurance_policy_no?: string | null
          is_active?: boolean | null
          lifecycle_stage?: string | null
          loading_capacity_quintal?: number | null
          make: string
          mfg_date?: string | null
          model: string
          model_code?: string | null
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          owner_certificate_url?: string | null
          owner_id?: string | null
          ownership_type?: string | null
          permit_expiry?: string | null
          photo_back_url?: string | null
          photo_extras_urls?: string[]
          photo_front_url?: string | null
          photo_left_url?: string | null
          photo_right_url?: string | null
          plate_number: string
          purchasing_price?: number | null
          purpose_for?: string | null
          registration_cert_no?: string | null
          registration_expiry?: string | null
          rental_contract_number?: string | null
          rental_daily_rate?: number | null
          rental_end_date?: string | null
          rental_provider?: string | null
          rental_start_date?: string | null
          route_type?: string | null
          safety_comfort_category?: string | null
          seating_capacity?: number | null
          specific_location?: string | null
          specific_pool?: string | null
          speed_cutoff_enabled?: boolean | null
          speed_cutoff_grace_seconds?: number | null
          speed_cutoff_limit_kmh?: number | null
          speed_governor_bypass_alert?: boolean | null
          status?: string
          tank_capacity_liters?: number | null
          tax_clearance_url?: string | null
          temperature_control?: string | null
          total_downtime_hours?: number | null
          total_fuel_cost?: number | null
          total_maintenance_cost?: number | null
          transmission_type?: string | null
          updated_at?: string
          vehicle_category?: string | null
          vehicle_group?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year: number
          year_of_ownership?: number | null
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          assigned_driver_id?: string | null
          assigned_location?: string | null
          awaiting_post_trip_inspection_id?: string | null
          capacity_kg?: number | null
          capacity_volume?: number | null
          color?: string | null
          commercial_permit?: boolean | null
          created_at?: string
          current_condition?: string | null
          current_market_price?: number | null
          current_value?: number | null
          depot_id?: string | null
          depreciation_rate?: number | null
          drive_type?: string | null
          engine_cc?: number | null
          engine_hours?: number | null
          engine_number?: string | null
          fuel_standard_km_per_liter?: number | null
          fuel_type?: string
          gps_device_id?: string | null
          gps_installed?: boolean | null
          id?: string
          insurance_cert_url?: string | null
          insurance_expiry?: string | null
          insurance_policy_no?: string | null
          is_active?: boolean | null
          lifecycle_stage?: string | null
          loading_capacity_quintal?: number | null
          make?: string
          mfg_date?: string | null
          model?: string
          model_code?: string | null
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          owner_certificate_url?: string | null
          owner_id?: string | null
          ownership_type?: string | null
          permit_expiry?: string | null
          photo_back_url?: string | null
          photo_extras_urls?: string[]
          photo_front_url?: string | null
          photo_left_url?: string | null
          photo_right_url?: string | null
          plate_number?: string
          purchasing_price?: number | null
          purpose_for?: string | null
          registration_cert_no?: string | null
          registration_expiry?: string | null
          rental_contract_number?: string | null
          rental_daily_rate?: number | null
          rental_end_date?: string | null
          rental_provider?: string | null
          rental_start_date?: string | null
          route_type?: string | null
          safety_comfort_category?: string | null
          seating_capacity?: number | null
          specific_location?: string | null
          specific_pool?: string | null
          speed_cutoff_enabled?: boolean | null
          speed_cutoff_grace_seconds?: number | null
          speed_cutoff_limit_kmh?: number | null
          speed_governor_bypass_alert?: boolean | null
          status?: string
          tank_capacity_liters?: number | null
          tax_clearance_url?: string | null
          temperature_control?: string | null
          total_downtime_hours?: number | null
          total_fuel_cost?: number | null
          total_maintenance_cost?: number | null
          transmission_type?: string | null
          updated_at?: string
          vehicle_category?: string | null
          vehicle_group?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number
          year_of_ownership?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_awaiting_post_trip_inspection_id_fkey"
            columns: ["awaiting_post_trip_inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_depot_id_fkey"
            columns: ["depot_id"]
            isOneToOne: false
            referencedRelation: "depots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vehicle_owners"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          rating: number | null
          total_jobs: number | null
          updated_at: string
          vendor_type: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          rating?: number | null
          total_jobs?: number | null
          updated_at?: string
          vendor_type: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          rating?: number | null
          total_jobs?: number | null
          updated_at?: string
          vendor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          approval_date: string | null
          approved_amount: number | null
          attachments: string[] | null
          claim_date: string
          claim_number: string | null
          claimed_amount: number
          created_at: string
          denial_reason: string | null
          id: string
          issue_description: string
          notes: string | null
          organization_id: string
          payment_date: string | null
          repair_description: string | null
          status: string
          submission_date: string | null
          updated_at: string
          vehicle_id: string
          warranty_id: string
          work_order_id: string | null
        }
        Insert: {
          approval_date?: string | null
          approved_amount?: number | null
          attachments?: string[] | null
          claim_date?: string
          claim_number?: string | null
          claimed_amount?: number
          created_at?: string
          denial_reason?: string | null
          id?: string
          issue_description: string
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          repair_description?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string
          vehicle_id: string
          warranty_id: string
          work_order_id?: string | null
        }
        Update: {
          approval_date?: string | null
          approved_amount?: number | null
          attachments?: string[] | null
          claim_date?: string
          claim_number?: string | null
          claimed_amount?: number
          created_at?: string
          denial_reason?: string | null
          id?: string
          issue_description?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          repair_description?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string
          vehicle_id?: string
          warranty_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "vehicle_warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number | null
          created_at: string
          error_message: string | null
          event_data: Json
          event_type: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          response_body: string | null
          response_status: number | null
          status: string
          subscription_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          error_message?: string | null
          event_data: Json
          event_type: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          response_body?: string | null
          response_status?: number | null
          status: string
          subscription_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          error_message?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          response_body?: string | null
          response_status?: number | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string
          created_by: string
          events: string[]
          headers: Json | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          retry_config: Json | null
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          events: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          retry_config?: Json | null
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          retry_config?: Json | null
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wo_supplier_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          organization_id: string
          read_at: string | null
          sender_id: string | null
          sender_name: string
          sender_type: string
          work_order_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          organization_id: string
          read_at?: string | null
          sender_id?: string | null
          sender_name: string
          sender_type?: string
          work_order_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          organization_id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wo_supplier_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wo_supplier_messages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_approvals: {
        Row: {
          approval_level_id: string
          approver_id: string | null
          comments: string | null
          created_at: string
          decision_at: string | null
          delegated_at: string | null
          delegated_to: string | null
          escalated: boolean | null
          escalation_reason: string | null
          id: string
          organization_id: string
          status: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          approval_level_id: string
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          decision_at?: string | null
          delegated_at?: string | null
          delegated_to?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          id?: string
          organization_id: string
          status?: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          approval_level_id?: string
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          decision_at?: string | null
          delegated_at?: string | null
          delegated_to?: string | null
          escalated?: boolean | null
          escalation_reason?: string | null
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_approvals_approval_level_id_fkey"
            columns: ["approval_level_id"]
            isOneToOne: false
            referencedRelation: "approval_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_approvals_delegated_to_fkey"
            columns: ["delegated_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_approvals_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_attachments: {
        Row: {
          category: string | null
          file_name: string
          file_url: string
          id: string
          mime_type: string | null
          notes: string | null
          organization_id: string
          uploaded_at: string | null
          uploaded_by: string | null
          work_order_id: string
        }
        Insert: {
          category?: string | null
          file_name: string
          file_url: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          work_order_id: string
        }
        Update: {
          category?: string | null
          file_name?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_materials: {
        Row: {
          created_at: string | null
          id: string
          issued_quantity: number | null
          item_code: string | null
          item_description: string | null
          notes: string | null
          operation_sequence: number | null
          organization_id: string
          required_date: string | null
          required_quantity: number | null
          supply_type: string | null
          unit_cost: number | null
          uom: string | null
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          issued_quantity?: number | null
          item_code?: string | null
          item_description?: string | null
          notes?: string | null
          operation_sequence?: number | null
          organization_id: string
          required_date?: string | null
          required_quantity?: number | null
          supply_type?: string | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          issued_quantity?: number | null
          item_code?: string | null
          item_description?: string | null
          notes?: string | null
          operation_sequence?: number | null
          organization_id?: string
          required_date?: string | null
          required_quantity?: number | null
          supply_type?: string | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_materials_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_meter_readings: {
        Row: {
          captured_at: string | null
          captured_by: string | null
          created_at: string | null
          id: string
          meter_name: string
          notes: string | null
          organization_id: string
          reading_value: number
          unit: string | null
          work_order_id: string
        }
        Insert: {
          captured_at?: string | null
          captured_by?: string | null
          created_at?: string | null
          id?: string
          meter_name: string
          notes?: string | null
          organization_id: string
          reading_value: number
          unit?: string | null
          work_order_id: string
        }
        Update: {
          captured_at?: string | null
          captured_by?: string | null
          created_at?: string | null
          id?: string
          meter_name?: string
          notes?: string | null
          organization_id?: string
          reading_value?: number
          unit?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_meter_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_meter_readings_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_operations: {
        Row: {
          assigned_hours: number | null
          assigned_units: number | null
          created_at: string
          department: string | null
          duration_hours: number | null
          end_time: string | null
          id: string
          instances_assigned: number | null
          notes: string | null
          operation_description: string
          organization_id: string
          person_or_equipment: string | null
          required_units: number | null
          resource: string | null
          resource_sequence: number | null
          sequence_number: number
          start_time: string | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          assigned_hours?: number | null
          assigned_units?: number | null
          created_at?: string
          department?: string | null
          duration_hours?: number | null
          end_time?: string | null
          id?: string
          instances_assigned?: number | null
          notes?: string | null
          operation_description: string
          organization_id: string
          person_or_equipment?: string | null
          required_units?: number | null
          resource?: string | null
          resource_sequence?: number | null
          sequence_number?: number
          start_time?: string | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          assigned_hours?: number | null
          assigned_units?: number | null
          created_at?: string
          department?: string | null
          duration_hours?: number | null
          end_time?: string | null
          id?: string
          instances_assigned?: number | null
          notes?: string | null
          operation_description?: string
          organization_id?: string
          person_or_equipment?: string | null
          required_units?: number | null
          resource?: string | null
          resource_sequence?: number | null
          sequence_number?: number
          start_time?: string | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_operations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_operations_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          is_warranty: boolean | null
          organization_id: string
          part_name: string
          part_number: string | null
          quantity: number
          quantity_used: number | null
          total_cost: number | null
          unit_cost: number | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          is_warranty?: boolean | null
          organization_id: string
          part_name: string
          part_number?: string | null
          quantity?: number
          quantity_used?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          is_warranty?: boolean | null
          organization_id?: string
          part_name?: string
          part_number?: string | null
          quantity?: number
          quantity_used?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_permits: {
        Row: {
          created_at: string | null
          id: string
          issued_by: string | null
          notes: string | null
          organization_id: string
          permit_number: string | null
          permit_type: string | null
          status: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          organization_id: string
          permit_number?: string | null
          permit_type?: string | null
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          organization_id?: string
          permit_number?: string | null
          permit_type?: string | null
          status?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_permits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_permits_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_portal_access: {
        Row: {
          access_email: string | null
          access_name: string
          access_role: string | null
          access_token_hash: string | null
          completion_notes: string | null
          completion_photos: string[] | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          organization_id: string
          parts_requested: Json | null
          permissions: Json | null
          portal_type: string
          status_updates: Json | null
          supplier_id: string | null
          time_logged_minutes: number | null
          updated_at: string
          user_id: string | null
          work_order_id: string
        }
        Insert: {
          access_email?: string | null
          access_name: string
          access_role?: string | null
          access_token_hash?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          organization_id: string
          parts_requested?: Json | null
          permissions?: Json | null
          portal_type?: string
          status_updates?: Json | null
          supplier_id?: string | null
          time_logged_minutes?: number | null
          updated_at?: string
          user_id?: string | null
          work_order_id: string
        }
        Update: {
          access_email?: string | null
          access_name?: string
          access_role?: string | null
          access_token_hash?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          organization_id?: string
          parts_requested?: Json | null
          permissions?: Json | null
          portal_type?: string
          status_updates?: Json | null
          supplier_id?: string | null
          time_logged_minutes?: number | null
          updated_at?: string
          user_id?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_portal_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_portal_access_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_portal_access_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_quality_plans: {
        Row: {
          characteristic: string | null
          collected_at: string | null
          collected_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          pass: boolean | null
          plan_name: string | null
          result: string | null
          specification: string | null
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          characteristic?: string | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          pass?: boolean | null
          plan_name?: string | null
          result?: string | null
          specification?: string | null
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          characteristic?: string | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          pass?: boolean | null
          plan_name?: string | null
          result?: string | null
          specification?: string | null
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_quality_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_quality_plans_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          activity_cause: string | null
          activity_source: string | null
          activity_type: string | null
          additional_description: string | null
          agreement_number: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          asset_criticality: string | null
          asset_group: string | null
          assigned_department: string | null
          attachments: Json | null
          auto_approved: boolean | null
          auto_approved_reason: string | null
          completed_date: string | null
          contact_preference: string | null
          context_value: string | null
          created_at: string
          created_by_email: string | null
          created_by_name: string | null
          created_by_phone: string | null
          created_by_user_id: string | null
          downtime_hours: number | null
          driver_name: string | null
          driver_phone: string | null
          driver_type: string | null
          erp_sync_attempts: number | null
          failure_cause: string | null
          failure_code: string | null
          failure_resolution: string | null
          firm_flag: boolean | null
          firm_status: string | null
          fuel_level: number | null
          id: string
          inspection_id: string | null
          km_reading: number | null
          labor_cost: number | null
          maintenance_schedule_id: string | null
          maintenance_type: string | null
          mechanic_id: string | null
          notes: string | null
          notification_required: boolean | null
          notify_user: boolean | null
          odometer_at_service: number | null
          organization_id: string
          parts_cost: number | null
          pending_flag: boolean | null
          planner: string | null
          pm_suggested_end_date: string | null
          pm_suggested_start_date: string | null
          por_number: string | null
          por_status: string | null
          por_synced_at: string | null
          priority: string | null
          project_code: string | null
          remark: string | null
          remark_1: string | null
          remark_2: string | null
          remark_3: string | null
          remark_4: string | null
          request_completion_date: string | null
          request_start_date: string | null
          request_type: string | null
          requested_for: string | null
          schedule_name: string | null
          scheduled_date: string | null
          service_category: string | null
          service_description: string
          shutdown_type: string | null
          status: string | null
          supplier_magic_token: string | null
          supplier_magic_token_expires_at: string | null
          supplier_name: string | null
          supplier_user_id: string | null
          tagout_required: boolean | null
          task_code: string | null
          technician_name: string | null
          total_cost: number | null
          updated_at: string
          vehicle_id: string
          vendor_id: string | null
          vendor_rating: number | null
          warranty_active: boolean | null
          warranty_amount: number | null
          warranty_claim: boolean | null
          warranty_expiration_date: string | null
          wip_accounting_class: string | null
          work_order_number: string
          work_order_type: string | null
          work_type: string
        }
        Insert: {
          activity_cause?: string | null
          activity_source?: string | null
          activity_type?: string | null
          additional_description?: string | null
          agreement_number?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_criticality?: string | null
          asset_group?: string | null
          assigned_department?: string | null
          attachments?: Json | null
          auto_approved?: boolean | null
          auto_approved_reason?: string | null
          completed_date?: string | null
          contact_preference?: string | null
          context_value?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_name?: string | null
          created_by_phone?: string | null
          created_by_user_id?: string | null
          downtime_hours?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          erp_sync_attempts?: number | null
          failure_cause?: string | null
          failure_code?: string | null
          failure_resolution?: string | null
          firm_flag?: boolean | null
          firm_status?: string | null
          fuel_level?: number | null
          id?: string
          inspection_id?: string | null
          km_reading?: number | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          maintenance_type?: string | null
          mechanic_id?: string | null
          notes?: string | null
          notification_required?: boolean | null
          notify_user?: boolean | null
          odometer_at_service?: number | null
          organization_id: string
          parts_cost?: number | null
          pending_flag?: boolean | null
          planner?: string | null
          pm_suggested_end_date?: string | null
          pm_suggested_start_date?: string | null
          por_number?: string | null
          por_status?: string | null
          por_synced_at?: string | null
          priority?: string | null
          project_code?: string | null
          remark?: string | null
          remark_1?: string | null
          remark_2?: string | null
          remark_3?: string | null
          remark_4?: string | null
          request_completion_date?: string | null
          request_start_date?: string | null
          request_type?: string | null
          requested_for?: string | null
          schedule_name?: string | null
          scheduled_date?: string | null
          service_category?: string | null
          service_description: string
          shutdown_type?: string | null
          status?: string | null
          supplier_magic_token?: string | null
          supplier_magic_token_expires_at?: string | null
          supplier_name?: string | null
          supplier_user_id?: string | null
          tagout_required?: boolean | null
          task_code?: string | null
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id: string
          vendor_id?: string | null
          vendor_rating?: number | null
          warranty_active?: boolean | null
          warranty_amount?: number | null
          warranty_claim?: boolean | null
          warranty_expiration_date?: string | null
          wip_accounting_class?: string | null
          work_order_number: string
          work_order_type?: string | null
          work_type: string
        }
        Update: {
          activity_cause?: string | null
          activity_source?: string | null
          activity_type?: string | null
          additional_description?: string | null
          agreement_number?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_criticality?: string | null
          asset_group?: string | null
          assigned_department?: string | null
          attachments?: Json | null
          auto_approved?: boolean | null
          auto_approved_reason?: string | null
          completed_date?: string | null
          contact_preference?: string | null
          context_value?: string | null
          created_at?: string
          created_by_email?: string | null
          created_by_name?: string | null
          created_by_phone?: string | null
          created_by_user_id?: string | null
          downtime_hours?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          driver_type?: string | null
          erp_sync_attempts?: number | null
          failure_cause?: string | null
          failure_code?: string | null
          failure_resolution?: string | null
          firm_flag?: boolean | null
          firm_status?: string | null
          fuel_level?: number | null
          id?: string
          inspection_id?: string | null
          km_reading?: number | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          maintenance_type?: string | null
          mechanic_id?: string | null
          notes?: string | null
          notification_required?: boolean | null
          notify_user?: boolean | null
          odometer_at_service?: number | null
          organization_id?: string
          parts_cost?: number | null
          pending_flag?: boolean | null
          planner?: string | null
          pm_suggested_end_date?: string | null
          pm_suggested_start_date?: string | null
          por_number?: string | null
          por_status?: string | null
          por_synced_at?: string | null
          priority?: string | null
          project_code?: string | null
          remark?: string | null
          remark_1?: string | null
          remark_2?: string | null
          remark_3?: string | null
          remark_4?: string | null
          request_completion_date?: string | null
          request_start_date?: string | null
          request_type?: string | null
          requested_for?: string | null
          schedule_name?: string | null
          scheduled_date?: string | null
          service_category?: string | null
          service_description?: string
          shutdown_type?: string | null
          status?: string | null
          supplier_magic_token?: string | null
          supplier_magic_token_expires_at?: string | null
          supplier_name?: string | null
          supplier_user_id?: string | null
          tagout_required?: boolean | null
          task_code?: string | null
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string
          vendor_id?: string | null
          vendor_rating?: number | null
          warranty_active?: boolean | null
          warranty_amount?: number | null
          warranty_claim?: boolean | null
          warranty_expiration_date?: string | null
          wip_accounting_class?: string | null
          work_order_number?: string
          work_order_type?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_maintenance_schedule_id_fkey"
            columns: ["maintenance_schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          db_reads: number
          db_writes: number
          duration_ms: number | null
          error_summary: string | null
          execution_logs: Json | null
          id: string
          nodes_executed: number
          nodes_failed: number
          organization_id: string
          started_at: string
          status: string
          total_nodes: number
          trigger_type: string
          triggered_by: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          db_reads?: number
          db_writes?: number
          duration_ms?: number | null
          error_summary?: string | null
          execution_logs?: Json | null
          id?: string
          nodes_executed?: number
          nodes_failed?: number
          organization_id: string
          started_at?: string
          status?: string
          total_nodes?: number
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          db_reads?: number
          db_writes?: number
          duration_ms?: number | null
          error_summary?: string | null
          execution_logs?: Json | null
          id?: string
          nodes_executed?: number
          nodes_failed?: number
          organization_id?: string
          started_at?: string
          status?: string
          total_nodes?: number
          trigger_type?: string
          triggered_by?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          current_lane: string | null
          current_stage: string
          data: Json | null
          description: string | null
          documents: string[] | null
          driver_id: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string | null
          reference_number: string
          status: string
          title: string | null
          updated_at: string
          vehicle_id: string | null
          workflow_type: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_lane?: string | null
          current_stage: string
          data?: Json | null
          description?: string | null
          documents?: string[] | null
          driver_id?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string | null
          reference_number: string
          status?: string
          title?: string | null
          updated_at?: string
          vehicle_id?: string | null
          workflow_type: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_lane?: string | null
          current_stage?: string
          data?: Json | null
          description?: string | null
          documents?: string[] | null
          driver_id?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string | null
          reference_number?: string
          status?: string
          title?: string | null
          updated_at?: string
          vehicle_id?: string | null
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          context: Json
          created_at: string
          current_node_id: string | null
          duration_ms: number | null
          error_message: string | null
          execution_log: Json | null
          id: string
          organization_id: string
          started_at: string
          status: string
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_node_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          organization_id: string
          started_at?: string
          status?: string
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_node_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_log?: Json | null
          id?: string
          organization_id?: string
          started_at?: string
          status?: string
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          actions: Json
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          assignee_role: string | null
          assignee_user_id: string | null
          completed_at: string | null
          completed_by: string | null
          context: Json
          created_at: string
          decision: string | null
          description: string | null
          driver_id: string | null
          due_at: string | null
          form_key: string | null
          form_schema: Json
          id: string
          node_id: string
          organization_id: string
          result: Json | null
          run_id: string
          status: string
          title: string
          updated_at: string
          vehicle_id: string | null
          workflow_id: string
        }
        Insert: {
          actions?: Json
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignee_role?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          context?: Json
          created_at?: string
          decision?: string | null
          description?: string | null
          driver_id?: string | null
          due_at?: string | null
          form_key?: string | null
          form_schema?: Json
          id?: string
          node_id: string
          organization_id: string
          result?: Json | null
          run_id: string
          status?: string
          title: string
          updated_at?: string
          vehicle_id?: string | null
          workflow_id: string
        }
        Update: {
          actions?: Json
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assignee_role?: string | null
          assignee_user_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          context?: Json
          created_at?: string
          decision?: string | null
          description?: string | null
          driver_id?: string | null
          due_at?: string | null
          form_key?: string | null
          form_schema?: Json
          id?: string
          node_id?: string
          organization_id?: string
          result?: Json | null
          run_id?: string
          status?: string
          title?: string
          updated_at?: string
          vehicle_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_transitions: {
        Row: {
          created_at: string
          decision: string | null
          documents: string[] | null
          from_lane: string | null
          from_stage: string | null
          id: string
          instance_id: string
          notes: string | null
          organization_id: string
          payload: Json | null
          performed_by: string | null
          performed_by_name: string | null
          performed_by_role: string | null
          to_lane: string | null
          to_stage: string
          workflow_type: string
        }
        Insert: {
          created_at?: string
          decision?: string | null
          documents?: string[] | null
          from_lane?: string | null
          from_stage?: string | null
          id?: string
          instance_id: string
          notes?: string | null
          organization_id: string
          payload?: Json | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          to_lane?: string | null
          to_stage: string
          workflow_type: string
        }
        Update: {
          created_at?: string
          decision?: string | null
          documents?: string[] | null
          from_lane?: string | null
          from_stage?: string | null
          id?: string
          instance_id?: string
          notes?: string | null
          organization_id?: string
          payload?: Json | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          to_lane?: string | null
          to_stage?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_transitions_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          cron_expression: string | null
          definition: Json | null
          description: string | null
          edges: Json
          event_filter: Json | null
          event_trigger: string | null
          execution_count: number
          id: string
          is_template: boolean | null
          kind: string
          last_executed_at: string | null
          last_run_at: string | null
          name: string
          next_execution_at: string | null
          nodes: Json
          organization_id: string
          run_count: number | null
          sop_code: string | null
          sop_type: string | null
          status: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
          version: number
          viewport: Json | null
          webhook_token: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          definition?: Json | null
          description?: string | null
          edges?: Json
          event_filter?: Json | null
          event_trigger?: string | null
          execution_count?: number
          id?: string
          is_template?: boolean | null
          kind?: string
          last_executed_at?: string | null
          last_run_at?: string | null
          name: string
          next_execution_at?: string | null
          nodes?: Json
          organization_id: string
          run_count?: number | null
          sop_code?: string | null
          sop_type?: string | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
          version?: number
          viewport?: Json | null
          webhook_token?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          definition?: Json | null
          description?: string | null
          edges?: Json
          event_filter?: Json | null
          event_trigger?: string | null
          execution_count?: number
          id?: string
          is_template?: boolean | null
          kind?: string
          last_executed_at?: string | null
          last_run_at?: string | null
          name?: string
          next_execution_at?: string | null
          nodes?: Json
          organization_id?: string
          run_count?: number | null
          sop_code?: string | null
          sop_type?: string | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
          version?: number
          viewport?: Json | null
          webhook_token?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      latest_driver_scores: {
        Row: {
          acceleration_score: number | null
          braking_score: number | null
          created_at: string | null
          driver_id: string | null
          harsh_acceleration_events: number | null
          harsh_braking_events: number | null
          id: string | null
          idle_score: number | null
          organization_id: string | null
          overall_score: number | null
          recommendations: string[] | null
          risk_factors: string[] | null
          safety_rating: string | null
          score_period_end: string | null
          score_period_start: string | null
          speed_violations: number | null
          speeding_score: number | null
          total_distance: number | null
          total_drive_time: number | null
          total_idle_time: number | null
          trend: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_behavior_scores_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_behavior_scores_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_daily_agg: {
        Row: {
          alarm_count: number | null
          avg_fuel: number | null
          avg_speed: number | null
          bucket: string | null
          distance_km: number | null
          event_count: number | null
          event_type: string | null
          max_fuel: number | null
          max_speed: number | null
          min_fuel: number | null
          organization_id: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_hourly_agg: {
        Row: {
          alarm_count: number | null
          avg_fuel: number | null
          avg_speed: number | null
          bucket: string | null
          distance_km: number | null
          event_count: number | null
          event_type: string | null
          max_fuel: number | null
          max_speed: number | null
          min_fuel: number | null
          organization_id: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _approval_actor_name: { Args: { _uid: string }; Returns: string }
      _backfill_inspection_links: { Args: never; Returns: number }
      _vrq_derive_stage: {
        Args: { r: Database["public"]["Tables"]["vehicle_requests"]["Row"] }
        Returns: string
      }
      _vrq_stage_lane: { Args: { _stage: string }; Returns: string }
      act_on_outsource_payment_approval: {
        Args: {
          _comments?: string
          _decision: string
          _payment_request_id: string
        }
        Returns: Json
      }
      action_fuel_approval: {
        Args: { p_action: string; p_approval_id: string; p_comment?: string }
        Returns: Json
      }
      action_fuel_emoney_approval: {
        Args: { p_action: string; p_approval_id: string; p_comment?: string }
        Returns: Json
      }
      action_fuel_wo_approval: {
        Args: { p_action: string; p_approval_id: string; p_comment?: string }
        Returns: Json
      }
      auto_complete_fuel_wo_approvals: {
        Args: { p_comment?: string; p_emoney_amount?: number; p_wo_id: string }
        Returns: Json
      }
      build_outsource_payment_approval_chain: {
        Args: { _payment_request_id: string }
        Returns: number
      }
      can_manage_forms: { Args: { _user_id: string }; Returns: boolean }
      can_submit_vehicle_request_rating: {
        Args: {
          _organization_id: string
          _user_id: string
          _vehicle_request_id: string
        }
        Returns: boolean
      }
      can_submit_vehicle_request_rating_for_requester: {
        Args: {
          _organization_id: string
          _requester_id: string
          _vehicle_request_id: string
        }
        Returns: boolean
      }
      check_account_lockout: {
        Args: { p_email: string }
        Returns: {
          failed_attempts: number
          is_locked: boolean
          lockout_until: string
        }[]
      }
      check_ip_lockout: {
        Args: {
          p_ip_address: string
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: {
          attempt_count: number
          is_locked: boolean
          locked_until: string
        }[]
      }
      check_password_reset_rate_limit: {
        Args: {
          p_email: string
          p_ip_address?: string
          p_max_per_email?: number
          p_max_per_ip?: number
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      check_rate_limit: {
        Args: {
          p_client_id: string
          p_function_name: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      check_safety_comfort_usability: {
        Args: {
          p_item_key: string
          p_period_days?: number
          p_user_id: string
          p_vehicle_id: string
        }
        Returns: {
          allowed: boolean
          days_since_last: number
          last_issued_at: string
          reason: string
        }[]
      }
      cleanup_license_renewal_e2e_test: { Args: never; Returns: undefined }
      cleanup_maintenance_workflow_e2e_test: { Args: never; Returns: string }
      cleanup_old_telemetry: {
        Args: { p_retain_months?: number }
        Returns: string
      }
      cleanup_outsource_tire_e2e_test: { Args: never; Returns: string }
      cleanup_vehicle_request_e2e_test: { Args: never; Returns: string }
      clear_failed_login: { Args: { p_email: string }; Returns: undefined }
      complete_workflow_task: {
        Args: { _decision: string; _result?: Json; _task_id: string }
        Returns: Json
      }
      compute_annual_inspection_due: {
        Args: { _vehicle_id: string }
        Returns: {
          last_inspection_id: string
          last_status: string
          next_due: string
          source: string
        }[]
      }
      compute_predictive_scores: {
        Args: { p_org_id: string }
        Returns: {
          critical: number
          high: number
          processed: number
        }[]
      }
      cpbr_is_same_org: { Args: { _org: string }; Returns: boolean }
      create_telemetry_partition: {
        Args: { p_date: string }
        Returns: undefined
      }
      current_driver_id: { Args: never; Returns: string }
      delivery_check_decision: {
        Args: {
          p_acceptable: boolean
          p_document_url?: string
          p_notes?: string
          p_request_id: string
        }
        Returns: undefined
      }
      driver_confirm_vehicle_delivered: {
        Args: { p_notes?: string; p_request_id: string }
        Returns: Json
      }
      driver_confirm_vehicle_received: {
        Args: { p_notes?: string; p_request_id: string }
        Returns: Json
      }
      e2e_check_stage: {
        Args: { p_expected: string; p_req: string }
        Returns: {
          detail: string
          status: string
        }[]
      }
      e2e_set_user: { Args: { p_user_id: string }; Returns: undefined }
      fleet_ops_review_request: {
        Args: { p_decision: string; p_notes?: string; p_request_id: string }
        Returns: undefined
      }
      form_intent: { Args: { form_key: string }; Returns: string }
      generate_vehicle_request_number: {
        Args: { p_org_id: string; p_request_type?: string }
        Returns: string
      }
      generate_workflow_reference: {
        Args: { _org_id: string; _workflow_type: string }
        Returns: string
      }
      get_active_delegate: {
        Args: { p_cost?: number; p_scope?: string; p_user_id: string }
        Returns: string
      }
      get_actor_name: { Args: never; Returns: string }
      get_due_preventive_schedules: {
        Args: {
          p_lookahead_days?: number
          p_lookahead_hours?: number
          p_lookahead_km?: number
          p_organization_id: string
          p_vehicle_id?: string
        }
        Returns: {
          current_hours: number
          current_odometer: number
          due_reason: string
          interval_type: string
          is_overdue: boolean
          next_due_date: string
          next_due_hours: number
          next_due_odometer: number
          plate_number: string
          priority: string
          schedule_id: string
          service_type: string
          vehicle_id: string
        }[]
      }
      get_effective_permissions: {
        Args: { _user_id: string }
        Returns: {
          permission_name: string
          source: string
        }[]
      }
      get_my_pending_emoney_approvals: {
        Args: never
        Returns: {
          amount: number
          approval_id: string
          approver_role: string
          created_at: string
          driver_phone: string
          fuel_work_order_id: string
          generator_name: string
          initiated_by_name: string
          is_delegated: boolean
          original_approver_name: string
          request_number: string
          vehicle_plate: string
          work_order_number: string
        }[]
      }
      get_my_pending_fuel_approvals: {
        Args: never
        Returns: {
          approval_id: string
          approver_role: string
          created_at: string
          estimated_cost: number
          fuel_request_id: string
          generator_name: string
          is_delegated: boolean
          liters_requested: number
          original_approver_name: string
          priority: string
          request_number: string
          requested_by_name: string
          step: number
          vehicle_plate: string
        }[]
      }
      get_my_pending_fuel_wo_approvals: {
        Args: never
        Returns: {
          approval_id: string
          approver_role: string
          created_at: string
          emoney_amount: number
          fuel_work_order_id: string
          generator_name: string
          is_delegated: boolean
          original_approver_name: string
          priority: string
          request_number: string
          step: number
          vehicle_plate: string
          work_order_number: string
        }[]
      }
      get_nearby_fuel_stations: {
        Args: {
          p_fuel_type?: string
          p_lat: number
          p_lng: number
          p_max_km?: number
          p_min_liters?: number
        }
        Returns: {
          brand: string
          diesel_available: boolean
          diesel_price_per_liter: number
          diesel_stock_liters: number
          distance_km: number
          has_requested_fuel: boolean
          hours_of_operation: string
          id: string
          last_stock_update: string
          lat: number
          lng: number
          name: string
          petrol_available: boolean
          petrol_price_per_liter: number
          petrol_stock_liters: number
          phone: string
        }[]
      }
      get_safety_comfort_allowed_items: {
        Args: { p_user_id: string; p_vehicle_id: string }
        Returns: {
          item_key: string
          source: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_vehicle_fuel_status: {
        Args: { p_vehicle_ids: string[] }
        Returns: {
          fuel_records_count: number
          last_communication_at: string
          last_fuel_reading: number
          vehicle_id: string
        }[]
      }
      has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initiate_fuel_emoney_request: {
        Args: { p_amount: number; p_wo_id: string }
        Returns: string
      }
      initiate_work_order_approval: {
        Args: { p_work_order_id: string }
        Returns: undefined
      }
      inspector_post_inspection: {
        Args: { p_notes?: string; p_request_id: string; p_result: string }
        Returns: undefined
      }
      is_basic_user_only: { Args: { _user_id: string }; Returns: boolean }
      is_driver_only: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vehicle_online: { Args: { vehicle_uuid: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _error_message?: string
          _new_values?: Json
          _old_values?: Json
          _resource_id?: string
          _resource_type: string
          _status?: string
        }
        Returns: string
      }
      log_maintenance_workflow_event: {
        Args: {
          p_action: string
          p_from: string
          p_metadata?: Json
          p_notes?: string
          p_request_id: string
          p_step: string
          p_to: string
        }
        Returns: string
      }
      maintenance_create_pdr: {
        Args: { p_notes?: string; p_pdr_number: string; p_request_id: string }
        Returns: undefined
      }
      maintenance_pre_inspection: {
        Args: {
          p_needs_maintenance: boolean
          p_notes?: string
          p_request_id: string
        }
        Returns: undefined
      }
      recalculate_driver_stats: {
        Args: { p_organization_id?: string }
        Returns: undefined
      }
      record_failed_login: {
        Args: {
          p_email: string
          p_ip_address: string
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: {
          failed_attempts: number
          is_locked: boolean
          lockout_until: string
        }[]
      }
      record_ip_failed_login: {
        Args: {
          p_ip_address: string
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: {
          attempt_count: number
          is_locked: boolean
          locked_until: string
        }[]
      }
      refresh_inspection_due_for_vehicle: {
        Args: { _vehicle_id: string }
        Returns: undefined
      }
      refresh_telemetry_aggregates: { Args: never; Returns: undefined }
      resolve_authority_approver: {
        Args: {
          p_amount?: number
          p_duration_days?: number
          p_organization_id: string
          p_requester_role?: string
          p_scope: string
        }
        Returns: {
          approver_role: string
          is_auto_approve: boolean
          rule_name: string
          step_order: number
        }[]
      }
      route_fuel_request_approval: {
        Args: { p_fuel_request_id: string }
        Returns: string
      }
      route_fuel_wo_approval: { Args: { p_wo_id: string }; Returns: string }
      route_vehicle_request_approval: {
        Args: { p_request_id: string }
        Returns: string
      }
      run_drivers_page_e2e_test: {
        Args: never
        Returns: {
          t_detail: string
          t_flow: string
          t_status: string
          t_step: string
        }[]
      }
      run_fuel_e2e_steps_6_12: {
        Args: never
        Returns: {
          t_detail: string
          t_flow: string
          t_status: string
          t_step: string
        }[]
      }
      run_fuel_workflow_e2e_test: {
        Args: never
        Returns: {
          t_detail: string
          t_flow: string
          t_status: string
          t_step: string
        }[]
      }
      run_license_renewal_e2e_test: {
        Args: never
        Returns: {
          t_detail: string
          t_flow: string
          t_status: string
          t_step: string
        }[]
      }
      run_maintenance_workflow_e2e_test: {
        Args: never
        Returns: {
          detail: string
          flow: string
          status: string
          step: string
        }[]
      }
      run_outsource_tire_e2e_test: {
        Args: never
        Returns: {
          t_detail: string
          t_flow: string
          t_status: string
          t_step: string
        }[]
      }
      run_vehicle_request_e2e_test: {
        Args: never
        Returns: {
          t_detail: string
          t_flow: string
          t_status: string
          t_step: string
        }[]
      }
      scd_create_po: {
        Args: {
          p_notes?: string
          p_po_id: string
          p_request_id: string
          p_supplier_geofence_id?: string
          p_supplier_id: string
          p_supplier_name: string
        }
        Returns: undefined
      }
      seed_authority_matrix_defaults: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      send_notification: {
        Args: {
          _link?: string
          _message: string
          _metadata?: Json
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      supplier_acknowledge_request: {
        Args: { p_notes?: string; p_request_id: string }
        Returns: undefined
      }
      supplier_complete_work: {
        Args: {
          p_invoice_url?: string
          p_notes?: string
          p_report_url?: string
          p_request_id: string
        }
        Returns: undefined
      }
      supplier_mark_delivered_back: {
        Args: {
          p_document_url?: string
          p_notes?: string
          p_request_id: string
        }
        Returns: undefined
      }
      supplier_request_variation: {
        Args: { p_request_id: string; p_variation_notes: string }
        Returns: undefined
      }
      trigger_preventive_maintenance: {
        Args: { p_organization_id?: string }
        Returns: {
          organization_id: string
          plate_number: string
          reason: string
          request_id: string
          schedule_id: string
          status: string
          vehicle_id: string
        }[]
      }
      trigger_webhook: {
        Args: { _event_data: Json; _event_type: string }
        Returns: undefined
      }
      user_in_organization: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      verify_vehicle_at_supplier: {
        Args: { p_default_radius_m?: number; p_request_id: string }
        Returns: {
          distance_m: number
          geofence_name: string
          vehicle_lat: number
          vehicle_lng: number
          verified: boolean
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "fleet_owner"
        | "operations_manager"
        | "dispatcher"
        | "maintenance_lead"
        | "fuel_controller"
        | "driver"
        | "auditor"
        | "org_admin"
        | "operator"
        | "fleet_manager"
        | "technician"
        | "mechanic"
        | "viewer"
        | "supplier"
        | "transport_authority"
        | "insurance_admin"
        | "finance_manager"
        | "sourcing_manager"
        | "maintenance_manager"
        | "maintenance_supervisor"
        | "inspection_center"
        | "user"
      employee_type:
        | "driver"
        | "mechanic"
        | "dispatcher"
        | "office_staff"
        | "manager"
        | "technician"
        | "coordinator"
        | "other"
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
        "super_admin",
        "fleet_owner",
        "operations_manager",
        "dispatcher",
        "maintenance_lead",
        "fuel_controller",
        "driver",
        "auditor",
        "org_admin",
        "operator",
        "fleet_manager",
        "technician",
        "mechanic",
        "viewer",
        "supplier",
        "transport_authority",
        "insurance_admin",
        "finance_manager",
        "sourcing_manager",
        "maintenance_manager",
        "maintenance_supervisor",
        "inspection_center",
        "user",
      ],
      employee_type: [
        "driver",
        "mechanic",
        "dispatcher",
        "office_staff",
        "manager",
        "technician",
        "coordinator",
        "other",
      ],
    },
  },
} as const
