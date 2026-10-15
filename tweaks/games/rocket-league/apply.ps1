$ErrorActionPreference = "Stop"
$processes = Get-Process -Name "RocketLeague" -ErrorAction SilentlyContinue

if (-not $processes) {
  Write-Output "RL_NOT_RUNNING"
  exit 0
}

$processes | ForEach-Object {
  try { $_.PriorityClass = "High" } catch { }
}

$gameProcess = $processes | Select-Object -First 1
try {
  $gamePath = $gameProcess.Path
  if ($gamePath) {
    $gpuPreferencesPath = "HKCU:\Software\Microsoft\DirectX\UserGpuPreferences"
    New-Item -Path $gpuPreferencesPath -Force | Out-Null
    New-ItemProperty -Path $gpuPreferencesPath -Name $gamePath -PropertyType String -Value "GpuPreference=2;" -Force | Out-Null
  }
} catch { }

$gameConfigPath = "HKCU:\System\GameConfigStore"
$gameBarPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR"
New-Item -Path $gameConfigPath -Force | Out-Null
New-Item -Path $gameBarPath -Force | Out-Null
New-ItemProperty -Path $gameConfigPath -Name "GameDVR_Enabled" -PropertyType DWord -Value 0 -Force | Out-Null
New-ItemProperty -Path $gameBarPath -Name "AppCaptureEnabled" -PropertyType DWord -Value 0 -Force | Out-Null

$perfSettings = @{
    "bUseVSync" = "False"
    "MaxFPS" = "250"
    "FrameRateLimit" = "250.000000"
}

$configFile = Join-Path $env:USERPROFILE "Documents\My Games\Rocket League\TAGame\Config\TASystemSettings.ini"
if (Test-Path $configFile) {
    Copy-Item $configFile "$configFile.k3d.bak" -Force -ErrorAction SilentlyContinue
    $content = [System.IO.File]::ReadAllText($configFile)
    foreach ($key in $perfSettings.Keys) {
        $pattern = '(?m)^' + $key + '=.*$'
        $replacement = $key + '=' + $perfSettings[$key]
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacement
        } else {
            $content = $content + [Environment]::NewLine + $replacement
        }
    }
    [System.IO.File]::WriteAllText($configFile, $content)
    Write-Output "RL_CONFIG_OK"
} else {
    Write-Output "RL_CONFIG_MISSING"
}

Write-Output "RL_OPTIMIZED"
