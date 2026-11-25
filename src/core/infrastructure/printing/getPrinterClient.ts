import type { IPrinterClient } from "./IPrinterClient";
import { browserPrinterClient } from "./BrowserPrinterClient";
import { printerRuntime } from "./PrinterClient";
import { probePrintAgent, resetPrintAgentProbe } from "@/lib/printing/printAgent";

let cachedClient: IPrinterClient | null = null;
let loadingClient: Promise<IPrinterClient> | null = null;

export async function getPrinterClient(): Promise<IPrinterClient> {
  if (cachedClient) return cachedClient;
  if (loadingClient) return loadingClient;
  loadingClient = (async () => {
    // The agent probe must settle first: the runtime choice depends on it, and a
    // print job must never be routed to QZ just because the boot probe was slow.
    await probePrintAgent();

    const runtime = printerRuntime();
    const client =
      runtime === "BROWSER"
        ? browserPrinterClient
        : runtime === "AGENT"
          ? (await import("./HttpPrintAgentClient")).httpPrintAgentClient
          : (await import("./QzTrayClient")).qzTrayClient;

    cachedClient = client;
    loadingClient = null;
    return client;
  })();
  return loadingClient;
}

export function resetPrinterClientCache() {
  cachedClient = null;
  loadingClient = null;
  resetPrintAgentProbe();
}
