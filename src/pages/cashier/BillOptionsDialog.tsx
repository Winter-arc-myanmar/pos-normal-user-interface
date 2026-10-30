import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

interface BillOptionsDialogProps {
  title: string;
  bill?: ReactNode;
  table?: ReactNode;
  tableTitle?: string;
  onClose: () => void;
}

/** What is set on the bill as a whole (discount, tip, member card) and on its table. */
export function BillOptionsDialog({
  title,
  bill,
  table,
  tableTitle,
  onClose,
}: BillOptionsDialogProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-options-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5 text-slate-100"
      >
        <h2 id="bill-options-title" className="text-lg font-bold">
          {title}
        </h2>
        {bill ? (
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t("cashier.billOptions.bill")}
            </h3>
            {bill}
          </section>
        ) : null}
        {table ? (
          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {tableTitle}
            </h3>
            {table}
          </section>
        ) : null}
        <Button fullWidth onClick={onClose}>
          {t("cashier.billOptions.done")}
        </Button>
      </div>
    </div>
  );
}
