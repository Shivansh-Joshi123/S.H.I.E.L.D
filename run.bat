@echo off
title S.H.I.E.L.D. - Underground Cable Fault Detection, Localization and Self-Healing
echo ===============================================================================
echo     S.H.I.E.L.D. — Underground Cable Fault Detection & Self-Healing
echo ===============================================================================
echo.
echo Starting Backend (Spring Boot 3.3.4 on http://localhost:8080)...
start "SHIELD-Backend" cmd /k "cd /d %~dp0backend && .\mvnw.cmd spring-boot:run"

echo Starting Frontend (Vite + React 19 on http://localhost:5173)...
start "SHIELD-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting 6 seconds for services to initialize...
timeout /t 6 /nobreak >nul

echo Opening S.H.I.E.L.D. Dashboard in your default browser...
start http://localhost:5173

echo.
echo S.H.I.E.L.D. is running!
echo - Frontend UI:  http://localhost:5173
echo - Backend API:  http://localhost:8080/api/network
echo - API Health:   http://localhost:8080/api/health
echo.
echo Press any key to exit this launcher window (services will stay open in their own windows)...
pause >nul
