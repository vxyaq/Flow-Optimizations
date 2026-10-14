$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "cod" -ErrorAction SilentlyContinue

if (-not $processes) {
  Write-Output "WARZONE_NOT_RUNNING"
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

$configPath = Join-Path $env:USERPROFILE "Documents\Call of Duty\players\options.ini"
if (Test-Path $configPath) {
  Copy-Item $configPath "$configPath.k3d.bak" -Force -ErrorAction SilentlyContinue
  $content = Get-Content $configPath -Raw
  $content = $content -replace '(?m)^VideoMemoryScale =.*', 'VideoMemoryScale = 0.85'
  $content = $content -replace '(?m)^ThreadedOptimization =.*', 'ThreadedOptimization = 1'
  Set-Content $configPath $content
}

Write-Output "WARZONE_OPTIMIZED"
