# DELTA – BIN Scripts Documentation

This document describes how to **install, upgrade, and run** the DELTA system using the batch scripts located in the `bin` folder.

---

## Fresh Installation of DELTA

Follow these steps for a first-time installation.

### Steps

1. Initialize the database:

   ```bat
   init_db.bat

   ```

2. Initialize the website:

   ```bat
   init_website.bat

   ```

3. Configure the .env file to fit your changes; especially for DATABASE_URL variable name

4. Run the System
   After completing the installation, start the system using:

   ```bat
   start.bat
   ```

## Upgrade Existing DELTA Installation

⚠️ Important – Before Upgrading

Always backup the database before running any database upgrade.

Always backup the application before upgrading the system.

Upgrade Steps

1. Upgrade the database:

   ```bat
   upgrade_database.bat
   ```

2. Re-initialize the website / application:

   ```bat
   init_website.bat
   ```

3. Run the System

   ```bat
       start.bat
   ```

For installation on Linux / maxOS
Using the same steps above, but run .sh files instead of .bat
