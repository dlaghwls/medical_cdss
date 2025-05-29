@echo off
echo Starting script...

REM Change to the directory where this batch file is located
cd /d "%~dp0"
echo Current directory is: %CD%
echo.

echo Attempting to activate virtual environment...
IF EXIST "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment should be active.
    echo VIRTUAL_ENV variable is: %VIRTUAL_ENV%
) ELSE (
    echo ERROR: venv\Scripts\activate.bat was NOT found in the current directory.
    echo Please check if the 'venv' folder and the activate script exist.
)
echo.

echo Script finished.
cmd /k