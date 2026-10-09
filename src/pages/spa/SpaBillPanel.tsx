import { Button } from "@/components/ui/Button";
import { SalesOrderLine } from "@/core/domain/entities/Cashier";
import { GuestCard, GuestWallet } from "@/core/domain/entities/GuestWallet";
import { SpaRoom, SpaSession, SpaSessionQuote } from "@/core/domain/entities/Spa";
import type { RoomKind } from "@/core/presentation/hooks/useRoomPos";
import { useRoomText } from "@/core/presentation/hooks/useRoomText";
import { getKtvWarning } from "@/lib/ktv/session";
import { estimateCardCharge } from "@/lib/spa/payment";
import { bookedSessions } from "@/lib/spa/session";
import {
  focPending,
  PendingItem,
  pendingKey,
  pendingSaving,
  pendingTotal,
} from "@/lib/spa/pending";
import type { PromotionDiscount, RunningPromotion } from "@/core/domain/entities/Promotion";

const money = (value: string | number | undefined) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function SpaBillPanel({
  kind = "spa",
  room,
  session,
  card,
  wallet,
  quote,
  lines,
  itemNames,
  nowMs,
  isBusy,
  billClosed,
  paid = false,
  onPrimary,
  primaryLabel,
  onTogglePause,
  onChangeQuantity,
  onAddAnother,
  onRemoveLine,
  pending,
  onPendingChange,
  onClearPending,
  onCommitPending,
  onToggleFoc,
  onChangeCard,
  onExtend,
  promotions = [],
  pendingDiscounts = {},
  promotionName = () => undefined,
  packageVariantIds,
}: {
  kind?: RoomKind;
  room: SpaRoom | null;
  session: SpaSession;
  card: GuestCard | null;
  wallet: GuestWallet | null;
  quote: SpaSessionQuote | null;
  lines: SalesOrderLine[];
  itemNames: Record<string, string>;
  nowMs: number;
  isBusy: boolean;
  billClosed: boolean;
  paid?: boolean;
  onPrimary: () => void;
  primaryLabel: string;
  onTogglePause: () => void;
  onChangeQuantity: (line: SalesOrderLine, delta: number) => void;
  onAddAnother: (line: SalesOrderLine) => void;
  onRemoveLine: (line: SalesOrderLine) => void;
  pending: PendingItem[];
  onPendingChange: (variantId: string, delta: number) => void;
  onClearPending: () => void;
  onCommitPending: () => void;
  onToggleFoc: (key: string) => void;
  onChangeCard: () => void;
  onExtend: () => void;
  promotions?: RunningPromotion[];
  pendingDiscounts?: Record<string, PromotionDiscount>;
  promotionName?: (id: string | undefined) => string | undefined;
  /** SPA package lines: booked treatments, shown by name and never edited. */
  packageVariantIds?: Set<string>;
}) {
  const tr = useRoomText(kind);
  const warning = getKtvWarning(session.endsAt, nowMs);
  const discountBps = wallet?.discountBpsSnapshot || 0;
  const pendingDue = pendingTotal(pending) - pendingSaving(pending, pendingDiscounts);
  const runningTotal = Number(quote?.runningTotal || 0);
  const discount = (runningTotal * discountBps) / 10000;
  const minutesIn = Math.max(0, (quote?.elapsedMinutes || 0) - (quote?.pausedMinutes || 0));
  const isPaused = session.sessionState === "PAUSED";
  const pendingCount = pending.reduce((sum, item) => sum + item.quantity, 0);
  const freeCount = focPending(pending).reduce((sum, item) => sum + item.quantity, 0);
  const prepaid = Boolean(quote?.prepaid);
  // Time is bought (paid now, or on the bill to pay at the end), never run up on a clock.
  const canExtend = prepaid || quote?.paymentTiming === "PAY_AT_END";
  const visibleLines = lines.filter(
    (line) => !["VOIDED", "COMPED"].includes(String(line.status || "").toUpperCase())
  );

  const timeLine = [
    tr("startedShort", {
      time: new Date(session.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }),
    session.plannedMinutes
      ? tr("minutesOfBooked", {
          count: minutesIn,
          booked: session.plannedMinutes,
          sessions: bookedSessions(session.plannedMinutes, room?.minimumMinutes || 60),
        })
      : tr("treatmentMinutes", { count: minutesIn }),
    tr("guestCount", { count: session.guestCount }),
  ].join(" · ");

  return (
    <aside className="flex min-h-0 flex-col gap-3 rounded-lg border border-slate-800 p-3 lg:overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-lg font-bold">
          {room?.roomNumber || quote?.roomNumber}
          {room?.name ? (
            <span className="ml-2 text-sm font-normal text-slate-400">{room.name}</span>
          ) : null}
        </p>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
            paid
              ? "border border-emerald-500/40 text-emerald-200"
              : billClosed
                ? "border border-amber-500/40 text-amber-200"
                : isPaused
                  ? "border border-slate-700 text-slate-400"
                  : "border border-slate-600 text-slate-200"
          }`}
        >
          {paid
            ? tr("status.paid")
            : billClosed
              ? tr("status.payment_pending")
              : tr(`status.${session.sessionState.toLowerCase()}`)}
        </span>
      </div>

      <div className="space-y-0.5 text-xs text-slate-400">
        {wallet ? (
          <p className="flex justify-between gap-2">
            <span className="truncate">
              <span className="font-semibold text-slate-200">{wallet.guestName}</span>
              {" · "}
              {wallet.tierNameSnapshot}
              {discountBps ? ` ${discountBps / 100}%` : ""}
              {card ? ` · …${card.cardUid.slice(-4)} ✓` : ""}
              {" "}
              <button
                type="button"
                className="text-slate-300 underline underline-offset-2 hover:text-white"
                onClick={onChangeCard}
              >
                {tr("changeCard")}
              </button>
            </span>
            <span className={Number(wallet.balance) < 0 ? "text-amber-300" : "text-slate-200"}>
              {Number(wallet.balance) < 0
                ? tr("owes", { amount: money(-Number(wallet.balance)) })
                : tr("balance", { amount: money(wallet.balance) })}
            </span>
          </p>
        ) : (
          <p>{tr("noCardYet")}</p>
        )}
        <p className="flex justify-between gap-2">
          <span className="truncate">{timeLine}</span>
          {session.endsAt && !billClosed ? (
            <span
              className={`shrink-0 font-semibold ${
                warning.level === "EXPIRED"
                  ? "text-red-300"
                  : warning.level === "WARNING"
                    ? "text-amber-300"
                    : "text-slate-200"
              }`}
            >
              {warning.level === "EXPIRED"
                ? tr("timeUp")
                : tr("minutesLeft", { count: warning.remainingMinutes })}
            </span>
          ) : null}
        </p>
      </div>

      {promotions.length ? (
        <p className="shrink-0 rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-xs text-emerald-200">
          <span className="font-semibold">{tr("promotionsNow")}</span>{" "}
          {promotions
            .map((promotion) =>
              promotion.discountType === "FREE_TIME"
                ? `${promotion.name} (${tr("freeTimeDeal", {
                    buy: promotion.buyUnits ?? 1,
                    free: promotion.freeUnits ?? 1,
                  })})`
                : promotion.discountType === "PERCENT_OFF"
                  ? `${promotion.name} (${promotion.discountValue}%)`
                  : `${promotion.name} (−${money(promotion.discountValue)})`
            )
            .join(" · ")}
        </p>
      ) : null}

      <section className="min-h-[5rem] flex-1 divide-y divide-slate-800 overflow-y-auto border-y border-slate-800">
        {visibleLines.length === 0 ? (
          <p className="py-3 text-xs text-slate-500">{tr("noLines")}</p>
        ) : (
          visibleLines.map((line) => {
            const quantity = Number(line.quantity || 0);
            const unitPrice = Number(line.unitPrice || 0);
            const total = quantity * unitPrice - Number(line.lineDiscount || 0);
            const isPackage = Boolean(packageVariantIds?.has(line.variantId));
            const isTreatment = line.variantId === room?.rateVariantId || isPackage;
            const isFoc = Boolean(line.compReasonId);
            const editable = !billClosed && !isTreatment;
            return (
              <div key={line.id} className="flex items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium leading-snug">
                    {isFoc ? (
                      <span className="mr-1.5 rounded border border-slate-500 px-1 text-[10px] font-semibold tracking-wide text-slate-300">
                        {tr("foc")}
                      </span>
                    ) : line.appliedPromotionId ? (
                      <span
                        className="mr-1.5 rounded border border-emerald-600 px-1 text-[10px] font-semibold tracking-wide text-emerald-300"
                        title={promotionName(line.appliedPromotionId)}
                      >
                        {tr("promo")}
                      </span>
                    ) : null}
                    {isTreatment && !isPackage
                      ? tr("treatmentCharge")
                      : line.productName || itemNames[line.variantId] || tr("item")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {money(unitPrice)}
                    {line.appliedPromotionId && promotionName(line.appliedPromotionId)
                      ? ` · ${promotionName(line.appliedPromotionId)}`
                      : ""}
                  </p>
                </div>
                {editable && isFoc ? (
                  <span className="shrink-0 text-xs text-slate-400">
                    × {Number(quantity.toFixed(4))}
                  </span>
                ) : editable && prepaid ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-xs text-slate-400">× {Number(quantity.toFixed(4))}</span>
                    <button
                      type="button"
                      aria-label={tr("increase")}
                      className="h-7 w-7 rounded bg-slate-800 text-base disabled:opacity-40"
                      disabled={isBusy}
                      onClick={() => onAddAnother(line)}
                    >
                      +
                    </button>
                  </div>
                ) : editable ? (
                  <div className="flex shrink-0 items-center rounded bg-slate-800">
                    <button
                      type="button"
                      aria-label={tr("decrease")}
                      className="h-7 w-7 text-base disabled:opacity-40"
                      disabled={isBusy}
                      onClick={() => onChangeQuantity(line, -1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs font-semibold">
                      {Number(quantity.toFixed(4))}
                    </span>
                    <button
                      type="button"
                      aria-label={tr("increase")}
                      className="h-7 w-7 text-base disabled:opacity-40"
                      disabled={isBusy}
                      onClick={() => onAddAnother(line)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">
                    × {Number(quantity.toFixed(4))}
                  </span>
                )}
                <span className="w-16 shrink-0 text-right font-semibold">
                  {money(total)}
                  {prepaid && !isFoc ? (
                    <span className="ml-1 text-xs text-slate-500">✓</span>
                  ) : null}
                </span>
                {editable ? (
                  <button
                    type="button"
                    aria-label={prepaid && !isFoc ? tr("refundLine") : tr("removeLine")}
                    className="h-7 w-6 shrink-0 rounded text-slate-500 hover:bg-red-950/60 hover:text-red-300 disabled:opacity-40"
                    disabled={isBusy}
                    onClick={() => onRemoveLine(line)}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {pending.length ? (
        <section className="flex shrink-0 flex-col gap-1 rounded border border-slate-700 bg-slate-900/70 p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tr("newItems")} · {pendingCount}
          </p>
          <div className="max-h-56 divide-y divide-slate-800/70 overflow-y-auto pr-1">
            {pending.map((item) => {
              const deal = item.foc ? undefined : pendingDiscounts[item.variantId];
              const full = item.unitPrice * item.quantity;
              return (
              <div key={pendingKey(item)} className="space-y-1 py-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-medium leading-snug">{item.name}</p>
                  <span className="shrink-0 text-right font-semibold">
                    {item.foc ? (
                      tr("free")
                    ) : deal?.discount ? (
                      <>
                        <span className="mr-1 text-xs font-normal text-slate-500 line-through">
                          {money(full)}
                        </span>
                        {money(full - deal.discount)}
                      </>
                    ) : (
                      money(full)
                    )}
                  </span>
                </div>
                {deal?.discount ? (
                  <p className="text-xs text-emerald-300">
                    {tr("promoSaving", {
                      name: deal.names.join(", "),
                      amount: money(deal.discount),
                    })}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-slate-500">{money(item.unitPrice)}</span>
                  <button
                    type="button"
                    aria-pressed={Boolean(item.foc)}
                    aria-label={tr("focToggle", { name: item.name })}
                    className={`h-7 shrink-0 rounded px-1.5 text-[10px] font-bold ${
                      item.foc
                        ? "border border-slate-200 bg-slate-200 text-slate-900"
                        : "border border-slate-700 text-slate-400"
                    }`}
                    onClick={() => onToggleFoc(pendingKey(item))}
                  >
                    {tr("foc")}
                  </button>
                  <div className="flex shrink-0 items-center rounded bg-slate-800">
                    <button
                      type="button"
                      aria-label={tr("decreaseNew")}
                      className="h-7 w-7 text-base"
                      onClick={() => onPendingChange(pendingKey(item), -1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={tr("increaseNew")}
                      className="h-7 w-7 text-base"
                      onClick={() => onPendingChange(pendingKey(item), 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={tr("removeNew")}
                    className="h-7 w-6 shrink-0 rounded text-slate-500 hover:bg-red-950/60 hover:text-red-300"
                    onClick={() => onPendingChange(pendingKey(item), -item.quantity)}
                  >
                    ✕
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
            <Button variant="secondary" disabled={isBusy} onClick={onClearPending}>
              {tr("clear")}
            </Button>
            <Button disabled={isBusy} onClick={onCommitPending}>
              {freeCount === pendingCount
                ? tr("giveFreeCount", { count: freeCount })
                : freeCount
                  ? tr("addToBillWithFree", {
                      count: pendingCount - freeCount,
                      amount: money(pendingDue),
                      free: freeCount,
                    })
                  : tr("addToBill", {
                      count: pendingCount,
                      amount: money(pendingDue),
                    })}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="shrink-0 space-y-0.5 text-sm">
        <p className="flex justify-between text-slate-300">
          <span>{billClosed ? tr("treatmentCharge") : tr("treatmentSoFar")}</span>
          <span>{money(quote?.treatmentCharge)}</span>
        </p>
        <p className="flex justify-between text-slate-300">
          <span>{tr("servicesCharge")}</span>
          <span>{money(quote?.servicesCharge)}</span>
        </p>
        {prepaid ? (
          <p className="flex justify-between border-t border-slate-800 pt-1.5 text-base font-semibold text-white">
            <span>{tr("paidSoFar")}</span>
            <span>{money(quote?.paidTotal)}</span>
          </p>
        ) : null}
        {!prepaid && discount > 0 ? (
          <p className="flex justify-between text-slate-300">
            <span>{tr("discountLine", { percent: discountBps / 100 })}</span>
            <span>−{money(discount)}</span>
          </p>
        ) : null}
        {!prepaid ? (
          <>
            <p className="flex justify-between pt-1 text-base font-bold">
              <span>{tr("estimatedTotal")}</span>
              <span>{money(estimateCardCharge({ runningTotal, discountBps }))}</span>
            </p>
            <p className="text-[11px] text-slate-500">{tr("taxNote")}</p>
          </>
        ) : null}
      </section>

      {!billClosed ? (
        <div className={`grid shrink-0 gap-2 ${canExtend ? "grid-cols-3" : "grid-cols-2"}`}>
          <Button variant="secondary" disabled={isBusy} onClick={onTogglePause}>
            {isPaused ? tr("resume") : tr("pause")}
          </Button>
          {canExtend ? (
            <Button variant="secondary" disabled={isBusy} onClick={onExtend}>
              {tr("extend")}
            </Button>
          ) : null}
          <Button disabled={isBusy} onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      ) : (
        <p className="rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300">
          {paid ? tr("billPaid") : tr("billClosed")}
        </p>
      )}
    </aside>
  );
}
