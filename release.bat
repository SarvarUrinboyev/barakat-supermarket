@echo off
chcp 65001 >nul
title Barakat SuperMarket - Yangi versiya chiqarish
cd /d "%~dp0"

echo ============================================
echo   BARAKAT SUPERMARKET - RELEASE
echo ============================================
echo.

if "%GH_TOKEN%"=="" (
  echo XATO: GH_TOKEN o'rnatilmagan.
  echo.
  echo Avval buyruq oynasida quyidagini bajaring:
  echo   set GH_TOKEN=ghp_sizning_tokeningiz
  echo.
  echo Batafsil: RELEASE.md faylini o'qing.
  pause
  exit /b 1
)

echo [1/3] Frontend build qilinmoqda...
cd frontend
call npm install --silent
call npm run build
if errorlevel 1 goto err
cd ..

echo [2/3] Backend build qilinmoqda...
cd backend
call mvnw.cmd -B clean package -DskipTests
if errorlevel 1 goto err
cd ..

echo [3/3] Yangi versiya GitHub Releases'ga yuklanmoqda...
cd electron
call npm install --silent
call npm run release
if errorlevel 1 goto err
cd ..

echo.
echo ============================================
echo   TAYYOR! Yangi versiya yuklandi.
echo   Mijozlar dasturni ochganda yangilanish
echo   avtomatik keladi.
echo ============================================
pause
exit /b 0

:err
echo.
echo  XATOLIK yuz berdi. Yuqoridagi xabarlarni tekshiring.
pause
exit /b 1
