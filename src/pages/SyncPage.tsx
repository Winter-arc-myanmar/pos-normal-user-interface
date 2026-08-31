import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { usePosSync } from "@/core/presentation/hooks/usePosSync";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useDateFormatter } from "@/lib/i18n/formatters";

type SyncCardProps = {
  title: string;
  description: string;
  accent: "green" | "blue" | "orange";
  illustration: ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  lastRunLabel?: string | null;
  isLoading?: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
};

function SettingsIllustration() {
  return (
    <svg viewBox="0 0 120 90" className="mx-auto h-24 w-32" aria-hidden="true">
      <rect x="24" y="24" width="72" height="52" rx="8" fill="#E2E8F0" />
      <rect x="34" y="34" width="52" height="8" rx="4" fill="#CBD5E1" />
      <rect x="34" y="48" width="40" height="8" rx="4" fill="#CBD5E1" />
      <circle cx="88" cy="58" r="18" fill="#22C55E" />
      <path
        d="M88 50 L88 66 M80 58 L96 58"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UploadIllustration() {
  return (
    <svg viewBox="0 0 120 90" className="mx-auto h-24 w-32" aria-hidden="true">
      <rect x="20" y="30" width="44" height="34" rx="6" fill="#E2E8F0" />
      <rect x="56" y="18" width="44" height="46" rx="6" fill="#DBEAFE" />
      <circle cx="78" cy="58" r="18" fill="#3B82F6" />
      <path
        d="M78 66 L78 50 M72 54 L78 48 L84 54"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RestartIllustration() {
  return (
    <svg viewBox="0 0 120 90" className="mx-auto h-24 w-32" aria-hidden="true">
      <rect x="34" y="18" width="52" height="12" rx="4" fill="#E2E8F0" />
      <rect x="34" y="36" width="52" height="12" rx="4" fill="#E2E8F0" />
      <rect x="34" y="54" width="52" height="12" rx="4" fill="#E2E8F0" />
      <circle cx="88" cy="58" r="18" fill="#F97316" />
      <path
        d="M88 50 A8 8 0 1 1 80 58"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M80 50 L80 58 L88 58"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SyncCard({
  title,
  description,
  accent,
  illustration,
  primaryLabel,
  secondaryLabel,
  lastRunLabel,
  isLoading,
  onPrimary,
  onSecondary,
}: SyncCardProps) {
  const accentStyles = {
    green: {
      title: "text-emerald-600",
      primary: "bg-emerald-500 hover:bg-emerald-600 border-emerald-500",
      secondary:
        "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    },
    blue: {
      title: "text-blue-600",
      primary: "bg-blue-500 hover:bg-blue-600 border-blue-500",
      secondary:
        "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    },
    orange: {
      title: "text-orange-500",
      primary: "bg-orange-500 hover:bg-orange-600 border-orange-500",
      secondary:
        "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    },
  }[accent];

  return (
    <article className="flex min-h-[28rem] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-1 flex-col items-center text-center">
        {illustration}
        <h2 className={`mt-4 text-lg font-bold ${accentStyles.title}`}>{title}</h2>
        <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      <div className="mt-6 space-y-2">
        <Button
          fullWidth
          isLoading={isLoading}
          className={accentStyles.primary}
          onClick={onPrimary}
        >
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary ? (
          <Button
            fullWidth
            variant="outline"
            isLoading={isLoading}
            className={accentStyles.secondary}
            onClick={onSecondary}
          >
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
      {lastRunLabel ? (
        <p className="mt-4 text-center text-xs text-slate-400">{lastRunLabel}</p>
      ) : null}
    </article>
  );
}

export function SyncPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormatter();
  const { user } = useAuth();
  const { activeLocationId, activePosRegisterId, activePosSessionId } =
    usePosWorkspace();
  const {
    lastSettingsSyncAt,
    lastItemSyncAt,
    lastOrderUploadAt,
    lastRestartAt,
    isLoading,
    error,
    notice,
    pullLatestSettings,
    pullItemUpdates,
    uploadOrders,
    restartService,
  } = usePosSync({
    tenantId: String(user?.tenantId || ""),
    locationId: activeLocationId,
    posRegisterId: activePosRegisterId,
    posSessionId: activePosSessionId,
  });

  const formatLastRun = (value: string | null) =>
    value
      ? t("sync.lastRun", { time: formatDateTime(value) })
      : t("sync.neverRun");

  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-100 p-4 sm:p-6">
      <header className="mb-6 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">{t("sync.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("sync.subtitle")}</p>
      </header>

      {(error || notice) && (
        <div className="mx-auto mb-4 w-full max-w-6xl space-y-2">
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </p>
          ) : null}
        </div>
      )}

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 md:grid-cols-3">
        <SyncCard
          accent="green"
          title={t("sync.settings.title")}
          description={t("sync.settings.description")}
          illustration={<SettingsIllustration />}
          primaryLabel={t("sync.settings.getUpdates")}
          secondaryLabel={t("sync.settings.itemUpdates")}
          lastRunLabel={formatLastRun(lastSettingsSyncAt || lastItemSyncAt)}
          isLoading={isLoading}
          onPrimary={() => void pullLatestSettings().catch(() => undefined)}
          onSecondary={() => void pullItemUpdates().catch(() => undefined)}
        />
        <SyncCard
          accent="blue"
          title={t("sync.upload.title")}
          description={t("sync.upload.description")}
          illustration={<UploadIllustration />}
          primaryLabel={t("sync.upload.uploadNow")}
          lastRunLabel={formatLastRun(lastOrderUploadAt)}
          isLoading={isLoading}
          onPrimary={() => void uploadOrders().catch(() => undefined)}
        />
        <SyncCard
          accent="orange"
          title={t("sync.restart.title")}
          description={t("sync.restart.description")}
          illustration={<RestartIllustration />}
          primaryLabel={t("sync.restart.restart")}
          lastRunLabel={formatLastRun(lastRestartAt)}
          isLoading={isLoading}
          onPrimary={() => void restartService().catch(() => undefined)}
        />
      </div>
    </section>
  );
}
