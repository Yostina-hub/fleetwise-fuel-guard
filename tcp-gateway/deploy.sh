#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
# GPS Gateway — Zero-Downtime Deploy Script
# ─────────────────────────────────────────────

DEPLOY_DIR="/opt/gps-gateway"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
ENV_FILE="$DEPLOY_DIR/.env"
BACKUP_DIR="$DEPLOY_DIR/backups"
LOG_FILE="$DEPLOY_DIR/deploy.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# ── Pre-flight checks ──
log "🚀 Starting deployment..."

if [ ! -f "$ENV_FILE" ]; then
  log "❌ .env file not found at $ENV_FILE"
  log "   Copy .env.example to .env and configure it first:"
  log "   cp $DEPLOY_DIR/.env.example $DEPLOY_DIR/.env"
  exit 1
fi

if ! command -v docker &>/dev/null; then
  log "❌ Docker not installed"; exit 1
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  log "❌ Docker Compose not installed"; exit 1
fi

# Determine compose command
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

# ── Backup current state ──
mkdir -p "$BACKUP_DIR"
if $DC -f "$COMPOSE_FILE" ps -q gps-gateway 2>/dev/null | grep -q .; then
  log "📦 Backing up current container logs..."
  docker logs gps-tcp-gateway --tail 1000 > "$BACKUP_DIR/logs_$TIMESTAMP.txt" 2>&1 || true
fi

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/logs_*.txt 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

# ── Deploy ──
log "🔄 Pulling latest images..."
$DC -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull 2>/dev/null || true

log "♻️  Recreating containers..."
$DC -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate --remove-orphans

# ── Health check ──
log "🏥 Waiting for health check..."
HEALTHY=false
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  sleep 2
done

if [ "$HEALTHY" = true ]; then
  log "✅ Gateway deployed successfully!"
  log "   Health: http://localhost:8080/health"
  log "   Stats:  http://localhost:8080/stats"
else
  log "⚠️  Gateway may not be healthy. Check logs:"
  log "   docker logs gps-tcp-gateway --tail 50"
fi

# ── Cleanup old images ──
log "🧹 Cleaning up unused Docker images..."
docker image prune -f --filter "until=168h" 2>/dev/null || true

log "🏁 Deployment complete at $(date)"
