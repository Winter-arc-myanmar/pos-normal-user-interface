export function isSettledSalesOrder(order?: { status?: string } | null): boolean {
  const status = String(order?.status || "").toUpperCase();
  return status === "COMPLETED" || status === "CANCELLED";
}
