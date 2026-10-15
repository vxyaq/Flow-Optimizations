Stop-Service -Name "Spooler" -Force -ErrorAction SilentlyContinue
Set-Service -Name "Spooler" -StartupType Disabled
Write-Output "Print Spooler disabled"
