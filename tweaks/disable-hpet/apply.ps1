bcdedit /deletevalue useplatformclock
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\HPET" -Name "Start" -Value 4 -Type DWord -Force
Write-Output "HPET disabled - restart required"
