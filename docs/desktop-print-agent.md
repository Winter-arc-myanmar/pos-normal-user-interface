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
awaited by `getPrinterClient()`. It is skipped entirely on phones and in the
Median shell, which cannot reach a loopback agent. A slow probe can therefore
never route a job to QZ by accident.

The probe reports one of four states (Settings shows the last two as an amber
warning instead of pretending QZ is the normal engine):

| Status | Meaning | Engine |
| --- | --- | --- |
| `ready` | Agent answered, this POS origin is allowed, contract matches | `AGENT` |
| `absent` | Nothing is listening on `127.0.0.1:8735` (or the browser blocks loopback entirely) | `QZ` |
| `unreachable` | Something answered but the POS could not use it: HTTP 403/`allowOrigins`, timeout, unreadable body, missing token | `QZ` **with a warning** |
| `incompatible` | Agent answered with a different `contractVersion` than `SUPPORTED_AGENT_CONTRACT` | `QZ` **with a warning** |

Because a refused CORS request and a closed port both surface as a network
`TypeError`, the client follows a failed probe with one short `mode:"no-cors"`
request to the agent address. If that succeeds, the agent is running and the POS
was refused (almost always `allowOrigins`); if it fails too, the agent is treated
as absent. This second request is subject to the browser's Private Network Access
rules as well — verify the warning once on a real HTTPS till with a deliberately
wrong `allowOrigins` before a wide rollout.

If the agent starts after the page loaded, press **Discover** in Settings: it
forces a fresh probe and selects the agent without a page reload.

## What changes in Settings

- **Printer** shows “Print agent ready” instead of the QZ Tray requirement, the
  agent version, and a **Clean up stale printers** button (enabled only when the
  service is elevated, which it is by default). If the agent is running but this
  POS was refused or speaks another contract, an amber banner says so.
- **Devices** shows the engine (`Print agent 1.0.0`) instead of the QZ rows, or
  “Print agent unreachable/incompatible” when the probe could not use it.
- Discover lists every installed USB print queue. The queue name no longer has to
  contain `POS-80`, `XPrinter`, `Receipt`, ….

## Why a printer keeps printing after moving USB port

A binding stores the queue name **and** the agent’s stable device identity
(`hardwareId`, plus `portName` for diagnostics) in
`src/lib/pos/printerBindingStorage.ts`. Identity is captured when the operator
runs **Discover** and saves the printer, and refreshed silently whenever the
agent reports `rebound`.

When Windows re-creates a queue under another name (`POS-80 (Copy 1)`), the agent
resolves the job **by identity**, prints, and answers `rebound: true`. The client
then saves the new queue name silently, so the operator never re-picks a printer.

Resolution order in the agent: identity → queue name → port name → the only queue
installed on the computer. With two or more queues and no match it refuses
rather than print on the wrong counter.

## Printer cleanup

`POST /v1/admin/cleanup` deletes print queues whose printer is provably gone — the
automated half of the old `reset-usb-printer.ps1` ritual. It requires the service
account (LocalSystem). A queue is removed only when its port is one the USB print
monitor knows and no printer is attached to it now; DOT4 ports, vendor-renamed
ports and queues that are merely offline (printer switched off) are left alone.
If the attached-device list cannot be read, nothing is removed. Phantom
`USBPRINT` devices that remain after a queue is deleted still need an elevated
`pnputil /remove-device`.

## Failure messages

The agent returns HTTP 4xx with a `message` written for a shopkeeper, and the
client surfaces it verbatim (with extra guidance where the POS can add it) in
Settings and in the print error toast:

| Code | Meaning |
| --- | --- |
| `PRINTER_NOT_FOUND` | Driver/queue missing, or the printer was removed. The POS appends “run Discover and pick the queue again”. |
| `PRINTER_QUEUE_MISSING` | The printer is attached but Windows has no queue for it, and the agent could not create one (no driver, ambiguous printers) |
| `PRINTER_BUSY` | The spooler is still printing the previous job |
| `PRINTER_ACCESS_DENIED` | The queue belongs to another session |
| `NOT_ELEVATED` | Cleanup was requested from a non-service instance |
| `JOB_TOO_LARGE` | The job exceeded the agent’s 8 MB body limit |
| `ORIGIN_NOT_ALLOWED` | The POS origin is missing from `allowOrigins`; the POS tells the operator which origin to add |
| `UNAUTHORIZED` | The cached token is stale (agent restarted); reload the page |

If the service is not running at all, the client says so instead of hanging:
`The print agent is not running on this computer…`

If the agent connection drops mid-job, the client re-probes once and retries the
same job on QZ (or the browser). The job id sent to the agent is the printer
binding id, so a slip that was partially written before the drop can print twice;
the POS surfaces both failures when the retry also fails.

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
