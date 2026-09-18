import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  CreateTipPoolDTO,
  TipPoolAllocationDTO,
  TipPoolStatus,
} from "@/core/application/dtos/CashierDTO";
import {
  TipPool,
  TipPoolAllocation,
} from "@/core/domain/entities/Cashier";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import { useUserManagement } from "@/core/presentation/hooks/useUserManagement";
import {
  TIP_POOL_ROLE,
  TipPoolAllocationFieldErrors,
  TipPoolAllocationForm,
  validateTipPoolAllocationForm,
} from "@/lib/pos/tipPoolAllocation";

const fieldClass =
  "min-h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500";

const emptyPoolForm = {
  name: "",
  periodStart: "",
  periodEnd: "",
  distributionMethod: "BY_HOURS",
  includeServiceCharge: false,
  serviceChargeShareBps: "0",
  notes: "",
};

const emptyAllocationForm: TipPoolAllocationForm = {
  userId: "",
  role: TIP_POOL_ROLE,
  hoursWorked: "8",
  weight: "1",
  amount: "0",
  notes: "",
};

const toLocalDateTime = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export function TipPoolsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    tipPools,
    tipPoolAllocations,
    isLoading,
    error,
    fetchTipPools,
    getTipPoolById,
    createTipPool,
    updateTipPool,
    distributeTipPool,
    settleTipPool,
    fetchTipPoolAllocations,
    createTipPoolAllocation,
    updateTipPoolAllocation,
    deleteTipPoolAllocation,
    activeLocationId,
    fetchInventoryLocations,
  } = useCashier();
  const { users, loadUsers } = useUserManagement();
  const [status, setStatus] = useState<"ALL" | TipPoolStatus>("ALL");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [poolDetail, setPoolDetail] = useState<TipPool | null>(null);
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [editingPool, setEditingPool] = useState(false);
  const [allocationForm, setAllocationForm] = useState(emptyAllocationForm);
  const [allocationErrors, setAllocationErrors] =
    useState<TipPoolAllocationFieldErrors>({});
  const [editingAllocation, setEditingAllocation] =
    useState<TipPoolAllocation | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tenantId = String(user?.tenantId || "");
  const locationId = activeLocationId;

  useEffect(() => {
    if (!tenantId) return;
    void fetchInventoryLocations(tenantId);
  }, [fetchInventoryLocations, tenantId]);

  useEffect(() => {
    void loadUsers({ take: 100, skip: 0 }).catch(() => undefined);
  }, [loadUsers]);

  useEffect(() => {
    if (!locationId) return;
    void fetchTipPools({
      page: 1,
      limit: 100,
      locationId,
      status: status === "ALL" ? undefined : status,
    }).catch(() => undefined);
  }, [fetchTipPools, locationId, status]);

  const visiblePools = useMemo(
    () =>
      status === "ALL"
        ? tipPools
        : tipPools.filter((pool) => pool.status === status),
    [status, tipPools]
  );

  const staffNameById = useMemo(
    () =>
      new Map(
        users.map((staff) => [
          staff.id,
          String(staff.nickname || staff.name || staff.email || staff.id),
        ])
      ),
    [users]
  );

  const roleOptions = useMemo(() => {
    const roles = new Set<string>([TIP_POOL_ROLE]);
    if (allocationForm.role) roles.add(allocationForm.role);
    for (const allocation of tipPoolAllocations) {
      if (allocation.role) roles.add(allocation.role);
    }
    for (const staff of users) {
      for (const access of staff.branchAccess || []) {
        for (const role of access.roles || []) {
          if (role) roles.add(String(role).toUpperCase());
        }
      }
    }
    return [...roles];
  }, [allocationForm.role, tipPoolAllocations, users]);

  const selectPool = async (poolId: string) => {
    setSelectedPoolId(poolId);
    setLocalError(null);
    try {
      const detail = await getTipPoolById(poolId);
      setPoolDetail(detail);
      await fetchTipPoolAllocations(poolId);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.tipPool.loadFailed")
      );
    }
  };

  const resetPoolForm = () => {
    setPoolForm(emptyPoolForm);
    setEditingPool(false);
  };

  const beginPoolEdit = (pool: TipPool) => {
    setEditingPool(true);
    setPoolForm({
      name: pool.name,
      periodStart: toLocalDateTime(pool.periodStart),
      periodEnd: toLocalDateTime(pool.periodEnd),
      distributionMethod: pool.distributionMethod,
      includeServiceCharge: pool.includeServiceCharge,
      serviceChargeShareBps: String(pool.serviceChargeShareBps),
      notes: pool.notes || "",
    });
  };

  const savePool = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setNotice(null);
    try {
      const common = {
        name: poolForm.name.trim(),
        periodStart: new Date(poolForm.periodStart).toISOString(),
        periodEnd: new Date(poolForm.periodEnd).toISOString(),
        distributionMethod: poolForm.distributionMethod.trim(),
        includeServiceCharge: poolForm.includeServiceCharge,
        serviceChargeShareBps: Number(poolForm.serviceChargeShareBps || 0),
        notes: poolForm.notes.trim() || undefined,
      };

      if (editingPool && selectedPoolId) {
        const updated = await updateTipPool(selectedPoolId, common);
        setPoolDetail(updated);
        setNotice(t("cashier.tipPool.updated"));
      } else {
        if (!tenantId || !locationId) {
          throw new Error(t("cashier.tipPool.missingBranch"));
        }
        const payload: CreateTipPoolDTO = {
          tenantId,
          locationId,
          ...common,
        };
        const created = await createTipPool(payload);
        await selectPool(created.id);
        setNotice(t("cashier.tipPool.created"));
      }
      resetPoolForm();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.tipPool.savePoolFailed")
      );
    }
  };

  const beginAllocationEdit = (allocation: TipPoolAllocation) => {
    setEditingAllocation(allocation);
    setAllocationErrors({});
    setAllocationForm({
      userId: allocation.userId,
      role: allocation.role || TIP_POOL_ROLE,
      hoursWorked: allocation.hoursWorked,
      weight: allocation.weight,
      amount: allocation.amount,
      notes: allocation.notes || "",
    });
  };

  const resetAllocationForm = () => {
    setEditingAllocation(null);
    setAllocationErrors({});
    setAllocationForm(emptyAllocationForm);
  };

  const saveAllocation = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPoolId) return;
    setLocalError(null);
    const { errors, payload } = validateTipPoolAllocationForm(allocationForm);
    if (!payload) {
      setAllocationErrors(errors);
      setLocalError(
        t(`cashier.tipPool.${errors.form || errors.userId || errors.role || "createFailed"}`)
      );
      return;
    }
    setAllocationErrors({});
    try {
      if (editingAllocation) {
        await updateTipPoolAllocation(selectedPoolId, editingAllocation.id, {
          role: payload.role,
          hoursWorked: payload.hoursWorked,
          weight: payload.weight,
          amount: payload.amount,
          notes: payload.notes,
        });
      } else {
        const createPayload: TipPoolAllocationDTO = {
          userId: payload.userId,
          role: payload.role,
          hoursWorked: payload.hoursWorked,
          weight: payload.weight,
          amount: payload.amount,
          notes: payload.notes,
        };
        await createTipPoolAllocation(selectedPoolId, createPayload);
      }
      resetAllocationForm();
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : t("cashier.tipPool.createFailed")
      );
    }
  };

  const runPoolAction = async (
    action: (poolId: string) => Promise<TipPool>,
    successMessage: string
  ) => {
    if (!selectedPoolId) return;
    setLocalError(null);
    try {
      const updated = await action(selectedPoolId);
      setPoolDetail(updated);
      setNotice(successMessage);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.tipPool.actionFailed")
      );
    }
  };

  return (
    <section className="grid h-full min-h-0 grid-cols-[16rem_minmax(0,1fr)] overflow-hidden bg-slate-100">
      <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white p-3">
        <h1 className="text-xl font-bold">{t("cashier.tipPool.title")}</h1>
        <div className="my-3 grid grid-cols-3 gap-1">
          {(["ALL", "OPEN", "SETTLED"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={[
                "min-h-10 rounded text-xs font-semibold",
                status === item ? "bg-blue-600 text-white" : "bg-slate-100",
              ].join(" ")}
            >
              {item === "ALL"
                ? t("cashier.tipPool.statusAll")
                : item === "OPEN"
                  ? t("cashier.tipPool.statusOpen")
                  : t("cashier.tipPool.statusSettled")}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {visiblePools.map((pool) => (
            <button
              key={pool.id}
              type="button"
              onClick={() => void selectPool(pool.id)}
              className={[
                "w-full rounded border p-3 text-left",
                selectedPoolId === pool.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200",
              ].join(" ")}
            >
              <span className="block truncate font-semibold">{pool.name}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {pool.totalDistributable} · {pool.status}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto p-3">
        <form onSubmit={savePool} className="rounded-lg bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {editingPool
                ? t("cashier.tipPool.editPool")
                : t("cashier.tipPool.create")}
            </h2>
            {poolDetail && !editingPool ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => beginPoolEdit(poolDetail)}
              >
                {t("cashier.tipPool.editSelected")}
              </Button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            <input
              required
              aria-label={t("cashier.tipPool.poolName")}
              placeholder={t("cashier.tipPool.poolName")}
              className={fieldClass}
              value={poolForm.name}
              onChange={(event) =>
                setPoolForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-500">
                {t("cashier.tipPool.start")}
                <input
                  required
                  type="datetime-local"
                  className={`${fieldClass} mt-1`}
                  value={poolForm.periodStart}
                  onChange={(event) =>
                    setPoolForm((current) => ({
                      ...current,
                      periodStart: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-slate-500">
                {t("cashier.tipPool.end")}
                <input
                  required
                  type="datetime-local"
                  className={`${fieldClass} mt-1`}
                  value={poolForm.periodEnd}
                  onChange={(event) =>
                    setPoolForm((current) => ({
                      ...current,
                      periodEnd: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <input
              required
              aria-label={t("cashier.tipPool.distributionMethod")}
              placeholder={t("cashier.tipPool.distributionMethod")}
              className={fieldClass}
              value={poolForm.distributionMethod}
              onChange={(event) =>
                setPoolForm((current) => ({
                  ...current,
                  distributionMethod: event.target.value,
                }))
              }
            />
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={poolForm.includeServiceCharge}
                onChange={(event) =>
                  setPoolForm((current) => ({
                    ...current,
                    includeServiceCharge: event.target.checked,
                  }))
                }
              />
              {t("cashier.tipPool.includeServiceCharge")}
            </label>
            <input
              type="number"
              min={0}
              max={10000}
              aria-label={t("cashier.tipPool.serviceChargeShareBps")}
              placeholder={t("cashier.tipPool.serviceChargeShareBps")}
              className={fieldClass}
              value={poolForm.serviceChargeShareBps}
              onChange={(event) =>
                setPoolForm((current) => ({
                  ...current,
                  serviceChargeShareBps: event.target.value,
                }))
              }
            />
            <textarea
              aria-label={t("cashier.tipPool.poolNotes")}
              placeholder={t("cashier.tipPool.poolNotes")}
              className={`${fieldClass} min-h-20 py-2`}
              value={poolForm.notes}
              onChange={(event) =>
                setPoolForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
            <Button fullWidth type="submit" isLoading={isLoading}>
              {editingPool
                ? t("cashier.tipPool.savePool")
                : t("cashier.tipPool.createPool")}
            </Button>
            {editingPool ? (
              <Button fullWidth variant="outline" onClick={resetPoolForm}>
                {t("cashier.tipPool.cancelEdit")}
              </Button>
            ) : null}
          </div>
        </form>

        <section className="rounded-lg bg-white p-4">
          <h2 className="font-bold">{t("cashier.tipPool.selectedPool")}</h2>
          {poolDetail ? (
            <>
              <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
                <p className="font-semibold">{poolDetail.name}</p>
                <p className="mt-1 text-slate-500">
                  {t("cashier.tipPool.tipsAndService", {
                    tips: poolDetail.totalTips,
                    serviceCharge: poolDetail.totalServiceCharge,
                  })}
                </p>
                <p className="mt-1 font-semibold">
                  {t("cashier.tipPool.distributable", {
                    amount: poolDetail.totalDistributable,
                  })}
                </p>
              </div>
              {poolDetail.status === "OPEN" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void runPoolAction(
                        distributeTipPool,
                        t("cashier.tipPool.distributed")
                      )
                    }
                  >
                    {t("cashier.tipPool.distribute")}
                  </Button>
                  <Button
                    onClick={() =>
                      void runPoolAction(settleTipPool, t("cashier.tipPool.settled"))
                    }
                  >
                    {t("cashier.tipPool.settle")}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              {t("cashier.tipPool.selectPool")}
            </p>
          )}
        </section>

        <form onSubmit={saveAllocation} className="rounded-lg bg-white p-4">
          <h2 className="font-bold">
            {editingAllocation
              ? t("cashier.tipPool.saveAllocation")
              : t("cashier.tipPool.addAllocation")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">
              {t("cashier.tipPool.staff")}
              <select
                aria-label={t("cashier.tipPool.staff")}
                className={`${fieldClass} mt-1`}
                value={allocationForm.userId}
                onChange={(event) =>
                  setAllocationForm((current) => ({
                    ...current,
                    userId: event.target.value,
                  }))
                }
              >
                <option value="">{t("cashier.tipPool.selectStaff")}</option>
                {allocationForm.userId && !staffNameById.has(allocationForm.userId) ? (
                  <option value={allocationForm.userId}>
                    {allocationForm.userId}
                  </option>
                ) : null}
                {users.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staffNameById.get(staff.id) || staff.id}
                  </option>
                ))}
              </select>
              {allocationErrors.userId ? (
                <span className="mt-1 block text-xs text-red-600">
                  {t(`cashier.tipPool.${allocationErrors.userId}`)}
                </span>
              ) : null}
            </label>
            <label className="text-xs text-slate-500">
              {t("cashier.tipPool.role")}
              <select
                aria-label={t("cashier.tipPool.role")}
                className={`${fieldClass} mt-1`}
                value={allocationForm.role}
                onChange={(event) =>
                  setAllocationForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {allocationErrors.role ? (
                <span className="mt-1 block text-xs text-red-600">
                  {t(`cashier.tipPool.${allocationErrors.role}`)}
                </span>
              ) : null}
            </label>
            {(
              [
                ["hoursWorked", t("cashier.tipPool.hoursWorked")],
                ["weight", t("cashier.tipPool.weight")],
                ["amount", t("cashier.tipPool.amount")],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="text-xs text-slate-500">
                {label}
                <input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  aria-label={label}
                  placeholder={label}
                  className={`${fieldClass} mt-1`}
                  value={allocationForm[field]}
                  onChange={(event) =>
                    setAllocationForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
                {allocationErrors[field] ? (
                  <span className="mt-1 block text-xs text-red-600">
                    {t(`cashier.tipPool.${allocationErrors[field]}`)}
                  </span>
                ) : null}
              </label>
            ))}
            <label className="col-span-2 text-xs text-slate-500">
              {t("cashier.tipPool.notes")}
              <input
                aria-label={t("cashier.tipPool.notes")}
                placeholder={t("cashier.tipPool.notes")}
                className={`${fieldClass} mt-1`}
                value={allocationForm.notes}
                onChange={(event) =>
                  setAllocationForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          {allocationErrors.form ? (
            <p className="mt-2 text-xs text-red-600">
              {t(`cashier.tipPool.${allocationErrors.form}`)}
            </p>
          ) : null}
          <Button
            fullWidth
            type="submit"
            disabled={!selectedPoolId}
            className="mt-3"
          >
            {editingAllocation
              ? t("cashier.tipPool.saveAllocation")
              : t("cashier.tipPool.addAllocation")}
          </Button>
          {editingAllocation ? (
            <Button
              fullWidth
              variant="outline"
              className="mt-2"
              onClick={resetAllocationForm}
            >
              {t("cashier.tipPool.cancelEdit")}
            </Button>
          ) : null}
        </form>

        <section className="rounded-lg bg-white p-4">
          <h2 className="font-bold">{t("cashier.tipPool.allocations")}</h2>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {tipPoolAllocations.map((allocation) => (
              <div
                key={allocation.id}
                className="rounded border border-slate-200 p-2 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {staffNameById.get(allocation.userId) || allocation.userId}{" "}
                    · {allocation.role}
                  </span>
                  <span>{allocation.amount}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {t("cashier.tipPool.hoursWeight", {
                    hours: allocation.hoursWorked,
                    weight: allocation.weight,
                  })}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => beginAllocationEdit(allocation)}
                  >
                    {t("cashier.tipPool.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      void deleteTipPoolAllocation(
                        selectedPoolId,
                        allocation.id
                      )
                    }
                  >
                    {t("cashier.tipPool.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {(error || localError || notice) && (
          <p
            className={[
              "col-span-2 rounded p-3 text-sm",
              error || localError
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700",
            ].join(" ")}
          >
            {localError || error || notice}
          </p>
        )}
      </main>
    </section>
  );
}
