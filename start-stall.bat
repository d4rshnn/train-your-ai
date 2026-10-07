@echo off
rem ---------------------------------------------------------------------------------------------
rem  Train Your AI - stall launcher (Windows)
rem  Builds the app if dist\ is missing, serves it from this laptop only (127.0.0.1, no internet),
rem  and opens it full screen in Edge or Chrome. Close the browser (Alt+F4) to stop everything.
rem
rem    start-stall.bat                 normal start
rem    start-stall.bat --autoplay      start in the self-playing demo loop (fallback / attract mode)
rem    start-stall.bat --record        play ONE cycle and stop on the last screen (to screen-record the fallback video)
rem    start-stall.bat --dry           only report what it would do (nothing is started)
rem    start-stall.bat --no-browser    start the server only (for testing)
rem ---------------------------------------------------------------------------------------------
setlocal EnableExtensions
cd /d "%~dp0"
title Train Your AI - stall launcher

set "PORT=4173"
set "QUERY=?kiosk"
set "DRY="
set "NOBROWSER="
:args
if "%~1"=="" goto args_done
if /i "%~1"=="--dry" set "DRY=1"
if /i "%~1"=="--no-browser" set "NOBROWSER=1"
if /i "%~1"=="--autoplay" set "QUERY=?kiosk&autoplay"
if /i "%~1"=="--record" set "QUERY=?kiosk&autoplay&once"
shift
goto args
:args_done
set "URL=http://127.0.0.1:%PORT%/%QUERY%"

rem --- 1. make sure there is a build -------------------------------------------------------------
if exist "dist\index.html" goto have_build
echo dist\ is missing - building it now.
where node >nul 2>&1
if errorlevel 1 goto no_node
if exist "node_modules\" goto build
echo First run on this machine: installing packages (needs internet once).
call npm install
if errorlevel 1 goto build_failed
:build
call npm run build
if errorlevel 1 goto build_failed
goto have_build
:no_node
echo.
echo dist\ is missing and Node.js is not installed here, so it cannot be built.
echo Copy the dist\ folder from the machine where the app was built, then run this again.
pause
exit /b 1
:build_failed
echo.
echo The build failed. See the messages above.
pause
exit /b 1
:have_build

rem --- 2. find Edge or Chrome ----------------------------------------------------------------------
set "PF86=%ProgramFiles(x86)%"
set "PF=%ProgramFiles%"
set "LAD=%LocalAppData%"
set "BROWSER="
if exist "%PF86%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%PF86%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%PF%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%PF%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%PF%\Google\Chrome\Application\chrome.exe" set "BROWSER=%PF%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%PF86%\Google\Chrome\Application\chrome.exe" set "BROWSER=%PF86%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LAD%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LAD%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if not defined NOBROWSER if not defined DRY goto no_browser

set "KIOSK=--kiosk"
echo "%BROWSER%" | findstr /i "msedge" >nul && set "KIOSK=--kiosk --edge-kiosk-type=fullscreen"
set "PROFILE=%LAD%\TrainYourAI\browser-profile"
set FLAGS=%KIOSK% --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check --disable-features=Translate,TranslateUI --noerrdialogs --disable-session-crashed-bubble --disable-infobars --overscroll-history-navigation=0 --disable-pinch --autoplay-policy=no-user-gesture-required

if defined DRY echo [dry run] build present : yes
if defined DRY echo [dry run] browser       : %BROWSER%
if defined DRY echo [dry run] address       : "%URL%"
if defined DRY echo [dry run] browser flags : %FLAGS%
if defined DRY echo [dry run] server        : powershell scripts\serve.ps1 -Root dist -Port %PORT%  (127.0.0.1 only)
if defined DRY exit /b 0

rem --- 3. start the local server (unless one is already answering) -----------------------------------
curl.exe -s -o nul -m 2 "http://127.0.0.1:%PORT%/" >nul 2>&1
if not errorlevel 1 goto server_up
start "TrainYourAI-server" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\serve.ps1" -Root "%~dp0dist" -Port %PORT%
set /a TRIES=0
:wait_server
set /a TRIES+=1
curl.exe -s -o nul -m 2 "http://127.0.0.1:%PORT%/" >nul 2>&1
if not errorlevel 1 goto server_up
if %TRIES% geq 20 goto server_failed
timeout /t 1 /nobreak >nul
goto wait_server
:server_failed
echo The local server did not start. Close other copies of this launcher and try again.
pause
exit /b 1
:server_up

rem --- 4. open the app, wait until the browser is closed, then stop the server -------------------------
if defined NOBROWSER (
  echo Server is running at %URL%  - press any key to stop it.
  pause >nul
  goto stop_server
)
start "" /wait "%BROWSER%" %FLAGS% "%URL%"

:stop_server
if exist "%TEMP%\tya-server.pid" (
  for /f "usebackq" %%i in ("%TEMP%\tya-server.pid") do taskkill /f /pid %%i >nul 2>&1
  del "%TEMP%\tya-server.pid" >nul 2>&1
)
exit /b 0

:no_browser
echo.
echo Neither Microsoft Edge nor Google Chrome was found. Install one of them, then run this again.
pause
exit /b 1
