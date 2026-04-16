// Pre-defined device compatibility profiles for hybrid protocol + model support
export interface CompatibilityProfileSeed {
  vendor: string;
  model_name: string;
  protocol_name: string;
  supported_commands: string[];
  capabilities: Record<string, unknown>;
  telemetry_fields: string[];
  setup_config: Record<string, unknown>;
  command_templates: Record<string, unknown>;
}

export const compatibilityProfileSeeds: CompatibilityProfileSeed[] = [
  // === Teltonika ===
  {
    vendor: "Teltonika",
    model_name: "FMB920",
    protocol_name: "teltonika",
    supported_commands: ["engine_cut", "engine_restore", "get_location", "set_interval", "restart_device", "read_io"],
    capabilities: {
      fuel_sensor: true, can_bus: true, rfid: true, temperature: true,
      digital_inputs: 4, analog_inputs: 2, digital_outputs: 2,
      harsh_driving: true, tow_detection: true, ble: false
    },
    telemetry_fields: ["speed", "heading", "altitude", "satellites", "hdop", "fuel_percent", "fuel_liters", "temp_1", "temp_2", "temp_3", "ignition", "battery_v", "external_v", "gsm_signal", "odometer", "engine_hours", "rpm", "acceleration", "braking", "cornering", "idling"],
    setup_config: { default_port: 5027, codec: "codec8_extended", ack_required: true },
    command_templates: {
      engine_cut: { type: "gprs", payload: "setdigout 1" },
      engine_restore: { type: "gprs", payload: "setdigout 0" },
      get_location: { type: "gprs", payload: "getinfo" },
      restart_device: { type: "gprs", payload: "cpureset" }
    }
  },
  {
    vendor: "Teltonika",
    model_name: "FMB640",
    protocol_name: "teltonika",
    supported_commands: ["engine_cut", "engine_restore", "get_location", "set_interval", "restart_device", "read_io", "read_can"],
    capabilities: {
      fuel_sensor: true, can_bus: true, rfid: true, temperature: true,
      digital_inputs: 6, analog_inputs: 2, digital_outputs: 2,
      harsh_driving: true, tow_detection: true, ble: true, tachograph: true
    },
    telemetry_fields: ["speed", "heading", "altitude", "fuel_level", "fuel_consumption", "temp_1", "temp_2", "temp_3", "temp_4", "driver_id", "cargo_door", "panic_button", "trailer_status", "pto_status", "battery_v", "ignition", "odometer", "trip_distance", "engine_hours", "coolant_temp", "rpm"],
    setup_config: { default_port: 5027, codec: "codec8_extended", ack_required: true },
    command_templates: {
      engine_cut: { type: "gprs", payload: "setdigout 1" },
      engine_restore: { type: "gprs", payload: "setdigout 0" },
      read_can: { type: "gprs", payload: "readcan" }
    }
  },
  // === Queclink ===
  {
    vendor: "Queclink",
    model_name: "GV300",
    protocol_name: "queclink",
    supported_commands: ["engine_cut", "engine_restore", "get_location", "set_interval", "restart_device"],
    capabilities: {
      fuel_sensor: true, can_bus: true, rfid: true, temperature: true,
      digital_inputs: 4, analog_inputs: 4, digital_outputs: 1,
      harsh_driving: true, tow_detection: false, ble: false
    },
    telemetry_fields: ["speed", "heading", "altitude", "fuel_percent", "fuel_liters", "fuel_rate", "temp_1", "temp_2", "driver_rfid", "harsh_acceleration", "harsh_braking", "harsh_cornering", "ignition", "main_power_v", "backup_battery_v", "gsm_signal", "odometer", "engine_rpm", "throttle_position"],
    setup_config: { default_port: 5030, protocol_version: "v2", ack_required: true },
    command_templates: {
      engine_cut: { type: "at", payload: "AT+GTOUT=gv300,1,0,0,0,0,0,0,0,0$" },
      engine_restore: { type: "at", payload: "AT+GTOUT=gv300,0,0,0,0,0,0,0,0,0$" },
      get_location: { type: "at", payload: "AT+GTRTO=gv300,1$" }
    }
  },
  {
    vendor: "Queclink",
    model_name: "GV600",
    protocol_name: "queclink",
    supported_commands: ["engine_cut", "engine_restore", "get_location", "set_interval", "restart_device"],
    capabilities: {
      fuel_sensor: true, can_bus: false, rfid: true, temperature: true,
      digital_inputs: 4, analog_inputs: 2, digital_outputs: 1,
      harsh_driving: true, tow_detection: true, ble: false, waterproof: "IP67",
      rs485: true, crash_detection: true, lte_4g: true
    },
    telemetry_fields: ["speed", "heading", "altitude", "satellites", "hdop", "fuel_percent_rs485", "fuel_liters", "temp_1", "temp_2", "temp_3", "ignition", "battery_v", "external_v", "gsm_signal", "odometer", "engine_hours", "harsh_acceleration", "harsh_braking", "harsh_cornering", "driver_rfid", "crash_event", "tow_alert"],
    setup_config: { default_port: 5030, protocol_version: "v2", ack_required: true },
    command_templates: {
      engine_cut: { type: "at", payload: "AT+GTOUT=gv600,1,0,0,0,0,0,0,0,0$" },
      engine_restore: { type: "at", payload: "AT+GTOUT=gv600,0,0,0,0,0,0,0,0,0$" }
    }
  },
  // === Ruptela ===
  {
    vendor: "Ruptela",
    model_name: "Pro5",
    protocol_name: "ruptela",
    supported_commands: ["engine_cut", "engine_restore", "get_location", "set_interval", "read_fuel"],
    capabilities: {
      fuel_sensor: true, fuel_sensor_count: 5, can_bus: true, rfid: true,
      temperature: true, temp_sensor_count: 8,
      digital_inputs: 8, analog_inputs: 4, digital_outputs: 4,
      harsh_driving: true, tachograph: true, eco_driving: true
    },
    telemetry_fields: ["speed", "course", "altitude", "fuel_tank_1", "fuel_tank_2", "fuel_tank_3", "fuel_tank_4", "fuel_tank_5", "total_fuel", "fuel_consumption", "temp_1", "temp_2", "temp_3", "temp_4", "temp_5", "temp_6", "temp_7", "temp_8", "driver_1_id", "driver_2_id", "ignition", "power_supply", "battery", "gsm_strength", "odometer", "engine_hours", "eco_score"],
    setup_config: { default_port: 5031, data_format: "bin", ack_required: true },
    command_templates: {
      engine_cut: { type: "binary", payload: "0x01" },
      engine_restore: { type: "binary", payload: "0x02" },
      read_fuel: { type: "binary", payload: "0x10" }
    }
  },
  // === GT06/Concox ===
  {
    vendor: "Concox",
    model_name: "GT06N",
    protocol_name: "gt06",
    supported_commands: ["engine_cut", "engine_restore", "get_location"],
    capabilities: {
      fuel_sensor: false, can_bus: false, rfid: false, temperature: false,
      digital_inputs: 1, analog_inputs: 0, digital_outputs: 1,
      harsh_driving: false, sos: true, geo_fence: true
    },
    telemetry_fields: ["speed", "direction", "satellites", "gsm_signal", "battery_level", "external_power", "ignition", "movement_alert", "overspeed_alert"],
    setup_config: { default_port: 5023, protocol_version: "gt06", ack_required: true },
    command_templates: {
      engine_cut: { type: "sms", payload: "relay,1#" },
      engine_restore: { type: "sms", payload: "relay,0#" },
      get_location: { type: "sms", payload: "where#" }
    }
  },
  {
    vendor: "Concox",
    model_name: "AT4",
    protocol_name: "gt06",
    supported_commands: ["engine_cut", "engine_restore", "get_location", "listen"],
    capabilities: {
      fuel_sensor: false, can_bus: false, rfid: false, temperature: false,
      digital_inputs: 1, analog_inputs: 0, digital_outputs: 1,
      harsh_driving: false, sos: true, lte_4g: true, voice_monitoring: true, relay: true
    },
    telemetry_fields: ["speed", "heading", "ignition", "battery_percent", "external_power_v", "movement", "towing_alert", "vibration", "geofence_status"],
    setup_config: { default_port: 5023, protocol_version: "gt06", ack_required: true },
    command_templates: {
      engine_cut: { type: "sms", payload: "relay,1#" },
      engine_restore: { type: "sms", payload: "relay,0#" },
      listen: { type: "sms", payload: "monitor#" }
    }
  },
  // === Coban TK103 ===
  {
    vendor: "Coban",
    model_name: "TK103",
    protocol_name: "tk103",
    supported_commands: ["engine_cut", "engine_restore", "get_location"],
    capabilities: {
      fuel_sensor: false, can_bus: false, rfid: false, temperature: false,
      digital_inputs: 1, analog_inputs: 0, digital_outputs: 1,
      harsh_driving: false, sos: true, geo_fence: true
    },
    telemetry_fields: ["speed", "battery_status", "gsm_signal", "acc_status", "door_alarm", "sos_status"],
    setup_config: { default_port: 5013, ack_required: false },
    command_templates: {
      engine_cut: { type: "sms", payload: "stop123456" },
      engine_restore: { type: "sms", payload: "resume123456" },
      get_location: { type: "sms", payload: "fix030s***n123456" }
    }
  },
  // === YTWL Speed Governor ===
  {
    vendor: "YTWL (Thingsasys)",
    model_name: "CA100F",
    protocol_name: "ytwl",
    supported_commands: ["engine_cut", "engine_restore", "set_speed_limit", "get_location", "set_interval"],
    capabilities: {
      fuel_sensor: false, can_bus: false, rfid: false, temperature: false,
      digital_inputs: 2, analog_inputs: 0, digital_outputs: 1,
      speed_governor: true, speed_limiting: true, remote_speed_control: true,
      compliance_reports: true, voice_warnings: true
    },
    telemetry_fields: ["speed", "max_speed_setting", "speed_limit_status", "overspeed_events", "governor_active", "ignition", "odometer", "trip_distance", "engine_hours", "battery_v", "gsm_signal", "satellites", "tamper_alerts", "compliance_score"],
    setup_config: { default_port: 5032, ack_required: true },
    command_templates: {
      engine_cut: { type: "binary", payload: "cutoff" },
      engine_restore: { type: "binary", payload: "restore" },
      set_speed_limit: { type: "binary", payload: "setspeed:{value}" }
    }
  },
  // === Sinotrack H02 ===
  {
    vendor: "Sinotrack",
    model_name: "ST-901",
    protocol_name: "h02",
    supported_commands: ["get_location"],
    capabilities: {
      fuel_sensor: false, can_bus: false, rfid: false, temperature: false,
      digital_inputs: 0, analog_inputs: 0, digital_outputs: 0,
      waterproof: "IP65", built_in_battery: true
    },
    telemetry_fields: ["speed", "direction", "battery_level", "gsm_signal", "movement_status", "geofence_status"],
    setup_config: { default_port: 5023, ack_required: false },
    command_templates: {
      get_location: { type: "sms", payload: "WHERE#" }
    }
  }
];

// Utility to get capability label and icon mapping
export const CAPABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  fuel_sensor: { label: "Fuel Sensor", icon: "⛽" },
  can_bus: { label: "CAN Bus", icon: "🔌" },
  rfid: { label: "RFID/iButton", icon: "🪪" },
  temperature: { label: "Temperature", icon: "🌡️" },
  harsh_driving: { label: "Harsh Driving", icon: "⚠️" },
  tow_detection: { label: "Tow Detection", icon: "🚛" },
  ble: { label: "Bluetooth LE", icon: "📶" },
  tachograph: { label: "Tachograph", icon: "📊" },
  eco_driving: { label: "Eco Driving", icon: "🌱" },
  speed_governor: { label: "Speed Governor", icon: "🚦" },
  crash_detection: { label: "Crash Detection", icon: "💥" },
  waterproof: { label: "Waterproof", icon: "💧" },
  sos: { label: "SOS Button", icon: "🆘" },
  voice_monitoring: { label: "Voice Monitor", icon: "🎤" },
  relay: { label: "Relay Control", icon: "⚡" },
  lte_4g: { label: "4G LTE", icon: "📡" },
  rs485: { label: "RS-485", icon: "🔗" },
};

export const COMMAND_LABELS: Record<string, { label: string; description: string }> = {
  engine_cut: { label: "Engine Cut-off", description: "Remotely stop the vehicle engine" },
  engine_restore: { label: "Engine Restore", description: "Re-enable the vehicle engine" },
  get_location: { label: "Get Location", description: "Request current GPS position" },
  set_interval: { label: "Set Interval", description: "Change reporting frequency" },
  restart_device: { label: "Restart Device", description: "Remotely reboot the tracker" },
  read_io: { label: "Read I/O", description: "Read digital/analog input states" },
  read_can: { label: "Read CAN", description: "Read CAN bus data" },
  read_fuel: { label: "Read Fuel", description: "Request fuel sensor reading" },
  set_speed_limit: { label: "Set Speed Limit", description: "Configure maximum speed" },
  listen: { label: "Voice Monitor", description: "Activate voice monitoring" },
};
