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
          approved_amount: number | null
          approved_at: string | null
          claim_amount: number | null
          claim_number: string
          created_at: string
          damage_description: string | null
          description: string | null
          documents: string[] | null
          driver_id: string | null
          estimated_repair_cost: number | null
          fault_determination: string | null
          fault_party: string | null
          filed_at: string | null
          id: string
          incident_id: string | null
          incident_type: string
          insurance_id: string | null
          notes: string | null
          organization_id: string
          photos: string[] | null
          police_report_number: string | null
          repair_end_date: string | null
          repair_start_date: string | null
          repair_vendor: string | null
          settled_at: string | null
          status: string | null
          third_party_contact: string | null
          third_party_insurance: string | null
          third_party_name: string | null
          third_party_vehicle: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          accident_date: string
          accident_location?: string | null
          actual_repair_cost?: number | null
          approved_amount?: number | null
          approved_at?: string | null
          claim_amount?: number | null
          claim_number: string
          created_at?: string
          damage_description?: string | null
          description?: string | null
          documents?: string[] | null
          driver_id?: string | null
          estimated_repair_cost?: number | null
          fault_determination?: string | null
          fault_party?: string | null
          filed_at?: string | null
          id?: string
          incident_id?: string | null
          incident_type?: string
          insurance_id?: string | null
          notes?: string | null
          organization_id: string
          photos?: string[] | null
          police_report_number?: string | null
          repair_end_date?: string | null
          repair_start_date?: string | null
          repair_vendor?: string | null
          settled_at?: string | null
          status?: string | null
          third_party_contact?: string | null
          third_party_insurance?: string | null
          third_party_name?: string | null
          third_party_vehicle?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          accident_date?: string
          accident_location?: string | null
          actual_repair_cost?: number | null
          approved_amount?: number | null
          approved_at?: string | null
          claim_amount?: number | null
          claim_number?: string
          created_at?: string
          damage_description?: string | null
          description?: string | null
          documents?: string[] | null
          driver_id?: string | null
          estimated_repair_cost?: number | null
          fault_determination?: string | null
          fault_party?: string | null
          filed_at?: string | null
          id?: string
          incident_id?: string | null
          incident_type?: string
          insurance_id?: string | null
          notes?: string | null
          organization_id?: string
          photos?: string[] | null
          police_report_number?: string | null
          repair_end_date?: string | null
          repair_start_date?: string | null
          repair_vendor?: string | null
          settled_at?: string | null
          status?: string | null
          third_party_contact?: string | null
          third_party_insurance?: string | null
          third_party_name?: string | null
          third_party_vehicle?: string | null
          updated_at?: string
          vehicle_id?: string
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
          geofence_id: string | null
          id: string
          is_active: boolean | null
          lat: number
          lng: number
          name: string
          organization_id: string
          radius_meters: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          lat: number
          lng: number
          name: string
          organization_id: string
          radius_meters?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          geofence_id?: string | null
          id?: string
          is_active?: boolean | null
          lat?: number
          lng?: number
          name?: string
          organization_id?: string
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
      depots: {
        Row: {
          address: string | null
          business_unit_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_unit_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_unit_id?: string
          created_at?: string
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
          driver_id: string | null
          dropoff_geofence_id: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_location_name: string | null
          id: string
          job_number: string
          job_type: string
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
          driver_id?: string | null
          dropoff_geofence_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location_name?: string | null
          id?: string
          job_number: string
          job_type?: string
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
          driver_id?: string | null
          dropoff_geofence_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_location_name?: string | null
          id?: string
          job_number?: string
          job_type?: string
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
      fuel_requests: {
        Row: {
          actual_cost: number | null
          approved_at: string | null
          approved_by: string | null
          cost_center: string | null
          created_at: string
          current_odometer: number | null
          driver_id: string | null
          estimated_cost: number | null
          fuel_type: string | null
          fulfilled_at: string | null
          id: string
          liters_approved: number | null
          liters_requested: number
          notes: string | null
          organization_id: string
          purpose: string | null
          rejected_reason: string | null
          request_number: string
          requested_at: string
          requested_by: string
          station_id: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cost_center?: string | null
          created_at?: string
          current_odometer?: number | null
          driver_id?: string | null
          estimated_cost?: number | null
          fuel_type?: string | null
          fulfilled_at?: string | null
          id?: string
          liters_approved?: number | null
          liters_requested: number
          notes?: string | null
          organization_id: string
          purpose?: string | null
          rejected_reason?: string | null
          request_number: string
          requested_at?: string
          requested_by: string
          station_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cost_center?: string | null
          created_at?: string
          current_odometer?: number | null
          driver_id?: string | null
          estimated_cost?: number | null
          fuel_type?: string | null
          fulfilled_at?: string | null
          id?: string
          liters_approved?: number | null
          liters_requested?: number
          notes?: string | null
          organization_id?: string
          purpose?: string | null
          rejected_reason?: string | null
          request_number?: string
          requested_at?: string
          requested_by?: string
          station_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
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
          created_at: string
          description: string
          driver_id: string | null
          estimated_cost: number | null
          fault_party: string | null
          id: string
          incident_number: string
          incident_time: string
          incident_type: string
          location: string | null
          organization_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          description: string
          driver_id?: string | null
          estimated_cost?: number | null
          fault_party?: string | null
          id?: string
          incident_number: string
          incident_time: string
          incident_type: string
          location?: string | null
          organization_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          description?: string
          driver_id?: string | null
          estimated_cost?: number | null
          fault_party?: string | null
          id?: string
          incident_number?: string
          incident_time?: string
          incident_type?: string
          location?: string | null
          organization_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
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
          fuel_price_per_liter: number
          fuel_unit: string
          id: string
          logo_url: string | null
          mapbox_token: string | null
          organization_id: string
          primary_color: string | null
          push_notifications_enabled: boolean | null
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
          fuel_price_per_liter?: number
          fuel_unit?: string
          id?: string
          logo_url?: string | null
          mapbox_token?: string | null
          organization_id: string
          primary_color?: string | null
          push_notifications_enabled?: boolean | null
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
          fuel_price_per_liter?: number
          fuel_unit?: string
          id?: string
          logo_url?: string | null
          mapbox_token?: string | null
          organization_id?: string
          primary_color?: string | null
          push_notifications_enabled?: boolean | null
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
          email: string
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          certified_safe: boolean | null
          checklist_data: Json | null
          created_at: string
          defects_found: Json | null
          driver_id: string | null
          id: string
          inspection_date: string
          inspection_type: string
          inspector_signature_url: string | null
          location_lat: number | null
          location_lng: number | null
          mechanic_notes: string | null
          mechanic_signature_url: string | null
          odometer_km: number | null
          organization_id: string
          overall_condition: string | null
          photo_urls: string[] | null
          repaired_at: string | null
          status: string
          updated_at: string
          vehicle_id: string
          work_order_created: boolean | null
        }
        Insert: {
          certified_safe?: boolean | null
          checklist_data?: Json | null
          created_at?: string
          defects_found?: Json | null
          driver_id?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_signature_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          mechanic_notes?: string | null
          mechanic_signature_url?: string | null
          odometer_km?: number | null
          organization_id: string
          overall_condition?: string | null
          photo_urls?: string[] | null
          repaired_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
          work_order_created?: boolean | null
        }
        Update: {
          certified_safe?: boolean | null
          checklist_data?: Json | null
          created_at?: string
          defects_found?: Json | null
          driver_id?: string | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_signature_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          mechanic_notes?: string | null
          mechanic_signature_url?: string | null
          odometer_km?: number | null
          organization_id?: string
          overall_condition?: string | null
          photo_urls?: string[] | null
          repaired_at?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
          work_order_created?: boolean | null
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
          check_in_at: string | null
          check_in_by: string | null
          completed_at: string | null
          created_at: string
          cross_pool_assignment: boolean | null
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
          driver_checkout_odometer: number | null
          end_time: string | null
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
          pool_review_status: string | null
          pool_reviewed_at: string | null
          pool_reviewer_id: string | null
          priority: string | null
          project_number: string | null
          purpose: string
          rejection_reason: string | null
          request_number: string
          request_type: string | null
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
          vehicle_type: string | null
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
          check_in_at?: string | null
          check_in_by?: string | null
          completed_at?: string | null
          created_at?: string
          cross_pool_assignment?: boolean | null
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
          driver_checkout_odometer?: number | null
          end_time?: string | null
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
          pool_review_status?: string | null
          pool_reviewed_at?: string | null
          pool_reviewer_id?: string | null
          priority?: string | null
          project_number?: string | null
          purpose: string
          rejection_reason?: string | null
          request_number: string
          request_type?: string | null
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
          vehicle_type?: string | null
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
          check_in_at?: string | null
          check_in_by?: string | null
          completed_at?: string | null
          created_at?: string
          cross_pool_assignment?: boolean | null
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
          driver_checkout_odometer?: number | null
          end_time?: string | null
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
          pool_review_status?: string | null
          pool_reviewed_at?: string | null
          pool_reviewer_id?: string | null
          priority?: string | null
          project_number?: string | null
          purpose?: string
          rejection_reason?: string | null
          request_number?: string
          request_type?: string | null
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
          vehicle_type?: string | null
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
          capacity_kg: number | null
          capacity_volume: number | null
          color: string | null
          commercial_permit: boolean | null
          created_at: string
          current_value: number | null
          depot_id: string | null
          depreciation_rate: number | null
          drive_type: string | null
          engine_hours: number | null
          fuel_type: string
          gps_device_id: string | null
          gps_installed: boolean | null
          id: string
          insurance_cert_url: string | null
          insurance_expiry: string | null
          insurance_policy_no: string | null
          is_active: boolean | null
          lifecycle_stage: string | null
          make: string
          model: string
          notes: string | null
          odometer_km: number | null
          organization_id: string
          owner_certificate_url: string | null
          owner_id: string | null
          ownership_type: string | null
          permit_expiry: string | null
          photo_back_url: string | null
          photo_front_url: string | null
          photo_left_url: string | null
          photo_right_url: string | null
          plate_number: string
          registration_cert_no: string | null
          registration_expiry: string | null
          rental_contract_number: string | null
          rental_daily_rate: number | null
          rental_end_date: string | null
          rental_provider: string | null
          rental_start_date: string | null
          route_type: string | null
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
          updated_at: string
          vehicle_category: string | null
          vehicle_group: string | null
          vehicle_type: string | null
          vin: string | null
          year: number
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          assigned_driver_id?: string | null
          capacity_kg?: number | null
          capacity_volume?: number | null
          color?: string | null
          commercial_permit?: boolean | null
          created_at?: string
          current_value?: number | null
          depot_id?: string | null
          depreciation_rate?: number | null
          drive_type?: string | null
          engine_hours?: number | null
          fuel_type: string
          gps_device_id?: string | null
          gps_installed?: boolean | null
          id?: string
          insurance_cert_url?: string | null
          insurance_expiry?: string | null
          insurance_policy_no?: string | null
          is_active?: boolean | null
          lifecycle_stage?: string | null
          make: string
          model: string
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          owner_certificate_url?: string | null
          owner_id?: string | null
          ownership_type?: string | null
          permit_expiry?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_left_url?: string | null
          photo_right_url?: string | null
          plate_number: string
          registration_cert_no?: string | null
          registration_expiry?: string | null
          rental_contract_number?: string | null
          rental_daily_rate?: number | null
          rental_end_date?: string | null
          rental_provider?: string | null
          rental_start_date?: string | null
          route_type?: string | null
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
          updated_at?: string
          vehicle_category?: string | null
          vehicle_group?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year: number
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          assigned_driver_id?: string | null
          capacity_kg?: number | null
          capacity_volume?: number | null
          color?: string | null
          commercial_permit?: boolean | null
          created_at?: string
          current_value?: number | null
          depot_id?: string | null
          depreciation_rate?: number | null
          drive_type?: string | null
          engine_hours?: number | null
          fuel_type?: string
          gps_device_id?: string | null
          gps_installed?: boolean | null
          id?: string
          insurance_cert_url?: string | null
          insurance_expiry?: string | null
          insurance_policy_no?: string | null
          is_active?: boolean | null
          lifecycle_stage?: string | null
          make?: string
          model?: string
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          owner_certificate_url?: string | null
          owner_id?: string | null
          ownership_type?: string | null
          permit_expiry?: string | null
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_left_url?: string | null
          photo_right_url?: string | null
          plate_number?: string
          registration_cert_no?: string | null
          registration_expiry?: string | null
          rental_contract_number?: string | null
          rental_daily_rate?: number | null
          rental_end_date?: string | null
          rental_provider?: string | null
          rental_start_date?: string | null
          route_type?: string | null
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
          updated_at?: string
          vehicle_category?: string | null
          vehicle_group?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number
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
      work_orders: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          completed_date: string | null
          created_at: string
          downtime_hours: number | null
          id: string
          inspection_id: string | null
          labor_cost: number | null
          maintenance_schedule_id: string | null
          mechanic_id: string | null
          notes: string | null
          odometer_at_service: number | null
          organization_id: string
          parts_cost: number | null
          priority: string | null
          scheduled_date: string | null
          service_category: string | null
          service_description: string
          status: string | null
          technician_name: string | null
          total_cost: number | null
          updated_at: string
          vehicle_id: string
          vendor_id: string | null
          vendor_rating: number | null
          warranty_amount: number | null
          warranty_claim: boolean | null
          work_order_number: string
          work_type: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          completed_date?: string | null
          created_at?: string
          downtime_hours?: number | null
          id?: string
          inspection_id?: string | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          mechanic_id?: string | null
          notes?: string | null
          odometer_at_service?: number | null
          organization_id: string
          parts_cost?: number | null
          priority?: string | null
          scheduled_date?: string | null
          service_category?: string | null
          service_description: string
          status?: string | null
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id: string
          vendor_id?: string | null
          vendor_rating?: number | null
          warranty_amount?: number | null
          warranty_claim?: boolean | null
          work_order_number: string
          work_type: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          completed_date?: string | null
          created_at?: string
          downtime_hours?: number | null
          id?: string
          inspection_id?: string | null
          labor_cost?: number | null
          maintenance_schedule_id?: string | null
          mechanic_id?: string | null
          notes?: string | null
          odometer_at_service?: number | null
          organization_id?: string
          parts_cost?: number | null
          priority?: string | null
          scheduled_date?: string | null
          service_category?: string | null
          service_description?: string
          status?: string | null
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string
          vendor_id?: string | null
          vendor_rating?: number | null
          warranty_amount?: number | null
          warranty_claim?: boolean | null
          work_order_number?: string
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
      workflow_runs: {
        Row: {
          completed_at: string | null
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      workflows: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          edges: Json
          id: string
          is_template: boolean | null
          last_run_at: string | null
          name: string
          nodes: Json
          organization_id: string
          run_count: number | null
          status: string
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string
          version: number
          viewport: Json | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_template?: boolean | null
          last_run_at?: string | null
          name: string
          nodes?: Json
          organization_id: string
          run_count?: number | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
          version?: number
          viewport?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_template?: boolean | null
          last_run_at?: string | null
          name?: string
          nodes?: Json
          organization_id?: string
          run_count?: number | null
          status?: string
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string
          version?: number
          viewport?: Json | null
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
      cleanup_old_telemetry: {
        Args: { p_retain_months?: number }
        Returns: string
      }
      clear_failed_login: { Args: { p_email: string }; Returns: undefined }
      create_telemetry_partition: {
        Args: { p_date: string }
        Returns: undefined
      }
      get_active_delegate: {
        Args: { p_cost?: number; p_scope?: string; p_user_id: string }
        Returns: string
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
      initiate_work_order_approval: {
        Args: { p_work_order_id: string }
        Returns: undefined
      }
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
      refresh_telemetry_aggregates: { Args: never; Returns: undefined }
      route_vehicle_request_approval: {
        Args: { p_request_id: string }
        Returns: string
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
      trigger_webhook: {
        Args: { _event_data: Json; _event_type: string }
        Returns: undefined
      }
      user_in_organization: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
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
      ],
    },
  },
} as const
