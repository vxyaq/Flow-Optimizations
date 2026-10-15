$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "VALORANT-Win64-Shipping" -ErrorAction SilentlyContinue

if ($processes) {
  $processes | ForEach-Object {
    try { $_.PriorityClass = "Normal" } catch { }
  }
}

Write-Output "Valorant optimization reverted."
