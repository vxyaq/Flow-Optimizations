$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "r5apex" -ErrorAction SilentlyContinue

if (-not $processes) {
  Write-Output "APEX_NOT_RUNNING"
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

$videoConfigPath = Join-Path $env:USERPROFILE "Saved Games\Respawn\Apex\local\videoconfig.txt"
if (Test-Path $videoConfigPath) {
  Copy-Item $videoConfigPath "$videoConfigPath.k3d.bak" -Force -ErrorAction SilentlyContinue
  $content = Get-Content $videoConfigPath -Raw
  $content = $content -replace '(?m)^"setting.cl_gib_allow".*', '"setting.cl_gib_allow" "0"'
  $content = $content -replace '(?m)^"setting.cl_particle_fallback_base".*', '"setting.cl_particle_fallback_base" "0"'
  $content = $content -replace '(?m)^"setting.mat_vsync_mode".*', '"setting.mat_vsync_mode" "0"'
  Set-Content $videoConfigPath $content
}

Write-Output "APEX_OPTIMIZED"
