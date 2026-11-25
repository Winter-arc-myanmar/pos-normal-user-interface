# Desktop printing through the print agent

The desktop POS can print without QZ Tray by running **Lnkits POS Print Agent**, a
small Windows service in a separate repository:
`https://github.com/mhkhizil/vision-pos-print-agent`.

```
POS page ──fetch 127.0.0.1:8735──► print agent (LocalSystem)
                                        ├─ Windows spooler (USB queues)
                                        ├─ raw TCP host:9100 (Wi-Fi printers)
                                        └─ COM port (Bluetooth SPP)
```

## How the app picks an engine

`printerRuntime()` in `src/core/infrastructure/printing/PrinterClient.ts` decides,
in this order:

1. **Android / iOS / Median shell → `BROWSER`** — the native `median.posPrinter`
   bridge stays exactly as it was. Mobile always wins.
2. **Desktop with a running agent → `AGENT`** — `HttpPrintAgentClient` talks to
   the service.
3. **Any other desktop → `QZ`** — `QzTrayClient`, unchanged, for computers that do
   not have the agent installed yet.

The probe is one `GET /v1/health` with a 700 ms budget, started in `main.tsx` and
awaited by `getPrinterClient()`. A slow probe can therefore never route a job to
QZ by accident; if the agent starts after the page loaded, reload the page.

## What changes in Settings

- **Printer** shows “Print agent ready” instead of the QZ Tray requirement, the
  agent version, and a **Clean up stale printers** button (enabled only when the
  service is elevated, which it is by default).
- **Devices** shows the engine (`Print agent 1.0.0`) instead of the QZ rows.
- Discover lists every installed USB print queue. The queue name no longer has to
  contain `POS-80`, `XPrinter`, `Receipt`, ….

## Why a printer keeps printing after moving USB port

A binding stores the queue name **and** the agent’s stable device identity
(`hardwareId`, plus `portName` for diagnostics) in
`src/lib/pos/printerBindingStorage.ts`.

When Windows re-creates a queue under another name (`POS-80 (Copy 1)`), the agent
resolves the job **by identity**, prints, and answers `rebound: true`. The client
then saves the new queue name silently, so the operator never re-picks a printer.

Resolution order in the agent: identity → queue name → port name → the only
connected printer. With two or more connected printers and no match it refuses
rather than print on the wrong counter.

## Printer cleanup

`POST /v1/admin/cleanup` deletes print queues whose printer is not attached —
the automated half of the old `reset-usb-printer.ps1` ritual. It requires the
service account (LocalSystem). Phantom `USBPRINT` devices that remain after a
queue is deleted still need an elevated `pnputil /remove-device`.

## Failure messages

The agent returns HTTP 4xx with a `message` written for a shopkeeper, and the
client surfaces it verbatim in Settings and in the print error toast:

| Code | Meaning |
| --- | --- |
| `PRINTER_NOT_FOUND` | Driver/queue missing, or the printer was removed |
| `PRINTER_BUSY` | The spooler is still printing the previous job |
| `PRINTER_ACCESS_DENIED` | The queue belongs to another session |
| `NOT_ELEVATED` | Cleanup was requested from a non-service instance |
| `JOB_TOO_LARGE` | The job exceeded the agent’s 8 MB body limit |

If the service is not running at all, the client says so instead of hanging:
`The print agent is not running on this computer…`

## Rollout and rollback

- Install per PC; computers without the agent keep using QZ Tray, so a partial
  rollout is safe.
- Rollback: stop/remove the service. The app falls back to QZ on the next reload
  because the probe fails.
- Lock the agent down before broad rollout by setting `allowOrigins` in
  `%PROGRAMDATA%\LnkitsPrintAgent\config.json` to the POS URL.

## Security

- Loopback only (`127.0.0.1` / `::1`); never a LAN address.
- Every printing call needs `X-Pos-Agent-Token`, read from `/v1/health` and kept
  in memory only.
- Origin allow-list plus the Chromium Private Network Access preflight header.
- 8 MB cap, per-printer serialisation, no shell interpolation of job data.
