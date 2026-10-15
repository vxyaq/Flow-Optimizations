$gpuPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
if (Test-Path $gpuPath) {
    Set-ItemProperty -Path $gpuPath -Name "DisableDynamicPstate" -Value 1 -Type DWord -Force
    Set-ItemProperty -Path $gpuPath -Name "EnableUlps" -Value 0 -Type DWord -Force
    Set-ItemProperty -Path $gpuPath -Name "PP_ThermalAutoThrottlingEnable" -Value 0 -Type DWord -Force
    Set-ItemProperty -Path $gpuPath -Name "PP_SclkDeepSleepDisable" -Value 1 -Type DWord -Force
}
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "TdrLevel" -Value 0 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "TdrDelay" -Value 60 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "TdrDdiDelay" -Value 60 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Power" -Name "DefaultD3TransitionLatencyActivelyUsed" -Value 0 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\Power" -Name "DefaultLatencyToleranceIdle0" -Value 0 -Type DWord -Force
Write-Output "Pro: GPU Max Performance mode enabled"
