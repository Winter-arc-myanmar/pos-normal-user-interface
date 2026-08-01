import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-start justify-center px-4">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        {t("notFound.title")}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {t("notFound.description")}
      </p>
      <Link className="mt-6" to="/dashboard">
        <Button variant="secondary">{t("notFound.goToDashboard")}</Button>
      </Link>
    </section>
  );
}
