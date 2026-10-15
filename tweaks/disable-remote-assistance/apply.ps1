Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Remote Assistance" -Name "fAllowToGetHelp" -Value 0 -Type DWord -Force
Disable-NetFirewallRule -DisplayGroup "Remote Assistance" -ErrorAction SilentlyContinue
Write-Output "Remote Assistance disabled"
