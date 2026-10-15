Stop-Service -Name "HomeGroupListener" -Force -ErrorAction SilentlyContinue
Stop-Service -Name "HomeGroupProvider" -Force -ErrorAction SilentlyContinue
Set-Service -Name "HomeGroupListener" -StartupType Disabled -ErrorAction SilentlyContinue
Set-Service -Name "HomeGroupProvider" -StartupType Disabled -ErrorAction SilentlyContinue
Write-Output "HomeGroup services disabled"
