FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p /app/logs && chown -R app:app /app && chmod -R 750 /app/logs

EXPOSE 8001

USER app

CMD ["node", "src/app.js"]
