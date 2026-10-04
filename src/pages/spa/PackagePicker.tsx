import type { SpaPackage } from "@/core/domain/entities/Spa";
import type { PromotionDiscount } from "@/core/domain/entities/Promotion";
import type { RoomKind } from "@/core/presentation/hooks/useRoomPos";
import { useRoomText } from "@/core/presentation/hooks/useRoomText";
import { PackageChoice } from "@/lib/spa/packages";

const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Service packages with a count each: what a SPA guest books, or adds to stay longer. */
export function PackagePicker({
  kind,
  packages,
  choice,
  discounts,
  onChange,
}: {
  kind: RoomKind;
  packages: SpaPackage[];
  choice: PackageChoice;
  discounts: Record<string, PromotionDiscount>;
  onChange: (packageId: string, delta: number) => void;
}) {
  const tr = useRoomText(kind);
  if (!packages.length) {
    return <p className="text-sm text-slate-400">{tr("noPackages")}</p>;
  }
  return (
    <div className="max-h-72 divide-y divide-slate-800 overflow-y-auto rounded border border-slate-800">
      {packages.map((item) => {
        const count = choice[item.id] || 0;
        const deal = count ? discounts[item.variantId] : undefined;
        return (
          <div key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium leading-snug">{item.name}</p>
              <p className="text-xs text-slate-400">
                {tr("packageMeta", { minutes: item.durationMinutes, price: money(item.price) })}
                {item.items.length
                  ? ` · ${tr("packageIncludes", {
                      items: item.items.map((i) => `${i.quantity} × ${i.name}`).join(", "),
                    })}`
                  : ""}
              </p>
              {deal?.discount ? (
                <p className="text-xs text-emerald-300">
                  {tr("promoSaving", { name: deal.names.join(", "), amount: money(deal.discount) })}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center rounded bg-slate-800">
              <button
                type="button"
                aria-label={tr("fewerOf", { name: item.name })}
                className="h-9 w-9 text-lg disabled:opacity-40"
                disabled={!count}
                onClick={() => onChange(item.id, -1)}
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{count}</span>
              <button
                type="button"
                aria-label={tr("moreOf", { name: item.name })}
                className="h-9 w-9 text-lg"
                onClick={() => onChange(item.id, 1)}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
