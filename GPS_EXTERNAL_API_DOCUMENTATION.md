# GPS External API Documentation

## Overview

The GPS External API is a standardized REST endpoint that allows external GPS tracking systems, gateways, or middleware to push vehicle telemetry data into FleetTrack FMS. This API provides a clean, protocol-agnostic interface that abstracts away the complexity of various GPS device protocols.

**Base URL:**
```
https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api
```

---

## Authentication

The API is open by design to accept data from GPS gateways. For additional security, you can include an optional API key header:

```http
x-api-key: your_api_key_here
```

---

## Quick Start

### Minimal Request (Single Location Update)

```bash
curl -X POST https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "868166056739147",
    "latitude": 9.0123,
    "longitude": 38.7456
  }'
```

### Response

```json
{
  "success": true,
  "message": "Telemetry received",
  "device_id": "uuid-here",
  "vehicle_id": "uuid-here",
  "processed_at": "2026-01-04T12:30:00.000Z"
}
```

---

## Request Formats

### 1. Single Record

Send a single telemetry update for one device.

**Endpoint:** `POST /functions/v1/gps-external-api`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "imei": "868166056739147",
  "timestamp": "2026-01-04T12:30:00Z",
  "latitude": 9.0123,
  "longitude": 38.7456,
  "speed_kmh": 45.5,
  "heading": 180,
  "ignition": true,
  "fuel_level_percent": 75
}
```

---

### 2. Batch Records

Send up to 100 telemetry records in a single request for efficiency.

**Body:**
```json
{
  "records": [
    {
      "imei": "868166056739147",
      "latitude": 9.0123,
      "longitude": 38.7456,
      "speed_kmh": 45.5,
      "timestamp": "2026-01-04T12:30:00Z"
    },
    {
      "imei": "868166056739148",
      "latitude": 9.0234,
      "longitude": 38.7567,
      "speed_kmh": 60.0,
      "timestamp": "2026-01-04T12:30:05Z"
    }
  ]
}
```

**Batch Response:**
```json
{
  "success": true,
  "batch": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "errors": []
}
```

---

### 3. Status Update (No Location)

For heartbeats, login, and alarm events that don't require GPS coordinates.

**Body:**
```json
{
  "imei": "868166056739147",
  "event_type": "heartbeat",
  "ignition": true,
  "battery_voltage": 12.6
}
```

**Valid event_type values:**
- `login` - Device connected to server
- `heartbeat` - Periodic keep-alive
- `alarm` - Alarm event (requires `alarm_type`)

---

## Complete Field Reference

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `imei` | string | Device IMEI (15 digits). Must be registered in the system. |

### Location Fields

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `latitude` | number | -90 to 90 | Latitude in decimal degrees |
| `longitude` | number | -180 to 180 | Longitude in decimal degrees |
| `altitude_m` | number | - | Altitude in meters above sea level |
| `heading` | number | 0 to 360 | Direction of travel in degrees (0 = North) |

### Speed & Movement

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `speed_kmh` | number | km/h | Current speed |
| `odometer_km` | number | km | Total distance traveled |

### Vehicle Status

| Field | Type | Description |
|-------|------|-------------|
| `ignition` | boolean | Ignition on (true) or off (false) |
| `engine_on` | boolean | Engine running status |

### Fuel Monitoring

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `fuel_level_percent` | number | 0-100 | Fuel tank level as percentage |
| `fuel_liters` | number | - | Fuel level in liters (alternative) |

### GPS Quality

| Field | Type | Description |
|-------|------|-------------|
| `gps_satellites` | number | Number of satellites in view |
| `gps_signal_strength` | number | Signal strength 0-100 |
| `gps_hdop` | number | Horizontal Dilution of Precision (lower = better) |
| `gps_fix_type` | string | `no_fix`, `2d_fix`, or `3d_fix` |

### Power Status

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `battery_voltage` | number | V | Internal GPS device battery |
| `external_voltage` | number | V | Vehicle battery voltage |

### Temperature Sensors

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `temperature_1` | number | °C | Temperature sensor 1 |
| `temperature_2` | number | °C | Temperature sensor 2 |

### Driver Identification

| Field | Type | Description |
|-------|------|-------------|
| `driver_id` | string | Driver ID, RFID tag, or iButton ID |

### Events & Alarms

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | string | Type of event (see below) |
| `alarm_type` | string | Type of alarm (see below) |
| `timestamp` | string | ISO8601 timestamp (defaults to server time) |

**Event Types:**
- `position` - Regular position update
- `login` - Device login
- `heartbeat` - Keep-alive
- `alarm` - Alarm triggered
- `overspeed` - Speed limit exceeded
- `geofence_enter` - Entered geofence
- `geofence_exit` - Exited geofence
- `harsh_brake` - Harsh braking detected
- `harsh_acceleration` - Harsh acceleration detected

**Alarm Types:**
- `sos` - Emergency SOS button pressed
- `power_cut` - External power disconnected
- `low_battery` - Internal battery low
- `vibration` - Vibration/tampering detected
- `overspeed` - Speeding
- `geofence` - Geofence violation

### Extended Data

| Field | Type | Description |
|-------|------|-------------|
| `raw_data` | object | Any additional protocol-specific data (stored as JSON) |

---

## Response Codes

### Success Responses

**200 OK - Single Record:**
```json
{
  "success": true,
  "message": "Telemetry received",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_id": "550e8400-e29b-41d4-a716-446655440001",
  "processed_at": "2026-01-04T12:30:00.000Z"
}
```

**200 OK - Batch:**
```json
{
  "success": true,
  "batch": true,
  "total": 10,
  "successful": 9,
  "failed": 1,
  "errors": [
    {
      "index": 3,
      "imei": "868166056739149",
      "error": "Device not found"
    }
  ]
}
```

### Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Missing IMEI",
  "code": "MISSING_IMEI"
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_IMEI` | 400 | No IMEI provided in request |
| `DEVICE_NOT_FOUND` | 404 | Device with IMEI not registered |
| `INVALID_COORDINATES` | 400 | Latitude/longitude out of valid range |
| `MISSING_LOCATION` | 400 | Position update requires coordinates |
| `RATE_LIMITED` | 429 | Too many requests (max 120/min per device) |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `BATCH_TOO_LARGE` | 400 | Batch contains more than 100 records |
| `DB_ERROR` | 500 | Database operation failed |

---

## Rate Limiting

- **Limit:** 120 requests per minute per device
- **Window:** Rolling 60-second window
- **Response when exceeded:**
  ```json
  {
    "success": false,
    "error": "Rate limit exceeded (120/min)",
    "code": "RATE_LIMITED"
  }
  ```

---

## Automatic Features

When telemetry is received, the system automatically:

### 1. Device Status
- Updates device `last_heartbeat` timestamp
- Sets device status to `active`

### 2. Trip Detection
- Detects trip start when ignition turns ON
- Detects trip end when ignition turns OFF
- Calculates trip duration and distance
- Associates trip with assigned driver

### 3. Speeding Detection
- Checks speed against vehicle's speed governor config
- Creates speed violation alerts
- Applies driver penalties if configured

### 4. Geofence Processing
- Checks position against all active geofences
- Triggers entry/exit alerts
- Logs geofence events

### 5. Alarm Processing
- Creates alerts for alarm events (SOS, power cut, etc.)
- Sets appropriate severity levels
- Sends notifications if configured

---

## Integration Examples

### Node.js

```javascript
const axios = require('axios');

async function sendTelemetry(data) {
  const response = await axios.post(
    'https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api',
    data,
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  return response.data;
}

// Single update
await sendTelemetry({
  imei: '868166056739147',
  latitude: 9.0123,
  longitude: 38.7456,
  speed_kmh: 45.5,
  ignition: true,
  fuel_level_percent: 75
});

// Batch update
await sendTelemetry({
  records: [
    { imei: '868166056739147', latitude: 9.0123, longitude: 38.7456, speed_kmh: 45 },
    { imei: '868166056739148', latitude: 9.0234, longitude: 38.7567, speed_kmh: 60 }
  ]
});
```

### Python

```python
import requests
import json

API_URL = 'https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api'

def send_telemetry(data):
    response = requests.post(
        API_URL,
        headers={'Content-Type': 'application/json'},
        data=json.dumps(data)
    )
    return response.json()

# Single update
result = send_telemetry({
    'imei': '868166056739147',
    'latitude': 9.0123,
    'longitude': 38.7456,
    'speed_kmh': 45.5,
    'ignition': True,
    'fuel_level_percent': 75
})
print(result)
```

### PHP

```php
<?php
$apiUrl = 'https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api';

$data = [
    'imei' => '868166056739147',
    'latitude' => 9.0123,
    'longitude' => 38.7456,
    'speed_kmh' => 45.5,
    'ignition' => true,
    'fuel_level_percent' => 75
];

$options = [
    'http' => [
        'header'  => "Content-Type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($apiUrl, false, $context);
echo $result;
?>
```

### cURL (Command Line)

```bash
# Single record
curl -X POST https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "868166056739147",
    "latitude": 9.0123,
    "longitude": 38.7456,
    "speed_kmh": 45.5,
    "ignition": true
  }'

# Heartbeat
curl -X POST https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "868166056739147",
    "event_type": "heartbeat"
  }'

# SOS Alarm
curl -X POST https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api \
  -H "Content-Type: application/json" \
  -d '{
    "imei": "868166056739147",
    "event_type": "alarm",
    "alarm_type": "sos",
    "latitude": 9.0123,
    "longitude": 38.7456
  }'
```

---

## Setting Up Your External Gateway

If you're running your own GPS gateway (e.g., Traccar, GPS-Server, custom software), configure it to forward parsed data to this API:

### Traccar Configuration

Add to `traccar.xml`:
```xml
<entry key='forward.url'>https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api</entry>
<entry key='forward.header.Content-Type'>application/json</entry>
```

### Custom Gateway Example

```javascript
// After parsing GPS device data
const parsedData = parseGpsPacket(rawData);

// Forward to FleetTrack API
fetch('https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-external-api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imei: parsedData.imei,
    latitude: parsedData.lat,
    longitude: parsedData.lng,
    speed_kmh: parsedData.speed,
    heading: parsedData.course,
    ignition: parsedData.ignition,
    timestamp: parsedData.timestamp
  })
});
```

---

## Device Registration

Before sending telemetry, devices must be registered in FleetTrack:

1. Go to **Devices** page
2. Click **Add Device**
3. Enter the device IMEI exactly as it will be sent in API requests
4. Select device type/model
5. Optionally assign to a vehicle

The IMEI is the unique identifier used to match incoming telemetry with registered devices.

---

## Troubleshooting

### "Device not found" Error

1. Verify the IMEI is exactly 15 digits
2. Check the device is registered in FleetTrack
3. Ensure no leading zeros are being stripped

### No Data on Map

1. Confirm response shows `"success": true`
2. Check device is assigned to a vehicle
3. Verify coordinates are valid (not 0,0)

### Rate Limit Errors

1. Reduce reporting frequency
2. Use batch mode for high-frequency devices
3. Check for duplicate sends

### Missing Trips

1. Ensure `ignition` field is being sent
2. Verify ignition changes from false→true (trip start) and true→false (trip end)

---

## Support

For issues or questions:
- Check FleetTrack documentation
- Review device configuration
- Contact support with IMEI and sample request/response

---

## Changelog

**v1.0.0 (2026-01-04)**
- Initial release
- Single and batch record support
- Status updates without location
- Automatic trip detection
- Geofence and speed violation processing
- Rate limiting (120 req/min per device)
