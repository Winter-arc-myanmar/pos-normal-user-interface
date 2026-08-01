import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("dashboard.description")}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          title={t("dashboard.usersCard")}
          value={t("dashboard.exampleValue")}
          subtitle={t("dashboard.usersHint")}
        />
        <MetricCard
          title={t("dashboard.customersCard")}
          value={t("dashboard.exampleValue")}
          subtitle={t("dashboard.customersHint")}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t("dashboard.nextStepsTitle")}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("dashboard.nextStepsText")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/users">
            <Button variant="secondary">{t("dashboard.openUsers")}</Button>
          </Link>
          <Link to="/customers">
            <Button>{t("dashboard.openCustomers")}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
