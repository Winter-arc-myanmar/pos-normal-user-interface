import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { Hostess } from "@/core/domain/entities/Hostess";
import { useWorkingHostesses } from "@/core/presentation/hooks/useWorkingHostesses";
import { useRoomText } from "@/core/presentation/hooks/useRoomText";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Picks the hostess who gives a service. Shows which room each one is in, but
 * lets her be picked anyway: the venue decides, not the till.
 */
export function HostessPicker({
  serviceName,
  onPick,
  onCancel,
}: {
  serviceName: string;
  onPick: (hostess: Hostess) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const tr = useRoomText("ktv");
  const { hostesses, isLoading, error, load } = useWorkingHostesses();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl shadow-black/50">
        <div>
          <h2 className="text-lg font-bold">{tr("whoServes", { service: serviceName })}</h2>
          <p className="mt-1 text-sm text-slate-400">{tr("whoServesHint")}</p>
        </div>
        {isLoading ? <p className="text-sm text-slate-400">{t("common.loading")}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {!isLoading && !error && !hostesses.length ? (
          <p className="text-sm text-slate-400">{tr("noHostesses")}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          {hostesses.map((hostess) => (
            <button
              key={hostess.id}
              type="button"
              onClick={() => onPick(hostess)}
              className="rounded border border-slate-700 bg-slate-900 p-3 text-left hover:border-emerald-500"
            >
              <span className="block font-semibold">{hostess.nickname || hostess.name}</span>
              {hostess.nickname ? (
                <span className="block text-xs text-slate-400">{hostess.name}</span>
              ) : null}
              <span
                className={`mt-1 block text-xs ${hostess.inRoom ? "text-sky-300" : "text-emerald-300"}`}
              >
                {hostess.inRoom
                  ? hostess.inRoom.until
                    ? tr("hostessInRoomUntil", {
                        room: hostess.inRoom.roomNumber,
                        time: clock(hostess.inRoom.until),
                      })
                    : tr("hostessInRoom", { room: hostess.inRoom.roomNumber })
                  : tr("hostessFree")}
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
