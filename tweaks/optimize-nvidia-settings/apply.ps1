$ErrorActionPreference = "SilentlyContinue"

if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
    nvidia-smi -pm 1
}

Get-ScheduledTask | Where-Object { $_.TaskName -like "NvTm*" } | Disable-ScheduledTask
Stop-Service -Name "NvTelemetryContainer" -Force
Set-Service -Name "NvTelemetryContainer" -StartupType Disabled

$gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -match "NVIDIA" -and $_.PNPDeviceID } | Select-Object -First 1
if ($gpu) {
    $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.PNPDeviceID)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
    if (-not (Test-Path $msiPath)) {
        New-Item -Path $msiPath -Force | Out-Null
    }
    Set-ItemProperty -Path $msiPath -Name "MSISupported" -Value 1 -Type DWord -Force
}

$nvScheduler = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Scheduler"
if (-not (Test-Path $nvScheduler)) {
    New-Item -Path $nvScheduler -Force | Out-Null
}
Set-ItemProperty -Path $nvScheduler -Name "EnablePreemption" -Value 0 -Type DWord -Force

$graphicsDrivers = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
Set-ItemProperty -Path $graphicsDrivers -Name "TdrDelay" -Value 60 -Type DWord -Force
Set-ItemProperty -Path $graphicsDrivers -Name "TdrDdiDelay" -Value 60 -Type DWord -Force
Set-ItemProperty -Path $graphicsDrivers -Name "TdrLevel" -Value 0 -Type DWord -Force

$powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
if (Test-Path $powerPath) {
    Set-ItemProperty -Path $powerPath -Name "DisableDynamicPstate" -Value 1 -Type DWord -Force
    Set-ItemProperty -Path $powerPath -Name "PowerMizerEnable" -Value 0 -Type DWord -Force
    Set-ItemProperty -Path $powerPath -Name "PowerMizerLevel" -Value 1 -Type DWord -Force
    Set-ItemProperty -Path $powerPath -Name "PowerMizerLevelAC" -Value 1 -Type DWord -Force
    Set-ItemProperty -Path $powerPath -Name "PerfLevelSrc" -Value 8738 -Type DWord -Force
}

$gameConfigStore = "HKCU:\System\GameConfigStore"
if (-not (Test-Path $gameConfigStore)) {
    New-Item -Path $gameConfigStore -Force | Out-Null
}
Set-ItemProperty -Path $gameConfigStore -Name "GameDVR_Enabled" -Value 0 -Type DWord -Force
Set-ItemProperty -Path $gameConfigStore -Name "GameDVR_FSEBehaviorMode" -Value 2 -Type DWord -Force
Set-ItemProperty -Path $gameConfigStore -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $gameConfigStore -Name "GameDVR_DXGIHonorFSEWindowsCompatible" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $gameConfigStore -Name "GameDVR_EFSEFeatureFlags" -Value 0 -Type DWord -Force

$multimediaProfile = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
if (-not (Test-Path $multimediaProfile)) {
    New-Item -Path $multimediaProfile -Force | Out-Null
}
Set-ItemProperty -Path $multimediaProfile -Name "GPU Priority" -Value 8 -Type DWord -Force
Set-ItemProperty -Path $multimediaProfile -Name "Priority" -Value 6 -Type DWord -Force
Set-ItemProperty -Path $multimediaProfile -Name "Scheduling Category" -Value "High" -Type String -Force
Set-ItemProperty -Path $multimediaProfile -Name "SFIO Priority" -Value "High" -Type String -Force

$nvidiaData = Join-Path $env:LOCALAPPDATA "NVIDIA"
@("DXCache", "GLCache") | ForEach-Object {
    $cachePath = Join-Path $nvidiaData $_
    if (Test-Path $cachePath) {
        Remove-Item (Join-Path $cachePath "*") -Recurse -Force
    }
}

Write-Output "NVIDIA optimizations applied successfully"
