<#
.SYNOPSIS
  Removes stale USB receipt-printer queues and ghost USBPRINT devices on this POS PC.

.DESCRIPTION
  A USB printer that was unplugged leaves its Windows queue (for example "POS-80")
  plus a ghost USBPRINT device behind. The POS "Discover" button lists that leftover
  queue name again (src/core/infrastructure/printing/QzTrayClient.ts -> findUsbPrinters),
  so the register keeps pointing at a printer that is not on the USB bus.

  Plug in the printer you want to use, then run this script elevated. It:
    1. cancels the stuck print jobs on the stale queue(s)
    2. removes the stale queue(s)
    3. removes ghost USBPRINT devices (Status other than OK)
    4. removes USB001..N ports no printer uses
    5. lists the USB print devices that are present now, so you can confirm what
       "Discover" will show

  After it finishes: POS -> Settings -> Printer -> Connection = USB -> Discover ->
  pick the listed printer -> Test print -> Save.

.PARAMETER PrinterName
  Only touch this queue. Use it when the queue name is wrong but the printer is
  plugged in. Default: every USB queue whose USBPRINT device is gone.

.PARAMETER JobsOnly
  Keep the queue and only clear its stuck print jobs.

.EXAMPLE
  # Preview what would be removed (works without admin, changes nothing)
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\reset-usb-printer.ps1 -WhatIf

.EXAMPLE
  # Remove every leftover USB receipt-printer queue on this PC
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\reset-usb-printer.ps1

.EXAMPLE
  # Remove one queue by name, even if its device looks present
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\reset-usb-printer.ps1 -PrinterName 'POS-80'
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$PrinterName,
  [switch]$JobsOnly
)

$ErrorActionPreference = "Stop"

function Test-Elevated {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Write-Step {
  param([string]$Text)
  Write-Host $Text -ForegroundColor Cyan
}

function Get-UsbPrintDevices {
  @(Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object {
      $_.InstanceId -like "USBPRINT\*"
    })
}

# USBPRINT\PRINTERPOS-80\7&14F9B973&0&USB001 -> USB001
function Get-LiveUsbPrintPorts {
  param([object[]]$Devices)
  $live = New-Object System.Collections.Generic.List[string]
  foreach ($device in $Devices) {
    if ($device.InstanceId -match "&(USB\d+)$" -and $device.Status -eq "OK") {
      $live.Add($Matches[1])
    }
  }
  @($live | Select-Object -Unique)
}

if (-not (Test-Elevated) -and -not $WhatIfPreference) {
  Write-Host "Run this script in an elevated PowerShell (right click -> Run as administrator)." -ForegroundColor Red
  Write-Host "To preview without admin: add -WhatIf" -ForegroundColor Yellow
  exit 1
}

$devices = Get-UsbPrintDevices
$livePorts = Get-LiveUsbPrintPorts -Devices $devices
$usbQueues = @(Get-Printer -ErrorAction SilentlyContinue | Where-Object { $_.PortName -like "USB*" })

if ($PrinterName) {
  $usbQueues = @($usbQueues | Where-Object { $_.Name -eq $PrinterName })
  if (-not $usbQueues.Count) {
    Write-Host "Printer '$PrinterName' is not a USB print queue on this PC." -ForegroundColor Red
    Write-Host "Current USB queues:" -ForegroundColor Yellow
    Get-Printer -ErrorAction SilentlyContinue | Where-Object { $_.PortName -like "USB*" } |
      Format-Table Name, PortName, DriverName -AutoSize | Out-String | Write-Host
    exit 1
  }
} else {
  # No explicit name: only queues whose USB port has no live USBPRINT device.
  $usbQueues = @($usbQueues | Where-Object { $livePorts -notcontains $_.PortName })
}

Write-Step "USB print devices on the bus:"
if ($devices.Count) {
  $devices | Select-Object Status, FriendlyName, InstanceId |
    Format-Table -AutoSize | Out-String | Write-Host
} else {
  Write-Host "  (none - no USB printer is enumerated right now)" -ForegroundColor Yellow
}

Write-Step "Queues to clean: $(if ($usbQueues.Count) { ($usbQueues | ForEach-Object { $_.Name }) -join ', ' } else { 'none' })"

foreach ($queue in $usbQueues) {
  $jobs = @(Get-PrintJob -PrinterName $queue.Name -ErrorAction SilentlyContinue)
  if ($jobs.Count) {
    if ($PSCmdlet.ShouldProcess($queue.Name, "Cancel $($jobs.Count) stuck print job(s)")) {
      $jobs | Remove-PrintJob -ErrorAction SilentlyContinue
      Write-Host "  $($queue.Name): cancelled $($jobs.Count) job(s)" -ForegroundColor Green
    }
  }
  if ($JobsOnly) { continue }
  if ($PSCmdlet.ShouldProcess($queue.Name, "Remove printer queue")) {
    Remove-Printer -Name $queue.Name -ErrorAction SilentlyContinue
    Write-Host "  $($queue.Name): queue removed" -ForegroundColor Green
  }
}

if (-not $JobsOnly) {
  $ghosts = @($devices | Where-Object { $_.Status -ne "OK" })
  foreach ($ghost in $ghosts) {
    if ($PSCmdlet.ShouldProcess($ghost.InstanceId, "Remove ghost USB print device")) {
      $output = & pnputil /remove-device "$($ghost.InstanceId)" 2>&1
      if ($LASTEXITCODE -eq 0) {
        Write-Host "  $($ghost.InstanceId): removed" -ForegroundColor Green
      } else {
        Write-Host "  $($ghost.InstanceId): $($output -join ' ')" -ForegroundColor Yellow
      }
    }
  }

  $inUse = @(Get-Printer -ErrorAction SilentlyContinue | ForEach-Object { $_.PortName })
  $freePorts = @(Get-PrinterPort -ErrorAction SilentlyContinue | Where-Object {
      $_.Name -like "USB*" -and $inUse -notcontains $_.Name
    })
  foreach ($port in $freePorts) {
    if ($PSCmdlet.ShouldProcess($port.Name, "Remove unused USB printer port")) {
      Remove-PrinterPort -Name $port.Name -ErrorAction SilentlyContinue
      Write-Host "  $($port.Name): unused port removed" -ForegroundColor Green
    }
  }
}

Write-Step "Current USB queues:"
$remaining = @(Get-Printer -ErrorAction SilentlyContinue | Where-Object { $_.PortName -like "USB*" })
if ($remaining.Count) {
  $remaining | Select-Object Name, PortName, DriverName, PrinterStatus, WorkOffline |
    Format-Table -AutoSize | Out-String | Write-Host
} else {
  Write-Host "  (none)" -ForegroundColor Yellow
}

$presentNow = @(Get-UsbPrintDevices | Where-Object { $_.Status -eq "OK" })
if (-not $presentNow.Count) {
  Write-Host "No USB receipt printer is plugged in right now. Connect it (directly to the PC, no hub)," -ForegroundColor Yellow
  Write-Host "let Windows install its driver, then run this script again." -ForegroundColor Yellow
  exit 0
}

Write-Host "Next in the POS: Settings -> Printer -> Connection = USB -> Discover ->" -ForegroundColor Cyan
Write-Host "pick the listed printer -> Test print -> Save." -ForegroundColor Cyan
