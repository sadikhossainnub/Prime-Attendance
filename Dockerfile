# Prime Attendance — production image (EasyPanel / Docker)
# Builds React UI + Node server in one container

FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN npx prisma generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache wget
WORKDIR /app
ENV NODE_ENV=production
ENV CLIENT_DIST_PATH=/app/client-dist
ENV PORT=7788

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/prisma ./prisma
RUN npx prisma generate
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./client-dist

EXPOSE 7788
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:7788/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
