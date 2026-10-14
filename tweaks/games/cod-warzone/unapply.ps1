$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "cod" -ErrorAction SilentlyContinue

if ($processes) {
  $processes | ForEach-Object {
    try { $_.PriorityClass = "Normal" } catch { }
  }
}

Write-Output "Call of Duty: Warzone optimization reverted."
