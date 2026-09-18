# Multi-stage build for backend microservices
# Build context is the project root (.)

FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/packages/shared/package.json ./backend/packages/shared/
ARG SERVICE_NAME
COPY backend/services/${SERVICE_NAME}/package.json ./backend/services/${SERVICE_NAME}/

RUN npm install --workspace=backend/services/${SERVICE_NAME} --workspace=backend/packages/shared

COPY backend/packages/shared/ ./backend/packages/shared/
COPY backend/services/${SERVICE_NAME}/ ./backend/services/${SERVICE_NAME}/

RUN npm run build --workspace=backend/packages/shared
RUN npm run build --workspace=backend/services/${SERVICE_NAME}

# Generate Prisma client if schema exists
RUN if [ -f "backend/services/${SERVICE_NAME}/prisma/schema.prisma" ]; then \
      npx prisma generate --schema=backend/services/${SERVICE_NAME}/prisma/schema.prisma; \
    fi

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

COPY package.json package-lock.json* ./
COPY backend/packages/shared/package.json ./backend/packages/shared/
COPY backend/services/${SERVICE_NAME}/package.json ./backend/services/${SERVICE_NAME}/

RUN npm install --omit=dev --workspace=backend/services/${SERVICE_NAME} --workspace=backend/packages/shared

# Copy Prisma schema and generate client in production
COPY backend/services/${SERVICE_NAME}/prisma ./backend/services/${SERVICE_NAME}/prisma
RUN if [ -f "backend/services/${SERVICE_NAME}/prisma/schema.prisma" ]; then \
      npx prisma generate --schema=backend/services/${SERVICE_NAME}/prisma/schema.prisma; \
    fi

COPY --from=base /app/backend/packages/shared/dist ./backend/packages/shared/dist
COPY --from=base /app/backend/services/${SERVICE_NAME}/dist ./backend/services/${SERVICE_NAME}/dist

COPY backend/services/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5001

CMD ["/entrypoint.sh"]
