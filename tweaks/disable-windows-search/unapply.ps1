Set-Service -Name "WSearch" -StartupType Automatic
Start-Service -Name "WSearch" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -Name "AllowCortana" -ErrorAction SilentlyContinue
Write-Output "Windows Search enabled"
