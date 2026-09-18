#!/bin/sh
set -e

echo "Running Prisma schema push for $SERVICE_NAME..."
npx prisma db push --schema=backend/services/$SERVICE_NAME/prisma/schema.prisma --accept-data-loss 2>/dev/null || echo "Prisma push skipped or failed (may not have prisma binary)"

echo "Starting $SERVICE_NAME..."
exec node backend/services/$SERVICE_NAME/dist/index.js
