FROM node:24-alpine AS base
WORKDIR /app

# Production dependencies only. better-sqlite3 is native, so keep a toolchain
# available for when no prebuilt binary matches the platform.
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev

# Full install (incl. typescript) to compile
FROM deps AS build
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/data/app.db
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health > /dev/null || exit 1
CMD ["node", "dist/index.js"]
