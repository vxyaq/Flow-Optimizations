$hubs = Get-WmiObject Win32_USBHub
foreach ($hub in $hubs) {
    $powerMgmt = Get-WmiObject MSPower_DeviceEnable -Namespace root\wmi | Where-Object {$_.InstanceName -like "*$($hub.DeviceID)*"}
    if ($powerMgmt) {
        $powerMgmt.Enable = $False
        $powerMgmt.Put()
    }
}
Write-Output "USB selective suspend disabled"
