bcdedit /deletevalue disabledynamictick
bcdedit /deletevalue useplatformtick
bcdedit /timeout 30
bcdedit /set nx OptIn
bcdedit /set bootux enabled
bcdedit /deletevalue hypervisorlaunchtype
bcdedit /deletevalue tpmbootentropy
Write-Output "BCD gaming optimizations reverted - restart required"
