import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  CreateCustomerDTO,
  CreateCustomerInteractionDTO,
} from "@/core/application/dtos/CustomerDTO";
import { Customer } from "@/core/domain/entities/Customer";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCustomerManagement } from "@/core/presentation/hooks/useCustomerManagement";
import { useDateFormatter } from "@/lib/i18n/formatters";

const PAGE_SIZE = 6;

const fieldClass =
  "min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500";

const emptyCustomerForm = {
  name: "",
  phone: "",
  email: "",
  accountType: "RETAIL",
  hasCreditAccount: false,
  maxCreditLimit: "0.0000",
  paymentTermsDays: "0",
  loyaltyTier: "BRONZE",
};

const emptyInteractionForm = {
  interactionChannel: "EMAIL",
  interactionType: "INQUIRY",
  summary: "",
  detailedNotes: "",
};

const keyboardRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function MemberEmptyIllustration() {
  return (
    <svg
      viewBox="0 0 160 110"
      className="mx-auto h-28 w-40 text-slate-300"
      aria-hidden="true"
    >
      <rect x="18" y="28" width="52" height="64" rx="8" fill="currentColor" opacity="0.28" />
      <circle cx="44" cy="48" r="10" fill="currentColor" opacity="0.45" />
      <rect x="30" y="64" width="28" height="16" rx="8" fill="currentColor" opacity="0.4" />
      <rect x="86" y="18" width="56" height="72" rx="8" fill="currentColor" opacity="0.22" />
      <circle cx="114" cy="42" r="11" fill="currentColor" opacity="0.4" />
      <rect x="98" y="60" width="32" height="18" rx="9" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function PosKeyboard({
  onInput,
  onBackspace,
  onEnter,
}: {
  onInput: (value: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}) {
  const [shifted, setShifted] = useState(false);

  const press = (value: string) => {
    onInput(shifted ? value.toUpperCase() : value);
    if (shifted) setShifted(false);
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-[#111111] p-2">
      {keyboardRows.map((row, index) => (
        <div key={row.join("")} className="mb-1 flex justify-center gap-1">
          {index === 3 ? (
            <button
              type="button"
              className="min-h-10 min-w-14 rounded bg-slate-800 px-2 text-xs font-semibold text-slate-200"
              onClick={() => setShifted((current) => !current)}
            >
              shift
            </button>
          ) : null}
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className="min-h-10 min-w-8 rounded bg-slate-700 px-2 text-sm font-semibold text-white hover:bg-slate-600"
              onClick={() => press(key)}
            >
              {shifted ? key.toUpperCase() : key}
            </button>
          ))}
          {index === 3 ? (
            <button
              type="button"
              className="min-h-10 min-w-16 rounded bg-slate-800 px-2 text-xs font-semibold text-slate-200"
              onClick={onBackspace}
            >
              ⌫
            </button>
          ) : null}
        </div>
      ))}
      <div className="flex justify-center gap-1">
        <button
          type="button"
          className="min-h-10 min-w-10 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput("@")}
        >
          @
        </button>
        <button
          type="button"
          className="min-h-10 min-w-10 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput(".")}
        >
          .
        </button>
        <button
          type="button"
          className="min-h-10 min-w-10 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput("/")}
        >
          /
        </button>
        <button
          type="button"
          className="min-h-10 flex-1 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput(" ")}
        >
          space
        </button>
        <button
          type="button"
          className="min-h-10 min-w-16 rounded bg-blue-600 px-3 text-sm font-semibold text-white"
          onClick={onEnter}
        >
          ↵
        </button>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormatter();
  const { user } = useAuth();
  const {
    customers,
    page,
    totalPages,
    currentCustomer,
    interactions,
    isLoading,
    error,
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getInteractionsForCustomer,
    createCustomerInteraction,
    deleteCustomerInteraction,
    clearCurrentCustomer,
  } = useCustomerManagement();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(emptyCustomerForm);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState(emptyInteractionForm);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tenantId = String(user?.tenantId || "");
  const agentId = String(user?.id || "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void getCustomers({
      page: currentPage,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }).catch(() => undefined);
  }, [currentPage, debouncedSearch, getCustomers]);

  const selectedCustomer = currentCustomer;

  const creditLabel = useMemo(() => {
    if (!selectedCustomer) return "";
    return selectedCustomer.hasCreditAccount
      ? t("crm.creditOn")
      : t("crm.creditOff");
  }, [selectedCustomer, t]);

  const openCreateForm = () => {
    setEditing(null);
    setForm(emptyCustomerForm);
    setIsFormOpen(true);
    setLocalError(null);
  };

  const openEditForm = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      accountType: customer.accountType || "RETAIL",
      hasCreditAccount: customer.hasCreditAccount,
      maxCreditLimit: customer.maxCreditLimit || "0.0000",
      paymentTermsDays: String(customer.paymentTermsDays || 0),
      loyaltyTier: customer.loyaltyTier || "BRONZE",
    });
    setIsFormOpen(true);
    setLocalError(null);
  };

  const handleSelect = async (customer: Customer) => {
    setLocalError(null);
    setNotice(null);
    try {
      await getCustomerById(customer.id);
      await getInteractionsForCustomer(customer.id, {
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.loadFailed")
      );
    }
  };

  const handleSubmitCustomer = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    try {
      if (!tenantId) {
        throw new Error(t("cashier.errors.missingTenant"));
      }
      const payload: CreateCustomerDTO = {
        name: form.name.trim(),
        tenantId,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        accountType: form.accountType,
        hasCreditAccount: form.hasCreditAccount,
        maxCreditLimit: form.maxCreditLimit,
        paymentTermsDays: Number(form.paymentTermsDays) || 0,
        loyaltyTier: form.loyaltyTier,
      };
      const saved = editing
        ? await updateCustomer(editing.id, payload)
        : await createCustomer(payload);
      setIsFormOpen(false);
      setNotice(editing ? t("crm.updated") : t("crm.created"));
      await getCustomers({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      await handleSelect(saved);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.saveFailed")
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setLocalError(null);
    try {
      await deleteCustomer(selectedCustomer.id);
      clearCurrentCustomer();
      setNotice(t("crm.deleted"));
      await getCustomers({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.deleteFailed")
      );
    }
  };

  const handleCreateInteraction = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCustomer) return;
    setLocalError(null);
    try {
      const payload: CreateCustomerInteractionDTO = {
        tenantId,
        agentId: agentId || undefined,
        interactionChannel: interactionForm.interactionChannel,
        interactionType: interactionForm.interactionType,
        summary: interactionForm.summary.trim(),
        detailedNotes: interactionForm.detailedNotes.trim() || undefined,
      };
      await createCustomerInteraction(selectedCustomer.id, payload);
      setInteractionForm(emptyInteractionForm);
      setNotice(t("crm.interactionCreated"));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.interactionFailed")
      );
    }
  };

  const typeSearch = (value: string) => {
    setSearch((current) => current + value);
  };

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] overflow-hidden bg-slate-100">
      <aside className="flex min-h-0 flex-col bg-white">
        {(error || localError) && (
          <p className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {localError || error}
          </p>
        )}
        {notice ? (
          <p className="m-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        {!selectedCustomer ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MemberEmptyIllustration />
            <p className="mt-4 text-sm text-slate-500">{t("crm.selectMember")}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {initials(selectedCustomer.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEditForm(selectedCustomer)}>
                  {t("crm.edit")}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void handleDelete()}>
                  {t("common.delete")}
                </Button>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {t("crm.email")}
                </dt>
                <dd className="mt-1 text-sm">{selectedCustomer.email || "—"}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {t("crm.accountType")}
                </dt>
                <dd className="mt-1 text-sm">{selectedCustomer.accountType}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {t("crm.loyaltyTier")}
                </dt>
                <dd className="mt-1 text-sm">{selectedCustomer.loyaltyTier}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {t("crm.points")}
                </dt>
                <dd className="mt-1 text-sm">
                  {selectedCustomer.lifetimePointsEarned}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {t("crm.credit")}
                </dt>
                <dd className="mt-1 text-sm">
                  {creditLabel} · {selectedCustomer.currentCreditBalance} /{" "}
                  {selectedCustomer.maxCreditLimit}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {t("crm.terms")}
                </dt>
                <dd className="mt-1 text-sm">
                  {t("crm.termsDays", { days: selectedCustomer.paymentTermsDays })}
                </dd>
              </div>
            </dl>

            <section className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("crm.interactions")}
              </h3>
              <form className="mt-3 space-y-2" onSubmit={handleCreateInteraction}>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label={t("crm.channel")}
                    className={fieldClass}
                    value={interactionForm.interactionChannel}
                    onChange={(event) =>
                      setInteractionForm((current) => ({
                        ...current,
                        interactionChannel: event.target.value,
                      }))
                    }
                  >
                    <option value="EMAIL">EMAIL</option>
                    <option value="PHONE">PHONE</option>
                    <option value="IN_PERSON">IN_PERSON</option>
                    <option value="SMS">SMS</option>
                  </select>
                  <select
                    aria-label={t("crm.interactionType")}
                    className={fieldClass}
                    value={interactionForm.interactionType}
                    onChange={(event) =>
                      setInteractionForm((current) => ({
                        ...current,
                        interactionType: event.target.value,
                      }))
                    }
                  >
                    <option value="INQUIRY">INQUIRY</option>
                    <option value="COMPLAINT">COMPLAINT</option>
                    <option value="FOLLOW_UP">FOLLOW_UP</option>
                    <option value="NOTE">NOTE</option>
                  </select>
                </div>
                <input
                  required
                  aria-label={t("crm.summary")}
                  placeholder={t("crm.summary")}
                  className={fieldClass}
                  value={interactionForm.summary}
                  onChange={(event) =>
                    setInteractionForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                />
                <textarea
                  aria-label={t("crm.notes")}
                  placeholder={t("crm.notes")}
                  className={`${fieldClass} min-h-20 py-2`}
                  value={interactionForm.detailedNotes}
                  onChange={(event) =>
                    setInteractionForm((current) => ({
                      ...current,
                      detailedNotes: event.target.value,
                    }))
                  }
                />
                <Button type="submit" size="sm" isLoading={isLoading}>
                  {t("crm.addInteraction")}
                </Button>
              </form>

              <ul className="mt-4 space-y-2">
                {interactions.length === 0 ? (
                  <li className="text-sm text-slate-500">{t("crm.noInteractions")}</li>
                ) : (
                  interactions.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.summary}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.interactionType} · {item.interactionChannel} ·{" "}
                            {formatDateTime(item.interactionDate)}
                          </p>
                          {item.detailedNotes ? (
                            <p className="mt-2 text-sm text-slate-600">
                              {item.detailedNotes}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void deleteCustomerInteraction(
                              selectedCustomer.id,
                              item.id
                            )
                          }
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        )}
      </aside>

      <main className="flex min-h-0 flex-col bg-slate-950 p-4 text-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput
              aria-label={t("crm.search")}
              placeholder={t("crm.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
            />
          </div>
          <Button
            aria-label={t("crm.addCustomer")}
            onClick={openCreateForm}
            className="h-10 w-10 min-h-10 px-0"
          >
            +
          </Button>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto">
          {customers.length === 0 ? (
            <p className="col-span-2 py-8 text-center text-sm text-slate-400">
              {isLoading ? t("crm.loading") : t("crm.empty")}
            </p>
          ) : (
            customers.map((customer) => {
              const isSelected = selectedCustomer?.id === customer.id;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => void handleSelect(customer)}
                  className={[
                    "rounded-lg border bg-white p-3 text-left text-slate-900 transition",
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-transparent hover:border-blue-300",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {initials(customer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate font-semibold">{customer.name}</p>
                        {customer.hasCreditAccount ? (
                          <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">
                            ✓
                          </span>
                        ) : null}
                        <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold uppercase text-amber-700">
                          {customer.loyaltyTier}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {customer.phone || "—"}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {customer.email || "—"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-sm text-slate-200">
          <button
            type="button"
            className="min-h-10 min-w-10 rounded bg-slate-800 disabled:opacity-40"
            disabled={page <= 1 || isLoading}
            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
            aria-label={t("crm.prevPage")}
          >
            ‹
          </button>
          <span>
            {page} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            className="min-h-10 min-w-10 rounded bg-slate-800 disabled:opacity-40"
            disabled={page >= totalPages || isLoading}
            onClick={() =>
              setCurrentPage((current) => Math.min(totalPages, current + 1))
            }
            aria-label={t("crm.nextPage")}
          >
            ›
          </button>
        </div>

        <PosKeyboard
          onInput={typeSearch}
          onBackspace={() => setSearch((current) => current.slice(0, -1))}
          onEnter={() => setDebouncedSearch(search.trim())}
        />
      </main>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmitCustomer}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">
              {editing ? t("crm.editCustomer") : t("crm.addCustomer")}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                required
                aria-label={t("crm.name")}
                placeholder={t("crm.name")}
                className={fieldClass}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                aria-label={t("crm.phone")}
                placeholder={t("crm.phone")}
                className={fieldClass}
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
              <input
                type="email"
                aria-label={t("crm.email")}
                placeholder={t("crm.email")}
                className={fieldClass}
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  {t("crm.accountType")}
                  <select
                    aria-label={t("crm.accountType")}
                    className={`${fieldClass} mt-1`}
                    value={form.accountType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accountType: event.target.value,
                      }))
                    }
                  >
                    <option value="RETAIL">RETAIL</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  {t("crm.loyaltyTier")}
                  <select
                    aria-label={t("crm.loyaltyTier")}
                    className={`${fieldClass} mt-1`}
                    value={form.loyaltyTier}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        loyaltyTier: event.target.value,
                      }))
                    }
                  >
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.hasCreditAccount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      hasCreditAccount: event.target.checked,
                    }))
                  }
                />
                {t("crm.creditOn")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  {t("crm.maxCredit")}
                  <input
                    aria-label={t("crm.maxCredit")}
                    className={`${fieldClass} mt-1`}
                    value={form.maxCreditLimit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxCreditLimit: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  {t("crm.terms")}
                  <input
                    aria-label={t("crm.terms")}
                    type="number"
                    min={0}
                    className={`${fieldClass} mt-1`}
                    value={form.paymentTermsDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paymentTermsDays: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button fullWidth type="submit" isLoading={isLoading}>
                  {editing ? t("common.save") : t("crm.addCustomer")}
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
