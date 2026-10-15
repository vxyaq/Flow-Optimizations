Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization" -Name "DODownloadMode" -Value 0 -Type DWord -Force
Stop-Service -Name "DoSvc" -Force -ErrorAction SilentlyContinue
Set-Service -Name "DoSvc" -StartupType Disabled
Write-Output "Windows Update Delivery Optimization disabled"
