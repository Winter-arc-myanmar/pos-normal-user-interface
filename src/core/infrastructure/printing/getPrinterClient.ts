import type { IPrinterClient } from "./IPrinterClient";
import { browserPrinterClient } from "./BrowserPrinterClient";
import { printerRuntime } from "./PrinterClient";
import type { KdsTicket } from "../../domain/entities/Cashier";
import type { PrinterBinding, PrinterTransport } from "@/lib/pos/printerBindingStorage";
import type { KitchenSlip, SaleReceipt } from "@/lib/printing/formatKdsTicket";
import {
  isPrintAgentConnectionError,
  probePrintAgent,
  resetPrintAgentProbe,
  type AgentCleanupReport,
  type AgentPrinter,
} from "@/lib/printing/printAgent";

/** What the native engines and the agent add on top of IPrinterClient. */
type ScopedPrinterClient = IPrinterClient & {
  configureScope?: (tenantId: string, registerId: string) => void;
  cleanup?: () => Promise<AgentCleanupReport>;
  listPrinterDevices?: (transport?: PrinterTransport) => Promise<AgentPrinter[]>;
};

const scopeOf = (client: IPrinterClient) => client as ScopedPrinterClient;

let cachedClient: IPrinterClient | null = null;
let loadingClient: Promise<IPrinterClient> | null = null;

/**
 * Chooses the engine for the computer the POS runs on.
 *
 * Browser printing (phones and the Median shell) never talks to the agent, so the
 * loopback probe is skipped there. On desktop the probe must settle first: a print
 * job must never be routed to QZ just because the boot probe was slow.
 */
async function selectClient(): Promise<IPrinterClient> {
  if (printerRuntime() !== "BROWSER") await probePrintAgent();

  const runtime = printerRuntime();
  if (runtime === "BROWSER") return browserPrinterClient;
  if (runtime === "AGENT") {
    return (await import("./HttpPrintAgentClient")).httpPrintAgentClient;
  }
  return (await import("./QzTrayClient")).qzTrayClient;
}

/**
 * Keeps printing alive when the agent restarts mid-shift.
 *
 * The agent hands out a new token every time it starts and closes the sockets it
 * had open. A job that fails on that dropped connection is re-probed once and
 * retried on whatever engine answers next — the agent again, or QZ when the
 * service is gone for good. One retry, never a loop.
 */
class ResilientPrinterClient implements IPrinterClient {
  private scope: { tenantId: string; registerId: string } | null = null;

  constructor(private inner: IPrinterClient) {
    this.applyScope();
  }

  /** Settings asks for the queue cleanup only when the active engine offers it. */
  get cleanup(): (() => Promise<AgentCleanupReport>) | undefined {
    const cleanup = scopeOf(this.inner).cleanup;
    if (!cleanup) return undefined;
    return () =>
      this.run((client) => {
        const active = scopeOf(client).cleanup;
        if (!active) throw new Error("Printer cleanup needs the desktop print agent.");
        return active.call(client);
      });
  }

  isConnected(): boolean {
    return this.inner.isConnected();
  }

  configureScope(tenantId: string, registerId: string): void {
    this.scope = { tenantId, registerId };
    this.applyScope();
  }

  connect(): Promise<void> {
    return this.run((client) => client.connect());
  }

  disconnect(): Promise<void> {
    return this.run((client) => client.disconnect());
  }

  findPrinters(transport?: PrinterTransport): Promise<string[]> {
    return this.run((client) => client.findPrinters(transport));
  }

  /** Raw agent inventory, so Settings can save the queue identity on discovery. */
  listPrinterDevices(transport?: PrinterTransport): Promise<AgentPrinter[]> {
    return this.run((client) => {
      const list = scopeOf(client).listPrinterDevices;
      if (!list) return Promise.resolve<AgentPrinter[]>([]);
      return list.call(client, transport);
    });
  }

  testPrint(binding: PrinterBinding): Promise<void> {
    return this.run((client) => client.testPrint(binding));
  }

  printKdsTicket(binding: PrinterBinding, ticket: KdsTicket): Promise<void> {
    return this.run((client) => client.printKdsTicket(binding, ticket));
  }

  printKitchen(binding: PrinterBinding, slip: KitchenSlip): Promise<void> {
    return this.run((client) => client.printKitchen(binding, slip));
  }

  printReceipt(binding: PrinterBinding, receipt: SaleReceipt): Promise<void> {
    return this.run((client) => client.printReceipt(binding, receipt));
  }

  /** The register the agent saves a rebound queue name back for. */
  private applyScope(): void {
    if (!this.scope) return;
    scopeOf(this.inner).configureScope?.call(
      this.inner,
      this.scope.tenantId,
      this.scope.registerId
    );
  }

  private async run<T>(operation: (client: IPrinterClient) => Promise<T>): Promise<T> {
    const active = this.inner;
    try {
      return await operation(active);
    } catch (error) {
      // An agent-connection failure is worth one re-probe whichever engine is
      // live now: after a fallback the agent may have restarted. The
      // same-instance check below still prevents a second identical attempt.
      if (!isPrintAgentConnectionError(error)) throw error;

      let replacement: IPrinterClient;
      try {
        replacement = await this.reselect();
      } catch {
        // The replacement engine could not even be loaded: report the real failure.
        throw error;
      }
      // The same agent instance means the probe found it healthy again, so a
      // second identical call would fail the same way.
      if (replacement === active) throw error;
      try {
        return await operation(replacement);
      } catch (retryError) {
        // Do not lose the agent diagnosis when the fallback engine also fails.
        // Build a new Error instead of mutating one the client may share.
        const retryMessage =
          retryError instanceof Error ? retryError.message : String(retryError);
        const causeMessage = error instanceof Error ? error.message : String(error);
        const combined = new Error(
          `${retryMessage} (the print agent connection was lost first: ${causeMessage})`
        );
        (combined as Error & { cause?: unknown }).cause = error;
        throw combined;
      }
    }
  }

  /** Forgets the probe, then picks an engine again behind the same wrapper. */
  private async reselect(): Promise<IPrinterClient> {
    resetPrintAgentProbe();
    const replacement = await selectClient();
    this.inner = replacement;
    this.applyScope();
    return replacement;
  }
}

export async function getPrinterClient(): Promise<IPrinterClient> {
  if (cachedClient) return cachedClient;
  if (loadingClient) return loadingClient;
  loadingClient = selectClient()
    .then((client) => {
      const wrapper = new ResilientPrinterClient(client);
      cachedClient = wrapper;
      return wrapper;
    })
    .finally(() => {
      loadingClient = null;
    });
  return loadingClient;
}

export function resetPrinterClientCache() {
  cachedClient = null;
  loadingClient = null;
  resetPrintAgentProbe();
}

