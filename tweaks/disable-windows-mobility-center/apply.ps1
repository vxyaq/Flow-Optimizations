Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\MobilityCenter" -Name "NoMobilityCenter" -Value 1 -Type DWord -Force
Write-Output "Windows Mobility Center disabled"
