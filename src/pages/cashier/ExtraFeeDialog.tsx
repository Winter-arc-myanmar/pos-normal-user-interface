import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { ChosenFee, ExtraFee } from "@/core/domain/entities/ExtraFee";
import { formatPosMoney } from "@/lib/pos/orderListDisplay";

interface ExtraFeeDialogProps {
  fees: ExtraFee[];
  isBusy?: boolean;
  onConfirm: (fee: ChosenFee) => void;
  onClose: () => void;
}

const tileClass =
  "min-h-14 rounded-md border px-2 py-2 text-left text-sm font-semibold transition";
const inputClass =
  "h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-slate-100 focus:border-blue-500 focus:outline-none";

/** The cashier picks a fee, may change its amount and quantity, and names "Other". */
export function ExtraFeeDialog({
  fees,
  isBusy = false,
  onConfirm,
  onClose,
}: ExtraFeeDialogProps) {
  const { t } = useTranslation();
  const offered = fees.filter((fee) => fee.isActive);
  const [chosen, setChosen] = useState<ExtraFee | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const choose = (fee: ExtraFee) => {
    setChosen(fee);
    setName(fee.isOther ? "" : fee.name);
    setAmount(fee.isOther ? "" : String(fee.amount));
    setQuantity(1);
    setError(null);
  };

  const confirm = () => {
    if (!chosen) return;
    const value = Number(amount);
    if (chosen.isOther && !name.trim()) {
      setError(t("cashier.extraFee.nameRequired"));
      return;
    }
    if (amount.trim() === "" || !Number.isFinite(value) || value < 0) {
      setError(t("cashier.extraFee.amountRequired"));
      return;
    }
    onConfirm({
      variantId: chosen.variantId,
      name: name.trim() || chosen.name,
      unitPrice: value,
      quantity,
    });
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="extra-fee-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5 text-slate-100"
      >
        <div>
          <h2 id="extra-fee-title" className="text-lg font-bold">
            {t("cashier.extraFee.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t("cashier.extraFee.hint")}</p>
        </div>

        {offered.length ? (
          <div className="grid grid-cols-2 gap-2 min-[500px]:grid-cols-3">
            {offered.map((fee) => (
              <button
                key={fee.id}
                type="button"
                disabled={isBusy}
                aria-pressed={chosen?.id === fee.id}
                onClick={() => choose(fee)}
                className={[
                  tileClass,
                  chosen?.id === fee.id
                    ? "border-blue-500 bg-blue-600/20"
                    : "border-slate-700 bg-slate-900 hover:border-blue-500",
                ].join(" ")}
              >
                {fee.isOther ? t("cashier.extraFee.other") : fee.name}
                <span className="block text-[10px] font-normal text-slate-400">
                  {fee.isOther
                    ? t("cashier.extraFee.typeIt")
                    : formatPosMoney(fee.amount)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t("cashier.extraFee.none")}</p>
        )}

        {chosen ? (
          <section className="space-y-3 rounded border border-slate-800 bg-slate-900/60 p-3 text-sm">
            {chosen.isOther ? (
              <label className="block space-y-1">
                <span className="text-slate-300">{t("cashier.extraFee.name")}</span>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("cashier.extraFee.namePlaceholder")}
                  maxLength={255}
                  autoFocus
                />
              </label>
            ) : null}
            <div className="flex items-end gap-3">
              <label className="block flex-1 space-y-1">
                <span className="text-slate-300">{t("cashier.extraFee.amount")}</span>
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  autoFocus={!chosen.isOther}
                />
              </label>
              <div className="space-y-1">
                <span className="block text-slate-300">{t("cashier.extraFee.quantity")}</span>
                <div className="flex h-11 items-center gap-1">
                  <button
                    type="button"
                    className="h-11 w-11 rounded-md border border-slate-700 bg-slate-900 text-lg disabled:opacity-40"
                    aria-label={t("cashier.orderPanel.decreaseQuantity")}
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  >
                    −
                  </button>
                  <span className="w-8 text-center tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    className="h-11 w-11 rounded-md border border-slate-700 bg-slate-900 text-lg"
                    aria-label={t("cashier.orderPanel.increaseQuantity")}
                    onClick={() => setQuantity((value) => value + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button fullWidth isLoading={isBusy} onClick={confirm}>
              {t("cashier.extraFee.add")}
            </Button>
          </section>
        ) : null}

        <Button variant="outline" fullWidth disabled={isBusy} onClick={onClose}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
