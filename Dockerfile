# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_FRONTEND_URL
ARG VITE_CONFIG_ENCRYPTION_KEY
ARG VITE_ENV
ARG VITE_GITHUB_LANDING_TOKEN
ARG VITE_GITHUB_LANDING_OWNER
ARG VITE_GITHUB_LANDING_REPO

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_CONFIG_ENCRYPTION_KEY=$VITE_CONFIG_ENCRYPTION_KEY
ENV VITE_ENV=$VITE_ENV
ENV VITE_GITHUB_LANDING_TOKEN=$VITE_GITHUB_LANDING_TOKEN
ENV VITE_GITHUB_LANDING_OWNER=$VITE_GITHUB_LANDING_OWNER
ENV VITE_GITHUB_LANDING_REPO=$VITE_GITHUB_LANDING_REPO

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server.js ./
COPY src/api ./src/api
COPY src/services ./src/services
COPY src/lib ./src/lib

# Expose port (Railway will override with PORT env var)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server.js"]
