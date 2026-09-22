import { PrinterBinding } from "@/lib/pos/printerBindingStorage";
import { PrintLine } from "./formatKdsTicket";

export interface PrinterJob {
  binding: PrinterBinding;
  lines: PrintLine[];
}

const bindingForLine = (
  line: PrintLine,
  bindings: PrinterBinding[],
  stationBinding: PrinterBinding | null,
  defaultBinding: PrinterBinding | null
) => {
  if (line.categoryId) {
    const routed = bindings.find((binding) =>
      binding.categoryIds?.includes(line.categoryId || "")
    );
    if (routed) return routed;
  }
  return stationBinding || defaultBinding;
};

export function groupKitchenJobs(
  lines: PrintLine[],
  bindings: PrinterBinding[],
  defaultBinding: PrinterBinding | null,
  stationId?: string
): PrinterJob[] {
  const stationBinding =
    bindings.find((binding) => stationId && binding.stationId === stationId) ||
    null;
  const jobs = new Map<string, PrinterJob>();

  const add = (binding: PrinterBinding, line?: PrintLine) => {
    const current = jobs.get(binding.id) || { binding, lines: [] };
    if (line) current.lines.push(line);
    jobs.set(binding.id, current);
  };

  if (!lines.length) {
    const target = stationBinding || defaultBinding;
    if (!target) throw new Error("No default printer is connected");
    add(target);
    return Array.from(jobs.values());
  }

  for (const line of lines) {
    const target = bindingForLine(line, bindings, stationBinding, defaultBinding);
    if (!target) throw new Error("No default printer is connected");
    add(target, line);
  }

  return Array.from(jobs.values());
}
