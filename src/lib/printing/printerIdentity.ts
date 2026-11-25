import type { AgentPrinter } from "./printAgent";

export interface PrinterIdentity {
  hardwareId?: string;
  portName?: string;
}

/** Stable identity for a Windows queue name, so the agent survives a queue rename. */
export function identityForDevice(
  printers: Pick<AgentPrinter, "name" | "id" | "port">[] | null | undefined,
  deviceName: string | null | undefined
): PrinterIdentity {
  const wanted = (deviceName || "").trim();
  if (!wanted) return {};
  const needle = wanted.toLowerCase();
  const match = (printers || []).find(
    (printer) => (printer.name || "").trim().toLowerCase() === needle
  );
  if (!match) return {};
  return { hardwareId: match.id || undefined, portName: match.port || undefined };
}
