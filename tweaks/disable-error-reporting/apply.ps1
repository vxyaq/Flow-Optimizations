Stop-Service -Name "WerSvc" -Force -ErrorAction SilentlyContinue
Set-Service -Name "WerSvc" -StartupType Disabled
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting" -Name "Disabled" -Value 1 -Type DWord -Force
Write-Output "Windows Error Reporting disabled"
