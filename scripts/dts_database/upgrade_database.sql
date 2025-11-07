-- ================================================
-- DELTA DATABASE UPGRADE SCRIPT
-- USE THIS FILE ONLY WHEN YOU WANT TO UPGRADE THE 
-- DATABASE FROM PREVIOUS VERSIONS TO THE CURRENT VERSION.
-- DO NOT USE THIS FILE FOR FRESH DATABASE INSTALLATION.
-- ================================================
BEGIN;

\echo Checking current database version...

\set is_version_1_0_0 `psql -t -A -c "SELECT CASE WHEN db_version_no = '1.0.0' THEN 'true' ELSE 'false' END FROM dts_system_info LIMIT 1;"`
\if :is_version_1_0_0
    \echo Upgrading from 1.0.0 to 0.1.2...
    \ir upgrade_from_1.0.0_to_0.1.2.sql
    UPDATE dts_system_info SET version_no = '0.1.2', updated_at = NOW();
\endif

COMMIT;
