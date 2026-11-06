# Median Android POS printing



## Runtimes



| Platform | Client | How it prints |

| --- | --- | --- |

| Windows / Linux / macOS (desktop browser) | `QzTrayClient` | QZ Tray → the printer's Windows queue (USB), the OS spooler, or raw TCP `host:9100` |

| Android, iOS, Median WebView (native plugin) | `BrowserPrinterClient` + native `window.median.posPrinter` | Native ESC/POS to Wi-Fi `host:9100`, USB, or Bluetooth - silent, no print dialog |



The app picks the runtime in `printerRuntime()`. All print jobs go through `usePrinterConnection` → `getPrinterClient()`. QZ Tray is not used on mobile.



## Android / Median printing paths



1. **Native bridge (primary)** — When `window.median.posPrinter` is present it receives the raw ESC/POS bytes and prints silently to Wi-Fi (`host:9100`), USB, or Bluetooth. This is the only way to open a raw TCP socket on Android/iOS.

2. **Browser print dialog (fallback)** — Tickets and receipts open in a print-ready browser document and immediately call `window.print()`. This lets Median hand the job to Android's configured print service, including a network, Bluetooth, or USB printer. It is the same print-window flow used by the reference POS application.

3. **USB (OTG) / Bluetooth (fallback)** — WebUSB / Web Bluetooth. Tap **Discover**, allow or pair the printer, save the binding. Raw ESC/POS is sent only when the WebView exposes WebUSB / Web Bluetooth (Android System WebView usually does not).



With the native plugin, no LAN print gateway or Docker bridge is required - the Wi-Fi printer is reached directly on port 9100.



## Median App Studio checklist



- Enable **WebUSB** / **Bluetooth** permissions when using those transports.

- Keep **JavaScript Bridge** allowed on POS URLs (the native printer bridge needs it).

- Enable the **native `posPrinter` plugin** (Median private plugin, or your own WebView bridge) and grant **Bluetooth / USB** permissions in the Android manifest.

- The plugin must expose `median.posPrinter.{connect,disconnect,discover,printRaw}`. Each call receives ONE options object and may either resolve a Promise or invoke `options.callback`; a `{ success: false, error }` result is treated as a failure.



## Native plugin (`median.posPrinter`) - primary path



When `window.median.posPrinter` (or the legacy `window.gonative.posPrinter`) is present, `BrowserPrinterClient` routes every job through it first - including raw TCP `host:9100`, which no Android/iOS browser can open - so Wi-Fi, USB and Bluetooth printers print silently with the same ESC/POS bytes as desktop QZ Tray. WebUSB, Web Bluetooth and the PDF/browser print dialog remain only as fallbacks when the bridge is absent.


## Sections without their own printer

A receipt or kitchen job prints to the printer bound to its section (Checkout, Finance, KDS). When nothing is bound to that section, the app falls back to the default printer, then to the only printer on the register, so a single-printer venue still prints everywhere instead of failing with "No checkout printer is connected".

Printer bindings are also mirrored in memory, so they keep working for the session when a WebView denies localStorage.

## Windows USB printers (QZ Tray)

A USB receipt printer on a POS PC is owned by its Windows driver (`usbprint.sys`), so QZ Tray **cannot** claim the device directly. Every USB job therefore goes to the printer's Windows **print queue** first, and only a printer with no queue at all is written to directly (`QzTrayClient.printUsb`). That order is deliberate: claiming a device that a driver owns always fails, and a queue is also what survives a changed USB port or a printer being switched off and on again.

For Discover to list a USB printer, and for printing to work:

1. **Install the printer's driver** so Windows creates a print queue for it. Without a queue the app can only see a raw device (`USB 1f9d:2016`), which it cannot print to while the driver owns it.
2. **Name the queue with a receipt keyword**: `POS-80`, `XP-80C`, `Receipt`, `Thermal`, `EPSON`, `Star Micronics`, `Rongta`, `Gprinter`. Discover only lists USB queues matching `isReceiptQueueName` (`src/lib/printing/usbPrintTarget.ts`).
3. **Keep the printer on a fixed USB port** and avoid hubs; Windows re-enumerates the queue name when the port changes.

Repair scripts for a POS PC, run elevated:

| Script | What it does |
| --- | --- |
| `scripts/attach-live-usb-printer.ps1` | removes the queue of a printer that is no longer plugged in, brings a live queue back online |
| `scripts/reset-usb-printer.ps1` | clears stuck jobs, removes the leftover queue and its ghost `USBPRINT` devices and unused ports (`-WhatIf`, `-PrinterName`, `-JobsOnly`) |
| `scripts/install-pos-printer-watchdog.ps1` | scheduled task that runs the first script every few minutes and restarts QZ Tray when it is closed (`-WhatIf`, `-Remove`) |

Errors say which side failed: "not reachable ... install its driver ... name that queue like POS-80" means there is no usable queue, and a message naming an interface means QZ could not claim the raw device because a driver holds it.

