@echo off
title Crescent ReClaim - Backend Server
echo ===================================================
echo Crescent ReClaim - Campus Lost and Found Server
echo Developer: M. MOHAED ASKAR (Reg No: 240071601159)
echo Crescent Institute of Science and Technology
echo ===================================================
echo.
echo Starting SQLite Relational Database and API Server...
echo Portal URL: http://localhost:5000
echo.
start http://localhost:5000
node server.js
pause
