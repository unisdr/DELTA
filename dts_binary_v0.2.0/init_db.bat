@echo off
setlocal

set /p DB_HOST=Enter database host (e.g. localhost or 10.0.0.5): 
set /p DB_PORT=Enter database port (default 5432): 
set /p DB_NAME=Enter the database name: 
set /p PGUSERNAME=Enter database username: 

if "%DB_PORT%"=="" set DB_PORT=5432

echo.
echo Creating database "%DB_NAME%" on %DB_HOST%:%DB_PORT% ...
createdb -h %DB_HOST% -p %DB_PORT% -U %PGUSERNAME% "%DB_NAME%"

if errorlevel 1 (
    echo Failed to create database "%DB_NAME%".
    goto end
)

echo Database "%DB_NAME%" created successfully.
echo Restoring schema...

psql -h %DB_HOST% -p %DB_PORT% -U %PGUSERNAME% -W -d "%DB_NAME%" ^
     -f dts_database\dts_db_schema.sql

if errorlevel 1 (
    echo Failed to restore schema.
) else (
    echo Schema restored successfully.
)

:end
pause
endlocal
