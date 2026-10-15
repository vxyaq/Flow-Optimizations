$nvidiaSetting = "HKCU:\Software\NVIDIA Corporation\Global\NVTweak"
if (-not (Test-Path $nvidiaSetting)) {
    New-Item -Path $nvidiaSetting -Force | Out-Null
}
Set-ItemProperty -Path $nvidiaSetting -Name "Gestalt" -Value 2 -Type DWord -Force
$nvcp3d = "HKCU:\Software\NVIDIA Corporation\Global\NVTweak\NvCplApi"
if (-not (Test-Path $nvcp3d)) {
    New-Item -Path $nvcp3d -Force | Out-Null
}
Set-ItemProperty -Path $nvcp3d -Name "PowerMizerEnable" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $nvcp3d -Name "PowerMizerDefault" -Value 1 -Type DWord -Force
Set-ItemProperty -Path $nvcp3d -Name "PowerMizerDefaultAC" -Value 1 -Type DWord -Force
nvidia-smi -lgc 2100,2100
Write-Output "Pro: NVIDIA Control Panel automated for max FPS"
