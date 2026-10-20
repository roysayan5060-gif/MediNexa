@echo off
title Doctor X Healthcare Platform
echo =======================================================
echo 🩺 Starting Doctor X Full-Stack Healthcare Platform...
echo =======================================================
echo.

echo [1/2] Starting Node.js Backend Server (Port 5000)...
start "Doctor X - Backend (Port 5000)" cmd /k "cd /d %~dp0backend && node dist/server.js"

echo [2/2] Starting Frontend Vite Server (Port 5173)...
start "Doctor X - Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npx vite --host 0.0.0.0 --port 5173"

echo.
echo =======================================================
echo ✅ Doctor X Services are Launching!
echo.
echo • Desktop URL:      http://localhost:5173
echo • Mobile (Wi-Fi):   http://192.168.0.153:5173
echo • Backend REST API: http://localhost:5000/api
echo.
echo Keep the backend and frontend windows running while using the app.
echo =======================================================
timeout /t 5 >nul
start http://localhost:5173
