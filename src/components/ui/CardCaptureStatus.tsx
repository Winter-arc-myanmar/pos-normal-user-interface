import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

export function CardCaptureStatus({
  nfcSupported,
  nfcActive,
  nfcError,
  lastUid,
  onEnableNfc,
  variant = "dark",
}: {
  nfcSupported: boolean;
  nfcActive: boolean;
  nfcError: string | null;
  lastUid?: string;
  onEnableNfc: () => void;
  variant?: "dark" | "light";
}) {
  const { t } = useTranslation();
  const dark = variant === "dark";

  return (
    <div
      className={[
        "flex flex-col items-stretch gap-2 rounded-lg border px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between",
        dark
          ? "border-slate-800 bg-slate-900 text-slate-300"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium">
          {nfcActive ? t("crm.nfcListening") : t("crm.readerListening")}
        </p>
        {lastUid ? (
          <p className="break-all text-[11px] opacity-80">
            {t("crm.cardCaptured", { uid: lastUid })}
          </p>
        ) : nfcError && nfcSupported ? (
          <p className="text-[11px] text-amber-500">{nfcError}</p>
        ) : !nfcSupported ? (
          <p className="text-[11px] opacity-70">{t("crm.nfcUnsupported")}</p>
        ) : null}
      </div>
      {nfcSupported && !nfcActive ? (
        <Button
          size="sm"
          variant="secondary"
          type="button"
          className="w-full shrink-0 sm:w-auto"
          onClick={onEnableNfc}
        >
          {t("crm.nfcEnable")}
        </Button>
      ) : null}
    </div>
  );
}
