const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatPosQuantity(value: unknown): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function salesOrderServiceTypeKey(serviceType?: string): string {
  switch (String(serviceType || "").toUpperCase()) {
    case "TABLE":
      return "cashier.serviceTypes.table";
    case "TAKE_AWAY":
    case "TAKEAWAY":
      return "cashier.serviceTypes.takeAway";
    case "DELIVERY":
      return "cashier.serviceTypes.delivery";
    case "PICK_UP":
    case "COUNTER":
      return "cashier.serviceTypes.pickUp";
    default:
      return "cashier.serviceTypes.dineIn";
  }
}

export function salesOrderStatusKey(status?: string): string {
  switch (String(status || "").toUpperCase()) {
    case "COMPLETED":
      return "salesOrders.status.completed";
    case "VOIDED":
    case "CANCELLED":
      return "salesOrders.status.voided";
    case "ON_HOLD_CREDIT":
      return "salesOrders.status.onHold";
    case "REFUNDED":
      return "salesOrders.status.refunded";
    case "PARTIALLY_REFUNDED":
      return "salesOrders.status.partiallyRefunded";
    default:
      return "salesOrders.status.open";
  }
}

export function isHumanDisplayName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const text = value.trim();
  return text.length > 0 && !UUID_LIKE.test(text);
}

export function lineDisplayName(line: {
  productName?: string;
  variantName?: string;
  sku?: string;
}): string {
  if (isHumanDisplayName(line.productName)) return line.productName.trim();
  if (isHumanDisplayName(line.variantName)) return line.variantName.trim();
  if (isHumanDisplayName(line.sku)) return line.sku.trim();
  return "";
}
