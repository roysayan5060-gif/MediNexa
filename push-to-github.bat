@echo off
setlocal
echo ===================================================
echo     Doctor X - Push to GitHub (roysayan5060-gif)
echo ===================================================
echo.

set "PATH=%LOCALAPPDATA%\Programs\MinGit\cmd;%LOCALAPPDATA%\Programs\gh;%PATH%"

echo [1/3] Checking Git Status...
git status -s

echo.
echo [2/3] Checking GitHub CLI Authentication...
gh auth status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo You need to authenticate with GitHub once.
    echo Running GitHub login in browser...
    gh auth login --web -h github.com
)

echo.
echo [3/3] Creating/Pushing repository to GitHub (roysayan5060-gif/doctor-x)...
gh repo create doctor-x --public --source=. --remote=origin --push 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Repo already exists or remote configured, pushing latest main branch...
    git push -u origin main
)

echo.
echo ===================================================
echo   Doctor X successfully uploaded to GitHub!
echo   URL: https://github.com/roysayan5060-gif/doctor-x
echo ===================================================
pause
