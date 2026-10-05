# Median Android POS printing



## Runtimes



| Platform | Client | How it prints |

| --- | --- | --- |

| Windows / Linux / macOS (desktop browser) | `QzTrayClient` | QZ Tray → OS spooler or raw TCP `host:9100` |

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
