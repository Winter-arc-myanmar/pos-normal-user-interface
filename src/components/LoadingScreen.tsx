import { useTranslation } from "react-i18next";

type LoadingScreenProps = {
  badge?: string;
  title?: string;
  subtitle?: string;
};

export function LoadingScreen({
  badge,
  title,
  subtitle,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  const heading = title ?? t("common.loading");
  const description = subtitle ?? t("common.preparingWorkspace");
  return (
    <section
      className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center"
      aria-live="polite"
      aria-busy="true"
    >
      {badge ? (
        <div className="mb-4 rounded-full border border-white/10 bg-[#0c0c0c] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
          {badge}
        </div>
      ) : null}
      <img src="/logo.png" alt="" className="mb-2 h-36 w-36 object-contain" />
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#ff8a1a]" />
      <h1 className="text-xl font-semibold text-white">{heading}</h1>
      <p className="mt-2 max-w-sm text-sm text-[#7ecbff]">{description}</p>
    </section>
  );
}
