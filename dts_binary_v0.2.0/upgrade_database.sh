#!/usr/bin/env bash
set -e  # Exit immediately if any command fails

echo "WARNING: You are about to upgrade your DELTA database."
echo "Make sure to BACK UP your database before continuing."
echo

# Confirm upgrade
read -p "Do you want to continue running the database upgrade? (Y/N): " confirm

if [[ "$confirm" != "Y" && "$confirm" != "y" ]]; then
  echo "Upgrade canceled by user."
  exit 1
fi

echo
echo "Proceeding with database upgrade..."
echo "----------------------------------------"

# Ask for database credentials
read -p "Enter PostgreSQL username: " PGUSERNAME
read -p "Enter database name: " DB_NAME
read -p "Enter database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

echo

# Run SQL upgrade script and stop on first SQL error
if ! psql -U "$PGUSERNAME" -d "$DB_NAME" -h "$DB_HOST" --set ON_ERROR_STOP=on -f "dts_database/upgrade_database.sql"; then
  echo
  echo "Database upgrade failed."
  exit 1
fi

echo
echo "Database upgrade process finished successfully."
