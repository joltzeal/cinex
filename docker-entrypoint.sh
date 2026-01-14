#!/bin/sh
set -e

echo "Generating Prisma Client..."
pnpm exec prisma generate

echo "Running database migrations..."
pnpm exec prisma migrate deploy

echo "Starting application..."
exec node server.js
