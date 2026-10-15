$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "r5apex" -ErrorAction SilentlyContinue

if ($processes) {
  $processes | ForEach-Object {
    try { $_.PriorityClass = "Normal" } catch { }
  }
}

Write-Output "Apex Legends optimization reverted."
