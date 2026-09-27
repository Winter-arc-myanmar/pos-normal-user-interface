import type { IPrinterClient } from "./IPrinterClient";
import { browserPrinterClient } from "./BrowserPrinterClient";
import { printerRuntime } from "./PrinterClient";

let cachedClient: IPrinterClient | null = null;
let loadingClient: Promise<IPrinterClient> | null = null;

export async function getPrinterClient(): Promise<IPrinterClient> {
  if (cachedClient) return cachedClient;
  if (loadingClient) return loadingClient;
  loadingClient = (async () => {
    const client =
      printerRuntime() === "BROWSER"
        ? browserPrinterClient
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
}