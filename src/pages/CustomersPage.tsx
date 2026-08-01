import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { Button } from "@/components/ui/Button";
import { useCustomerManagement } from "@/core/presentation/hooks/useCustomerManagement";

const inputClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-white/10";

export function CustomersPage() {
  const { t } = useTranslation();
  const {
    customers,
    totalCustomers,
    isLoading,
    error,
    getCustomers,
    createCustomer,
    deleteCustomer,
    clearError,
  } = useCustomerManagement();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => {
    clearError();
    void getCustomers({ take: 20, skip: 0 }).catch(() => undefined);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await createCustomer({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      refresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t("customers.createError")
      );
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("customers.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("customers.description")}
          </p>
        </div>
        <Button variant="secondary" isLoading={isLoading} onClick={refresh}>
          {isLoading ? t("common.refreshing") : t("common.refresh")}
        </Button>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t("customers.createTitle")}
        </h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreate}>
          <input
            className={inputClassName}
            placeholder={t("customers.fields.name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className={inputClassName}
            type="email"
            placeholder={t("customers.fields.email")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className={inputClassName}
            placeholder={t("customers.fields.phone")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <input
            className={inputClassName}
            placeholder={t("customers.fields.address")}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
          />
          {(formError || error) && (
            <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {formError || error}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={isLoading}>
              {t("customers.createSubmit")}
            </Button>
          </div>
        </form>
      </div>

      {isLoading && customers.length === 0 ? (
        <ApiLoadingState label={t("customers.loading")} />
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("customers.empty")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {t("customers.total", { count: totalCustomers })}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("customers.fields.name")}</th>
                  <th className="px-4 py-3 font-semibold">{t("customers.fields.email")}</th>
                  <th className="px-4 py-3 font-semibold">{t("customers.fields.phone")}</th>
                  <th className="px-4 py-3 font-semibold">{t("customers.columns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {customers.map((customer) => (
                  <tr key={customer.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3">{customer.name}</td>
                    <td className="px-4 py-3">{customer.email}</td>
                    <td className="px-4 py-3">{customer.phone}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => {
                          void deleteCustomer(customer.id).then(refresh);
                        }}
                      >
                        {t("common.delete")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
