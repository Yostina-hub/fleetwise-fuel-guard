import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
};

// Protocol detection patterns
const PROTOCOL_PATTERNS = {
  GT06: /^7878/i,           // GT06 hex prefix
  TK103: /^imei:/i,         // TK103 IMEI prefix
  H02: /^\*HQ/,             // H02/Sinotrack protocol
  OSMAND: /^id=/i,          // OsmAnd/Traccar format
  TELTONIKA: /^00000000/,   // Teltonika header (preamble)
  QUECLINK: /^\+(?:RESP|BUFF|ACK):/i, // Queclink AT-style response
  RUPTELA: /^[0-9a-fA-F]{4}00/,  // Ruptela binary (length + 0x00)
  MEITRACK: /^\$\$/,        // Meitrack $$ prefix
  YTWL: /^\*[0-9]+,/,       // YTWL format *IMEI,CMD,...#
};

// ==================== CRC/Checksum Validation Functions ====================

// CRC-16 X.25 (used by GT06 protocol)
function calculateCRC16_X25(data: Uint8Array): number {
  const polynomial = 0x8408;
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ polynomial;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc ^ 0xFFFF;
}

// Standard CRC-16
function calculateCRC16(data: Uint8Array): number {
  let crc = 0xFFFF;
  const polynomial = 0xA001;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >> 1) ^ polynomial;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc;
}

// CRC-16 CCITT (used by Queclink)
function calculateCRC16_CCITT(data: Uint8Array): number {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data[i] << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc;
}

// XOR Checksum (used by TK103, H02)
function calculateXOR(data: Uint8Array): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum ^= data[i];
  }
  return checksum;
}

// Simple additive checksum
function calculateChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]) & 0xFF;
  }
  return sum;
}

// CRC-32
function calculateCRC32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  const table: number[] = [];
  
  // Build CRC table
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Validate CRC based on type
function validateCRC(data: string, crcType: string, providedCrc?: string): { valid: boolean; calculated?: string; provided?: string } {
  if (crcType === 'none') {
    return { valid: true };
  }

  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  let calculated: number;

  switch (crcType) {
    case 'crc16_x25':
      calculated = calculateCRC16_X25(bytes);
      break;
    case 'crc16':
      calculated = calculateCRC16(bytes);
      break;
    case 'crc16_ccitt':
      calculated = calculateCRC16_CCITT(bytes);
      break;
    case 'xor':
      calculated = calculateXOR(bytes);
      break;
    case 'checksum':
      calculated = calculateChecksum(bytes);
      break;
    case 'crc32':
      calculated = calculateCRC32(bytes);
      break;
    default:
      return { valid: true }; // Unknown CRC type, skip validation
  }

  const calculatedHex = calculated.toString(16).toUpperCase().padStart(crcType.includes('32') ? 8 : 4, '0');
  
  if (!providedCrc) {
    // No CRC provided, return the calculated value for reference
    return { valid: true, calculated: calculatedHex };
  }

  const valid = calculatedHex.toLowerCase() === providedCrc.toLowerCase();
  return { valid, calculated: calculatedHex, provided: providedCrc };
}

// Detect protocol from raw data
function detectProtocol(data: string): string {
  for (const [protocol, pattern] of Object.entries(PROTOCOL_PATTERNS)) {
    if (pattern.test(data)) {
      return protocol;
    }
  }
  // Check if it's JSON
  try {
    JSON.parse(data);
    return 'JSON';
  } catch {
    // Check if URL-encoded
    if (data.includes('=') && (data.includes('imei') || data.includes('lat'))) {
      return 'URL_ENCODED';
    }
  }
  return 'UNKNOWN';
}

// Get CRC type for known protocols
function getDefaultCRCType(protocol: string): string {
  const crcMap: Record<string, string> = {
    GT06: 'crc16_x25',
    TK103: 'xor',
    H02: 'xor',
    TELTONIKA: 'crc16',
    QUECLINK: 'crc16_ccitt',
    RUPTELA: 'crc16',
    MEITRACK: 'checksum',
    YTWL: 'xor',
    CALAMP: 'crc32',
    JSON: 'none',
    URL_ENCODED: 'none',
    OSMAND: 'none',
  };
  return crcMap[protocol] || 'none';
}

// Parse different protocol formats
function parseProtocolData(rawData: string, protocol: string): Record<string, any> | null {
  switch (protocol) {
    case 'JSON':
      return JSON.parse(rawData);
    
    case 'URL_ENCODED':
      const params = new URLSearchParams(rawData);
      return Object.fromEntries(params.entries());
    
    case 'TK103':
      // Format: imei:355442200988256,tracker,1,0,1,9.0214,38.7624,45.2,90
      const tk103Match = rawData.match(/imei:(\d+),\w+,(\d+),(\d+),(\d+),([0-9.-]+),([0-9.-]+),([0-9.]+),(\d+)/);
      if (tk103Match) {
        return {
          imei: tk103Match[1],
          lat: tk103Match[5],
          lng: tk103Match[6],
          speed: tk103Match[7],
          heading: tk103Match[8],
          ignition: tk103Match[3],
        };
      }
      return null;
    
    case 'H02':
      // Format: *HQ,355442200988256,V1,123456,A,0902.1400,N,03845.7440,E,045.20,090,010123,FFFFFFFF#
      const h02Match = rawData.match(/\*HQ,(\d+),V1,\d+,A,([0-9.]+),([NS]),([0-9.]+),([EW]),([0-9.]+),(\d+)/);
      if (h02Match) {
        let lat = parseFloat(h02Match[2].slice(0, 2)) + parseFloat(h02Match[2].slice(2)) / 60;
        let lng = parseFloat(h02Match[4].slice(0, 3)) + parseFloat(h02Match[4].slice(3)) / 60;
        if (h02Match[3] === 'S') lat = -lat;
        if (h02Match[5] === 'W') lng = -lng;
        return {
          imei: h02Match[1],
          lat: lat.toString(),
          lng: lng.toString(),
          speed: h02Match[6],
          heading: h02Match[7],
        };
      }
      return null;
    
    case 'OSMAND':
      // Format: id=355442200988256&lat=9.0214&lon=38.7624&speed=45&heading=90&altitude=2400
      const osmandParams = new URLSearchParams(rawData);
      return {
        imei: osmandParams.get('id') || osmandParams.get('deviceId'),
        lat: osmandParams.get('lat'),
        lng: osmandParams.get('lon') || osmandParams.get('lng'),
        speed: osmandParams.get('speed'),
        heading: osmandParams.get('heading') || osmandParams.get('bearing'),
        altitude: osmandParams.get('altitude') || osmandParams.get('alt'),
        fuel: osmandParams.get('fuel'),
        ignition: osmandParams.get('ignition'),
      };
    
    case 'TELTONIKA':
      // Teltonika Codec 8/8E - binary format forwarded from TCP gateway as JSON
      // When forwarded, it comes as JSON with parsed fields
      return null; // Binary parsing done by TCP gateway
    
    case 'QUECLINK':
      // Format: +RESP:GTFRI,350503,864606040XXXXXX,,0,0,1,1,4.3,92,70.0,9.123456,38.654321,20250103120000,0234,0001,ABCD,1234,,100.0,10000,
      return parseQueclinkData(rawData);
    
    case 'RUPTELA':
      // Binary protocol - parsed by TCP gateway, comes as JSON
      return null; // Binary parsing done by TCP gateway
    
    case 'MEITRACK':
      // Format: $$A138,864606040XXXXXX,AAA,35,9.123456,38.654321,250103120000,A,12,24,45.2,90,1234.5,100,0.0,00000000
      return parseMeitrackData(rawData);
    
    case 'YTWL':
      // Format: *355442200988256,V1,120000,A,0912.1234,N,03845.6789,E,045.2,090,010125,80,70,1#
      return parseYTWLData(rawData);
    
    default:
      return null;
  }
}

// Parse Queclink AT-style format
function parseQueclinkData(rawData: string): Record<string, any> | null {
  // +RESP:GTFRI - Fixed Report Information
  const friMatch = rawData.match(/\+RESP:GTFRI,([^,]*),(\d{15}),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),([0-9.-]+),([0-9.-]+),(\d{14})/);
  if (friMatch) {
    return {
      imei: friMatch[2],
      lat: friMatch[11],
      lng: friMatch[12],
      speed: friMatch[9],
      heading: friMatch[10],
      altitude: friMatch[8],
      battery_voltage: friMatch[7],
      satellites: friMatch[6],
      ignition: friMatch[5] === '1',
    };
  }
  
  // +RESP:GTHBD - Heartbeat
  const hbdMatch = rawData.match(/\+RESP:GTHBD,([^,]*),(\d{15})/);
  if (hbdMatch) {
    return {
      imei: hbdMatch[2],
      heartbeat: true,
    };
  }
  
  // +RESP:GTSOS - SOS Alert
  const sosMatch = rawData.match(/\+RESP:GTSOS,([^,]*),(\d{15}),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,([0-9.-]+),([0-9.-]+)/);
  if (sosMatch) {
    return {
      imei: sosMatch[2],
      lat: sosMatch[3],
      lng: sosMatch[4],
      alert_type: 'SOS',
    };
  }
  
  return null;
}

// Parse Meitrack format
function parseMeitrackData(rawData: string): Record<string, any> | null {
  // $$A - Standard position report
  const match = rawData.match(/\$\$[A-Z](\d+),(\d{15}),AAA,(\d+),([0-9.-]+),([0-9.-]+),(\d{12}),([AV]),(\d+),(\d+),([0-9.]+),(\d+),([0-9.]+),(\d+),([0-9.]+)/);
  if (match) {
    return {
      imei: match[2],
      event_code: match[3],
      lat: match[4],
      lng: match[5],
      gps_valid: match[7] === 'A',
      satellites: match[8],
      gsm_signal: match[9],
      speed: match[10],
      heading: match[11],
      altitude: match[12],
      odometer: match[13],
      fuel: match[14],
    };
  }
  
  // $$B - Heartbeat/status
  const hbMatch = rawData.match(/\$\$[B](\d+),(\d{15}),BBB/);
  if (hbMatch) {
    return {
      imei: hbMatch[2],
      heartbeat: true,
    };
  }
  
  return null;
}

// Parse YTWL Speed Governor format
function parseYTWLData(rawData: string): Record<string, any> | null {
  // Format: *IMEI,CMD,TIME,STATUS,LAT,NS,LNG,EW,SPEED,HEADING,DATE,LIMIT,CURRENT,FLAGS#
  const match = rawData.match(/\*(\d+),([A-Z0-9]+),(\d{6}),([AV]),([0-9.]+),([NS]),([0-9.]+),([EW]),([0-9.]+),(\d+),(\d{6}),(\d+),(\d+),([^#]*)/);
  if (match) {
    let lat = parseFloat(match[5].slice(0, 2)) + parseFloat(match[5].slice(2)) / 60;
    let lng = parseFloat(match[7].slice(0, 3)) + parseFloat(match[7].slice(3)) / 60;
    if (match[6] === 'S') lat = -lat;
    if (match[8] === 'W') lng = -lng;
    
    return {
      imei: match[1],
      command: match[2],
      lat: lat.toString(),
      lng: lng.toString(),
      speed: match[9],
      heading: match[10],
      gps_valid: match[4] === 'A',
      speed_limit: match[12],
      current_speed: match[13],
      governor_flags: match[14],
    };
  }
  
  // JSON format from TCP gateway
  try {
    if (rawData.includes('{')) {
      return JSON.parse(rawData);
    }
  } catch (e) {
    // Not JSON
  }
  
  return null;
}

// Check if this telemetry indicates trip start/end
async function detectTripTransition(
  supabase: any,
  vehicleId: string,
  organizationId: string,
  currentIgnition: boolean,
  lat: number,
  lng: number
) {
  // Get the last telemetry for this vehicle
  const { data: lastTelemetry } = await supabase
    .from('vehicle_telemetry')
    .select('ignition_on, latitude, longitude, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const previousIgnition = lastTelemetry?.ignition_on ?? false;

  // Trip start: ignition turned ON
  if (currentIgnition && !previousIgnition) {
    // Get driver for this vehicle
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('assigned_driver_id')
      .eq('id', vehicleId)
      .single();

    const { error: tripError } = await supabase
      .from('trips')
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: vehicle?.assigned_driver_id || null,
        start_time: new Date().toISOString(),
        start_location: { lat, lng },
        status: 'in_progress',
      });

    if (tripError) {
      console.error('Error creating trip:', tripError);
    } else {
      console.log('Trip started for vehicle:', vehicleId);
    }
  }

  // Trip end: ignition turned OFF
  if (!currentIgnition && previousIgnition) {
    // Find the active trip and complete it
    const { data: activeTrip } = await supabase
      .from('trips')
      .select('id, start_location, start_time')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'in_progress')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (activeTrip) {
      const startTime = new Date(activeTrip.start_time);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      // Calculate approximate distance (simplified - for actual use, sum telemetry points)
      const startLat = activeTrip.start_location?.lat || lat;
      const startLng = activeTrip.start_location?.lng || lng;
      const distance = calculateDistance(startLat, startLng, lat, lng);

      const { error: updateError } = await supabase
        .from('trips')
        .update({
          end_time: endTime.toISOString(),
          end_location: { lat, lng },
          duration_minutes: durationMinutes,
          distance_km: distance,
          status: 'completed',
        })
        .eq('id', activeTrip.id);

      if (updateError) {
        console.error('Error completing trip:', updateError);
      } else {
        console.log('Trip completed for vehicle:', vehicleId);
      }
    }
  }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimal places
}

// Process a single GPS data point
async function processGPSData(
  supabase: any,
  data: Record<string, any>,
  rawData: string,
  protocol: string,
  deviceToken?: string
) {
  const {
    imei,
    lat,
    lng,
    speed,
    fuel,
    ignition,
    altitude,
    heading,
    satellites,
    signal_strength,
    odometer,
    hdop,
    battery,
  } = data;

  if (!imei || !lat || !lng) {
    return { error: 'Missing required fields: imei, lat, lng', status: 400 };
  }

  // Find device by IMEI (optionally verify auth token)
  let deviceQuery = supabase
    .from('devices')
    .select('id, vehicle_id, organization_id, auth_token')
    .eq('imei', imei);

  const { data: device, error: deviceError } = await deviceQuery.single();

  if (deviceError || !device) {
    console.error('Device not found:', imei, deviceError);
    return { error: 'Device not found with IMEI: ' + imei, status: 404 };
  }

  // Verify auth token if provided and device has one configured
  if (device.auth_token && deviceToken && device.auth_token !== deviceToken) {
    console.error('Invalid device token for IMEI:', imei);
    return { error: 'Invalid device authentication token', status: 401 };
  }

  // Update device last_heartbeat
  const { error: heartbeatError } = await supabase
    .from('devices')
    .update({ 
      last_heartbeat: new Date().toISOString(),
      status: 'active'
    })
    .eq('id', device.id);

  if (heartbeatError) {
    console.warn('Error updating device heartbeat:', heartbeatError);
  }

  // Log raw telemetry for debugging
  const { error: rawLogError } = await supabase
    .from('telemetry_raw')
    .insert({
      organization_id: device.organization_id,
      device_id: device.id,
      protocol: protocol,
      raw_hex: rawData.substring(0, 1000), // Limit to 1000 chars
      parsed_payload: data,
      processing_status: 'processed',
    });

  if (rawLogError) {
    console.warn('Error logging raw telemetry:', rawLogError);
  }

  // Validate CRC if enabled for this protocol
  const crcType = getDefaultCRCType(protocol);
  const crcValidation = validateCRC(rawData, crcType, data.crc || data.checksum);
  
  if (!crcValidation.valid) {
    console.warn(`CRC validation failed for device ${imei}: expected ${crcValidation.calculated}, got ${crcValidation.provided}`);
    // Log the failure but continue processing (for now, as some devices may not send CRC)
  }

  // Insert telemetry data if vehicle is linked
  if (device.vehicle_id) {
    const speedValue = speed ? parseFloat(speed) : 0;
    const ignitionState = ignition === '1' || ignition === 'true' || ignition === true;
    const latValue = parseFloat(lat);
    const lngValue = parseFloat(lng);
    
    // Detect trip start/end based on ignition
    await detectTripTransition(
      supabase,
      device.vehicle_id,
      device.organization_id,
      ignitionState,
      latValue,
      lngValue
    );

    // Extract extended telemetry fields
    const {
      engine_hours,
      battery_voltage,
      external_voltage,
      gsm_signal,
      temperature_1,
      temperature_2,
      driver_rfid,
      harsh_acceleration,
      harsh_braking,
      harsh_cornering,
      dtc_codes,
      can_data,
      io_elements,
    } = data;

    const telemetryData = {
      vehicle_id: device.vehicle_id,
      organization_id: device.organization_id,
      latitude: latValue,
      longitude: lngValue,
      speed_kmh: speedValue,
      fuel_level_percent: fuel ? parseFloat(fuel) : null,
      engine_on: ignitionState,
      ignition_on: ignitionState,
      heading: heading ? parseFloat(heading) : null,
      altitude_meters: altitude ? parseFloat(altitude) : null,
      odometer_km: odometer ? parseFloat(odometer) : null,
      gps_satellites_count: satellites ? parseInt(satellites) : null,
      gps_signal_strength: signal_strength ? parseInt(signal_strength) : null,
      gps_hdop: hdop ? parseFloat(hdop) : null,
      device_connected: true,
      last_communication_at: new Date().toISOString(),
      // Extended telemetry fields
      engine_hours: engine_hours ? parseFloat(engine_hours) : null,
      battery_voltage: battery_voltage ? parseFloat(battery_voltage) : null,
      external_voltage: external_voltage ? parseFloat(external_voltage) : null,
      gsm_signal_strength: gsm_signal ? parseInt(gsm_signal) : null,
      temperature_1: temperature_1 ? parseFloat(temperature_1) : null,
      temperature_2: temperature_2 ? parseFloat(temperature_2) : null,
      driver_rfid: driver_rfid || null,
      harsh_acceleration: harsh_acceleration === true || harsh_acceleration === '1',
      harsh_braking: harsh_braking === true || harsh_braking === '1',
      harsh_cornering: harsh_cornering === true || harsh_cornering === '1',
      dtc_codes: dtc_codes || null,
      can_data: can_data || null,
      io_elements: io_elements || null,
    };

    console.log('Inserting telemetry data:', telemetryData);

    const { error: telemetryError } = await supabase
      .from('vehicle_telemetry')
      .insert(telemetryData);

    if (telemetryError) {
      console.error('Error inserting telemetry:', telemetryError);
      return { error: 'Failed to store telemetry data', details: telemetryError.message, status: 500 };
    }

    // Get speed limit from speed governor config
    const { data: governorConfig } = await supabase
      .from('speed_governor_config')
      .select('max_speed_limit, governor_active')
      .eq('vehicle_id', device.vehicle_id)
      .eq('governor_active', true)
      .single();

    const speedLimit = governorConfig?.max_speed_limit || 80;

    // Check for overspeed and trigger penalty
    if (speedValue > speedLimit) {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('assigned_driver_id')
        .eq('id', device.vehicle_id)
        .single();

      if (vehicleData?.assigned_driver_id) {
        try {
          await supabase.functions.invoke('process-driver-penalties', {
            body: {
              action: 'process_overspeed',
              data: {
                organization_id: device.organization_id,
                driver_id: vehicleData.assigned_driver_id,
                vehicle_id: device.vehicle_id,
                speed_kmh: speedValue,
                speed_limit_kmh: speedLimit,
                lat: latValue,
                lng: lngValue,
                violation_time: new Date().toISOString(),
              },
            },
          });
          console.log('Overspeed penalty triggered for driver:', vehicleData.assigned_driver_id);
        } catch (penaltyError) {
          console.error('Error triggering overspeed penalty:', penaltyError);
        }
      }
    }

    // Trigger geofence processing
    try {
      await supabase.functions.invoke('process-geofence-events', {
        body: {
          vehicle_id: device.vehicle_id,
          lat: latValue,
          lng: lngValue,
          speed_kmh: speedValue,
          organization_id: device.organization_id,
        },
      });
    } catch (geofenceError) {
      console.error('Error processing geofence events:', geofenceError);
    }
  }

  return { 
    success: true, 
    message: 'GPS data received successfully',
    device_id: device.id,
    protocol: protocol,
    crc_validation: crcValidation,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get optional device token from header
    const deviceToken = req.headers.get('x-device-token') || undefined;

    // Parse incoming GPS data
    const contentType = req.headers.get('content-type');
    let rawData: string;
    let parsedData: Record<string, any> | null = null;
    let protocol = 'UNKNOWN';

    if (contentType?.includes('application/json')) {
      rawData = await req.text();
      const jsonData = JSON.parse(rawData);
      
      // Check for batch data
      if (Array.isArray(jsonData)) {
        // Batch processing
        console.log(`Processing batch of ${jsonData.length} GPS records`);
        const results = [];
        
        for (const item of jsonData) {
          const result = await processGPSData(supabase, item, JSON.stringify(item), 'JSON', deviceToken);
          results.push(result);
        }
        
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.length - successCount;
        
        return new Response(
          JSON.stringify({ 
            success: true,
            batch: true,
            total: results.length,
            successful: successCount,
            failed: errorCount,
            results: results.slice(0, 10), // Return first 10 results
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      protocol = 'JSON';
      parsedData = jsonData;
    } else {
      // Handle URL-encoded or text data
      rawData = await req.text();
      console.log('Received GPS data:', rawData);
      
      // Detect protocol
      protocol = detectProtocol(rawData);
      console.log('Detected protocol:', protocol);
      
      // Parse based on detected protocol
      parsedData = parseProtocolData(rawData, protocol);
    }

    if (!parsedData) {
      return new Response(
        JSON.stringify({ 
          error: 'Unable to parse GPS data',
          protocol: protocol,
          hint: 'Supported formats: JSON, URL-encoded, TK103, H02, OsmAnd'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed GPS data:', parsedData);

    const result = await processGPSData(supabase, parsedData, rawData, protocol, deviceToken);
    
    if (result.error) {
      return new Response(
        JSON.stringify(result),
        { status: result.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing GPS data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
