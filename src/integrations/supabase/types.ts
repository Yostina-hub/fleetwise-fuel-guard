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
      incidents: {
        Row: {
          actual_cost: number | null
          created_at: string
          description: string
          driver_id: string | null
          estimated_cost: number | null
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
          created_at?: string
          description: string
          driver_id?: string | null
          estimated_cost?: number | null
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
          created_at?: string
          description?: string
          driver_id?: string | null
          estimated_cost?: number | null
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
          category: string
          created_at: string
          current_quantity: number
          id: string
          minimum_quantity: number | null
          organization_id: string
          part_name: string
          part_number: string
          unit_cost: number | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          current_quantity?: number
          id?: string
          minimum_quantity?: number | null
          organization_id: string
          part_name: string
          part_number: string
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_quantity?: number
          id?: string
          minimum_quantity?: number | null
          organization_id?: string
          part_name?: string
          part_number?: string
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: []
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
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          id: string
          notification_types: Json | null
          organization_id: string
          push_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notification_types?: Json | null
          organization_id: string
          push_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          notification_types?: Json | null
          organization_id?: string
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
          company_name: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          date_format: string | null
          default_language: string | null
          default_timezone: string | null
          distance_unit: string | null
          enable_2fa: boolean | null
          enable_api_access: boolean | null
          enable_mobile_access: boolean | null
          enable_sso: boolean | null
          enforce_2fa: boolean | null
          favicon_url: string | null
          from_email: string | null
          from_name: string | null
          id: string
          logo_url: string | null
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          time_format: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          date_format?: string | null
          default_language?: string | null
          default_timezone?: string | null
          distance_unit?: string | null
          enable_2fa?: boolean | null
          enable_api_access?: boolean | null
          enable_mobile_access?: boolean | null
          enable_sso?: boolean | null
          enforce_2fa?: boolean | null
          favicon_url?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          time_format?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          date_format?: string | null
          default_language?: string | null
          default_timezone?: string | null
          distance_unit?: string | null
          enable_2fa?: boolean | null
          enable_api_access?: boolean | null
          enable_mobile_access?: boolean | null
          enable_sso?: boolean | null
          enforce_2fa?: boolean | null
          favicon_url?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          time_format?: string | null
          updated_at?: string
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
          cost_center_id: string | null
          created_at: string
          drop_geofence_id: string | null
          id: string
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
          return_at: string
          sla_deadline_at: string | null
          special_requirements: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          cost_center_id?: string | null
          created_at?: string
          drop_geofence_id?: string | null
          id?: string
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
          return_at: string
          sla_deadline_at?: string | null
          special_requirements?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          cost_center_id?: string | null
          created_at?: string
          drop_geofence_id?: string | null
          id?: string
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
      vehicle_telemetry: {
        Row: {
          created_at: string
          device_connected: boolean | null
          engine_on: boolean | null
          fuel_level_percent: number | null
          gps_fix_type: string | null
          gps_hdop: number | null
          gps_satellites_count: number | null
          gps_signal_strength: number | null
          heading: number | null
          id: string
          last_communication_at: string | null
          latitude: number | null
          longitude: number | null
          organization_id: string
          speed_kmh: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          device_connected?: boolean | null
          engine_on?: boolean | null
          fuel_level_percent?: number | null
          gps_fix_type?: string | null
          gps_hdop?: number | null
          gps_satellites_count?: number | null
          gps_signal_strength?: number | null
          heading?: number | null
          id?: string
          last_communication_at?: string | null
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          speed_kmh?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          device_connected?: boolean | null
          engine_on?: boolean | null
          fuel_level_percent?: number | null
          gps_fix_type?: string | null
          gps_hdop?: number | null
          gps_satellites_count?: number | null
          gps_signal_strength?: number | null
          heading?: number | null
          id?: string
          last_communication_at?: string | null
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          speed_kmh?: number | null
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
            foreignKeyName: "driver_behavior_scores_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
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
