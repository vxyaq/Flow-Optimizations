$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
foreach ($adapter in $adapters) {
    Set-NetAdapterPowerManagement -Name $adapter.Name -SelectiveSuspend Disabled -ErrorAction SilentlyContinue
    Disable-NetAdapterPowerManagement -Name $adapter.Name -ErrorAction SilentlyContinue
}
powercfg /setacvalueindex SCHEME_CURRENT 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0
powercfg /setactive SCHEME_CURRENT
Write-Output "Network adapter power saving disabled"
