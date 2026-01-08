param(
  [int[]]$Ports = @(5173),
  [string]$ListenAddress = '0.0.0.0',
  [switch]$SkipFirewall
)

$principal = New-Object Security.Principal.WindowsPrincipal(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Please run this script in an elevated PowerShell session."
  exit 1
}

$wslArgs = @('-e', 'sh', '-c', "hostname -I | awk '{print $1}'")
$wslIp = (& wsl.exe @wslArgs).Trim()
if (-not $wslIp) {
  Write-Error "Unable to resolve WSL IP. Is WSL running and do you have awk?"
  exit 1
}

foreach ($port in $Ports) {
  & netsh interface portproxy delete v4tov4 listenaddress=$ListenAddress listenport=$port | Out-Null
  & netsh interface portproxy add v4tov4 listenaddress=$ListenAddress listenport=$port connectaddress=$wslIp connectport=$port | Out-Null

  if (-not $SkipFirewall) {
    $ruleName = "SecondBrain $port"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
    }
  }
}

Write-Host "WSL IP: $wslIp"
Write-Host "Port proxy updated for: $($Ports -join ', ')"
