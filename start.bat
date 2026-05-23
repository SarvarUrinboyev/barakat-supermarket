@echo off
chcp 65001 >nul
title Barakat SuperMarket
cd /d "%~dp0"

echo ============================================
echo   BARAKAT SUPERMARKET
echo ============================================
echo.

if not exist "backend\target\barakat-market.jar" (
  echo Birinchi ishga tushirish - tizim build qilinmoqda.
  echo Bu bir necha daqiqa vaqt oladi, kuting...
  echo.
  echo [1/2] Frontend build...
  cd frontend
  call npm install --silent
  call npm run build
  if errorlevel 1 goto :err
  cd ..
  echo [2/2] Backend build...
  cd backend
  call mvnw.cmd -B clean package -DskipTests
  if errorlevel 1 goto :err
  cd ..
)

if not exist "electron\node_modules" (
  echo Electron paketi o'rnatilmoqda...
  cd electron
  call npm install --silent
  cd ..
)

echo Ilova ochilmoqda...
cd electron
call npm start
cd ..
exit /b 0

:err
echo.
echo  XATOLIK yuz berdi. Yuqoridagi xabarlarni tekshiring.
pause
exit /b 1
