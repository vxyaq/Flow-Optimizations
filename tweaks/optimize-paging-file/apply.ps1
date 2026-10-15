$ram = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum).Sum / 1GB
$initialSize = [math]::Round($ram * 1024)
$maximumSize = [math]::Round($ram * 1024 * 1.5)
$computersys = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
$computersys.AutomaticManagedPagefile = $False
$computersys.Put()
$pagefile = Get-WmiObject -Query "SELECT * FROM Win32_PageFileSetting WHERE Name='C:\\pagefile.sys'"
if ($pagefile) {
    $pagefile.InitialSize = $initialSize
    $pagefile.MaximumSize = $maximumSize
    $pagefile.Put()
} else {
    Set-WmiInstance -Class Win32_PageFileSetting -Arguments @{name="C:\pagefile.sys"; InitialSize = $initialSize; MaximumSize = $maximumSize}
}
Write-Output "Paging file optimized: $initialSize MB - $maximumSize MB"
