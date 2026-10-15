Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Avalon.Graphics" -Name "DisableHWAcceleration" -Value 0 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Avalon.Graphics" -Name "MaxTextureSize" -Value 4096 -Type DWord -Force
Write-Output "Texture quality optimized"
