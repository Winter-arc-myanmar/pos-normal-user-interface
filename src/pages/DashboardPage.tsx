import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { MetricCard } from "@/components/ui/MetricCard";
import { ItemSalesReport, SalesSummaryReport, ZReport } from "@/core/domain/entities/Report";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useReports } from "@/core/presentation/hooks/useReports";
import { useNumberFormatter } from "@/lib/i18n/formatters";
import { downloadCsv } from "@/lib/pos/exportReport";
import { ColumnChart, PieChart, RankChart } from "./dashboard/ReportChart";

type ReportTab = "summary" | "payments" | "items" | "shift";
type ReportMode = "text" | "chart";

const today = () => new Date().toISOString().slice(0, 10);

const emptySummary = (): SalesSummaryReport => ({
  from: today(),
  to: today(),
  locationIds: [],
  orders: {
    count: 0,
    averageNetSales: "0",
    averageGrandTotal: "0",
    voided: { count: 0, amount: "0" },
  },
  sales: {
    grossSales: "0",
    lineDiscounts: "0",
    orderDiscounts: "0",
    totalDiscounts: "0",
    netSales: "0",
    serviceCharge: "0",
    tax: "0",
    tips: "0",
    grandTotal: "0",
  },
  refunds: { count: 0, subtotal: "0", tax: "0", total: "0", byMethod: [] },
  netAfterRefunds: "0",
  voidedLines: { count: 0, amount: "0" },
  compedLines: { count: 0, amount: "0" },
  payments: { byMethod: [], tendered: "0", changeGiven: "0" },
  byDay: [],
  byHour: [],
  byOutlet: [],
  byServiceType: [],
});

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useNumberFormatter();
  const { activeLocationId } = usePosWorkspace();
  const { isLoading, error, salesSummary, itemSales, zReport } = useReports();
  const [tab, setTab] = useState<ReportTab>("summary");
  const [mode, setMode] = useState<ReportMode>("text");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [summary, setSummary] = useState<SalesSummaryReport>(emptySummary);
  const [items, setItems] = useState<ItemSalesReport | null>(null);
  const [shift, setShift] = useState<ZReport | null>(null);

  const money = (value?: string | number) => formatCurrency(Number(value) || 0);
  const amount = (value?: string | number) => Number(value) || 0;

  useEffect(() => {
    let active = true;
    const locationId = activeLocationId || undefined;
    void Promise.all([
      salesSummary({ from, to, locationId }),
      itemSales({
        from,
        to,
        locationId,
        page: 1,
        limit: 50,
        sortBy: "netSales",
        sortOrder: "desc",
      }),
      zReport({ date: to, locationId }),
    ])
      .then(([sales, itemReport, shiftReport]) => {
        if (!active) return;
        setSummary(sales);
        setItems(itemReport);
        setShift(shiftReport);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [activeLocationId, from, itemSales, salesSummary, to, zReport]);

  const exportCurrent = () => {
    if (tab === "summary") {
      downloadCsv(`sales-summary-${from}-${to}.csv`, [
        [t("dashboard.netSales"), summary.sales.netSales],
        [t("dashboard.grossSales"), summary.sales.grossSales],
        [t("dashboard.orders"), String(summary.orders.count)],
        [t("dashboard.grandTotal"), summary.sales.grandTotal],
        [t("dashboard.discounts"), summary.sales.totalDiscounts],
        [t("dashboard.refunds"), summary.refunds.total],
        [],
        [t("dashboard.serviceTypes"), t("dashboard.orders"), t("dashboard.grandTotal")],
        ...summary.byServiceType.map((row) => [
          row.serviceType,
          String(row.orderCount),
          row.grandTotal,
        ]),
        [],
        ["Date", t("dashboard.orders"), t("dashboard.netSales"), t("dashboard.grandTotal")],
        ...summary.byDay.map((row) => [
          row.businessDate,
          String(row.orderCount),
          row.netSales,
          row.grandTotal,
        ]),
      ]);
    }
    if (tab === "payments") {
      downloadCsv(`payments-${from}-${to}.csv`, [
        [t("dashboard.tendered"), summary.payments.tendered],
        [t("dashboard.changeGiven"), summary.payments.changeGiven],
        [],
        [t("dashboard.method"), t("dashboard.count"), t("dashboard.amount")],
        ...summary.payments.byMethod.map((row) => [row.name, String(row.count), row.amount]),
      ]);
    }
    if (tab === "items") {
      downloadCsv(`item-sales-${from}-${to}.csv`, [
        [t("dashboard.categories"), t("dashboard.netSales"), "Share"],
        ...(items?.categories || []).map((row) => [
          row.categoryName,
          row.netSales,
          row.shareOfNetSales,
        ]),
        [],
        [t("dashboard.items"), "Qty", t("dashboard.netSales")],
        ...(items?.items || []).map((row) => [row.productName, row.quantitySold, row.netSales]),
      ]);
    }
    if (tab === "shift" && shift) {
      downloadCsv(`shift-${to}.csv`, [
        [t("dashboard.completed"), String(shift.orders.completed)],
        [t("dashboard.voided"), String(shift.orders.voided)],
        [t("dashboard.refunded"), String(shift.orders.refunded)],
        [t("dashboard.grandTotal"), shift.totals.grandTotal],
        [],
        [t("dashboard.method"), t("dashboard.amount")],
        ...shift.payments.map((row) => [row.method, row.total]),
      ]);
    }
  };

  const tabs: ReportTab[] = ["summary", "payments", "items", "shift"];
  const modes: ReportMode[] = ["text", "chart"];

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4 px-1 sm:space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("dashboard.description")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <label className="text-xs font-medium text-slate-500">
            {t("dashboard.from")}
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 block h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 sm:text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            {t("dashboard.to")}
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 block h-11 w-full rounded-md border border-slate-300 px-3 text-base text-slate-900 sm:text-sm"
            />
          </label>
          <button
            type="button"
            onClick={exportCurrent}
            className="col-span-2 h-11 self-end rounded-md bg-slate-900 px-4 text-sm font-semibold text-white sm:col-span-1"
          >
            {t("dashboard.export")}
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={[
                "min-h-11 rounded-md px-3 text-sm",
                tab === item
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              ].join(" ")}
            >
              {t(`dashboard.tabs.${item}`)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {modes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={[
                "min-h-11 rounded-md px-4 text-sm",
                mode === item
                  ? "bg-blue-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              ].join(" ")}
            >
              {t(item === "text" ? "dashboard.textMode" : "dashboard.chartMode")}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {isLoading ? <ApiLoadingState /> : null}

      {tab === "summary" ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard title={t("dashboard.netSales")} value={money(summary.sales.netSales)} variant="primary" />
            <MetricCard title={t("dashboard.grossSales")} value={money(summary.sales.grossSales)} />
            <MetricCard title={t("dashboard.orders")} value={summary.orders.count} />
            <MetricCard title={t("dashboard.grandTotal")} value={money(summary.sales.grandTotal)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Panel title={t("dashboard.discounts")}>
              {mode === "chart" ? (
                <PieChart
                  empty={t("dashboard.empty")}
                  points={[
                    { label: t("dashboard.lineDiscounts"), value: amount(summary.sales.lineDiscounts), display: money(summary.sales.lineDiscounts) },
                    { label: t("dashboard.orderDiscounts"), value: amount(summary.sales.orderDiscounts), display: money(summary.sales.orderDiscounts) },
                  ]}
                />
              ) : (
                <>
                  <p className="text-sm text-slate-600">{t("dashboard.lineDiscounts")}: {money(summary.sales.lineDiscounts)}</p>
                  <p className="mt-1 text-sm text-slate-600">{t("dashboard.orderDiscounts")}: {money(summary.sales.orderDiscounts)}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{money(summary.sales.totalDiscounts)}</p>
                </>
              )}
            </Panel>
            <Panel title={t("dashboard.serviceTypes")}>
              {mode === "chart" ? (
                <PieChart
                  empty={t("dashboard.empty")}
                  points={(summary.byServiceType || []).map((row) => ({
                    label: row.serviceType,
                    value: amount(row.grandTotal),
                    display: money(row.grandTotal),
                  }))}
                />
              ) : (summary.byServiceType || []).length === 0 ? (
                <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(summary.byServiceType || []).map((row) => (
                    <li key={row.serviceType} className="flex justify-between gap-3">
                      <span className="truncate">{row.serviceType}</span>
                      <span className="shrink-0">{money(row.grandTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t("dashboard.byDay")}>
              {mode === "chart" ? (
                <ColumnChart
                  empty={t("dashboard.empty")}
                  points={(summary.byDay || []).map((row) => ({
                    label: row.businessDate.slice(5),
                    value: amount(row.grandTotal),
                    display: money(row.grandTotal),
                  }))}
                />
              ) : (summary.byDay || []).length === 0 ? (
                <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(summary.byDay || []).map((row) => (
                    <li key={row.businessDate} className="flex justify-between gap-3">
                      <span>{row.businessDate}</span>
                      <span>{money(row.grandTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t("dashboard.byHour")}>
              {mode === "chart" ? (
                <ColumnChart
                  empty={t("dashboard.empty")}
                  points={(summary.byHour || []).map((row) => ({
                    label: `${row.hour}:00`,
                    value: amount(row.grandTotal),
                    display: money(row.grandTotal),
                  }))}
                />
              ) : (summary.byHour || []).length === 0 ? (
                <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(summary.byHour || []).map((row) => (
                    <li key={row.hour} className="flex justify-between gap-3">
                      <span>{row.hour}:00</span>
                      <span>{money(row.grandTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      ) : null}

      {tab === "payments" ? (
        <Panel title={t("dashboard.payments")}>
          <p className="mb-3 text-sm text-slate-600">
            {t("dashboard.tendered")}: {money(summary.payments.tendered)} · {t("dashboard.changeGiven")}: {money(summary.payments.changeGiven)}
          </p>
          {mode === "chart" ? (
            <PieChart
              empty={t("dashboard.empty")}
              points={(summary.payments.byMethod || []).map((row) => ({
                label: row.name,
                value: amount(row.amount),
                display: money(row.amount),
              }))}
            />
          ) : (summary.payments.byMethod || []).length === 0 ? (
            <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">{t("dashboard.method")}</th>
                    <th className="py-2 pr-3">{t("dashboard.count")}</th>
                    <th className="py-2">{t("dashboard.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.payments.byMethod.map((row) => (
                    <tr key={row.paymentMethodId} className="border-t border-slate-100">
                      <td className="py-3 pr-3">{row.name}</td>
                      <td className="py-3 pr-3">{row.count}</td>
                      <td className="py-3">{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}

      {tab === "items" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t("dashboard.categories")}>
            {mode === "chart" ? (
              <PieChart
                empty={t("dashboard.empty")}
                points={(items?.categories || []).map((row) => ({
                  label: row.categoryName,
                  value: amount(row.netSales),
                  display: money(row.netSales),
                }))}
              />
            ) : !items?.categories.length ? (
              <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {items.categories.map((row) => (
                  <li key={row.categoryId} className="flex justify-between gap-3">
                    <span className="truncate">{row.categoryName}</span>
                    <span className="shrink-0">{row.shareOfNetSales}% · {money(row.netSales)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t("dashboard.items")}>
            {mode === "chart" ? (
              <RankChart
                empty={t("dashboard.empty")}
                points={(items?.items || []).map((row) => ({
                  label: row.productName,
                  value: amount(row.netSales),
                  display: money(row.netSales),
                }))}
              />
            ) : !items?.items.length ? (
              <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {items.items.map((row) => (
                  <li key={row.variantId} className="flex justify-between gap-3">
                    <span className="truncate">{row.productName}</span>
                    <span className="shrink-0">{row.quantitySold} · {money(row.netSales)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "shift" && shift ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard title={t("dashboard.completed")} value={shift.orders.completed} variant="primary" />
            <MetricCard title={t("dashboard.voided")} value={shift.orders.voided} />
            <MetricCard title={t("dashboard.refunded")} value={shift.orders.refunded} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t("dashboard.orderMix")}>
            {mode === "chart" ? (
              <PieChart
                empty={t("dashboard.empty")}
                points={[
                  { label: t("dashboard.completed"), value: shift.orders.completed, display: String(shift.orders.completed) },
                  { label: t("dashboard.voided"), value: shift.orders.voided, display: String(shift.orders.voided) },
                  { label: t("dashboard.refunded"), value: shift.orders.refunded, display: String(shift.orders.refunded) },
                ]}
              />
            ) : (
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between"><span>{t("dashboard.completed")}</span><span>{shift.orders.completed}</span></li>
                <li className="flex justify-between"><span>{t("dashboard.voided")}</span><span>{shift.orders.voided}</span></li>
                <li className="flex justify-between"><span>{t("dashboard.refunded")}</span><span>{shift.orders.refunded}</span></li>
              </ul>
            )}
          </Panel>
          <Panel title={t("dashboard.shifts")}>
            {mode === "chart" ? (
              <PieChart
                empty={t("dashboard.empty")}
                points={shift.payments.map((row) => ({
                  label: row.method,
                  value: amount(row.total),
                  display: money(row.total),
                }))}
              />
            ) : (
              <>
                <p className="text-sm text-slate-600">{t("dashboard.grandTotal")}: {money(shift.totals.grandTotal)}</p>
                <p className="mt-1 text-sm text-slate-600">{t("dashboard.tax", { amount: money(shift.totals.totalTax) })}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {shift.payments.map((row) => (
                    <li key={row.paymentMethodId} className="flex justify-between gap-3">
                      <span>{row.method}</span>
                      <span>{money(row.total)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
          <Panel title={t("dashboard.categories")}>
            {mode === "chart" ? (
              <PieChart
                empty={t("dashboard.empty")}
                points={(shift.byCategory || []).map((row) => ({
                  label: row.categoryName,
                  value: amount(row.totalRevenue),
                  display: money(row.totalRevenue),
                }))}
              />
            ) : !(shift.byCategory || []).length ? (
              <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {shift.byCategory.map((row) => (
                  <li key={row.categoryId} className="flex justify-between gap-3">
                    <span className="truncate">{row.categoryName}</span>
                    <span>{money(row.totalRevenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t("dashboard.topItems")}>
            {mode === "chart" ? (
              <RankChart
                empty={t("dashboard.empty")}
                points={(shift.topItems || []).map((row) => ({
                  label: row.productName,
                  value: amount(row.totalRevenue),
                  display: money(row.totalRevenue),
                }))}
              />
            ) : !(shift.topItems || []).length ? (
              <p className="text-sm text-slate-500">{t("dashboard.empty")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {shift.topItems.map((row) => (
                  <li key={row.variantId} className="flex justify-between gap-3">
                    <span className="truncate">{row.productName}</span>
                    <span>{row.quantitySold} · {money(row.totalRevenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          </div>
        </>
      ) : null}
    </section>
  );
}
