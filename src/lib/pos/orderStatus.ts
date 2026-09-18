export function isSettledSalesOrder(order?: { status?: string } | null): boolean {
  const status = String(order?.status || "").toUpperCase();
  return (
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "VOIDED" ||
    status === "REFUNDED" ||
    status === "PARTIALLY_REFUNDED"
  );
}
