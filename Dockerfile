# =============================================================================
# Multi-stage Dockerfile: Node.js Express Gateway behind Nginx reverse proxy
# OpenShift compatible: runs as arbitrary non-root UID
# =============================================================================

# ---------------------
# Stage 1: Builder
# ---------------------
FROM dockerproxy.repos.tech.orange/node:20.12.2-alpine AS builder

WORKDIR /usr/src/app

# Copy package files first (layer caching optimisation)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source
COPY config/ ./config/
COPY policies/ ./policies/
COPY server.js ./
COPY manifest.js ./

# Set executable permission for ffprobe if exists
RUN if [ -f /usr/src/app/node_modules/@ffprobe-installer/linux-x64/ffprobe ]; then \
      chmod +x /usr/src/app/node_modules/@ffprobe-installer/linux-x64/ffprobe; \
    fi

# ---------------------
# Stage 2: Production
# ---------------------
FROM dockerproxy.repos.tech.orange/nginx:1.25-alpine

LABEL name="discobole-metaverse-gateway" \
      description="Discobole Metaverse Gateway behind Nginx" \
      url="https://gitlab.tech.orange/disco/disco-innovations/disco-metaverse/metaverse-gateway" \
      maintainer="disco@orange.com" \
      org.opencontainers.image.source="https://gitlab.tech.orange/disco/disco-innovations/disco-metaverse/metaverse-gateway" \
      org.opencontainers.image.title="metaverse-gateway" \
      org.opencontainers.image.description="Express Gateway API proxy for Discobole Metaverse platform"

# Install Node.js runtime (no npm needed in production)
RUN apk add --no-cache nodejs && \
    rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

# Copy Node.js application from builder
COPY --from=builder /usr/src/app ./

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# OpenShift runs containers with an arbitrary UID that belongs to the root group (GID 0).
# All directories that nginx/node need to write to must be group-writable by GID 0.
RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/client_temp /tmp/proxy_temp \
             /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R 1001:0 /usr/src/app /var/log/nginx /var/cache/nginx /tmp/client_temp \
                     /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chmod -R g+rwX /usr/src/app /var/log/nginx /var/cache/nginx /etc/nginx /tmp/client_temp \
                    /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

ENV NODE_ENV=production

EXPOSE 8080

# Run as non-root (OpenShift will override UID but keep GID 0)
USER 1001

CMD ["/usr/local/bin/start.sh"]
