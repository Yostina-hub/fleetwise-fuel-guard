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
      devices: {
        Row: {
          apn: string | null
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
            foreignKeyName: "devices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      drivers: {
        Row: {
          avatar_url: string | null
          bluetooth_id: string | null
          created_at: string
          email: string | null
          employee_id: string | null
          first_name: string
          hire_date: string | null
          ibutton_id: string | null
          id: string
          last_name: string
          license_class: string | null
          license_expiry: string | null
          license_number: string
          notes: string | null
          organization_id: string
          phone: string | null
          rfid_tag: string | null
          safety_score: number | null
          status: string | null
          total_distance_km: number | null
          total_trips: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bluetooth_id?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          first_name: string
          hire_date?: string | null
          ibutton_id?: string | null
          id?: string
          last_name: string
          license_class?: string | null
          license_expiry?: string | null
          license_number: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          rfid_tag?: string | null
          safety_score?: number | null
          status?: string | null
          total_distance_km?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bluetooth_id?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          first_name?: string
          hire_date?: string | null
          ibutton_id?: string | null
          id?: string
          last_name?: string
          license_class?: string | null
          license_expiry?: string | null
          license_number?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          rfid_tag?: string | null
          safety_score?: number | null
          status?: string | null
          total_distance_km?: number | null
          total_trips?: number | null
          updated_at?: string
          user_id?: string | null
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
      fuel_transactions: {
        Row: {
          card_number: string | null
          created_at: string
          fuel_amount_liters: number
          fuel_cost: number | null
          fuel_price_per_liter: number | null
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
          fuel_cost?: number | null
          fuel_price_per_liter?: number | null
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
          fuel_cost?: number | null
          fuel_price_per_liter?: number | null
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
          event_time: string
          event_type: string
          geofence_id: string
          id: string
          lat: number | null
          lng: number | null
          organization_id: string
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          event_time: string
          event_type: string
          geofence_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id: string
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          event_time?: string
          event_type?: string
          geofence_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string
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
          address: string | null
          category: string
          center_lat: number | null
          center_lng: number | null
          created_at: string
          geometry_type: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string
          polygon_points: Json | null
          radius_meters: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category: string
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          geometry_type: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          organization_id: string
          polygon_points?: Json | null
          radius_meters?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          geometry_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string
          polygon_points?: Json | null
          radius_meters?: number | null
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
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      trips: {
        Row: {
          avg_speed_kmh: number | null
          created_at: string
          distance_km: number | null
          driver_id: string | null
          duration_minutes: number | null
          end_fuel_level: number | null
          end_location: Json | null
          end_odometer: number | null
          end_time: string | null
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
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          duration_minutes?: number | null
          end_fuel_level?: number | null
          end_location?: Json | null
          end_odometer?: number | null
          end_time?: string | null
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
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          avg_speed_kmh?: number | null
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          duration_minutes?: number | null
          end_fuel_level?: number | null
          end_location?: Json | null
          end_odometer?: number | null
          end_time?: string | null
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
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
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
      vehicles: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          color: string | null
          created_at: string
          depot_id: string | null
          depreciation_rate: number | null
          engine_hours: number | null
          fuel_type: string
          id: string
          make: string
          model: string
          notes: string | null
          odometer_km: number | null
          organization_id: string
          ownership_type: string | null
          plate_number: string
          status: string
          tank_capacity_liters: number
          updated_at: string
          vin: string | null
          year: number
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          color?: string | null
          created_at?: string
          depot_id?: string | null
          depreciation_rate?: number | null
          engine_hours?: number | null
          fuel_type: string
          id?: string
          make: string
          model: string
          notes?: string | null
          odometer_km?: number | null
          organization_id: string
          ownership_type?: string | null
          plate_number: string
          status?: string
          tank_capacity_liters: number
          updated_at?: string
          vin?: string | null
          year: number
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          color?: string | null
          created_at?: string
          depot_id?: string | null
          depreciation_rate?: number | null
          engine_hours?: number | null
          fuel_type?: string
          id?: string
          make?: string
          model?: string
          notes?: string | null
          odometer_km?: number | null
          organization_id?: string
          ownership_type?: string | null
          plate_number?: string
          status?: string
          tank_capacity_liters?: number
          updated_at?: string
          vin?: string | null
          year?: number
        }
        Relationships: [
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
      work_orders: {
        Row: {
          attachments: Json | null
          completed_date: string | null
          created_at: string
          id: string
          labor_cost: number | null
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
          work_order_number: string
          work_type: string
        }
        Insert: {
          attachments?: Json | null
          completed_date?: string | null
          created_at?: string
          id?: string
          labor_cost?: number | null
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
          work_order_number: string
          work_type: string
        }
        Update: {
          attachments?: Json | null
          completed_date?: string | null
          created_at?: string
          id?: string
          labor_cost?: number | null
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
          work_order_number?: string
          work_type?: string
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization: { Args: { _user_id: string }; Returns: string }
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
      trigger_webhook: {
        Args: { _event_data: Json; _event_type: string }
        Returns: undefined
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
      ],
    },
  },
} as const
