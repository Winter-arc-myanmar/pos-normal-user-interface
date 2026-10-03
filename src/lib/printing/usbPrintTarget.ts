export type UsbQueueInfo = { name?: string; connection?: string };
export type UsbDeviceInfo = { product?: string; manufacturer?: string };

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
