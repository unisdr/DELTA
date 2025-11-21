@echo off
setlocal enabledelayedexpansion

echo WARNING: You are about to upgrade your DELTA database.
echo Make sure to BACK UP your database before continuing.
echo.


:: Confirm upgrade
set /p confirm=Do you want to continue running the database upgrade? (Y/N): 

if /I not "%confirm%"=="Y" if /I not "%confirm%"=="y" (
    echo Upgrade canceled by user.
    exit /b 1
)

echo.
echo Proceeding with database upgrade...
echo ----------------------------------------

:: Ask for database credentials
set /p PGUSER=Enter PostgreSQL username: 
set /p PGDATABASE=Enter database name: 
set /p PGHOST=Enter database host (default: localhost): 
if "%PGHOST%"=="" set PGHOST=localhost
echo.

:: Run SQL upgrade script
psql -U %PGUSER% -d %PGDATABASE% -h %PGHOST% --set ON_ERROR_STOP=on -f "scripts/dts_database/upgrade_database.sql"

if %ERRORLEVEL% neq 0 (
    echo Database upgrade failed.
    endlocal
    pause
    exit /b %ERRORLEVEL%
)

echo Database upgrade process finished successfully.
endlocal
pause
