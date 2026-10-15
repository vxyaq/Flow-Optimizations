$ErrorActionPreference = "SilentlyContinue"

$processName = "Discord"
$changed = $false

foreach ($p in (Get-Process -Name $processName -ErrorAction SilentlyContinue)) {
  try { $p.PriorityClass = "BelowNormal"; $changed = $true } catch {}
}

$gpuKey = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
New-Item -Path $gpuKey -Force | Out-Null

$discordExe = $null
$running = Get-Process -Name $processName -ErrorAction SilentlyContinue | Select-Object -First 1
if ($running -and $running.Path) { $discordExe = $running.Path }
if (-not $discordExe) {
  $root = Join-Path $env:LOCALAPPDATA "Discord"
  if (Test-Path $root) {
    $found = Get-ChildItem $root -Recurse -Filter "Discord.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $discordExe = $found.FullName }
  }
}
if ($discordExe) {
  New-ItemProperty -Path $gpuKey -Name $discordExe -PropertyType String -Value "GpuPreference=1;" -Force | Out-Null
  $changed = $true
}

$settingsPath = Join-Path $env:APPDATA "discord\settings.json"
if (Test-Path $settingsPath) {
  $bak = "$settingsPath.flow.bak"
  if (-not (Test-Path $bak)) { Copy-Item $settingsPath $bak -Force }
  try {
    $json = Get-Content $settingsPath -Raw | ConvertFrom-Json
    $json | Add-Member -NotePropertyName "enableHardwareAcceleration" -NotePropertyValue $false -Force
    $json | ConvertTo-Json -Depth 30 | Set-Content $settingsPath -Encoding UTF8
    $changed = $true
  } catch {}
}

foreach ($d in @("Cache", "Code Cache", "GPUCache", "Service Worker\CacheStorage", "blob_storage")) {
  $path = Join-Path $env:APPDATA "discord\$d"
  if (Test-Path $path) { Remove-Item "$path\*" -Recurse -Force -ErrorAction SilentlyContinue }
}

if ($changed) {
  Write-Output "DISCORD_OPTIMIZED"
} else {
  Write-Output "DISCORD_NOT_FOUND"
}
