# GPS Device TCP/UDP Gateway
# Multi-stage build for minimal image size

FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files (if we add dependencies later)
COPY package*.json ./

# Install dependencies (currently none, but structure for future)
RUN npm ci --only=production 2>/dev/null || echo "No dependencies to install"

# Copy application code
COPY gateway.js ./

# Create non-root user for security
RUN addgroup -g 1001 -S gateway && \
    adduser -S gateway -u 1001 -G gateway

# Switch to non-root user
USER gateway

# Expose ports
# TCP ports
EXPOSE 5001
EXPOSE 5013
EXPOSE 5023
EXPOSE 5027
# UDP ports (TCP + 1000)
EXPOSE 6001/udp
EXPOSE 6013/udp
EXPOSE 6023/udp
EXPOSE 6027/udp
# Health check port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Set default environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV GT06_PORT=5023
ENV TK103_PORT=5001
ENV H02_PORT=5013
ENV CONCOX_PORT=5027

# Run the gateway
CMD ["node", "gateway.js"]
