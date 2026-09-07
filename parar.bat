@echo off
title Pulso Social PRO - Encerrar Servidores
chcp 65001 >nul
echo ========================================================
echo   PULSO SOCIAL PRO - ENCERRANDO SERVIDORES
echo ========================================================
echo.
echo Liberando porta 5174 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo Liberando porta 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo.
echo Todos os servidores foram encerrados e as portas foram liberadas!
timeout /t 2 >nul
