# Multi-stage build for API Gateway
# Build context is the project root (.)

FROM node:20-alpine AS base
WORKDIR /app

# Copy root package.json for workspace definitions
COPY package.json package-lock.json* ./
COPY backend/packages/shared/package.json ./backend/packages/shared/
COPY backend/gateway/package.json ./backend/gateway/

# Install dependencies using workspaces from root
RUN npm install --workspace=backend/gateway --workspace=backend/packages/shared

# Copy source code
COPY backend/packages/shared/ ./backend/packages/shared/
COPY backend/gateway/ ./backend/gateway/

# Build shared package first, then the gateway
RUN npm run build --workspace=backend/packages/shared
RUN npm run build --workspace=backend/gateway

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/packages/shared/package.json ./backend/packages/shared/
COPY backend/gateway/package.json ./backend/gateway/

RUN npm install --omit=dev --workspace=backend/gateway --workspace=backend/packages/shared

COPY --from=base /app/backend/packages/shared/dist ./backend/packages/shared/dist
COPY --from=base /app/backend/gateway/dist ./backend/gateway/dist

EXPOSE 4000

CMD ["node", "backend/gateway/dist/index.js"]
