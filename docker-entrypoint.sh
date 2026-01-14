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

# Run Prisma migrations
echo "Running Prisma database migrations..."
if npx prisma migrate deploy; then
  echo "Prisma migrations completed successfully"
else
  echo "Warning: Prisma migrations failed, but continuing..."
fi

# Apply better-auth migrations if they exist
if [ -d "./better-auth_migrations" ] && [ "$(ls -A ./better-auth_migrations/*.sql 2>/dev/null)" ]; then
  echo "Applying better-auth migrations..."

  for migration_file in ./better-auth_migrations/*.sql; do
    if [ -f "$migration_file" ]; then
      echo "Applying migration: $(basename "$migration_file")"

      # Extract database connection details from DATABASE_URL
      # Format: postgresql://user:password@host:port/database
      DB_URL="${DATABASE_URL}"

      if [ -n "$DB_URL" ]; then
        # Use psql to apply the migration
        psql "$DB_URL" -f "$migration_file" 2>&1 | grep -v "already exists" || true
        echo "Migration $(basename "$migration_file") applied"
      else
        echo "Warning: DATABASE_URL not set, skipping better-auth migrations"
        break
      fi
    fi
  done

  echo "Better-auth migrations completed"
else
  echo "No better-auth migrations found, skipping..."
fi

echo "==================================="
echo "Starting Next.js application..."
echo "==================================="

# Start the Next.js application
exec node server.js
