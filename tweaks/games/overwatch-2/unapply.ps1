$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "Overwatch" -ErrorAction SilentlyContinue

if ($processes) {
  $processes | ForEach-Object {
    try { $_.PriorityClass = "Normal" } catch { }
  }
}

Write-Output "Overwatch 2 optimization reverted."
