# GPS Device TCP/UDP Gateway - Direct DB Write Mode
# Multi-stage build for minimal image size

FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (pg required, ioredis/socket.io/bullmq/aedes optional)
RUN npm ci --only=production; npm install --no-save ioredis socket.io bullmq aedes websocket-stream 2>/dev/null || true

# Copy application code
COPY gateway.js ./
COPY lib/ ./lib/

# Create non-root user for security
RUN addgroup -g 1001 -S gateway && \
    adduser -S gateway -u 1001 -G gateway

# Switch to non-root user
USER gateway

# Expose ports
# TCP ports for each protocol
EXPOSE 5001
EXPOSE 5013
EXPOSE 5023
EXPOSE 5027
EXPOSE 5030
EXPOSE 5031
EXPOSE 5032
# UDP ports (same as TCP)
EXPOSE 5001/udp
EXPOSE 5013/udp
EXPOSE 5023/udp
# Health check port
EXPOSE 8080
# Socket.io WebSocket gateway
EXPOSE 9090
# MQTT broker
EXPOSE 1883
# MQTT over WebSocket
EXPOSE 9883

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Set default environment variables
ENV NODE_ENV=production
ENV GATEWAY_SHARED_KEY=
ENV LOG_LEVEL=info
ENV GT06_PORT=5001
ENV TK103_PORT=5013
ENV H02_PORT=5023
ENV TELTONIKA_PORT=5027
ENV QUECLINK_PORT=5030
ENV RUPTELA_PORT=5031
ENV YTWL_PORT=5032
ENV BATCH_INTERVAL_MS=5000
ENV BATCH_SIZE=50
ENV NESTJS_GATEWAY_URL=
ENV FORWARD_TO_NESTJS=false
ENV AUTO_PROVISION=true
ENV DEFAULT_ORGANIZATION_ID=
ENV REDIS_URL=
ENV ENABLE_SOCKET_GATEWAY=true
ENV SOCKETIO_PORT=9090
ENV ENABLE_MQTT=true
ENV MQTT_PORT=1883
ENV MQTT_WS_PORT=9883
ENV MQTT_AUTH_TOKEN=
ENV DEFAULT_ORGANIZATION_ID=

# Run the gateway
CMD ["node", "gateway.js"]
