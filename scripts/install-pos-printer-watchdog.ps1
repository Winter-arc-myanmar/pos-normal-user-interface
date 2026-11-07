<#
.SYNOPSIS
  Keeps a Windows POS printing without anyone visiting the machine.

.DESCRIPTION
  Installs a scheduled task that, every few minutes and at every boot:
    1. runs attach-live-usb-printer.ps1 - removes the Windows queue of a USB
       printer that is no longer plugged in, and brings a live queue back online
    2. starts QZ Tray again when it is not running

  That pair covers the two failures seen on POS PCs: a dead "POS-80" queue that
  Discover keeps offering, and QZ Tray having been closed or crashed.

  Run it elevated. Use -WhatIf to see what would change, -Remove to uninstall.

.PARAMETER IntervalMinutes
  How often the watchdog runs. 5 minutes by default; 15 is fine for a venue.

.PARAMETER QzTrayPath
  Where QZ Tray is installed. Defaults to the standard Program Files location.

.PARAMETER TaskName
  Name of the scheduled task. One per PC.

.PARAMETER Run
  What the scheduled task runs: the repair itself, not the installer.

.PARAMETER Remove
  Unregister the scheduled task.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-pos-printer-watchdog.ps1 -WhatIf

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-pos-printer-watchdog.ps1

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-pos-printer-watchdog.ps1 -Remove
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [int]$IntervalMinutes = 5,
  [string]$QzTrayPath = "C:\Program Files\QZ Tray\qz-tray.exe",
  [string]$TaskName = "POS Printer Watchdog",
  [switch]$Run,
  [switch]$Remove
)

$ErrorActionPreference = "Stop"
$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath

function Test-Elevated {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Start-QzTrayIfStopped {
  if (Get-Process -Name "qz-tray" -ErrorAction SilentlyContinue) { return }
  if (-not (Test-Path -LiteralPath $QzTrayPath)) {
    Write-Host "QZ Tray is not installed at $QzTrayPath" -ForegroundColor Yellow
    return
  }
  Start-Process -FilePath $QzTrayPath -ErrorAction SilentlyContinue
  Write-Host "QZ Tray was not running; started it." -ForegroundColor Green
}

# ---- What the scheduled task runs -------------------------------------------
if ($Run) {
  $attach = Join-Path $scriptDir "attach-live-usb-printer.ps1"
  if (Test-Path -LiteralPath $attach) {
    try {
      & $attach
    } catch {
      Write-Host "attach-live-usb-printer.ps1: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
  Start-QzTrayIfStopped
  exit 0
}

if (-not (Test-Elevated) -and -not $WhatIfPreference) {
  Write-Host "Run this script in an elevated PowerShell (right click -> Run as administrator)." -ForegroundColor Red
  Write-Host "To preview without admin: add -WhatIf" -ForegroundColor Yellow
  exit 1
}

# ---- Uninstall ---------------------------------------------------------------
if ($Remove) {
  if ($PSCmdlet.ShouldProcess($TaskName, "Unregister scheduled task")) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task '$TaskName'." -ForegroundColor Green
  }
  exit 0
}

# ---- Install -----------------------------------------------------------------
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Run"
$atStartup = New-ScheduledTaskTrigger -AtStartup
$everyFewMinutes = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes ([Math]::Max(1, $IntervalMinutes))) `
  -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

if ($PSCmdlet.ShouldProcess($TaskName, "Register scheduled task every $IntervalMinutes min (SYSTEM, highest privileges)")) {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger @($atStartup, $everyFewMinutes) `
    -Settings $settings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Force | Out-Null
  Write-Host "Installed '$TaskName': runs at boot and every $IntervalMinutes minutes." -ForegroundColor Green
  Write-Host "It repairs dead USB queues and restarts QZ Tray when it is closed." -ForegroundColor Cyan
  Write-Host "Check it with:  Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo" -ForegroundColor Cyan
}
