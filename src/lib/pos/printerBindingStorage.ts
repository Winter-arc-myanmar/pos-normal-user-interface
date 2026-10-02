export type PrinterTransport = "NETWORK" | "USB" | "BLUETOOTH";

export interface PrinterBinding {
  id: string;
  backendPrinterId?: string;
  transport: PrinterTransport;
  displayName: string;
  deviceName?: string;
  host?: string;
  port?: number;
  categoryIds?: string[];
  lastVerifiedAt: string;
  lastError?: string | null;
}

interface PrinterBindingStore {
  version: 1;
  defaultBindingId?: string;
  bindings: Record<string, PrinterBinding>;
}

export const PRINTER_BINDINGS_CHANGED = "pos:printer-bindings-changed";

const keyFor = (tenantId: string, registerId: string) =>
  `pos:printerBindings:${tenantId || "unknown"}:${registerId || "default"}`;

const emptyStore = (): PrinterBindingStore => ({ version: 1, bindings: {} });

type LegacyPrinterBinding = PrinterBinding & {
  stationId?: string;
  stationIds?: string[];
};

const normalizeBinding = (
  binding: LegacyPrinterBinding
): PrinterBinding => {
  const normalized = { ...binding };
  delete normalized.stationId;
  delete normalized.stationIds;
  return normalized;
};

const normalizeStore = (store: PrinterBindingStore): PrinterBindingStore => ({
  ...store,
  bindings: Object.fromEntries(
    Object.entries(store.bindings || {}).map(([id, binding]) => [
      id,
      normalizeBinding(binding as LegacyPrinterBinding),
    ])
  ),
});

export function readPrinterBindings(
  tenantId: string,
  registerId: string
): PrinterBindingStore {
  try {
    const raw = localStorage.getItem(keyFor(tenantId, registerId));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as PrinterBindingStore;
    return parsed?.version === 1 && parsed.bindings
      ? normalizeStore(parsed)
      : emptyStore();
  } catch {
    return emptyStore();
  }
}

const bindingsFromStore = (store: PrinterBindingStore) => {
  const bindings = Object.values(store.bindings || {});
  const savedDefault = store.defaultBindingId
    ? store.bindings[store.defaultBindingId] || null
    : null;
  return {
    bindings,
    defaultBinding: savedDefault || bindings[0] || null,
  };
};

export function listStoredPrinterBindings(
  tenantId: string,
  registerId: string
): { bindings: PrinterBinding[]; defaultBinding: PrinterBinding | null } {
  const current = bindingsFromStore(readPrinterBindings(tenantId, registerId));
  if (current.bindings.length || typeof localStorage === "undefined") return current;

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("pos:printerBindings:")) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "") as PrinterBindingStore;
      const found = bindingsFromStore(normalizeStore(parsed));
      if (found.bindings.length) return found;
    } catch {
      // Ignore unreadable printer settings from another register.
    }
  }

  return current;
}

const write = (
  tenantId: string,
  registerId: string,
  store: PrinterBindingStore
) => {
  try {
    localStorage.setItem(keyFor(tenantId, registerId), JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(PRINTER_BINDINGS_CHANGED));
  } catch {
    // Embedded WebViews may deny local storage.
  }
};

export function savePrinterBinding(
  tenantId: string,
  registerId: string,
  binding: PrinterBinding,
  makeDefault = false
): void {
  const store = readPrinterBindings(tenantId, registerId);
  write(tenantId, registerId, {
    ...store,
    defaultBindingId:
      makeDefault || !store.defaultBindingId ? binding.id : store.defaultBindingId,
    bindings: { ...store.bindings, [binding.id]: normalizeBinding(binding) },
  });
}

export function removeLocalOnlyPrinterBindings(
  tenantId: string,
  registerId: string
): void {
  const store = readPrinterBindings(tenantId, registerId);
  const bindings = Object.fromEntries(
    Object.entries(store.bindings).filter(([, binding]) => binding.backendPrinterId)
  );
  if (Object.keys(bindings).length === Object.keys(store.bindings).length) return;
  const nextDefault =
    store.defaultBindingId && bindings[store.defaultBindingId]
      ? store.defaultBindingId
      : Object.keys(bindings)[0];
  write(tenantId, registerId, {
    ...store,
    bindings,
    defaultBindingId: nextDefault,
  });
}

export function removePrinterBinding(
  tenantId: string,
  registerId: string,
  bindingId: string
): void {
  const store = readPrinterBindings(tenantId, registerId);
  const bindings = { ...store.bindings };
  delete bindings[bindingId];
  const nextDefault =
    store.defaultBindingId === bindingId
      ? Object.keys(bindings)[0]
      : store.defaultBindingId;
  write(tenantId, registerId, {
    ...store,
    bindings,
    defaultBindingId: nextDefault,
  });
}

export function setDefaultPrinterBinding(
  tenantId: string,
  registerId: string,
  bindingId: string
): void {
  const store = readPrinterBindings(tenantId, registerId);
  if (!store.bindings[bindingId]) return;
  write(tenantId, registerId, { ...store, defaultBindingId: bindingId });
}

export function getDefaultPrinterBinding(
  tenantId: string,
  registerId: string
): PrinterBinding | null {
  const store = readPrinterBindings(tenantId, registerId);
  return store.defaultBindingId
    ? store.bindings[store.defaultBindingId] || null
    : null;
}
