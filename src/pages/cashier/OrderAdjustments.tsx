import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AdjustmentReason } from "@/core/domain/entities/Cashier";
import { formatPosMoney } from "@/lib/pos/orderListDisplay";

interface OrderAdjustmentsProps {
  discountAmount: string;
  discountReasonId: string;
  discountReasons: AdjustmentReason[];
  serviceCharge: string;
  tipAmount: string;
  /** Member points are a cashier concept; a room bill simply omits them. */
  memberCardUid?: string;
  memberPointsLabel?: string;
  memberCardError?: string | null;
  isMemberCardLoading?: boolean;
  disabled?: boolean;
  onDiscountAmountChange: (value: string) => void;
  onDiscountReasonChange: (value: string) => void;
  onRemoveDiscount: () => void;
  onTipAmountChange: (value: string) => void;
  onMemberCardUidChange?: (value: string) => void;
  onLookupMemberCard?: () => void;
}

// No amount shows as an empty box: typing 5000 after "0.0000" made it 0.00005000.
const shownAmount = (value: string) => (value === "0.0000" ? "" : value);

const inputClass =
  "min-h-11 w-full min-w-0 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none disabled:opacity-50";

export function OrderAdjustments({
  discountAmount,
  discountReasonId,
  discountReasons,
  serviceCharge,
  tipAmount,
  memberCardUid = "",
  memberPointsLabel,
  memberCardError,
  isMemberCardLoading = false,
  disabled = false,
  onDiscountAmountChange,
  onDiscountReasonChange,
  onRemoveDiscount,
  onTipAmountChange,
  onMemberCardUidChange,
  onLookupMemberCard,
}: OrderAdjustmentsProps) {
  const { t } = useTranslation();
  const hasDiscount = Number(discountAmount) > 0;

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs text-slate-300">
            {t("cashier.orderPanel.discount")}
          </span>
          <input
            inputMode="decimal"
            value={shownAmount(discountAmount)}
            placeholder="0"
            disabled={disabled}
            aria-label={t("cashier.orderPanel.discount")}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => onDiscountAmountChange(event.target.value)}
            className={inputClass}
          />
        </label>
        {discountReasons.length ? (
          <label className="block space-y-1">
            <span className="text-xs text-slate-300">
              {t("cashier.orderPanel.discountReason")}
            </span>
            <select
              value={discountReasonId}
              disabled={disabled}
              aria-label={t("cashier.orderPanel.discountReason")}
              onChange={(event) => onDiscountReasonChange(event.target.value)}
              className={inputClass}
            >
              <option value="">{t("cashier.orderPanel.selectDiscountReason")}</option>
              {discountReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {hasDiscount ? (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onRemoveDiscount}
        >
          {t("cashier.orderPanel.removeDiscount")}
        </Button>
      ) : null}
      {Number(serviceCharge) > 0 ? (
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>{t("cashier.orderPanel.serviceCharge")}</span>
          <span className="font-medium tabular-nums text-slate-100">{formatPosMoney(serviceCharge)}</span>
        </div>
      ) : null}
      <label className="block space-y-1">
        <span className="text-xs text-slate-300">
          {t("cashier.orderPanel.tip")}
        </span>
        <input
          inputMode="decimal"
          value={shownAmount(tipAmount)}
          placeholder="0"
          disabled={disabled}
          aria-label={t("cashier.orderPanel.tip")}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onTipAmountChange(event.target.value)}
          className={inputClass}
        />
      </label>
      {onMemberCardUidChange && onLookupMemberCard ? (
        <div className="space-y-1">
          <span className="text-xs text-slate-300">
            {t("cashier.orderPanel.memberPoints")}
          </span>
          <div className="flex gap-2">
            <input
              value={memberCardUid}
              disabled={disabled || isMemberCardLoading}
              aria-label={t("cashier.orderPanel.memberPoints")}
              placeholder={t("cashier.orderPanel.memberCardUid")}
              onChange={(event) => onMemberCardUidChange(event.target.value)}
              className={inputClass}
            />
            <Button
              variant="outline"
              className="shrink-0"
              disabled={disabled || isMemberCardLoading || !memberCardUid.trim()}
              isLoading={isMemberCardLoading}
              onClick={() => onLookupMemberCard()}
            >
              {t("cashier.orderPanel.lookupCard")}
            </Button>
          </div>
          {memberPointsLabel ? (
            <p className="text-xs font-medium text-slate-200">{memberPointsLabel}</p>
          ) : null}
          {memberCardError ? (
            <p className="text-xs text-red-400">{memberCardError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
