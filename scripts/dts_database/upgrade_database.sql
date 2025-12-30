-- ================================================
-- DELTA DATABASE UPGRADE SCRIPT
-- USE THIS FILE ONLY WHEN YOU WANT TO UPGRADE THE 
-- DATABASE FROM PREVIOUS VERSIONS TO THE CURRENT VERSION.
-- DO NOT USE THIS FILE FOR FRESH DATABASE INSTALLATION.
-- ================================================
BEGIN;
\encoding UTF8
SHOW client_encoding;


\echo Checking current database version...

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

COMMIT;
