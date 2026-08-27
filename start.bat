@echo off
REM Jalankan Talent Matching System (backend + frontend) sekaligus.
REM Klik dua kali file ini, tunggu ~15 detik, browser terbuka otomatis.

echo Menjalankan backend (FastAPI) di port 8000...
start "TM Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

echo Menjalankan frontend (Vite) di port 5173...
start "TM Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Menunggu server siap...
timeout /t 15 /nobreak >nul
start http://localhost:5173

echo.
echo Web dibuka di http://localhost:5173
echo Tutup kedua jendela "TM Backend" dan "TM Frontend" untuk menghentikan.
