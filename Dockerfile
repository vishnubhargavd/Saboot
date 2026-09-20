# Multi-stage lightweight Node.js Dockerfile for Saboot Zero-Trust Engine
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY admin/ ./admin/
COPY src/ ./src/

# Ensure data and uploads directories exist with proper permissions
RUN mkdir -p admin/data/uploads

# Expose default Saboot application port
EXPOSE 3001

# Production defaults
ENV NODE_ENV=production
ENV PORT=3001

# Container healthcheck for AWS ALB / App Runner
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start Saboot Node.js server
CMD ["node", "admin/server.js"]
