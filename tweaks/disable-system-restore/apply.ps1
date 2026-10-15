Disable-ComputerRestore -Drive "C:\"
vssadmin delete shadows /all /quiet
Write-Output "System Restore disabled and shadow copies deleted"
