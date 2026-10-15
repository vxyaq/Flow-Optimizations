Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" -Name "GlobalTimerResolutionRequests" -Value 1 -Type DWord -Force
bcdedit /set useplatformtick yes
bcdedit /set disabledynamictick yes
Write-Output "Timer resolution optimized"
