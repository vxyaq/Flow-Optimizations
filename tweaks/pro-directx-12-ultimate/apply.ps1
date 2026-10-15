Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\DirectX" -Name "D3D12_ENABLE_RUNTIME_DRIVER_OPTIMIZATIONS" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\DirectX" -Name "DisableVidMemCacheCoherency" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\DirectX" -Name "D3D12_ENABLE_UNSAFE_COMMAND_BUFFER_REUSE" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\DirectX" -Name "D3D12_RESIDENCY_MANAGEMENT_ENABLE_EVICTION" -Value 0 -Type DWord -Force
Set-ItemProperty -Path "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences" -Name "DirectXUserGlobalSettings" -Value "VRROptimizeEnable=1;SwapEffectUpgradeEnable=1;" -Type String -Force
Write-Output "Pro: DirectX 12 Ultimate optimized"
