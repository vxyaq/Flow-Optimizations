Write-Host "Reverting PUBG: Battlegrounds optimization..."
Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue
$processes = Get-Process -Name "TslGame" -ErrorAction SilentlyContinue
if ($processes) {
  $processes | ForEach-Object {
    try { $_.PriorityClass = "Normal" } catch { }
  }
}

$configPath = "$env:LOCALAPPDATA\TslGame\Saved\Config\WindowsNoEditor\GameUserSettings.ini"
$backupPath = "$configPath.backup"
if (Test-Path $backupPath) {
  Copy-Item -Path $backupPath -Destination $configPath -Force
  Remove-Item -Path $backupPath -Force
}

Write-Host "PUBG: Battlegrounds optimization reverted."
