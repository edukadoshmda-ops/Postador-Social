@echo off
title Pulso Social PRO - Inicializador Blindado
chcp 65001 >nul
echo ========================================================
echo   PULSO SOCIAL PRO v5.80.0 - INICIANDO SISTEMA
echo ========================================================
echo.
echo [1/4] Limpando e liberando portas 5174 e 3001 contra travamentos...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo       Portas liberadas com sucesso!

echo.
echo [2/4] Iniciando Servidor Backend (Porta 3001)...
start "Pulso Social - Backend (Porta 3001)" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 >nul

echo.
echo [3/4] Iniciando Painel Frontend (Porta 5174)...
start "Pulso Social - Frontend (Porta 5174)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo.
echo [4/4] Abrindo Painel no Navegador...
start http://localhost:5174

echo.
echo ========================================================
echo   SISTEMA ONLINE COM SUCESSO!
echo   - Painel: http://localhost:5174
echo   - Aquecedores: http://localhost:5174/aquecedores
echo   - API Backend: http://localhost:3001
echo   - Extensao: Pronta e sincronizada
echo ========================================================
echo   Mantenha as janelas pretas abertas ou minimizadas.
pause
