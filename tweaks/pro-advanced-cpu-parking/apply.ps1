powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMAXCORES 100
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPHEADROOM 0
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPCONCURRENCY 100
powercfg -setactive SCHEME_CURRENT
$parkingPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\54533251-82be-4824-96c1-47b60b740d00"
Get-ChildItem -Path $parkingPath | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name "Attributes" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
}
Write-Output "Pro: Advanced CPU core parking configured"
