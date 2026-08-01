import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { useCustomerManagement } from "@/core/presentation/hooks/useCustomerManagement";

/**
 * Thin example CRUD page for the Customer resource.
 * Follow architecture.md when adding your own resources.
 */
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
    <section className="page">
      <header className="pageHeader">
        <div>
          <h1 className="pageTitle">{t("customers.title")}</h1>
          <p className="pageDescription">{t("customers.description")}</p>
        </div>
        <button
          type="button"
          className="verificationActionButton"
          onClick={refresh}
          disabled={isLoading}
        >
          {isLoading ? t("common.refreshing") : t("common.refresh")}
        </button>
      </header>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="sectionTitle">{t("customers.createTitle")}</h2>
        <form className="authForm" onSubmit={handleCreate}>
          <input
            className="authInput"
            placeholder={t("customers.fields.name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="authInput"
            type="email"
            placeholder={t("customers.fields.email")}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="authInput"
            placeholder={t("customers.fields.phone")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <input
            className="authInput"
            placeholder={t("customers.fields.address")}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
          />
          {(formError || error) && (
            <p className="authError">{formError || error}</p>
          )}
          <button className="btn" type="submit" disabled={isLoading}>
            {t("customers.createSubmit")}
          </button>
        </form>
      </div>

      {isLoading && customers.length === 0 ? (
        <ApiLoadingState label={t("customers.loading")} />
      ) : customers.length === 0 ? (
        <div className="card">
          <p className="muted">{t("customers.empty")}</p>
        </div>
      ) : (
        <div className="card">
          <p className="muted" style={{ marginBottom: 12 }}>
            {t("customers.total", { count: totalCustomers })}
          </p>
          <div className="verificationTableWrap">
            <table className="verificationTable">
              <thead>
                <tr>
                  <th>{t("customers.fields.name")}</th>
                  <th>{t("customers.fields.email")}</th>
                  <th>{t("customers.fields.phone")}</th>
                  <th>{t("customers.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone}</td>
                    <td>
                      <button
                        type="button"
                        className="verificationActionButton subtle"
                        onClick={() => {
                          void deleteCustomer(customer.id).then(refresh);
                        }}
                        disabled={isLoading}
                      >
                        {t("common.delete")}
                      </button>
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
