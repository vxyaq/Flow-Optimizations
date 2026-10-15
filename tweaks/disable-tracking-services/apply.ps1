$services = @("DiagTrack", "dmwappushservice", "WMPNetworkSvc")
foreach ($service in $services) {
    Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
    Set-Service -Name $service -StartupType Disabled -ErrorAction SilentlyContinue
}
Write-Output "Tracking services disabled"
