powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
$guid = (powercfg -list | Select-String "Ultimate Performance").ToString().Split()[3]
powercfg -setactive $guid
powercfg -setacvalueindex $guid SUB_PROCESSOR PERFBOOSTMODE 2
powercfg -setacvalueindex $guid SUB_PROCESSOR PERFBOOSTPOL 100
powercfg -setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMIN 100
powercfg -setacvalueindex $guid SUB_PROCESSOR PROCTHROTTLEMAX 100
powercfg -setactive $guid
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HibernateEnabled" -Value 0 -Type DWord -Force
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "CsEnabled" -Value 0 -Type DWord -Force
Write-Output "Pro: Extreme Performance Mode activated"
