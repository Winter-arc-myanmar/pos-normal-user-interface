export type UsbQueueInfo = { name?: string; connection?: string };
export type UsbDeviceInfo = {
  product?: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
};

const IGNORED_USB =
  /keyboard|mouse\b|hub\b|camera|webcam|uvc|headset|audio|bluetooth|realtek|wireless receiver/i;

const RECEIPT_USB_NAME =
  /print|pos-?80|xprinter|thermal|receipt|escpos|gprinter|rongta|xp-|star micronics|epson/i;

const RECEIPT_USB_VIDS = new Set([
  "1fc9",
  "0483",
  "0416",
  "04b8",
  "0519",
  "0dd4",
  "154f",
  "1cbe",
  "20d1",
  "6868",
  "0fe6",
  "1a86",
  "0525",
]);

export function usbDeviceLabel(device: UsbDeviceInfo): string {
  const named = [device.manufacturer, device.product]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  if (named) return named;
  if (device.vendorId && device.productId) {
    return `USB ${device.vendorId}:${device.productId}`;
  }
  return "";
}

export function isIgnoredUsbDevice(device: UsbDeviceInfo): boolean {
  return IGNORED_USB.test(`${device.product || ""} ${device.manufacturer || ""}`);
}

export function isReceiptQueueName(name?: string): boolean {
  return RECEIPT_USB_NAME.test(name || "");
}

/** True only for a USB device that looks like a receipt printer, not a webcam or dongle. */
export function isReceiptUsbPrinter(device: UsbDeviceInfo): boolean {
  if (isIgnoredUsbDevice(device)) return false;
  const vid = normalizeHex(device.vendorId);
  if (vid && RECEIPT_USB_VIDS.has(vid)) return true;
  return RECEIPT_USB_NAME.test(
    `${device.product || ""} ${device.manufacturer || ""} ${usbDeviceLabel(device)}`
  );
}

export function uniquePrinterNames(names: Array<string | undefined | null>): string[] {
  return [...new Set(names.map((name) => name?.trim()).filter(Boolean) as string[])];
}

const normalizeHex = (value?: string) =>
  (value || "").trim().replace(/^0x/i, "").toLowerCase();

/** QZ Tray USB calls expect hex IDs like 0x1F9D, not 1f9d. */
export function toQzUsbHex(value?: string | number): string {
  const hex = normalizeHex(String(value ?? ""));
  if (!hex || !/^[0-9a-f]+$/.test(hex)) return "";
  return `0x${hex.toUpperCase()}`;
}

export function parseUsbDeviceRef(
  name?: string
): { vendorId: string; productId: string } | null {
  const match = name?.trim().match(/^USB\s+([0-9a-fA-F]+):([0-9a-fA-F]+)$/i);
  if (!match) return null;
  return { vendorId: match[1], productId: match[2] };
}

export function usbDeviceMatchesName(device: UsbDeviceInfo, name?: string): boolean {
  if (!name?.trim()) return false;
  const ref = parseUsbDeviceRef(name);
  if (ref) {
    return (
      normalizeHex(device.vendorId) === normalizeHex(ref.vendorId) &&
      normalizeHex(device.productId) === normalizeHex(ref.productId)
    );
  }
  return (
    usbNameMatches(name, usbDeviceLabel(device)) ||
    usbNameMatches(name, device.product) ||
    usbNameMatches(name, device.manufacturer)
  );
}

const USB_CONNECTION = /^USB/i;

export function usbNameMatches(left?: string, right?: string): boolean {
  const a = left?.trim().toLowerCase();
  const b = right?.trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function queueMatchesUsbDevice(queueName: string, device: UsbDeviceInfo): boolean {
  return (
    usbNameMatches(queueName, device.product) ||
    usbNameMatches(queueName, device.manufacturer)
  );
}

const isUsbQueue = (queue: UsbQueueInfo): queue is UsbQueueInfo & { name: string } =>
  Boolean(queue.name) && USB_CONNECTION.test(queue.connection || "");

/**
 * Prefer the saved Windows queue only when it still looks like a plugged-in printer.
 * A leftover "Ready" queue from an unplugged USB printer is ranked after queues that
 * match a device that is actually connected now.
 */
export function rankUsbPrintQueues(input: {
  savedName?: string;
  queues: UsbQueueInfo[];
  offlineNames?: Iterable<string>;
  connectedDevices?: UsbDeviceInfo[];
}): string[] {
  const offline = new Set(input.offlineNames || []);
  const devices = input.connectedDevices || [];
  const online = input.queues
    .filter(isUsbQueue)
    .map((queue) => queue.name)
    .filter((name, index, all) => all.indexOf(name) === index && !offline.has(name));

  const matchesDevice = (name: string) =>
    devices.some((device) => queueMatchesUsbDevice(name, device));
  const saved =
    input.savedName && online.includes(input.savedName) ? input.savedName : undefined;
  const matched = online.filter((name) => name !== saved && matchesDevice(name));
  const others = online.filter((name) => name !== saved && !matched.includes(name));
  const savedLooksStale =
    Boolean(saved) && devices.length > 0 && !matchesDevice(saved as string) && matched.length > 0;

  if (saved && !savedLooksStale) return [saved, ...matched, ...others];
  return [...matched, ...others, ...(saved && savedLooksStale ? [saved] : [])];
}

export function isRetryableUsbQueueError(message: string): boolean {
  return /cannot find printer|not found|offline|not available|unavailable|i\/o|access is denied|spooler|not connected/i.test(
    message
  );
}
