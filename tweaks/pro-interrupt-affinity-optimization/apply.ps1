$cores = (Get-WmiObject -Class Win32_Processor).NumberOfLogicalProcessors
$lastCore = $cores - 1
$affinityMask = [Math]::Pow(2, $lastCore)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force
$devices = Get-WmiObject Win32_PnPEntity | Where-Object { $_.ConfigManagerErrorCode -eq 0 -and $_.PNPDeviceID -like "PCI\VEN_*" }
foreach ($device in $devices | Select-Object -First 5) {
    $devicePath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($device.PNPDeviceID)"
    if (Test-Path $devicePath) {
        $interruptPath = "$devicePath\Device Parameters\Interrupt Management\Affinity Policy"
        if (-not (Test-Path $interruptPath)) {
            New-Item -Path $interruptPath -Force | Out-Null
        }
        Set-ItemProperty -Path $interruptPath -Name "DevicePolicy" -Value 5 -Type DWord -Force
        Set-ItemProperty -Path $interruptPath -Name "AssignmentSetOverride" -Value $affinityMask -Type DWord -Force
    }
}
Write-Output "Pro: Interrupt affinity optimized for $cores cores"
