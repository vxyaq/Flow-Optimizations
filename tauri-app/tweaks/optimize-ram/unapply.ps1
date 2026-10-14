$ErrorActionPreference = "Stop"

$memKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"

$computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
if (-not $computerSystem.AutomaticManagedPagefile) {
    $computerSystem | Set-CimInstance -Property @{ AutomaticManagedPagefile = $true }
    Write-Host "Restored automatic pagefile management."
}

if (Get-ItemProperty -Path $memKey -Name "PagingFiles" -ErrorAction SilentlyContinue) {
    Remove-ItemProperty -Path $memKey -Name "PagingFiles" -ErrorAction SilentlyContinue
    Write-Host "Removed the explicit paging file size."
}

Set-ItemProperty -Path $memKey -Name "DisablePagingExecutive" -Value 0 -Type DWord -Force
Write-Host "DisablePagingExecutive = 0."

Set-Service -Name "SysMain" -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name "SysMain" -ErrorAction SilentlyContinue
Write-Host "SysMain restored to Automatic."

Write-Host "Restart Windows to let Windows manage memory again."
