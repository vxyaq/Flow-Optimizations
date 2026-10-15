$ErrorActionPreference = "SilentlyContinue"

if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
    nvidia-smi -pm 0
}

Get-ScheduledTask | Where-Object { $_.TaskName -like "NvTm*" } | Enable-ScheduledTask
Set-Service -Name "NvTelemetryContainer" -StartupType Automatic
Start-Service -Name "NvTelemetryContainer"

$gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -match "NVIDIA" -and $_.PNPDeviceID } | Select-Object -First 1
if ($gpu) {
    $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.PNPDeviceID)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
    if (Test-Path $msiPath) {
        Remove-ItemProperty -Path $msiPath -Name "MSISupported"
    }
}

$nvScheduler = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler"
if (Test-Path $nvScheduler) {
    Remove-ItemProperty -Path $nvScheduler -Name "EnablePreemption"
}

$graphicsDrivers = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
Remove-ItemProperty -Path $graphicsDrivers -Name "TdrDelay"
Remove-ItemProperty -Path $graphicsDrivers -Name "TdrDdiDelay"
Remove-ItemProperty -Path $graphicsDrivers -Name "TdrLevel"

$powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
if (Test-Path $powerPath) {
    Remove-ItemProperty -Path $powerPath -Name "DisableDynamicPstate"
    Remove-ItemProperty -Path $powerPath -Name "PowerMizerEnable"
    Remove-ItemProperty -Path $powerPath -Name "PowerMizerLevel"
    Remove-ItemProperty -Path $powerPath -Name "PowerMizerLevelAC"
    Remove-ItemProperty -Path $powerPath -Name "PerfLevelSrc"
}

$gameConfigStore = "HKCU:\System\GameConfigStore"
if (Test-Path $gameConfigStore) {
    Remove-ItemProperty -Path $gameConfigStore -Name "GameDVR_Enabled"
    Remove-ItemProperty -Path $gameConfigStore -Name "GameDVR_FSEBehaviorMode"
    Remove-ItemProperty -Path $gameConfigStore -Name "GameDVR_HonorUserFSEBehaviorMode"
    Remove-ItemProperty -Path $gameConfigStore -Name "GameDVR_DXGIHonorFSEWindowsCompatible"
    Remove-ItemProperty -Path $gameConfigStore -Name "GameDVR_EFSEFeatureFlags"
}

$multimediaProfile = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
if (Test-Path $multimediaProfile) {
    Remove-ItemProperty -Path $multimediaProfile -Name "GPU Priority"
    Remove-ItemProperty -Path $multimediaProfile -Name "Priority"
    Remove-ItemProperty -Path $multimediaProfile -Name "Scheduling Category"
    Remove-ItemProperty -Path $multimediaProfile -Name "SFIO Priority"
}

Write-Output "NVIDIA optimizations reverted to default"
