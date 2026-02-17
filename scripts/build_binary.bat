@echo off
setlocal enabledelayedexpansion

:: Total number of steps
set TOTAL_STEPS=9

:: Initialize step counter
set STEP=0


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Creating folder dts_shared_binary ===

if exist dts_shared_binary (
    echo Removing existing dts_shared_binary folder...
    rmdir /s /q dts_shared_binary
)

mkdir dts_shared_binary

set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Creating folder dts_database inside dts_shared_binary ===
if not exist dts_shared_binary\dts_database mkdir dts_shared_binary\dts_database


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Build React Router App ===
call yarn build
if errorlevel 1 (
    echo WARNING: yarn build failed, continuing anyway...
)


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying build folder into dts_shared_binary ===
xcopy /E /I /Y build dts_shared_binary\build


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying package.json into dts_shared_binary ===
copy package.json dts_shared_binary\package.json /Y


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying example.env into dts_shared_binary as .env ===
copy example.env dts_shared_binary\.env /Y


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying all dts_db_schema.sql and upgradeDatabase files into dts_database folder ===
copy scripts\dts_database\dts_db_schema.sql dts_shared_binary\dts_database\dts_db_schema.sql /Y
copy scripts\dts_database\upgrade_database.sql dts_shared_binary\dts_database\upgrade_database.sql /Y
copy scripts\dts_database\upgrade_from_1.0.0_to_0.1.2.sql dts_shared_binary\dts_database\upgrade_from_1.0.0_to_0.1.2.sql /Y
copy scripts\dts_database\upgrade_from_0.1.2_to_0.1.3.sql dts_shared_binary\dts_database\upgrade_from_0.1.2_to_0.1.3.sql /Y
copy scripts\dts_database\upgrade_from_0.1.3_to_0.2.0.sql dts_shared_binary\dts_database\upgrade_from_0.1.3_to_0.2.0.sql /Y

set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying shell scripts into dts_shared_binary ===
copy .\scripts\init_db.bat dts_shared_binary\init_db.bat /Y
copy .\scripts\init_db.sh dts_shared_binary\init_db.sh /Y
copy .\scripts\init_website.bat dts_shared_binary\init_website.bat /Y
copy .\scripts\init_website.sh dts_shared_binary\init_website.sh /Y
copy .\scripts\start.bat dts_shared_binary\start.bat /Y
copy .\scripts\start.sh dts_shared_binary\start.sh /Y
copy .\scripts\upgrade_database.sh dts_shared_binary\upgrade_database.sh /Y
copy .\scripts\upgrade_database.bat dts_shared_binary\upgrade_database.bat /Y

set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying locale folder into dts_shared_binary ===
xcopy .\locales dts_shared_binary\locales\ /E /I /Y


set /A STEP+=1
echo === Step !STEP!/%TOTAL_STEPS%!. Copying README.md file into dts_shared_binary ===
copy .\scripts\README.MD dts_shared_binary\README.md /Y



echo === Done ===
endlocal
pause
