$cores = (Get-WmiObject -Class Win32_Processor).NumberOfLogicalProcessors
for ($i = 0; $i -lt $cores; $i++) {
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00\0cc5b647-c1df-4637-891a-dec35c318583"
    Set-ItemProperty -Path $regPath -Name "ValueMax" -Value 0 -Type DWord -Force
}
powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 100
powercfg /setactive SCHEME_CURRENT
Write-Output "All CPU cores unparked"
