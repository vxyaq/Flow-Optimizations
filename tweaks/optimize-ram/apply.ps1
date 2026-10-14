$ErrorActionPreference = "Stop"

$memKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"

$ramGb = 0
if (Get-Variable -Name K3D_RAM_GB -Scope Script -ErrorAction SilentlyContinue) {
    $parsed = 0
    if ([int]::TryParse([string]$K3D_RAM_GB, [ref]$parsed)) { $ramGb = $parsed }
}
if ($ramGb -lt 1) {
    $ramGb = [int][math]::Round((Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
}
$ramGb = [Math]::Min([Math]::Max($ramGb, 1), 1024)

$pfInitial = [Math]::Min([Math]::Max($ramGb * 128, 1024), 8192)
$pfMaximum = [Math]::Min([Math]::Max($ramGb * 3072, 4096), 16384)
if ($pfMaximum -lt ($pfInitial * 2)) { $pfMaximum = $pfInitial * 2 }

if (Get-Variable -Name K3D_PF_INITIAL -Scope Script -ErrorAction SilentlyContinue) {
    $p = 0
    if ([int]::TryParse([string]$K3D_PF_INITIAL, [ref]$p) -and $p -ge 64) { $pfInitial = $p }
}
if (Get-Variable -Name K3D_PF_MAXIMUM -Scope Script -ErrorAction SilentlyContinue) {
    $p = 0
    if ([int]::TryParse([string]$K3D_PF_MAXIMUM, [ref]$p) -and $p -ge 64) { $pfMaximum = $p }
}
if ($pfMaximum -lt $pfInitial) { $pfMaximum = $pfInitial }

$keepKernel = 0
if (Get-Variable -Name K3D_KEEP_KERNEL -Scope Script -ErrorAction SilentlyContinue) {
    if ([string]$K3D_KEEP_KERNEL -eq "1") { $keepKernel = 1 }
}
$disableSysMain = 0
if (Get-Variable -Name K3D_DISABLE_SYSMAIN -Scope Script -ErrorAction SilentlyContinue) {
    if ([string]$K3D_DISABLE_SYSMAIN -eq "1") { $disableSysMain = 1 }
}

$computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
if ($computerSystem.AutomaticManagedPagefile) {
    $computerSystem | Set-CimInstance -Property @{ AutomaticManagedPagefile = $false }
    Write-Host "Disabled automatic pagefile management."
}

$entry = "{0} {1} {2}" -f "$env:SystemDrive\pagefile.sys", $pfInitial, $pfMaximum
if (Get-ItemProperty -Path $memKey -Name "PagingFiles" -ErrorAction SilentlyContinue) {
    Set-ItemProperty -Path $memKey -Name "PagingFiles" -Type MultiString -Value @($entry)
} else {
    New-ItemProperty -Path $memKey -Name "PagingFiles" -PropertyType MultiString -Value @($entry) -Force | Out-Null
}
Write-Host ("RAM profile: {0} GB -> pagefile {1} MB / {2} MB" -f $ramGb, $pfInitial, $pfMaximum)

if ($keepKernel -eq 1) {
    Set-ItemProperty -Path $memKey -Name "DisablePagingExecutive" -Value 1 -Type DWord -Force
    Write-Host "DisablePagingExecutive = 1 (kernel stays in RAM)."
} else {
    Set-ItemProperty -Path $memKey -Name "DisablePagingExecutive" -Value 0 -Type DWord -Force
    Write-Host "DisablePagingExecutive = 0."
}

if ($disableSysMain -eq 1) {
    Stop-Service -Name "SysMain" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "SysMain" -StartupType Disabled
    Write-Host "SysMain disabled."
} else {
    Set-Service -Name "SysMain" -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name "SysMain" -ErrorAction SilentlyContinue
    Write-Host "SysMain left enabled."
}

Write-Host "Restart Windows to activate the new memory settings."
