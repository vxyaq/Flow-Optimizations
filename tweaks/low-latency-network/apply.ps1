Write-Host "Applying low latency network tuning..."

# Prioritise networking/multimedia over background tasks
$mm = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
if (-not (Test-Path $mm)) { New-Item -Path $mm -Force | Out-Null }
Set-ItemProperty -Path $mm -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -Force
Set-ItemProperty -Path $mm -Name "SystemResponsiveness" -Value 10 -Type DWord -Force

# Latency-friendly TCP stack
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global rss=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global rsc=disabled
netsh int tcp set global initialRto=1000
netsh int tcp set global fastopen=enabled

# Disable Nagle's algorithm for snappier packet delivery
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpAckFrequency" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TCPNoDelay" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpDelAckTicks" -Value 0 -Type DWord -Force

Write-Host "Low latency network tuning applied."
