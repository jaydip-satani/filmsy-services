# Multi-stage Dockerfile for auth-service

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Copy source
COPY . ./

# Final stage
FROM node:20-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy only production node_modules from builder if present
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 8000

# Switch to non-root
USER app

ENV NODE_ENV=production

CMD ["nodemon", "src/app.js"]
