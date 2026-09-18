import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AdjustmentReason } from "@/core/domain/entities/Cashier";

interface OrderAdjustmentsProps {
  discountAmount: string;
  discountReasonId: string;
  discountReasons: AdjustmentReason[];
  serviceCharge: string;
  tipAmount: string;
  memberCardUid: string;
  memberPointsLabel?: string;
  memberCardError?: string | null;
  isMemberCardLoading?: boolean;
  disabled?: boolean;
  onDiscountAmountChange: (value: string) => void;
  onDiscountReasonChange: (value: string) => void;
  onRemoveDiscount: () => void;
  onServiceChargeChange: (value: string) => void;
  onTipAmountChange: (value: string) => void;
  onMemberCardUidChange: (value: string) => void;
  onLookupMemberCard: () => void;
}

export function OrderAdjustments({
  discountAmount,
  discountReasonId,
  discountReasons,
  serviceCharge,
  tipAmount,
  memberCardUid,
  memberPointsLabel,
  memberCardError,
  isMemberCardLoading = false,
  disabled = false,
  onDiscountAmountChange,
  onDiscountReasonChange,
  onRemoveDiscount,
  onServiceChargeChange,
  onTipAmountChange,
  onMemberCardUidChange,
  onLookupMemberCard,
}: OrderAdjustmentsProps) {
  const { t } = useTranslation();
  const hasDiscount = Number(discountAmount) > 0;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {t("cashier.orderPanel.adjustments")}
      </p>
      <label className="block space-y-1">
        <span className="text-xs text-slate-600">
          {t("cashier.orderPanel.discount")}
        </span>
        <input
          inputMode="decimal"
          value={discountAmount}
          disabled={disabled}
          aria-label={t("cashier.orderPanel.discount")}
          onChange={(event) => onDiscountAmountChange(event.target.value)}
          className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      {discountReasons.length ? (
        <select
          value={discountReasonId}
          disabled={disabled}
          aria-label={t("cashier.orderPanel.discountReason")}
          onChange={(event) => onDiscountReasonChange(event.target.value)}
          className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm"
        >
          <option value="">{t("cashier.orderPanel.selectDiscountReason")}</option>
          {discountReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.name}
            </option>
          ))}
        </select>
      ) : null}
      {hasDiscount ? (
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={onRemoveDiscount}
        >
          {t("cashier.orderPanel.removeDiscount")}
        </Button>
      ) : null}
      <label className="block space-y-1">
        <span className="text-xs text-slate-600">
          {t("cashier.orderPanel.extraFee")}
        </span>
        <input
          inputMode="decimal"
          value={serviceCharge}
          disabled={disabled}
          aria-label={t("cashier.orderPanel.extraFee")}
          onChange={(event) => onServiceChargeChange(event.target.value)}
          className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-slate-600">
          {t("cashier.orderPanel.tip")}
        </span>
        <input
          inputMode="decimal"
          value={tipAmount}
          disabled={disabled}
          aria-label={t("cashier.orderPanel.tip")}
          onChange={(event) => onTipAmountChange(event.target.value)}
          className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <div className="space-y-1">
        <span className="text-xs text-slate-600">
          {t("cashier.orderPanel.memberPoints")}
        </span>
        <div className="flex gap-2">
          <input
            value={memberCardUid}
            disabled={disabled || isMemberCardLoading}
            aria-label={t("cashier.orderPanel.memberPoints")}
            placeholder={t("cashier.orderPanel.memberCardUid")}
            onChange={(event) => onMemberCardUidChange(event.target.value)}
            className="min-h-9 w-full rounded border border-slate-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled || isMemberCardLoading || !memberCardUid.trim()}
            isLoading={isMemberCardLoading}
            onClick={onLookupMemberCard}
          >
            {t("cashier.orderPanel.lookupCard")}
          </Button>
        </div>
        {memberPointsLabel ? (
          <p className="text-xs font-medium text-slate-700">{memberPointsLabel}</p>
        ) : null}
        {memberCardError ? (
          <p className="text-xs text-red-700">{memberCardError}</p>
        ) : null}
      </div>
    </div>
  );
}
