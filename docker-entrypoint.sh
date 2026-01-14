#!/bin/sh
set -e

echo "==================================="
echo "Starting application initialization"
echo "==================================="

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_retries=30
retry_count=0

until pg_isready -h "${DATABASE_HOST:-localhost}" -p "${DATABASE_PORT:-5432}" -U "${DATABASE_USER:-postgres}" > /dev/null 2>&1; do
  retry_count=$((retry_count + 1))
  if [ $retry_count -ge $max_retries ]; then
    echo "Error: Database is not ready after $max_retries attempts"
    exit 1
  fi
  echo "Database is unavailable - sleeping (attempt $retry_count/$max_retries)"
  sleep 2
done

echo "Database is ready!"

# Run Prisma migrations with smart handling
echo "Running database migrations..."

# Check if _prisma_migrations table exists
MIGRATIONS_TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations');")

if [ "$MIGRATIONS_TABLE_EXISTS" = "f" ]; then
  echo "First time setup - creating all tables..."

  # Apply all migration SQLs directly
  for migration_dir in prisma/migrations/*/; do
    if [ -d "$migration_dir" ]; then
      migration_name=$(basename "$migration_dir")
      migration_file="${migration_dir}migration.sql"

      if [ -f "$migration_file" ]; then
        echo "Applying migration: $migration_name"
        psql "$DATABASE_URL" -f "$migration_file" 2>&1 | grep -v "already exists" || true
      fi
    fi
  done

  # Initialize Prisma migrations table and mark all as applied
  echo "Initializing Prisma migrations tracking..."
  pnpm exec prisma migrate resolve --applied 20260108034655_add_better_auth || true
  pnpm exec prisma migrate resolve --applied 20260114200108_add_missing_tables || true

  echo "Initial setup completed"
else
  echo "Existing database detected - checking for pending migrations..."

  # Deploy any new migrations
  if pnpm exec prisma migrate deploy; then
    echo "Migrations completed successfully"
  else
    echo "Warning: Migration check failed, but continuing..."
  fi
fi

echo "==================================="
echo "Starting Next.js application..."
echo "==================================="

# Start the Next.js application
exec node server.js
