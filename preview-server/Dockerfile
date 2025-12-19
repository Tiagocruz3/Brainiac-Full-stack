# Brainiac Preview Server - Docker Configuration

FROM node:20-alpine

# Install dependencies for Vite
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY preview-server/package*.json ./

# Install dependencies
RUN npm ci --production --ignore-scripts

# Copy source code
COPY preview-server/ ./
COPY src/lib/preview-server.ts ./src/lib/
COPY src/types/preview.ts ./src/types/

# Create temp directory for previews
RUN mkdir -p /tmp/brainiac-previews

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV TEMP_DIR=/tmp/brainiac-previews

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]

