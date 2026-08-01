type LoadingScreenProps = {
  badge?: string;
  title?: string;
  subtitle?: string;
};

export function LoadingScreen({
  badge,
  title = "Loading...",
  subtitle = "Preparing your workspace.",
}: LoadingScreenProps) {
  return (
    <section
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950"
      aria-live="polite"
      aria-busy="true"
    >
      {badge ? (
        <div className="mb-4 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {badge}
        </div>
      ) : null}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white dark:bg-white dark:text-slate-900">
        A
      </div>
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </section>
  );
}
