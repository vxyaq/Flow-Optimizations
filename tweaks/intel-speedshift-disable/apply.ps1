powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFAUTONOMOUS 0
powercfg -setdcvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFAUTONOMOUS 0
powercfg /setactive SCHEME_CURRENT
Write-Output "Intel Speed Shift disabled"
