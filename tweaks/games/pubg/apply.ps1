$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "TslGame" -ErrorAction SilentlyContinue

if (-not $processes) {
  Write-Output "PUBG_NOT_RUNNING"
  exit 0
}

$processes | ForEach-Object {
  try { $_.PriorityClass = "High" } catch { }
}

$gameProcess = $processes | Select-Object -First 1
try {
  $gamePath = $gameProcess.Path
  if ($gamePath) {
    $gpuPreferencesPath = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
    New-Item -Path $gpuPreferencesPath -Force | Out-Null
    New-ItemProperty -Path $gpuPreferencesPath -Name $gamePath -PropertyType String -Value "GpuPreference=2;" -Force | Out-Null
  }
} catch { }

$gameConfigPath = "HKCU:\System\GameConfigStore"
$gameBarPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR"
New-Item -Path $gameConfigPath -Force | Out-Null
New-Item -Path $gameBarPath -Force | Out-Null
New-ItemProperty -Path $gameConfigPath -Name "GameDVR_Enabled" -PropertyType DWord -Value 0 -Force | Out-Null
New-ItemProperty -Path $gameBarPath -Name "AppCaptureEnabled" -PropertyType DWord -Value 0 -Force | Out-Null

$configPath = "$env:LOCALAPPDATA\TslGame\Saved\Config\WindowsNoEditor\GameUserSettings.ini"
if (-not (Test-Path $configPath)) {
  Write-Output "PUBG_CONFIG_MISSING"
  exit 0
}

$backupPath = "$configPath.backup"
if (-not (Test-Path $backupPath)) {
  Copy-Item -Path $configPath -Destination $backupPath -Force
}

$content = Get-Content -Path $configPath -Raw

$content = $content -replace '(?m)^bUseVSync=.*$', 'bUseVSync=False'
if ($content -notmatch 'bUseVSync=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nbUseVSync=False"
}

$content = $content -replace '(?m)^FrameRateLimit=.*$', 'FrameRateLimit=240.000000'
if ($content -notmatch 'FrameRateLimit=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nFrameRateLimit=240.000000"
}

$content = $content -replace '(?m)^sg\.ResolutionQuality=.*$', 'sg.ResolutionQuality=100'
if ($content -notmatch 'sg\.ResolutionQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.ResolutionQuality=100"
}

$content = $content -replace '(?m)^sg\.ViewDistanceQuality=.*$', 'sg.ViewDistanceQuality=0'
if ($content -notmatch 'sg\.ViewDistanceQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.ViewDistanceQuality=0"
}

$content = $content -replace '(?m)^sg\.AntiAliasingQuality=.*$', 'sg.AntiAliasingQuality=0'
if ($content -notmatch 'sg\.AntiAliasingQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.AntiAliasingQuality=0"
}

$content = $content -replace '(?m)^sg\.ShadowQuality=.*$', 'sg.ShadowQuality=0'
if ($content -notmatch 'sg\.ShadowQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.ShadowQuality=0"
}

$content = $content -replace '(?m)^sg\.PostProcessQuality=.*$', 'sg.PostProcessQuality=0'
if ($content -notmatch 'sg\.PostProcessQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.PostProcessQuality=0"
}

$content = $content -replace '(?m)^sg\.TextureQuality=.*$', 'sg.TextureQuality=2'
if ($content -notmatch 'sg\.TextureQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.TextureQuality=2"
}

$content = $content -replace '(?m)^sg\.EffectsQuality=.*$', 'sg.EffectsQuality=0'
if ($content -notmatch 'sg\.EffectsQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.EffectsQuality=0"
}

$content = $content -replace '(?m)^sg\.FoliageQuality=.*$', 'sg.FoliageQuality=0'
if ($content -notmatch 'sg\.FoliageQuality=') {
  $content = $content -replace '(\[/Script/TslGame\.TslGameUserSettings\])', "`$1`r`nsg.FoliageQuality=0"
}

Set-Content -Path $configPath -Value $content -Force

Write-Output "PUBG_OPTIMIZED"
