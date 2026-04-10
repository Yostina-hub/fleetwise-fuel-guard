# GPS Gateway — VPS Deployment with CI/CD

## Architecture

```
GitHub Push → GitHub Actions → Build Docker Image → Push to GHCR → SSH Deploy to VPS
                                                                         ↓
                                                              docker compose up -d
                                                                         ↓
                                                              Health Check ✅
```

## Quick Start

### 1. Prepare VPS (one-time)

```bash
# SSH into your VPS as root
ssh root@your-vps-ip

# Run the setup script
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/tcp-gateway/setup-vps.sh | sudo bash

# Configure environment
cp /opt/gps-gateway/.env.example /opt/gps-gateway/.env
nano /opt/gps-gateway/.env
```

### 2. Configure GitHub Secrets

Go to **GitHub → Repository → Settings → Secrets and variables → Actions** and add:

| Secret | Description | Example |
|--------|-------------|---------|
| `VPS_HOST` | VPS public IP or domain | `203.0.113.50` |
| `VPS_USER` | SSH username | `gateway` |
| `VPS_SSH_KEY` | Private SSH key (full PEM) | `-----BEGIN OPENSSH...` |
| `VPS_SSH_PORT` | SSH port (optional) | `22` |

### 3. Deploy

Push to `main` branch with changes in `tcp-gateway/` — deployment triggers automatically.

Or trigger manually: **GitHub → Actions → Deploy GPS Gateway → Run workflow**

### 4. Verify

```bash
# Health check
curl http://your-vps-ip:8080/health

# Stats
curl http://your-vps-ip:8080/stats

# Logs
ssh gateway@your-vps-ip 'docker logs gps-tcp-gateway --tail 100'
```

---

## Manual Deployment

```bash
# On VPS
cd /opt/gps-gateway
docker compose pull
./deploy.sh
```

## Rollback

```bash
# On VPS — restart with previous image
cd /opt/gps-gateway
docker compose down
docker tag gps-tcp-gateway:previous gps-tcp-gateway:latest
docker compose up -d
```

## Monitoring

```bash
# Service status
systemctl status gps-gateway

# Container health
docker inspect --format='{{.State.Health.Status}}' gps-tcp-gateway

# Resource usage
docker stats gps-tcp-gateway --no-stream

# Recent logs
docker logs gps-tcp-gateway --since 1h
```

## Ports

| Port | Protocol | Service |
|------|----------|---------|
| 5001 | TCP/UDP | GT06/Concox |
| 5013 | TCP/UDP | TK103 |
| 5023 | TCP/UDP | H02/Sinotrack |
| 5027 | TCP | Teltonika |
| 5030 | TCP | Queclink |
| 5031 | TCP | Ruptela |
| 5032 | TCP | YTWL Speed Governor |
| 8080 | HTTP | Health + Stats |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Deploy fails at SSH | Verify `VPS_SSH_KEY` has correct permissions and `gateway` user exists |
| Health check timeout | Check `.env` has valid `DATABASE_URL` |
| Container crash loop | `docker logs gps-tcp-gateway --tail 50` |
| Port already in use | `sudo lsof -i :5001` and stop conflicting process |
| Firewall blocks GPS | `sudo ufw allow 5001/tcp` |
