# ── Stage 1: Build client ─────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Build server ─────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# ── Stage 3: Production ───────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV CLIENT_DIST_PATH=/app/client-dist

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev
COPY server/prisma ./prisma
RUN npx prisma generate

COPY --from=server-builder /app/dist ./dist
COPY --from=client-builder /client/dist ./client-dist

EXPOSE 7788
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
