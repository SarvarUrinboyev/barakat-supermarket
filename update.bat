@echo off
chcp 65001 >nul
title Barakat SuperMarket - Yangilash
cd /d "%~dp0"

echo ============================================
echo   BARAKAT SUPERMARKET - Tizimni yangilash
echo ============================================
echo.
echo Bu jarayon ~10-15 daqiqa davom etadi.
echo.

echo [1/3] Frontend build qilinmoqda...
cd frontend
call npm install --silent
call npm run build
if errorlevel 1 goto :err
cd ..
echo.

echo [2/3] Backend JAR build qilinmoqda...
cd backend
call mvnw.cmd -B clean package -DskipTests
if errorlevel 1 goto :err
cd ..
echo.

echo [3/3] Desktop ilova paketlanmoqda...
cd electron
call npm install --silent
call npm run dist
if errorlevel 1 goto :err
cd ..
echo.

echo ============================================
echo   TAYYOR!
echo   Yangi o'rnatuvchi fayl:
echo   electron\dist\Barakat SuperMarket Setup 1.0.0.exe
echo.
echo   Uni ishga tushirib, eski versiya ustiga o'rnating.
echo ============================================
pause
exit /b 0

:err
echo.
echo  XATOLIK yuz berdi. Yuqoridagi xabarlarni tekshiring.
pause
exit /b 1
