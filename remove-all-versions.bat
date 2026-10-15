@echo off
chcp 65001 >nul 2>&1
title Flow Optimizations - Complete Uninstaller

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║        Flow Optimizations - Complete Removal Tool           ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This will remove:
echo    - All installed versions of Flow Optimizations
echo    - Old K3d Tweaks installations
echo    - App data, settings and cache
echo    - Registry entries
echo.
echo  ⚠  Close the application before continuing!
echo.
pause
echo.

echo [1/4] Removing Program Files...
if exist "%LOCALAPPDATA%\Programs\flowoptimizations" (
    rmdir /s /q "%LOCALAPPDATA%\Programs\flowoptimizations" 2>nul
    rmdir /s /q "%LOCALAPPDATA%\Programs\flow-optimizations" 2>nul
    rmdir /s /q "%LOCALAPPDATA%\Programs\Flow Optimizations" 2>nul
    echo    Removed Program Files
) else (
    echo    No Program Files found
)
if exist "%LOCALAPPDATA%\Programs\k3dtweaks" (
    rmdir /s /q "%LOCALAPPDATA%\Programs\k3dtweaks" 2>nul
    rmdir /s /q "%LOCALAPPDATA%\Programs\k3d-tweaks" 2>nul
    rmdir /s /q "%LOCALAPPDATA%\Programs\K3d Tweaks" 2>nul
    echo    Removed old K3d Tweaks Program Files
)

echo [2/4] Removing App Data...
rmdir /s /q "%APPDATA%\Flow Optimizations" 2>nul
rmdir /s /q "%APPDATA%\flowoptimizations" 2>nul
rmdir /s /q "%APPDATA%\flow-optimizations" 2>nul
rmdir /s /q "%LOCALAPPDATA%\Flow Optimizations" 2>nul
rmdir /s /q "%LOCALAPPDATA%\flowoptimizations" 2>nul
rmdir /s /q "%LOCALAPPDATA%\flow-optimizations" 2>nul
rmdir /s /q "%TEMP%\Flow Optimizations" 2>nul
rmdir /s /q "%APPDATA%\K3d Tweaks" 2>nul
rmdir /s /q "%APPDATA%\k3dtweaks" 2>nul
rmdir /s /q "%APPDATA%\k3d-tweaks" 2>nul
rmdir /s /q "%LOCALAPPDATA%\K3d Tweaks" 2>nul
rmdir /s /q "%LOCALAPPDATA%\k3dtweaks" 2>nul
rmdir /s /q "%LOCALAPPDATA%\k3d-tweaks" 2>nul
rmdir /s /q "%TEMP%\K3d Tweaks" 2>nul
rmdir /s /q "%USERPROFILE%\.k3d" 2>nul
echo    Removed App Data and Cache

echo [3/4] Removing Registry Entries...
reg delete "HKCU\Software\Flow Optimizations" /f >nul 2>&1
reg delete "HKCU\Software\flowoptimizations" /f >nul 2>&1
reg delete "HKCU\Software\flow-optimizations" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Flow Optimizations" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\flowoptimizations" /f >nul 2>&1
reg delete "HKCU\Software\K3d Tweaks" /f >nul 2>&1
reg delete "HKCU\Software\k3dtweaks" /f >nul 2>&1
reg delete "HKCU\Software\k3d-tweaks" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\K3d Tweaks" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\k3dtweaks" /f >nul 2>&1
echo    Removed Registry Entries

echo [4/4] Removing Shortcuts...
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Flow Optimizations.lnk" 2>nul
del /f /q "%PUBLIC%\Desktop\Flow Optimizations.lnk" 2>nul
del /f /q "%USERPROFILE%\Desktop\Flow Optimizations.lnk" 2>nul
del /f /q "%APPDATA%\Microsoft\Internet Explorer\Quick Launch\Flow Optimizations.lnk" 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\K3d Tweaks.lnk" 2>nul
del /f /q "%PUBLIC%\Desktop\K3d Tweaks.lnk" 2>nul
del /f /q "%USERPROFILE%\Desktop\K3d Tweaks.lnk" 2>nul
del /f /q "%APPDATA%\Microsoft\Internet Explorer\Quick Launch\K3d Tweaks.lnk" 2>nul
echo    Removed Shortcuts

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║              Removal Complete!                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  All versions of Flow Optimizations (and old K3d Tweaks) have been removed.
echo  You can now safely install a fresh copy.
echo.
pause
