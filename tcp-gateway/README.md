# GPS Device TCP/UDP Gateway

A lightweight gateway that receives raw TCP/UDP data from GPS tracking devices and forwards it to the Supabase Edge Function for processing.

## Overview

Many GPS tracking devices communicate over raw TCP/UDP sockets rather than HTTP. This gateway acts as a bridge, accepting connections from these devices and forwarding the data to your fleet management system's edge function.

```
┌─────────────┐     TCP/UDP      ┌─────────────┐      HTTPS       ┌─────────────────────┐
│ GPS Device  │ ───────────────► │   Gateway   │ ───────────────► │ Edge Function       │
│ (GT06, etc) │                  │ (This app)  │                  │ (gps-data-receiver) │
└─────────────┘                  └─────────────┘                  └─────────────────────┘
```

## Supported Protocols

| Protocol | Port | Transport | Description |
|----------|------|-----------|-------------|
| GT06/Concox | 5001 | TCP + UDP | Binary protocol, login, location, heartbeat, alarm |
| TK103 | 5013 | TCP + UDP | Text protocol, multiple formats supported |
| H02/Sinotrack | 5023 | TCP + UDP | Text protocol, V1/V4/HTBT commands |
| Teltonika | 5027 | TCP | Codec 8/8E, full AVL data with IO elements |
| Queclink | 5030 | TCP | AT-style commands, GV series devices |
| Ruptela | 5031 | TCP | Binary protocol with IO elements |
| YTWL Speed Gov | 5032 | TCP | Speed governor/limiter devices |

## Quick Start

### Option 1: Run with Node.js

```bash
# Clone or copy the tcp-gateway folder to your VPS
cd tcp-gateway

# Install dependencies (if any)
npm install

# Set environment variables
export SUPABASE_URL="https://kkmjwmyqakprqdhrlsoz.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export LOG_LEVEL="info"

# Run the gateway
npm start

# Or with debug logging
npm run start:debug
```

### Option 2: Run with Docker

```bash
# Build the image
docker build -t gps-tcp-gateway .

# Run the container
docker run -d \
  --name gps-gateway \
  -e SUPABASE_URL="https://kkmjwmyqakprqdhrlsoz.supabase.co" \
  -e SUPABASE_ANON_KEY="your-anon-key" \
  -e LOG_LEVEL="info" \
  -p 5001:5001 -p 5001:5001/udp \
  -p 5013:5013 -p 5013:5013/udp \
  -p 5023:5023 -p 5023:5023/udp \
  -p 5027:5027 \
  -p 5030:5030 \
  -p 5031:5031 \
  -p 5032:5032 \
  -p 8080:8080 \
  gps-tcp-gateway
```

### Option 3: Run with Docker Compose

```bash
# Create .env file (optional, has defaults)
cat > .env << EOF
SUPABASE_URL=https://kkmjwmyqakprqdhrlsoz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
LOG_LEVEL=info
EOF

# Start the gateway
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the gateway
docker-compose down
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | (project URL) | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | (project key) | Your Supabase anonymous key |
| `GT06_PORT` | 5001 | Port for GT06/Concox protocol |
| `TK103_PORT` | 5013 | Port for TK103 protocol |
| `H02_PORT` | 5023 | Port for H02/Sinotrack protocol |
| `TELTONIKA_PORT` | 5027 | Port for Teltonika protocol |
| `QUECLINK_PORT` | 5030 | Port for Queclink protocol |
| `RUPTELA_PORT` | 5031 | Port for Ruptela protocol |
| `YTWL_PORT` | 5032 | Port for YTWL Speed Governor |
| `HEALTH_PORT` | 8080 | Health check HTTP port |
| `LOG_LEVEL` | info | Logging level: debug, info, warn, error |

### Device Configuration

Configure your GPS devices to connect to your VPS IP address on the appropriate port:

**GT06/Concox devices:**
```
Server: your-vps-ip.com
Port: 5001
Protocol: TCP
```

**TK103 devices:**
```
SMS Command: 
adminip123456 your-vps-ip.com 5013
```

**H02/Sinotrack devices:**
```
SMS Command:
804{password} {server-ip} {port}
Example: 804123456 203.0.113.50 5023
```

**Teltonika devices:**
Configure via Teltonika Configurator:
- Server: your-vps-ip.com
- Port: 5027
- Protocol: TCP

**Queclink GV series:**
Configure via Queclink Tool or SMS:
- Server: your-vps-ip.com
- Port: 5030

**YTWL Speed Governor:**
Configure via SMS or PC software:
- Server: your-vps-ip.com
- Port: 5032

## Health Checks

The gateway exposes health check endpoints:

```bash
# Check health
curl http://localhost:8080/health

# Get statistics
curl http://localhost:8080/stats
```

Example stats response:
```json
{
  "uptime": "2h 30m",
  "protocols": {
    "gt06": { "received": 1500, "forwarded": 1498, "errors": 2, "parsed": 1500 },
    "tk103": { "received": 850, "forwarded": 848, "errors": 2, "parsed": 850 },
    "teltonika": { "received": 2000, "forwarded": 2000, "errors": 0, "parsed": 2000 }
  },
  "activeSessions": 25
}
```

## VPS Deployment Guide

### 1. Provision a VPS

Any cloud provider works (DigitalOcean, AWS EC2, Vultr, Linode, etc.):
- **Minimum specs:** 1 vCPU, 512MB RAM
- **Recommended:** 2 vCPU, 1GB RAM
- **OS:** Ubuntu 22.04 LTS or similar

### 2. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

### 3. Configure Firewall

```bash
# Allow required ports
sudo ufw allow 5001/tcp  # GT06
sudo ufw allow 5013/tcp  # TK103
sudo ufw allow 5023/tcp  # H02
sudo ufw allow 5027/tcp  # Teltonika
sudo ufw allow 5030/tcp  # Queclink
sudo ufw allow 5031/tcp  # Ruptela
sudo ufw allow 5032/tcp  # YTWL
sudo ufw allow 5001/udp  # GT06 UDP
sudo ufw allow 5013/udp  # TK103 UDP
sudo ufw allow 5023/udp  # H02 UDP
sudo ufw allow 8080/tcp  # Health check
sudo ufw enable
```

### 4. Deploy the Gateway

```bash
# Create directory
mkdir -p /opt/gps-gateway
cd /opt/gps-gateway

# Copy files (gateway.js, Dockerfile, docker-compose.yml, package.json)
# ... or clone from your repo

# Create environment file
cat > .env << EOF
SUPABASE_URL=https://kkmjwmyqakprqdhrlsoz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
LOG_LEVEL=info
EOF

# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 5. Set Up as System Service (Alternative to Docker)

```bash
# Create systemd service
sudo cat > /etc/systemd/system/gps-gateway.service << EOF
[Unit]
Description=GPS TCP/UDP Gateway
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/gps-gateway
ExecStart=/usr/bin/node gateway.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=SUPABASE_URL=https://kkmjwmyqakprqdhrlsoz.supabase.co
Environment=SUPABASE_ANON_KEY=your-anon-key
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable gps-gateway
sudo systemctl start gps-gateway

# Check status
sudo systemctl status gps-gateway
```

## Monitoring

### View Real-time Logs

```bash
# Docker
docker logs -f gps-gateway

# Docker Compose  
docker-compose logs -f

# Systemd
sudo journalctl -u gps-gateway -f
```

### Stats Endpoint

```bash
# Get current statistics
watch -n 5 'curl -s http://localhost:8080/stats | jq'
```

## Troubleshooting

### Device Not Connecting

1. **Check firewall:** Ensure ports are open
   ```bash
   sudo ufw status
   telnet your-server-ip 5001
   ```

2. **Check device configuration:** Verify IP and port settings

3. **Enable debug logging:**
   ```bash
   export LOG_LEVEL=debug
   npm start
   ```

### Messages Not Reaching Edge Function

1. **Check edge function is deployed:** Test via HTTP
   ```bash
   curl -X POST https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/gps-data-receiver \
     -H "Content-Type: application/json" \
     -H "apikey: your-anon-key" \
     -d '{"imei": "123456789012345", "lat": 9.0, "lng": 38.7}'
   ```

2. **Check gateway health:**
   ```bash
   curl http://localhost:8080/health
   ```

3. **Review gateway logs for errors**

## Protocol-Specific Notes

### Teltonika
- Supports Codec 8 and Codec 8E (extended)
- Parses all IO elements including ignition, movement, voltages
- Acknowledges records to prevent retransmission

### Queclink
- Parses +RESP:GTFRI (location), +RESP:GTHBD (heartbeat)
- Supports GV series devices
- Returns +SACK acknowledgments

### Ruptela
- Binary protocol with BCD-encoded IMEI
- Parses multiple records per packet
- Returns ACK with record count

### YTWL Speed Governor
- Parses speed limit and governor status
- Supports both text and JSON formats
- Used for speed limiter compliance

## License

MIT License
