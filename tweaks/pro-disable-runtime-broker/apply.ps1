Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\TimeBrokerSvc" -Name "Start" -Value 4 -Type DWord -Force
Stop-Service -Name "TimeBrokerSvc" -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\TimeBroker" -Name "Start" -Value 4 -Type DWord -Force
Stop-Service -Name "TimeBroker" -Force -ErrorAction SilentlyContinue
Get-Process RuntimeBroker -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Output "Pro: Runtime Broker disabled"
