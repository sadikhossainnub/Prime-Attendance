FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7788

# Install openssl, wget, and curl for Prisma and Coolify Healthchecks
RUN apk add --no-cache openssl wget curl

COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/prisma ./prisma
RUN npx prisma generate
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./client/dist

ENV CLIENT_DIST_PATH=/app/client/dist
EXPOSE 7788
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-7788}/health || curl -f http://127.0.0.1:${PORT:-7788}/health || exit 1

CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then npx prisma migrate deploy; else echo 'WARNING: DATABASE_URL not set!'; fi && node dist/index.js"]
