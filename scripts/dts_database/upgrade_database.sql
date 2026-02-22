BEGIN;
\encoding UTF8
SHOW client_encoding;

\echo Checking current database version...

-- ================================
-- Upgrade 0.1.1 -> 0.1.3
-- Note: the app version was named here 0.1.2 but the version in db was saved as 0.1.1
-- ================================
SELECT (version_no='0.1.1') AS is_version_0_1_1 FROM dts_system_info LIMIT 1 \gset
\if :is_version_0_1_1
    \echo Upgrading from 0.1.1 to 0.1.3...
    \ir upgrade_from_0.1.2_to_0.1.3.sql
\endif

-- ================================
-- Upgrade 0.1.3 -> 0.2.0
-- ================================
SELECT (version_no='0.1.3') AS is_version_0_1_3 FROM dts_system_info LIMIT 1 \gset
\if :is_version_0_1_3
    \echo Upgrading from 0.1.3 to 0.2.0...
    \ir upgrade_from_0.1.3_to_0.2.0.sql
\endif


COMMIT;
