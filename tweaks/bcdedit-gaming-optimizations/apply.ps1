bcdedit /set disabledynamictick yes
bcdedit /set useplatformtick yes
bcdedit /timeout 3
bcdedit /set nx OptOut
bcdedit /set bootux disabled
bcdedit /set bootmenupolicy legacy
bcdedit /set hypervisorlaunchtype off
bcdedit /set tpmbootentropy ForceDisable
Write-Output "BCD gaming optimizations applied - restart required"
