@echo off
REM ============================================================
REM  HeartScreen - modern Flask web app (Windows launcher)
REM ============================================================
echo Installing dependencies (first run only)...
py -3.12 -m pip install -r requirements.txt

echo.
echo Building dataset (if needed)...
if not exist data\heart.csv py -3.12 src\build_dataset.py

echo Training models (if needed)...
if not exist reports\metrics.json py -3.12 src\train.py

echo.
echo Launching the web app at http://localhost:5000 ...
py -3.12 web\server.py
