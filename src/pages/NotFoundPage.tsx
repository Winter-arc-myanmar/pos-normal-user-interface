import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="page">
      <h1 className="pageTitle">{t("notFound.title")}</h1>
      <p className="muted">{t("notFound.description")}</p>
      <div style={{ marginTop: 16 }}>
        <Link to="/dashboard" className="link">
          {t("notFound.goToDashboard")}
        </Link>
      </div>
    </section>
  );
}

