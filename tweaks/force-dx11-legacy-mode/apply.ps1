Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\DirectX" -Name "D3D12_ENABLE_UNSAFE_COMMAND_BUFFER_REUSE" -Value 1 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\DirectX" -Name "DisableVidMemCacheCoherency" -Value 1 -Type DWord -Force
Write-Output "DirectX optimizations applied"
