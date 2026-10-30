import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SplitLineDTO } from "@/core/application/dtos/CashierDTO";
import {
  DiningTable,
  SalesOrderLine,
  TableSession,
} from "@/core/domain/entities/Cashier";
import {
  findOpenTableSession,
  isOccupiedDiningTable,
} from "@/lib/pos/tableSession";

/** Where the split-off items go: another table's open bill, or a free table. */
export type SplitTarget = { sessionId: string } | { tableId: string };

interface SplitItemsDialogProps {
  session: TableSession;
  lines: SalesOrderLine[];
  tables: DiningTable[];
  sessions: TableSession[];
  isBusy?: boolean;
  /** An item's name from the loaded menu, for a line saved without one. */
  menuName?: (line: SalesOrderLine) => string | undefined;
  onConfirm: (target: SplitTarget, lines: SplitLineDTO[]) => void;
  onClose: () => void;
}

const tileClass =
  "min-h-14 rounded-md border px-2 py-2 text-left text-sm font-semibold transition";
const stepClass =
  "h-11 w-11 rounded-md border border-slate-700 bg-slate-900 text-lg disabled:opacity-40";

const savedName = (line: SalesOrderLine) =>
  [line.productName, line.variantName].filter(Boolean).join(" · ") ||
  line.sku;

export function SplitItemsDialog({
  session,
  lines,
  tables,
  sessions,
  isBusy = false,
  menuName,
  onConfirm,
  onClose,
}: SplitItemsDialogProps) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [target, setTarget] = useState<SplitTarget | null>(null);

  const splittable = lines.filter(
    (line) => line.id && line.status !== "VOIDED" && Number(line.quantity) > 0
  );
  const tableNumber = (tableId: string) =>
    tables.find((table) => table.id === tableId)?.tableNumber || "?";
  const ownTableIds = [session.tableId, ...(session.joinedTableIds ?? [])];

  const otherParties = useMemo(() => {
    const seen = new Set<string>();
    const parties: TableSession[] = [];
    for (const table of tables) {
      const open = findOpenTableSession(sessions, table.id);
      if (!open || open.id === session.id || seen.has(open.id)) continue;
      seen.add(open.id);
      parties.push(open);
    }
    return parties;
  }, [session.id, sessions, tables]);

  const freeTables = tables.filter(
    (table) =>
      !ownTableIds.includes(table.id) && !isOccupiedDiningTable(table.status)
  );

  const chosen = splittable
    .map((line) => ({ lineId: line.id, quantity: picked[line.id] ?? 0 }))
    .filter((line) => line.quantity > 0);

  const setQuantity = (line: SalesOrderLine, quantity: number) =>
    setPicked((current) => ({
      ...current,
      [line.id]: Math.min(Number(line.quantity), Math.max(0, quantity)),
    }));

  const isTarget = (candidate: SplitTarget) =>
    target !== null &&
    ("sessionId" in candidate
      ? "sessionId" in target && target.sessionId === candidate.sessionId
      : "tableId" in target && target.tableId === candidate.tableId);

  const targetTile = (candidate: SplitTarget, label: string, detail: string) => (
    <button
      key={"sessionId" in candidate ? candidate.sessionId : candidate.tableId}
      type="button"
      disabled={isBusy}
      aria-pressed={isTarget(candidate)}
      onClick={() => setTarget(candidate)}
      className={[
        tileClass,
        isTarget(candidate)
          ? "border-blue-500 bg-blue-600/20"
          : "border-slate-700 bg-slate-900 hover:border-blue-500",
      ].join(" ")}
    >
      {label}
      <span className="block text-[10px] font-normal text-slate-400">{detail}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-items-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5 text-slate-100"
      >
        <div>
          <h2 id="split-items-title" className="text-lg font-bold">
            {t("cashier.seating.splitTitle", {
              table: ownTableIds.map(tableNumber).join(" + "),
            })}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {t("cashier.seating.splitHint")}
          </p>
        </div>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("cashier.seating.itemsToMove")}
          </h3>
          {splittable.length ? (
            <ul className="divide-y divide-slate-800 rounded border border-slate-800">
              {splittable.map((line) => {
                const quantity = picked[line.id] ?? 0;
                const max = Number(line.quantity);
                return (
                  <li key={line.id} className="flex items-center gap-3 p-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {savedName(line) || menuName?.(line) || "?"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {t("cashier.seating.onBill", { count: max })}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={stepClass}
                      aria-label={t("cashier.orderPanel.decreaseQuantity")}
                      disabled={isBusy || quantity <= 0}
                      onClick={() => setQuantity(line, quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-8 text-center tabular-nums">{quantity}</span>
                    <button
                      type="button"
                      className={stepClass}
                      aria-label={t("cashier.orderPanel.increaseQuantity")}
                      disabled={isBusy || quantity >= max}
                      onClick={() => setQuantity(line, quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="h-11 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-semibold disabled:opacity-40"
                      disabled={isBusy || quantity === max}
                      onClick={() => setQuantity(line, max)}
                    >
                      {t("cashier.seating.all")}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{t("cashier.seating.noItems")}</p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("cashier.seating.moveItemsTo")}
          </h3>
          {otherParties.length || freeTables.length ? (
            <div className="grid grid-cols-3 gap-2 min-[500px]:grid-cols-4">
              {otherParties.map((party) =>
                targetTile(
                  { sessionId: party.id },
                  [party.tableId, ...(party.joinedTableIds ?? [])]
                    .map(tableNumber)
                    .join(" + "),
                  t("cashier.seating.openBill")
                )
              )}
              {freeTables.map((table) =>
                targetTile(
                  { tableId: table.id },
                  table.tableNumber,
                  t("cashier.seating.freeTable")
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {t("cashier.seating.noOtherTables")}
            </p>
          )}
        </section>

        <Button
          fullWidth
          isLoading={isBusy}
          disabled={!target || !chosen.length}
          onClick={() => target && onConfirm(target, chosen)}
        >
          {t("cashier.seating.moveItems", { count: chosen.length })}
        </Button>
        <Button variant="outline" fullWidth disabled={isBusy} onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
