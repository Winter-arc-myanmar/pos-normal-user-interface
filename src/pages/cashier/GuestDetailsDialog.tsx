import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { EMPTY_GUEST_DETAILS, type GuestDetails } from "@/lib/pos/guestDetails";

const inputClass =
  "h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-slate-100 focus:border-blue-500 focus:outline-none";

/**
 * Asked when Confirm pay is pressed on a pickup, delivery or take-away sale:
 * the name, location, time and phone the cashier's slip prints. Every box is
 * optional, and Skip pays without any of them.
 */
export function GuestDetailsDialog({
  onContinue,
  onSkip,
}: {
  onContinue: (details: GuestDetails) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [details, setDetails] = useState<GuestDetails>(EMPTY_GUEST_DETAILS);

  const field = (key: keyof GuestDetails) => (
    <label className="block space-y-1">
      <span className="text-slate-300">{t(`cashier.guestDetails.${key}`)}</span>
      <input
        className={inputClass}
        value={details[key]}
        onChange={(event) =>
          setDetails((current) => ({ ...current, [key]: event.target.value }))
        }
        maxLength={120}
        autoFocus={key === "name"}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-details-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5 text-slate-100"
      >
        <div>
          <h2 id="guest-details-title" className="text-lg font-bold">
            {t("cashier.guestDetails.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t("cashier.guestDetails.hint")}</p>
        </div>

        <div className="grid gap-3 min-[480px]:grid-cols-2">
          {field("name")}
          {field("phone")}
          {field("location")}
          {field("time")}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" fullWidth onClick={onSkip}>
            {t("cashier.guestDetails.skip")}
          </Button>
          <Button fullWidth onClick={() => onContinue(details)}>
            {t("cashier.guestDetails.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
