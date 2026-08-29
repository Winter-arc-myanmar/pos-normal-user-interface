import { FormEvent, useEffect, useMemo, useState } from "react";
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

const fieldClass =
  "min-h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500";

const emptyPoolForm = {
  name: "",
  periodStart: "",
  periodEnd: "",
  distributionMethod: "",
  includeServiceCharge: false,
  serviceChargeShareBps: "0",
  notes: "",
};

const emptyAllocationForm = {
  userId: "",
  role: "",
  hoursWorked: "",
  weight: "",
  amount: "",
  notes: "",
};

const toLocalDateTime = (value?: string) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export function TipPoolsPage() {
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
  const [status, setStatus] = useState<"ALL" | TipPoolStatus>("ALL");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [poolDetail, setPoolDetail] = useState<TipPool | null>(null);
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [editingPool, setEditingPool] = useState(false);
  const [allocationForm, setAllocationForm] = useState(emptyAllocationForm);
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

  const selectPool = async (poolId: string) => {
    setSelectedPoolId(poolId);
    setLocalError(null);
    try {
      const detail = await getTipPoolById(poolId);
      setPoolDetail(detail);
      await fetchTipPoolAllocations(poolId);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to load tip pool"
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
        setNotice("Tip pool updated");
      } else {
        if (!tenantId || !locationId) {
          throw new Error("Select a tenant branch before creating a tip pool");
        }
        const payload: CreateTipPoolDTO = {
          tenantId,
          locationId,
          ...common,
        };
        const created = await createTipPool(payload);
        await selectPool(created.id);
        setNotice("Tip pool created");
      }
      resetPoolForm();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to save tip pool"
      );
    }
  };

  const beginAllocationEdit = (allocation: TipPoolAllocation) => {
    setEditingAllocation(allocation);
    setAllocationForm({
      userId: allocation.userId,
      role: allocation.role,
      hoursWorked: allocation.hoursWorked,
      weight: allocation.weight,
      amount: allocation.amount,
      notes: allocation.notes || "",
    });
  };

  const resetAllocationForm = () => {
    setEditingAllocation(null);
    setAllocationForm(emptyAllocationForm);
  };

  const saveAllocation = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPoolId) return;
    setLocalError(null);
    try {
      const payload: TipPoolAllocationDTO = {
        userId: allocationForm.userId.trim(),
        role: allocationForm.role.trim(),
        hoursWorked: allocationForm.hoursWorked
          ? Number(allocationForm.hoursWorked)
          : undefined,
        weight: allocationForm.weight
          ? Number(allocationForm.weight)
          : undefined,
        amount: allocationForm.amount
          ? Number(allocationForm.amount)
          : undefined,
        notes: allocationForm.notes.trim() || undefined,
      };

      if (editingAllocation) {
        await updateTipPoolAllocation(
          selectedPoolId,
          editingAllocation.id,
          payload
        );
      } else {
        await createTipPoolAllocation(selectedPoolId, payload);
      }
      resetAllocationForm();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to save allocation"
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
        caught instanceof Error ? caught.message : "Tip pool action failed"
      );
    }
  };

  return (
    <section className="grid h-full min-h-0 grid-cols-[16rem_minmax(0,1fr)] overflow-hidden bg-slate-100">
      <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white p-3">
        <h1 className="text-xl font-bold">Tip pools</h1>
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
              {item}
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
              {editingPool ? "Edit tip pool" : "Create tip pool"}
            </h2>
            {poolDetail && !editingPool ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => beginPoolEdit(poolDetail)}
              >
                Edit selected
              </Button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            <input
              required
              aria-label="Pool name"
              placeholder="Pool name"
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
                Start
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
                End
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
              aria-label="Distribution method"
              placeholder="Backend distribution method"
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
              Include service charge
            </label>
            <input
              type="number"
              min={0}
              max={10000}
              aria-label="Service charge share BPS"
              placeholder="Service charge share BPS"
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
              aria-label="Pool notes"
              placeholder="Notes"
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
              {editingPool ? "Save pool" : "Create pool"}
            </Button>
            {editingPool ? (
              <Button fullWidth variant="outline" onClick={resetPoolForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>

        <section className="rounded-lg bg-white p-4">
          <h2 className="font-bold">Selected pool</h2>
          {poolDetail ? (
            <>
              <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
                <p className="font-semibold">{poolDetail.name}</p>
                <p className="mt-1 text-slate-500">
                  Tips {poolDetail.totalTips} · Service charge{" "}
                  {poolDetail.totalServiceCharge}
                </p>
                <p className="mt-1 font-semibold">
                  Distributable {poolDetail.totalDistributable}
                </p>
              </div>
              {poolDetail.status === "OPEN" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void runPoolAction(
                        distributeTipPool,
                        "Tip pool distributed"
                      )
                    }
                  >
                    Distribute
                  </Button>
                  <Button
                    onClick={() =>
                      void runPoolAction(settleTipPool, "Tip pool settled")
                    }
                  >
                    Settle
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Select a tip pool.</p>
          )}
        </section>

        <form onSubmit={saveAllocation} className="rounded-lg bg-white p-4">
          <h2 className="font-bold">
            {editingAllocation ? "Edit allocation" : "Add allocation"}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              required
              aria-label="Allocation user ID"
              placeholder="User ID"
              className={fieldClass}
              value={allocationForm.userId}
              onChange={(event) =>
                setAllocationForm((current) => ({
                  ...current,
                  userId: event.target.value,
                }))
              }
            />
            <input
              required
              aria-label="Allocation role"
              placeholder="Role"
              className={fieldClass}
              value={allocationForm.role}
              onChange={(event) =>
                setAllocationForm((current) => ({
                  ...current,
                  role: event.target.value,
                }))
              }
            />
            {(["hoursWorked", "weight", "amount"] as const).map((field) => (
              <input
                key={field}
                type="number"
                min={0}
                step="any"
                aria-label={field}
                placeholder={field}
                className={fieldClass}
                value={allocationForm[field]}
                onChange={(event) =>
                  setAllocationForm((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
              />
            ))}
            <input
              aria-label="Allocation notes"
              placeholder="Notes"
              className={fieldClass}
              value={allocationForm.notes}
              onChange={(event) =>
                setAllocationForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <Button
            fullWidth
            type="submit"
            disabled={!selectedPoolId}
            className="mt-3"
          >
            {editingAllocation ? "Save allocation" : "Add allocation"}
          </Button>
          {editingAllocation ? (
            <Button
              fullWidth
              variant="outline"
              className="mt-2"
              onClick={resetAllocationForm}
            >
              Cancel edit
            </Button>
          ) : null}
        </form>

        <section className="rounded-lg bg-white p-4">
          <h2 className="font-bold">Allocations</h2>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {tipPoolAllocations.map((allocation) => (
              <div
                key={allocation.id}
                className="rounded border border-slate-200 p-2 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {allocation.userId} · {allocation.role}
                  </span>
                  <span>{allocation.amount}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Hours {allocation.hoursWorked} · Weight {allocation.weight}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => beginAllocationEdit(allocation)}
                  >
                    Edit
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
                    Delete
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
