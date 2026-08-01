import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MetricCard } from "@/components/ui/MetricCard";

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <section className="page">
      <header className="pageHeader">
        <div>
          <h1 className="pageTitle">{t("dashboard.title")}</h1>
          <p className="pageDescription">{t("dashboard.description")}</p>
        </div>
      </header>

      <div className="metricGrid">
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

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="sectionTitle">{t("dashboard.nextStepsTitle")}</h2>
        <p className="sectionDescription">{t("dashboard.nextStepsText")}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Link className="btn" to="/users">
            {t("dashboard.openUsers")}
          </Link>
          <Link className="btn" to="/customers">
            {t("dashboard.openCustomers")}
          </Link>
        </div>
      </div>
    </section>
  );
}
