#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
# GPS Gateway — One-Time VPS Setup Script
# Run as root on a fresh Ubuntu 22.04+ VPS
# Usage: curl -sSL <raw-url> | sudo bash
# ─────────────────────────────────────────────

echo "🔧 GPS Gateway — VPS Initial Setup"
echo "===================================="

# ── 1. System updates ──
echo "📦 Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker ──
if ! command -v docker &>/dev/null; then
  echo "🐳 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "✅ Docker already installed"
fi

# ── 3. Install Docker Compose plugin ──
if ! docker compose version &>/dev/null 2>&1; then
  echo "🐳 Installing Docker Compose..."
  apt-get install -y -qq docker-compose-plugin
else
  echo "✅ Docker Compose already installed"
fi

# ── 4. Create app user ──
if ! id -u gateway &>/dev/null 2>&1; then
  echo "👤 Creating 'gateway' user..."
  useradd -r -m -s /bin/bash -G docker gateway
else
  echo "✅ User 'gateway' already exists"
fi

# ── 5. Create directory structure ──
echo "📁 Setting up directories..."
mkdir -p /opt/gps-gateway/backups
chown -R gateway:gateway /opt/gps-gateway

# ── 6. Configure firewall ──
echo "🔥 Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw --force enable
  ufw allow ssh
  ufw allow 8080/tcp    comment 'Gateway health check'
  # GPS protocol ports
  ufw allow 5001/tcp    comment 'GT06/Concox'
  ufw allow 5013/tcp    comment 'TK103'
  ufw allow 5023/tcp    comment 'H02/Sinotrack'
  ufw allow 5027/tcp    comment 'Teltonika'
  ufw allow 5030/tcp    comment 'Queclink'
  ufw allow 5031/tcp    comment 'Ruptela'
  ufw allow 5032/tcp    comment 'YTWL'
  # MQTT ports
  ufw allow 1883/tcp    comment 'MQTT broker'
  ufw allow 9883/tcp    comment 'MQTT WebSocket'
  # UDP ports
  ufw allow 5001/udp    comment 'GT06 UDP'
  ufw allow 5013/udp    comment 'TK103 UDP'
  ufw allow 5023/udp    comment 'H02 UDP'
  ufw reload
  echo "✅ Firewall configured"
else
  echo "⚠️  ufw not found — configure firewall manually"
fi

# ── 7. Configure log rotation ──
echo "📋 Setting up log rotation..."
cat > /etc/logrotate.d/gps-gateway << 'EOF'
/opt/gps-gateway/deploy.log
/opt/gps-gateway/backups/*.txt {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
}
EOF

# ── 8. Install monitoring tools ──
echo "📊 Installing monitoring tools..."
apt-get install -y -qq curl jq htop

# ── 9. Set up systemd auto-start ──
echo "⚙️  Creating systemd service..."
cat > /etc/systemd/system/gps-gateway.service << 'EOF'
[Unit]
Description=GPS TCP/UDP Gateway
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=gateway
WorkingDirectory=/opt/gps-gateway
ExecStart=/usr/bin/docker compose -f docker-compose.yml --env-file .env up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yml down
ExecReload=/usr/bin/docker compose -f docker-compose.yml --env-file .env up -d --force-recreate

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gps-gateway.service
echo "✅ Systemd service created (will start after .env is configured)"

# ── 10. SSH hardening ──
echo "🔐 Hardening SSH..."
sed -i 's/#PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd || systemctl reload ssh || true

# ── Done ──
echo ""
echo "============================================"
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and configure:"
echo "     cp /opt/gps-gateway/.env.example /opt/gps-gateway/.env"
echo "     nano /opt/gps-gateway/.env"
echo ""
echo "  2. Add these GitHub Actions secrets:"
echo "     VPS_HOST     = $(curl -s ifconfig.me)"
echo "     VPS_USER     = gateway"
echo "     VPS_SSH_KEY  = (your private SSH key)"
echo "     VPS_SSH_PORT = 22"
echo ""
echo "  3. Push to main branch to trigger deployment"
echo "============================================"
