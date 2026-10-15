$ErrorActionPreference = "SilentlyContinue"

$processName = "Medal"
$changed = $false

foreach ($p in (Get-Process -Name $processName -ErrorAction SilentlyContinue)) {
  try { $p.PriorityClass = "BelowNormal"; $changed = $true } catch {}
}

$gpuKey = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
New-Item -Path $gpuKey -Force | Out-Null

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
  New-ItemProperty -Path $gpuKey -Name $medalExe -PropertyType String -Value "GpuPreference=1;" -Force | Out-Null
  $changed = $true
}

foreach ($base in @((Join-Path $env:APPDATA "Medal"), (Join-Path $env:LOCALAPPDATA "Medal"))) {
  foreach ($d in @("Cache", "Code Cache", "GPUCache", "Service Worker\CacheStorage", "logs")) {
    $path = Join-Path $base $d
    if (Test-Path $path) { Remove-Item "$path\*" -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

if ($changed) {
  Write-Output "MEDAL_OPTIMIZED"
} else {
  Write-Output "MEDAL_NOT_FOUND"
}
