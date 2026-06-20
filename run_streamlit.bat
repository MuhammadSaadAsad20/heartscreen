@echo off
REM ============================================================
REM  HeartScreen - backup Streamlit app (Windows launcher)
REM ============================================================
echo Launching the backup Streamlit app at http://localhost:8501 ...
py -3.12 -m streamlit run app.py
