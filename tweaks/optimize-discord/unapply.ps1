$ErrorActionPreference = "SilentlyContinue"

$processName = "Discord"

foreach ($p in (Get-Process -Name $processName -ErrorAction SilentlyContinue)) {
  try { $p.PriorityClass = "Normal" } catch {}
}

$gpuKey = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
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
  Remove-ItemProperty -Path $gpuKey -Name $discordExe -ErrorAction SilentlyContinue
}

$settingsPath = Join-Path $env:APPDATA "discord\settings.json"
$bak = "$settingsPath.flow.bak"
if (Test-Path $bak) {
  Copy-Item $bak $settingsPath -Force
  Remove-Item $bak -Force
}

Write-Output "DISCORD_RESTORED"
