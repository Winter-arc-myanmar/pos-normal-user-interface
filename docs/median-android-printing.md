# Median Android POS printing

## Runtimes

| Platform | Client | How it prints |
| --- | --- | --- |
| Windows / Linux / macOS (desktop browser) | `QzTrayClient` | QZ Tray → OS spooler or raw TCP `host:9100` |
| Android, iOS, Median WebView | `BrowserPrinterClient` | PDF (Wi‑Fi), WebUSB, Web Bluetooth, optional `median.posPrinter` |

The app picks the runtime in `printerRuntime()`. All print jobs go through `usePrinterConnection` → `getPrinterClient()`. QZ Tray is not used on mobile.

## Android / Median (no custom native build)

1. **Wi‑Fi (port 9100)** — Save the printer IP in **Settings → Printer**. Tickets and receipts open as a **PDF** in Median’s native viewer (`median.share.downloadFile` with `open: true`). Use the **Print** icon in the viewer to send to a network, Bluetooth, or USB printer configured on the device.
2. **USB (OTG)** — WebUSB. Tap **Discover**, allow the printer, save the binding. Raw ESC/POS is sent when the WebView supports WebUSB.
3. **Bluetooth** — Web Bluetooth. Tap **Discover**, pair in the system chooser, save the binding. Raw ESC/POS is sent when the WebView supports Web Bluetooth.

No LAN print gateway or Docker bridge is required.

## Median App Studio checklist

- Enable **Download File** in the app config (used to open PDFs for printing).
- Enable **WebUSB** / **Bluetooth** permissions when using those transports.
- Keep **JavaScript Bridge** allowed on POS URLs.

## Optional native plugin (`median.posPrinter`)

If you later add Median’s ESC/POS plugin, it is used automatically for raw bytes before WebUSB/BT/PDF fallback. This is optional; PDF + WebUSB/BT work without a custom build.
