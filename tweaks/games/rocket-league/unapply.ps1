Write-Host "Reverting Rocket League optimization..."
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
$processes = Get-Process -Name "RocketLeague" -ErrorAction SilentlyContinue
if ($processes) {
  $processes | ForEach-Object {
    try { $_.PriorityClass = "Normal" } catch { }
  }
}
$configFile = Join-Path $env:USERPROFILE "Documents\My Games\Rocket League\TAGame\Config\TASystemSettings.ini"
$backupFile = "$configFile.flow.bak"
if (Test-Path $backupFile) {
    Copy-Item $backupFile $configFile -Force -ErrorAction SilentlyContinue
}
Write-Host "Rocket League optimization reverted."
