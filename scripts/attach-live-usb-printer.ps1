# Watches USB receipt printers on this PC.
# When a printer's USB port drops, that Windows printer queue is removed.
# A queue whose USB port is still connected is brought back online.
$ErrorActionPreference = "Stop"

function Get-UsbPrintPortStates {
  $live = New-Object System.Collections.Generic.List[string]
  $dead = New-Object System.Collections.Generic.List[string]
  $devices = @(Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object {
      $_.InstanceId -like "USBPRINT\*"
    })
  foreach ($device in $devices) {
    if ($device.InstanceId -notmatch "&(USB\d+)$") { continue }
    $port = $Matches[1]
    if ($device.Status -eq "OK") {
      $live.Add($port)
    } else {
      $dead.Add($port)
    }
  }
  [pscustomobject]@{
    Live = @($live | Select-Object -Unique)
    Dead = @($dead | Select-Object -Unique)
  }
}

function Set-PrinterOnline {
  param([string]$Name)
  Resume-Printer -Name $Name -ErrorAction SilentlyContinue
  $escaped = $Name.Replace("'", "''")
  $printer = Get-CimInstance -ClassName Win32_Printer -Filter "Name='$escaped'"
  if ($printer -and $printer.WorkOffline) {
    Set-CimInstance -InputObject $printer -Property @{ WorkOffline = $false } | Out-Null
  }
}

function Remove-DisconnectedUsbPrinter {
  param([string]$Name)
  Get-PrintJob -PrinterName $Name -ErrorAction SilentlyContinue | Remove-PrintJob
  Remove-Printer -Name $Name
}

$ports = Get-UsbPrintPortStates
if ($ports.Live.Count -eq 0 -and $ports.Dead.Count -eq 0) { exit 0 }

$usbPrinters = @(Get-Printer | Where-Object { $_.PortName -like "USB*" })
foreach ($printer in $usbPrinters) {
  $portName = $printer.PortName
  $disconnected = ($ports.Dead -contains $portName) -and ($ports.Live -notcontains $portName)
  if ($disconnected) {
    Remove-DisconnectedUsbPrinter -Name $printer.Name
    continue
  }

  if ($ports.Live -notcontains $portName) { continue }

  $escaped = $printer.Name.Replace("'", "''")
  $current = Get-CimInstance -ClassName Win32_Printer -Filter "Name='$escaped'"
  if ($current.WorkOffline) {
    Get-PrintJob -PrinterName $printer.Name -ErrorAction SilentlyContinue | Remove-PrintJob
  }
  Set-PrinterOnline -Name $printer.Name
}
