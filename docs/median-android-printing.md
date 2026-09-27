# Median Android POS printing



## Runtimes



| Platform | Client | How it prints |

| --- | --- | --- |

| Windows / Linux / macOS (desktop browser) | `QzTrayClient` | QZ Tray → OS spooler or raw TCP `host:9100` |

| Android, iOS, Median WebView | `BrowserPrinterClient` | Browser print dialog, WebUSB, Web Bluetooth, optional `median.posPrinter` |



The app picks the runtime in `printerRuntime()`. All print jobs go through `usePrinterConnection` → `getPrinterClient()`. QZ Tray is not used on mobile.



## Android / Median (no custom native build)



1. **Browser print dialog** — Tickets and receipts open in a print-ready browser document and immediately call `window.print()`. This lets Median hand the job to Android's configured print service, including a network, Bluetooth, or USB printer. It is the same print-window flow used by the reference POS application.

2. **USB (OTG)** — WebUSB. Tap **Discover**, allow the printer, save the binding. Raw ESC/POS is sent when the WebView supports WebUSB.

3. **Bluetooth** — Web Bluetooth. Tap **Discover**, pair in the system chooser, save the binding. Raw ESC/POS is sent when the WebView supports Web Bluetooth.



No LAN print gateway or Docker bridge is required.



## Median App Studio checklist



- Enable **WebUSB** / **Bluetooth** permissions when using those transports.

- Keep **JavaScript Bridge** allowed on POS URLs.



## Optional native plugin (`median.posPrinter`)



If you later add Median’s ESC/POS plugin, it is used automatically for raw bytes before WebUSB/BT/browser-print fallback. This is optional; browser print + WebUSB/BT work without a custom build.

