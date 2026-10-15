$gpuDevices = Get-PnpDevice | Where-Object {$_.Class -eq "Display" -and $_.Status -eq "OK"}
foreach ($device in $gpuDevices) {
    $deviceID = $device.InstanceId
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$deviceID\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
    if (Test-Path $regPath) {
        Set-ItemProperty -Path $regPath -Name "MSISupported" -Value 1 -Type DWord -Force
    }
}
Write-Output "MSI Mode enabled for GPU"
