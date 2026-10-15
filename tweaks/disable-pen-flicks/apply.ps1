Set-ItemProperty -Path "HKCU:\Software\Microsoft\Wisp\Touch" -Name "TouchGate" -Value 0 -Type DWord -Force
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Wisp\Pen\SysEventParameters" -Name "PenHoldConfig" -Value 0 -Type DWord -Force
Write-Output "Pen and touch features disabled"
