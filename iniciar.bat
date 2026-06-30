@echo off
chcp 65001 >nul
title Asistente de Carrera Bot
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
echo.
echo  ====================================
echo   Asistente de Carrera - Iniciando
echo  ====================================
echo.

REM Verifica que Node y Python esten instalados
where node >nul 2>&1 || (echo ERROR: Node.js no encontrado. Instala desde nodejs.org && pause && exit)
where py >nul 2>&1 || (echo ERROR: Python no encontrado. Instala desde python.org && pause && exit)

REM Instala dependencias si no existen
if not exist "node_modules" (
    echo Instalando dependencias Node...
    npm install --no-audit --no-fund
)
if not exist "scraper\__pycache__" (
    echo Instalando dependencias Python...
    py -m pip install -r scraper\requirements.txt -q
)

echo Arrancando bot y scraper...
echo (Cierra esta ventana para detener todo)
echo.
npm start
pause
