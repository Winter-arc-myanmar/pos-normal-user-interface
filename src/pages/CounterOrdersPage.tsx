import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCashier } from "@/core/presentation/hooks/useCashier";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const findArray = (source: UnknownRecord, keys: string[]): UnknownRecord[] => {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value.map(asRecord);
  }
  for (const value of Object.values(source)) {
    const nested = asRecord(value);
    if (Object.keys(nested).length) {
      const result = findArray(nested, keys);
      if (result.length) return result;
    }
  }
  return [];
};

const display = (record: UnknownRecord, keys: string[], fallback = "—") => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return fallback;
};

export function CounterOrdersPage() {
  const {
    isLoading,
    error,
    getCounterOrderById,
    pickupCounterOrder,
  } = useCashier();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<UnknownRecord | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const order = useMemo(() => {
    if (!result) return {};
    return asRecord(result.order || result.counterOrder || result.salesOrder || result);
  }, [result]);
  const lines = useMemo(
    () => (result ? findArray(result, ["lines", "items", "orderLines"]) : []),
    [result]
  );
  const tickets = useMemo(
    () => (result ? findArray(result, ["kdsTickets", "tickets"]) : []),
    [result]
  );

  const loadOrder = async (event: FormEvent) => {
    event.preventDefault();
    const orderId = query.trim();
    if (!orderId) return;
    setLocalError(null);
    setNotice(null);
    try {
      setResult(await getCounterOrderById(orderId));
    } catch (caught) {
      setResult(null);
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to find counter order"
      );
    }
  };

  const markPickedUp = async () => {
    const orderId = query.trim();
    if (!orderId) return;
    setLocalError(null);
    try {
      await pickupCounterOrder(orderId);
      setResult(await getCounterOrderById(orderId));
      setNotice("Counter order marked as picked up");
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to confirm pickup"
      );
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-100 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Counter orders</h1>
          <p className="text-sm text-slate-500">
            Find takeaway orders and confirm customer pickup.
          </p>
        </div>
        <form onSubmit={loadOrder} className="flex gap-2">
          <input
            aria-label="Counter order ID"
            placeholder="Counter order ID"
            className="min-h-11 w-72 rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" isLoading={isLoading}>
            Find order
          </Button>
        </form>
      </header>

      {(error || localError || notice) && (
        <p
          className={[
            "mt-3 rounded p-3 text-sm",
            error || localError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700",
          ].join(" ")}
        >
          {localError || error || notice}
        </p>
      )}

      {result ? (
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)] gap-3 overflow-hidden">
          <div className="min-h-0 overflow-y-auto rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Order</p>
                <h2 className="text-lg font-bold">
                  {display(order, ["orderNumber", "number", "id"])}
                </h2>
                <p className="text-sm text-slate-500">
                  {display(order, ["customerName", "guestName", "name"])}
                </p>
              </div>
              <span className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold">
                {display(order, ["status", "state"])}
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded border border-slate-200">
              {lines.length ? (
                lines.map((line, index) => (
                  <div
                    key={display(line, ["id"], String(index))}
                    className="grid grid-cols-[minmax(0,1fr)_5rem_7rem] gap-2 border-b border-slate-100 p-3 text-sm last:border-0"
                  >
                    <span className="truncate font-medium">
                      {display(line, [
                        "productName",
                        "variantName",
                        "name",
                        "description",
                      ])}
                    </span>
                    <span className="text-right">
                      × {display(line, ["quantity", "qty"], "1")}
                    </span>
                    <span className="text-right font-semibold">
                      {display(line, [
                        "lineTotal",
                        "total",
                        "subtotal",
                        "unitPrice",
                      ])}
                    </span>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-slate-500">
                  No returned order lines.
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded bg-slate-50 p-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">
                {display(order, ["grandTotal", "total", "netTotal"])}
              </span>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col rounded-lg bg-white p-4">
            <h2 className="font-bold">KDS tickets</h2>
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {tickets.length ? (
                tickets.map((ticket, index) => (
                  <div
                    key={display(ticket, ["id"], String(index))}
                    className="rounded border border-slate-200 p-3 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {display(ticket, [
                          "ticketNumber",
                          "stationName",
                          "id",
                        ])}
                      </span>
                      <span className="text-xs font-semibold">
                        {display(ticket, ["status", "state"])}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {display(ticket, ["firedAt", "createdAt", "updatedAt"])}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No KDS tickets returned.
                </p>
              )}
            </div>
            <Button
              fullWidth
              className="mt-4"
              isLoading={isLoading}
              onClick={() => void markPickedUp()}
            >
              Confirm pickup
            </Button>
          </aside>
        </div>
      ) : (
        <div className="mt-4 grid flex-1 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
          Enter an order ID to load order lines and KDS tickets.
        </div>
      )}
    </section>
  );
}
