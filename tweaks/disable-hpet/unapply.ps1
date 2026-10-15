bcdedit /set useplatformclock true
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\HPET" -Name "Start" -Value 3 -Type DWord -Force
Write-Output "HPET enabled - restart required"
