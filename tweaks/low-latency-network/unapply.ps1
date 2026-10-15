Write-Host "Restoring default network settings..."

# Restore multimedia/network scheduling defaults
$mm = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
Set-ItemProperty -Path $mm -Name "NetworkThrottlingIndex" -Value 10 -Type DWord -Force
Set-ItemProperty -Path $mm -Name "SystemResponsiveness" -Value 20 -Type DWord -Force

# Restore default TCP stack parameters
netsh int tcp set global autotuninglevel=normal
netsh int tcp set global rss=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=enabled
netsh int tcp set global rsc=enabled
netsh int tcp set global initialRto=3000
netsh int tcp set global fastopen=disabled

# Restore Nagle's algorithm (remove custom values)
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpAckFrequency" -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TCPNoDelay" -Force -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpDelAckTicks" -Force -ErrorAction SilentlyContinue

Write-Host "Default network settings restored."
