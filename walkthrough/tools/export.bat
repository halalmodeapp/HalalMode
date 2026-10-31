@echo off
rem Double-click to export the Halal Mode walkthrough films to MP4.
cd /d "%~dp0"
where ffmpeg >nul 2>nul || (echo ffmpeg was not found. Install it from https://www.gyan.dev/ffmpeg/builds/ and try again. & pause & exit /b 1)
if not exist node_modules\playwright-core (echo Setting up the exporter, one time only... & call npm install --no-audit --no-fund || (pause & exit /b 1))

echo.
echo  Halal Mode walkthrough export
echo  -----------------------------
set FILM=all
set /p FILM=Film: a, b, c or all [all]:
echo.
echo   1  1080x1920  TikTok, Reels, Shorts
echo   2  1920x1080  website, YouTube
echo   3  720x1280   vertical, smaller file
echo   4  1280x720   wide, smaller file
echo   5  2160x3840  vertical 4K
echo   6  3840x2160  wide 4K
echo   7  all of them
set S=1
set /p S=Size [1]:
set SIZE=1080x1920
if "%S%"=="2" set SIZE=1920x1080
if "%S%"=="3" set SIZE=720x1280
if "%S%"=="4" set SIZE=1280x720
if "%S%"=="5" set SIZE=2160x3840
if "%S%"=="6" set SIZE=3840x2160
if "%S%"=="7" set SIZE=all
set EXTRA=
set M=y
set /p M=Include music? y/n [y]:
if /i "%M%"=="n" set EXTRA=%EXTRA% --no-music
set X=y
set /p X=Include sound effects? y/n [y]:
if /i "%X%"=="n" set EXTRA=%EXTRA% --no-sfx
echo.
node export.mjs --film %FILM% --size %SIZE%%EXTRA%
echo.
echo The files are in the walkthrough\exports folder.
start "" "%~dp0..\exports" 2>nul
pause
