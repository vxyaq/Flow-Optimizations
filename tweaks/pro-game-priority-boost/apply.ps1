$gamesPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options"
$gameExes = @("csgo.exe", "cs2.exe", "FortniteClient-Win64-Shipping.exe", "valorant.exe", "League of Legends.exe", "r5apex.exe", "RainbowSix.exe", "Overwatch.exe", "PUBG.exe", "Warzone.exe")
foreach ($exe in $gameExes) {
    $exePath = "$gamesPath\$exe\PerfOptions"
    if (-not (Test-Path $exePath)) {
        New-Item -Path $exePath -Force | Out-Null
    }
    Set-ItemProperty -Path $exePath -Name "CpuPriorityClass" -Value 3 -Type DWord -Force
    Set-ItemProperty -Path $exePath -Name "IoPriority" -Value 3 -Type DWord -Force
    Set-ItemProperty -Path $exePath -Name "PagePriority" -Value 3 -Type DWord -Force
}
Write-Output "Pro: Game priority boost configured for popular games"
