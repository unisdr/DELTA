\encoding UTF8
SHOW client_encoding;

\echo Checking database initialization status...

-- Check if this is a new database (public schema has ≤1 tables)
SELECT (COUNT(*) <= 1) AS is_new_database FROM pg_tables WHERE schemaname = 'public' \gset

\if :is_new_database
    \echo Initializing new database with full schema...
    \ir ./dts_db_schema.sql
\else
    \echo Applying upgrade migrations to existing database...
    \ir ./upgrade_database.sql
\endif
