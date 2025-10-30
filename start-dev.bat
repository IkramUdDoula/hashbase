@echo off
echo Starting development server...

:: Run npm install if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install dependencies. Exiting.
        pause
        exit /b %ERRORLEVEL%
    )
)

:: Start the development server
echo Starting development server with 'npm run dev'...
call npm run dev

:: Keep the window open to see the output
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo The command failed with error code %ERRORLEVEL%
) else (
    echo.
    echo Development server stopped
)

pause
