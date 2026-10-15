$ErrorActionPreference = "SilentlyContinue"

$processName = "Medal"

foreach ($p in (Get-Process -Name $processName -ErrorAction SilentlyContinue)) {
  try { $p.PriorityClass = "Normal" } catch {}
}

$gpuKey = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
$medalExe = $null
$running = Get-Process -Name $processName -ErrorAction SilentlyContinue | Select-Object -First 1
if ($running -and $running.Path) { $medalExe = $running.Path }
if (-not $medalExe) {
  foreach ($root in @((Join-Path $env:LOCALAPPDATA "Medal"), (Join-Path $env:APPDATA "Medal"), (Join-Path ${env:ProgramFiles} "Medal"))) {
    if (Test-Path $root) {
      $found = Get-ChildItem $root -Recurse -Filter "Medal.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($found) { $medalExe = $found.FullName; break }
    }
  }
}
if ($medalExe) {
  Remove-ItemProperty -Path $gpuKey -Name $medalExe -ErrorAction SilentlyContinue
}

Write-Output "MEDAL_RESTORED"
