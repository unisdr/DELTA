#!/bin/bash
set -e

# Total number of steps
TOTAL_STEPS=9

# Initialize step counter
STEP=0

# Function to print step progress
next_step() {
  STEP=$((STEP+1))
  echo "=== Step $STEP/$TOTAL_STEPS. $1 ==="
}

# Step 1: Create folder dts_shared_binary
next_step "Creating folder dts_shared_binary"

if [ -d "dts_shared_binary" ]; then
  echo "Removing existing dts_shared_binary folder..."
  rm -rf dts_shared_binary
fi

mkdir -p dts_shared_binary

# Step 2: Create folder dts_database inside dts_shared_binary
next_step "Creating folder dts_database inside dts_shared_binary"
mkdir -p dts_shared_binary/dts_database

# Step 3: Build Remix App
next_step "Build Remix App"
if ! yarn build; then
  echo "WARNING: yarn build failed, continuing anyway..."
fi

# Step 4: Copy build folder into dts_shared_binary
next_step "Copying build folder into dts_shared_binary"
cp -r build dts_shared_binary/

# Step 5: Copy package.json into dts_shared_binary
next_step "Copying package.json into dts_shared_binary"
cp -f package.json dts_shared_binary/package.json

# Step 6: Copy example.env into dts_shared_binary as .env
next_step "Copying example.env into dts_shared_binary as .env"
cp -f example.env dts_shared_binary/.env

# Step 7: Copy dts_db_schema.sql and upgradeDatabase files into dts_database folder
next_step "Copying dts_db_schema.sql schema into dts_database"
cp -f scripts/dts_database/dts_db_schema.sql dts_shared_binary/dts_database/dts_db_schema.sql
cp -f scripts/dts_database/upgrade_database.sql dts_shared_binary/dts_database/upgrade_database.sql
cp -f scripts/dts_database/upgrade_from_1.0.0_to_0.1.2.sql dts_shared_binary/dts_database/upgrade_from_1.0.0_to_0.1.2.sql
cp -f scripts/dts_database/upgrade_from_0.1.2_to_0.1.3.sql dts_shared_binary/dts_database/upgrade_from_0.1.2_to_0.1.3.sql

# Step 8: Copy shell and batch scripts into dts_shared_binary
next_step "Copying shell scripts into dts_shared_binary"
cp -f scripts/init_db.bat dts_shared_binary/init_db.bat
cp -f scripts/init_db.sh dts_shared_binary/init_db.sh
cp -f scripts/init_website.bat dts_shared_binary/init_website.bat
cp -f scripts/init_website.sh dts_shared_binary/init_website.sh
cp -f scripts/start.bat dts_shared_binary/start.bat
cp -f scripts/start.sh dts_shared_binary/start.sh
cp -f scripts/upgrade_database.sh dts_shared_binary/upgrade_database.sh
cp -f scripts/upgrade_database.bat dts_shared_binary/upgrade_database.bat

# Step 8: Copying README.md file into dts_shared_binary
next_step "Copying README.md file into dts_shared_binary"
cp -f scripts/README.md dts_shared_binary/README.md

echo "=== Done ==="