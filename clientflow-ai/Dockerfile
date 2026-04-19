# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Backend runtime ─────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend's static directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Serve static frontend from Express
RUN echo "app.use(require('express').static('public'));" >> /tmp/staticpatch.js

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "server.js"]
