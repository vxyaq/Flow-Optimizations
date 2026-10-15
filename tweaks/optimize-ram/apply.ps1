$ErrorActionPreference = "SilentlyContinue"

$memKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management"

$ramGb = 0
if (Get-Variable -Name FLOW_RAM_GB -Scope Script -ErrorAction SilentlyContinue) {
    $parsed = 0
    if ([int]::TryParse([string]$FLOW_RAM_GB, [ref]$parsed)) { $ramGb = $parsed }
}
if ($ramGb -lt 1) {
    $ramGb = [int][math]::Round((Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
}
$ramGb = [Math]::Min([Math]::Max($ramGb, 1), 1024)

if ($ramGb -le 8) {
    $pfInitial = $ramGb * 1024
    $pfMaximum = $ramGb * 2048
} elseif ($ramGb -le 16) {
    $pfInitial = $ramGb * 512
    $pfMaximum = $ramGb * 1536
} else {
    $pfInitial = 4096
    $pfMaximum = 8192
}

if (Get-Variable -Name FLOW_PF_INITIAL -Scope Script -ErrorAction SilentlyContinue) {
    $p = 0
    if ([int]::TryParse([string]$FLOW_PF_INITIAL, [ref]$p) -and $p -ge 64) { $pfInitial = $p }
}
if (Get-Variable -Name FLOW_PF_MAXIMUM -Scope Script -ErrorAction SilentlyContinue) {
    $p = 0
    if ([int]::TryParse([string]$FLOW_PF_MAXIMUM, [ref]$p) -and $p -ge 64) { $pfMaximum = $p }
}
if ($pfMaximum -lt $pfInitial) { $pfMaximum = $pfInitial * 2 }

$keepKernel = if ($ramGb -ge 16) { 1 } else { 0 }
if (Get-Variable -Name FLOW_KEEP_KERNEL -Scope Script -ErrorAction SilentlyContinue) {
    if ([string]$FLOW_KEEP_KERNEL -eq "1") { $keepKernel = 1 }
    elseif ([string]$FLOW_KEEP_KERNEL -eq "0") { $keepKernel = 0 }
}

$disableSysMain = 1
if (Get-Variable -Name FLOW_DISABLE_SYSMAIN -Scope Script -ErrorAction SilentlyContinue) {
    if ([string]$FLOW_DISABLE_SYSMAIN -eq "0") { $disableSysMain = 0 }
}

$computerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
if ($computerSystem.AutomaticManagedPagefile) {
    $computerSystem | Set-CimInstance -Property @{ AutomaticManagedPagefile = $false }
}

$entry = "{0} {1} {2}" -f "$env:SystemDrive\pagefile.sys", $pfInitial, $pfMaximum
if (Get-ItemProperty -Path $memKey -Name "PagingFiles" -ErrorAction SilentlyContinue) {
    Set-ItemProperty -Path $memKey -Name "PagingFiles" -Type MultiString -Value @($entry)
} else {
    New-ItemProperty -Path $memKey -Name "PagingFiles" -PropertyType MultiString -Value @($entry) -Force | Out-Null
}

Set-ItemProperty -Path $memKey -Name "LargeSystemCache" -Value 0 -Type DWord -Force
Set-ItemProperty -Path $memKey -Name "SystemPages" -Value 0 -Type DWord -Force
Set-ItemProperty -Path $memKey -Name "SecondLevelDataCache" -Value 0 -Type DWord -Force
Set-ItemProperty -Path $memKey -Name "IoPageLockLimit" -Value ([int]($ramGb * 1024 * 1024 * 1024 * 0.5)) -Type DWord -Force

if ($keepKernel -eq 1) {
    Set-ItemProperty -Path $memKey -Name "DisablePagingExecutive" -Value 1 -Type DWord -Force
} else {
    Set-ItemProperty -Path $memKey -Name "DisablePagingExecutive" -Value 0 -Type DWord -Force
}

if ($disableSysMain -eq 1) {
    Stop-Service -Name "SysMain" -Force
    Set-Service -Name "SysMain" -StartupType Disabled
} else {
    Set-Service -Name "SysMain" -StartupType Automatic
    Start-Service -Name "SysMain"
}

Write-Output "RAM optimized: ${ramGb}GB -> Pagefile ${pfInitial}MB-${pfMaximum}MB | Kernel in RAM: $($keepKernel -eq 1) | SysMain: $($disableSysMain -eq 0)"
Write-Output "Restart required for changes to take effect"
