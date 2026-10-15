Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance" -Name "MaintenanceDisabled" -Value 1 -Type DWord -Force
Disable-ScheduledTask -TaskName "\Microsoft\Windows\TaskScheduler\Regular Maintenance" -ErrorAction SilentlyContinue
Write-Output "Automatic Maintenance disabled"
