#!/bin/sh

read -p "Enter database host (e.g. localhost or 10.0.0.5): " DB_HOST
read -p "Enter database port (default 5432): " DB_PORT
read -p "Enter the database name: " DB_NAME
read -p "Enter database username: " PGUSERNAME

# Default port
DB_PORT=${DB_PORT:-5432}

echo
echo "Creating database \"$DB_NAME\" on $DB_HOST:$DB_PORT ..."

createdb -h "$DB_HOST" -p "$DB_PORT" -U "$PGUSERNAME" "$DB_NAME"
if [ $? -ne 0 ]; then
    echo "Failed to create database \"$DB_NAME\"."
    exit 1
fi

echo "Database \"$DB_NAME\" created successfully."
echo "Restoring schema..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$PGUSERNAME" -W \
     -d "$DB_NAME" \
     -f dts_database/dts_db_schema.sql

if [ $? -ne 0 ]; then
    echo "Failed to restore schema."
    exit 1
fi

echo "Schema restored successfully."
