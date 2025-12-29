-- ================================================
-- DELTA DATABASE UPGRADE SCRIPT
-- USE THIS FILE ONLY WHEN YOU WANT TO UPGRADE THE 
-- DATABASE FROM PREVIOUS VERSIONS TO THE CURRENT VERSION.
-- DO NOT USE THIS FILE FOR FRESH DATABASE INSTALLATION.
-- ================================================
BEGIN;

\echo Checking current database version...

-- Check if db_version_no column exists
SELECT COUNT(*) AS col_exists
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dts_system'
  AND column_name = 'db_version_no'
\gset

\if :col_exists
    SELECT (db_version_no = '1.0.0') AS is_version_1_0_0
    FROM dts_system_info
    LIMIT 1
    \gset

    \if :is_version_1_0_0
        \echo Upgrading from 1.0.0 to 0.1.2...
        \ir upgrade_from_1.0.0_to_0.1.2.sql
        
    \endif

\else
    SELECT
        (version_no = '0.1.1') AS is_version_0_1_1,
        (version_no = '0.1.2') AS is_version_0_1_2
    FROM dts_system_info
    LIMIT 1
    \gset

    \if :is_version_0_1_1
        \echo Upgrading from 0.1.1 to 0.1.3...
        \ir upgrade_from_0.1.2_to_0.1.3.sql
    \elif :is_version_0_1_2
        \echo Upgrading from 0.1.2 to 0.1.3...
        \ir upgrade_from_0.1.2_to_0.1.3.sql
    \endif
\endif

COMMIT;
