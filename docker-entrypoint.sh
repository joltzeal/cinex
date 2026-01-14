#!/bin/sh
set -e

echo "Installing Prisma CLI..."
pnpm add -g prisma

echo "Generating Prisma Client..."
prisma generate

echo "Running database migrations..."
prisma migrate deploy

echo "Starting application..."
exec node server.js
