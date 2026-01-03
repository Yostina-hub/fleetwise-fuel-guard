# GPS Device TCP/UDP Gateway

A lightweight gateway that receives raw TCP/UDP data from GPS tracking devices and forwards it to the Supabase Edge Function for processing.

## Overview

Many GPS tracking devices (GT06, TK103, H02, etc.) communicate over raw TCP/UDP sockets rather than HTTP. This gateway acts as a bridge, accepting connections from these devices and forwarding the data to your fleet management system's edge function.

```
┌─────────────┐     TCP/UDP      ┌─────────────┐      HTTPS       ┌─────────────────────┐
│ GPS Device  │ ───────────────► │   Gateway   │ ───────────────► │ Edge Function       │
│ (GT06, etc) │                  │ (This app)  │                  │ (gps-data-receiver) │
└─────────────┘                  └─────────────┘                  └─────────────────────┘
```

## Supported Protocols

| Protocol | TCP Port | UDP Port | Description |
|----------|----------|----------|-------------|
| GT06/GT06N | 5023 | 6023 | Binary protocol, common in Concox devices |
| TK103 | 5001 | 6001 | Text protocol, very common in Chinese trackers |
| H02 | 5013 | 6013 | Text protocol, Sinotrack and similar |
| Concox | 5027 | 6027 | Extended binary protocol |

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
  -p 5001:5001 \
  -p 5013:5013 \
  -p 5023:5023 \
  -p 5027:5027 \
  -p 6001:6001/udp \
  -p 6013:6013/udp \
  -p 6023:6023/udp \
  -p 6027:6027/udp \
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
| `GT06_PORT` | 5023 | TCP port for GT06 protocol |
| `TK103_PORT` | 5001 | TCP port for TK103 protocol |
| `H02_PORT` | 5013 | TCP port for H02 protocol |
| `CONCOX_PORT` | 5027 | TCP port for Concox protocol |
| `LOG_LEVEL` | info | Logging level: debug, info, warn, error |

### Device Configuration

Configure your GPS devices to connect to your VPS IP address on the appropriate port:

**Example for GT06/Concox devices:**
```
Server: your-vps-ip.com
Port: 5023
Protocol: TCP
```

**Example for TK103 devices:**
```
SMS Command: 
adminip123456 your-vps-ip.com 5001
```

**Example for H02/Sinotrack devices:**
```
SMS Command:
804{password} {server-ip} {port}
Example: 804123456 203.0.113.50 5013
```

## Health Checks

The gateway exposes a health check endpoint:

```bash
# Check health
curl http://localhost:8080/health

# Get statistics
curl http://localhost:8080/stats
```

Example response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "stats": {
    "connections": 15,
    "messagesReceived": 1250,
    "messagesForwarded": 1248,
    "errors": 2
  }
}
```

## VPS Deployment Guide

### 1. Provision a VPS

Any cloud provider works (DigitalOcean, AWS EC2, Vultr, Linode, etc.):
- **Minimum specs:** 1 vCPU, 512MB RAM
- **Recommended:** 1 vCPU, 1GB RAM
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
sudo ufw allow 5001/tcp  # TK103
sudo ufw allow 5013/tcp  # H02
sudo ufw allow 5023/tcp  # GT06
sudo ufw allow 5027/tcp  # Concox
sudo ufw allow 6001/udp  # TK103 UDP
sudo ufw allow 6013/udp  # H02 UDP
sudo ufw allow 6023/udp  # GT06 UDP
sudo ufw allow 6027/udp  # Concox UDP
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
   telnet your-server-ip 5023
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
     -d '{"lat": 9.0, "lng": 38.7}'
   ```

2. **Check gateway health:**
   ```bash
   curl http://localhost:8080/health
   ```

3. **Review gateway logs for errors**

## License

MIT License
