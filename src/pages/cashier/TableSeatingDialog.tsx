import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { TableSeatingChangeDTO } from "@/core/application/dtos/CashierDTO";
import { DiningTable, TableSession } from "@/core/domain/entities/Cashier";
import {
  findOpenTableSession,
  isOccupiedDiningTable,
} from "@/lib/pos/tableSession";

interface TableSeatingDialogProps {
  mode: "move" | "combine";
  session: TableSession;
  tables: DiningTable[];
  sessions: TableSession[];
  isBusy?: boolean;
  onConfirm: (change: TableSeatingChangeDTO) => void;
  onClose: () => void;
}

const tileClass =
  "min-h-14 rounded-md border px-2 py-2 text-left text-sm font-semibold transition";

export function TableSeatingDialog({
  mode,
  session,
  tables,
  sessions,
  isBusy = false,
  onConfirm,
  onClose,
}: TableSeatingDialogProps) {
  const { t } = useTranslation();
  const [sourceSessionId, setSourceSessionId] = useState("");
  const [keepTable, setKeepTable] = useState(false);

  const tableNumber = (tableId: string) =>
    tables.find((table) => table.id === tableId)?.tableNumber || "?";
  const ownTableIds = [session.tableId, ...(session.joinedTableIds ?? [])];

  const freeTables = tables.filter(
    (table) =>
      !ownTableIds.includes(table.id) && !isOccupiedDiningTable(table.status)
  );

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

  const partyLabel = (party: TableSession) =>
    [party.tableId, ...(party.joinedTableIds ?? [])].map(tableNumber).join(" + ");

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5 text-slate-100">
        <div>
          <h2 className="text-lg font-bold">
            {mode === "move"
              ? t("cashier.seating.moveTitle", {
                  table: tableNumber(session.tableId),
                })
              : t("cashier.seating.combineTitle", {
                  table: ownTableIds.map(tableNumber).join(" + "),
                })}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "move"
              ? t("cashier.seating.moveHint")
              : t("cashier.seating.combineHint")}
          </p>
        </div>

        {mode === "combine" ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("cashier.seating.otherBills")}
            </h3>
            {otherParties.length ? (
              <div className="grid grid-cols-3 gap-2">
                {otherParties.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setSourceSessionId(party.id)}
                    className={[
                      tileClass,
                      sourceSessionId === party.id
                        ? "border-blue-500 bg-blue-600/20"
                        : "border-slate-700 bg-slate-900 hover:border-blue-500",
                    ].join(" ")}
                  >
                    {partyLabel(party)}
                    <span className="block text-[10px] font-normal text-slate-400">
                      {t("cashier.seating.guests", { count: party.guestCount })}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {t("cashier.seating.noOtherBills")}
              </p>
            )}
            {sourceSessionId ? (
              <div className="space-y-2 rounded border border-slate-800 bg-slate-900/60 p-3 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="keep-table"
                    checked={!keepTable}
                    onChange={() => setKeepTable(false)}
                    className="mt-1"
                  />
                  <span>{t("cashier.seating.guestsMoveHere")}</span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="keep-table"
                    checked={keepTable}
                    onChange={() => setKeepTable(true)}
                    className="mt-1"
                  />
                  <span>{t("cashier.seating.keepBothTables")}</span>
                </label>
                <Button
                  fullWidth
                  isLoading={isBusy}
                  onClick={() =>
                    onConfirm({ kind: "merge", sourceSessionId, keepTable })
                  }
                >
                  {t("cashier.seating.combineBills")}
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {mode === "move"
              ? t("cashier.seating.freeTables")
              : t("cashier.seating.joinFreeTable")}
          </h3>
          {freeTables.length ? (
            <div className="grid grid-cols-3 gap-2 min-[500px]:grid-cols-4">
              {freeTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    onConfirm({
                      kind: mode === "move" ? "move" : "join",
                      tableId: table.id,
                    })
                  }
                  className={[
                    tileClass,
                    "border-slate-700 bg-slate-900 hover:border-blue-500 disabled:opacity-50",
                  ].join(" ")}
                >
                  {table.tableNumber}
                  <span className="block text-[10px] font-normal text-slate-400">
                    {t("cashier.seating.seats", { count: table.maxSeats })}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {t("cashier.seating.noFreeTables")}
            </p>
          )}
        </section>

        <Button variant="outline" fullWidth disabled={isBusy} onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
