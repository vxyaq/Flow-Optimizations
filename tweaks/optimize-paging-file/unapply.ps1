$computersys = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
$computersys.AutomaticManagedPagefile = $True
$computersys.Put()
Write-Output "Paging file set to system managed"
