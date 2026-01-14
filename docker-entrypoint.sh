#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"
echo "Running migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node server.js
