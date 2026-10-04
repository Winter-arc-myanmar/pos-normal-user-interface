import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { SearchInput } from "@/components/ui/SearchInput";
import { MetricCard } from "@/components/ui/MetricCard";
import { PosType } from "@/core/application/dtos/ReportDTO";
import {
  BarCategoriesReport,
  BarCategoryRow,
  KtvSessionsReport,
  PosBillsReport,
  SalesSummaryReport,
  SpaMenuReport,
  SpaMenuSection,
} from "@/core/domain/entities/Report";
import { useReports } from "@/core/presentation/hooks/useReports";
import { useNumberFormatter } from "@/lib/i18n/formatters";
import { ColumnChart, PieChart } from "./dashboard/ReportChart";

type SummaryTab = "posSummary" | "posBills" | "bar" | "spaMenu" | "ktv";
type ReportMode = "text" | "chart";

const POS_TYPES: PosType[] = ["SPA", "KTV", "BAR"];
const TABS: SummaryTab[] = ["posSummary", "posBills", "bar", "spaMenu", "ktv"];
const BILL_LIMIT = 50;

const today = () => new Date().toISOString().slice(0, 10);

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function qty(value?: string | number | null) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "0";
}

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function SalesSummaryPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useNumberFormatter();
  const {
    isLoading,
    error,
    posSummary,
    posBills,
    barCategories,
    spaMenu,
    ktvSessions,
  } = useReports();

  const [tab, setTab] = useState<SummaryTab>("posSummary");
  const [mode, setMode] = useState<ReportMode>("text");
  const [posType, setPosType] = useState<PosType>("SPA");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<SalesSummaryReport | null>(null);
  const [bills, setBills] = useState<PosBillsReport | null>(null);
  const [bar, setBar] = useState<BarCategoriesReport | null>(null);
  const [spa, setSpa] = useState<SpaMenuReport | null>(null);
  const [ktv, setKtv] = useState<KtvSessionsReport | null>(null);

  const money = (value?: string | number | null) => formatCurrency(Number(value) || 0);
  const amount = (value?: string | number | null) => Number(value) || 0;
  const share = (value?: string) => `${qty(value)}%`;
  const needsPosType = tab === "posSummary" || tab === "posBills";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [posType, from, to, debouncedSearch]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (tab === "posSummary") {
          const report = await posSummary({ posType, from, to });
          if (active) setSummary(report);
          return;
        }
        if (tab === "posBills") {
          const report = await posBills({
            posType,
            from,
            to,
            page,
            limit: BILL_LIMIT,
            search: debouncedSearch || undefined,
          });
          if (active) setBills(report);
          return;
        }
        if (tab === "bar") {
          const report = await barCategories({ from, to });
          if (active) setBar(report);
          return;
        }
        if (tab === "spaMenu") {
          const report = await spaMenu({ from, to });
          if (active) setSpa(report);
          return;
        }
        const report = await ktvSessions({ from, to });
        if (active) setKtv(report);
      } catch {
        if (!active) return;
        if (tab === "posSummary") setSummary(null);
        if (tab === "posBills") setBills(null);
        if (tab === "bar") setBar(null);
        if (tab === "spaMenu") setSpa(null);
        if (tab === "ktv") setKtv(null);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [
    barCategories,
    debouncedSearch,
    from,
    ktvSessions,
    page,
    posBills,
    posSummary,
    posType,
    spaMenu,
    tab,
    to,
  ]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4 px-1 sm:space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {t("salesSummary.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("salesSummary.description")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {needsPosType ? (
            <label className="text-xs font-medium text-slate-500">
              {t("salesSummary.posType")}
              <select
                value={posType}
                onChange={(event) => setPosType(event.target.value as PosType)}
                className="mt-1 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 sm:text-sm"
              >
                {POS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`salesSummary.posTypes.${type}`)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {TABS.map((item) => (
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
              {t(`salesSummary.tabs.${item}`)}
            </button>
          ))}
        </div>
        {tab !== "posBills" ? (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {(["text", "chart"] as ReportMode[]).map((item) => (
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
        ) : (
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder={t("salesSummary.searchBills")}
            containerClassName="w-full md:max-w-sm"
          />
        )}
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {isLoading ? <ApiLoadingState label={t("common.loading")} /> : null}

      {tab === "posSummary" && summary ? (
        <PosSummaryPanels
          summary={summary}
          mode={mode}
          money={money}
          amount={amount}
        />
      ) : null}

      {tab === "posBills" && bills ? (
        <PosBillsPanels
          report={bills}
          money={money}
          onPage={setPage}
        />
      ) : null}

      {tab === "bar" && bar ? (
        <BarCategoryPanels report={bar} mode={mode} money={money} amount={amount} share={share} />
      ) : null}

      {tab === "spaMenu" && spa ? (
        <SpaMenuPanels report={spa} mode={mode} money={money} amount={amount} share={share} />
      ) : null}

      {tab === "ktv" && ktv ? (
        <KtvSessionPanels report={ktv} mode={mode} money={money} amount={amount} />
      ) : null}
    </section>
  );
}

function PosSummaryPanels({
  summary,
  mode,
  money,
  amount,
}: {
  summary: SalesSummaryReport;
  mode: ReportMode;
  money: (value?: string | number | null) => string;
  amount: (value?: string | number | null) => number;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard title={t("dashboard.netSales")} value={money(summary.sales.netSales)} variant="primary" />
        <MetricCard title={t("dashboard.grossSales")} value={money(summary.sales.grossSales)} />
        <MetricCard title={t("dashboard.orders")} value={summary.orders.count} />
        <MetricCard title={t("dashboard.netAfterRefunds")} value={money(summary.netAfterRefunds)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("dashboard.discounts")}>
          <p className="text-sm text-slate-600">
            {t("dashboard.lineDiscounts")}: {money(summary.sales.lineDiscounts)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {t("dashboard.orderDiscounts")}: {money(summary.sales.orderDiscounts)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {t("dashboard.columns.compedLines")}: {summary.compedLines.count} · {money(summary.compedLines.amount)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {t("dashboard.columns.voidedLines")}: {summary.voidedLines.count} · {money(summary.voidedLines.amount)}
          </p>
        </Panel>
        <Panel title={t("dashboard.payments")}>
          <p className="mb-3 text-sm text-slate-600">
            {t("dashboard.tendered")}: {money(summary.payments.tendered)} · {t("dashboard.changeGiven")}: {money(summary.payments.changeGiven)}
          </p>
          {mode === "chart" ? (
            <PieChart
              empty={t("salesSummary.empty")}
              points={(summary.payments.byMethod || []).map((row) => ({
                label: row.name,
                value: amount(row.amount),
                display: money(row.amount),
              }))}
            />
          ) : (
            <SimpleTable
              empty={!summary.payments.byMethod.length}
              headers={[t("dashboard.method"), t("dashboard.count"), t("dashboard.amount")]}
              rows={(summary.payments.byMethod || []).map((row) => [
                row.name,
                String(row.count),
                money(row.amount),
              ])}
            />
          )}
        </Panel>
        <Panel title={t("dashboard.byDay")}>
          {mode === "chart" ? (
            <ColumnChart
              empty={t("salesSummary.empty")}
              points={(summary.byDay || []).map((row) => ({
                label: row.businessDate.slice(5),
                value: amount(row.grandTotal),
                display: money(row.grandTotal),
              }))}
            />
          ) : (
            <SimpleTable
              empty={!summary.byDay.length}
              headers={[
                t("dashboard.columns.date"),
                t("dashboard.orders"),
                t("dashboard.netSales"),
                t("dashboard.refunds"),
              ]}
              rows={(summary.byDay || []).map((row) => [
                row.businessDate,
                String(row.orderCount),
                money(row.netSales),
                money(row.refunds),
              ])}
            />
          )}
        </Panel>
        <Panel title={t("dashboard.byHour")}>
          {mode === "chart" ? (
            <ColumnChart
              empty={t("salesSummary.empty")}
              points={(summary.byHour || []).map((row) => ({
                label: `${row.hour}:00`,
                value: amount(row.grandTotal),
                display: money(row.grandTotal),
              }))}
            />
          ) : (
            <SimpleTable
              empty={!summary.byHour.length}
              headers={[t("dashboard.columns.hour"), t("dashboard.orders"), t("dashboard.netSales")]}
              rows={(summary.byHour || []).map((row) => [
                `${row.hour}:00`,
                String(row.orderCount),
                money(row.netSales),
              ])}
            />
          )}
        </Panel>
        <Panel title={t("dashboard.byOutlet")}>
          <SimpleTable
            empty={!summary.byOutlet.length}
            headers={[t("dashboard.columns.outlet"), t("dashboard.orders"), t("dashboard.netSales")]}
            rows={(summary.byOutlet || []).map((row) => [
              row.locationName,
              String(row.orderCount),
              money(row.netSales),
            ])}
          />
        </Panel>
        <Panel title={t("dashboard.serviceTypes")}>
          <SimpleTable
            empty={!summary.byServiceType.length}
            headers={[t("dashboard.serviceTypes"), t("dashboard.orders"), t("dashboard.netSales")]}
            rows={(summary.byServiceType || []).map((row) => [
              row.serviceType,
              String(row.orderCount),
              money(row.netSales),
            ])}
          />
        </Panel>
      </div>
    </>
  );
}

function PosBillsPanels({
  report,
  money,
  onPage,
}: {
  report: PosBillsReport;
  money: (value?: string | number | null) => string;
  onPage: (page: number) => void;
}) {
  const { t } = useTranslation();
  const totalPages = Math.max(report.meta.totalPages || 1, 1);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard title={t("salesSummary.billCount")} value={report.totals.billCount} variant="primary" />
        <MetricCard title={t("dashboard.grossSales")} value={money(report.totals.grossSales)} />
        <MetricCard title={t("dashboard.netSales")} value={money(report.totals.netSales)} />
        <MetricCard title={t("dashboard.grandTotal")} value={money(report.totals.grandTotal)} />
      </div>
      {report.bills.length === 0 ? (
        <p className="text-sm text-slate-500">{t("salesSummary.empty")}</p>
      ) : (
        <div className="space-y-3">
          {report.bills.map((bill) => (
            <article
              key={bill.orderId}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{bill.orderNumber}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {bill.place || "—"}
                    {bill.guestName ? ` · ${bill.guestName}` : ""}
                    {` · ${when(bill.soldAt)}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{money(bill.grandTotal)}</p>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {bill.items.map((item, index) => (
                  <li key={`${bill.orderId}-item-${index}`} className="flex justify-between gap-3">
                    <span>
                      {item.name} × {qty(item.quantity)}
                    </span>
                    <span>{money(item.netSales)}</span>
                  </li>
                ))}
              </ul>
              {bill.compedItems.length ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {t("salesSummary.compedItems")}
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-600">
                    {bill.compedItems.map((item, index) => (
                      <li key={`${bill.orderId}-foc-${index}`} className="flex justify-between gap-3">
                        <span>
                          {item.name} × {qty(item.quantity)}
                        </span>
                        <span>{money(item.value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-slate-500">
                {t("dashboard.discounts")}: {money(bill.discounts)} ·{" "}
                {(bill.payments || []).map((payment) => `${payment.name} ${money(payment.amount)}`).join(" · ")}
              </p>
            </article>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {t("salesSummary.page", { page: report.meta.page, total: totalPages })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={report.meta.page <= 1}
            onClick={() => onPage(report.meta.page - 1)}
            className="h-10 rounded-md px-3 text-sm ring-1 ring-slate-200 disabled:opacity-40"
          >
            {t("salesSummary.previous")}
          </button>
          <button
            type="button"
            disabled={report.meta.page >= totalPages}
            onClick={() => onPage(report.meta.page + 1)}
            className="h-10 rounded-md px-3 text-sm ring-1 ring-slate-200 disabled:opacity-40"
          >
            {t("salesSummary.next")}
          </button>
        </div>
      </div>
    </>
  );
}

function flattenCategories(rows: BarCategoryRow[], depth = 0): Array<BarCategoryRow & { depth: number }> {
  return rows.flatMap((row) => [
    { ...row, depth },
    ...flattenCategories(row.subCategories || [], depth + 1),
  ]);
}

function BarCategoryPanels({
  report,
  mode,
  money,
  amount,
  share,
}: {
  report: BarCategoriesReport;
  mode: ReportMode;
  money: (value?: string | number | null) => string;
  amount: (value?: string | number | null) => number;
  share: (value?: string) => string;
}) {
  const { t } = useTranslation();
  const rows = flattenCategories(report.categories || []);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard title={t("dashboard.orders")} value={report.totals.orderCount} variant="primary" />
        <MetricCard title={t("dashboard.netSales")} value={money(report.totals.netSales)} />
        <MetricCard title={t("salesSummary.compedValue")} value={money(report.totals.compedValue)} />
        <MetricCard title={t("salesSummary.refundAmount")} value={money(report.totals.refundAmount)} />
      </div>
      <Panel title={t("dashboard.categories")}>
        {mode === "chart" ? (
          <PieChart
            empty={t("salesSummary.empty")}
            points={(report.categories || []).map((row) => ({
              label: row.categoryName || t("salesSummary.uncategorized"),
              value: amount(row.netSales),
              display: money(row.netSales),
            }))}
          />
        ) : (
          <SimpleTable
            empty={!rows.length}
            headers={[
              t("dashboard.columns.category"),
              t("dashboard.columns.quantity"),
              t("dashboard.netSales"),
              t("salesSummary.share"),
              t("salesSummary.compedValue"),
            ]}
            rows={rows.map((row) => [
              `${row.depth ? "↳ " : ""}${row.categoryName || t("salesSummary.uncategorized")}`,
              qty(row.quantity),
              money(row.netSales),
              share(row.shareOfNetSales),
              money(row.compedValue),
            ])}
          />
        )}
      </Panel>
    </>
  );
}

function SpaMenuPanels({
  report,
  mode,
  money,
  amount,
  share,
}: {
  report: SpaMenuReport;
  mode: ReportMode;
  money: (value?: string | number | null) => string;
  amount: (value?: string | number | null) => number;
  share: (value?: string) => string;
}) {
  const { t } = useTranslation();
  const sections: Array<{ key: keyof Pick<SpaMenuReport, "spaMenu" | "roomMenuPackages" | "roomServices" | "roomTime">; hideEmpty?: boolean }> = [
    { key: "spaMenu" },
    { key: "roomMenuPackages" },
    { key: "roomServices" },
    { key: "roomTime", hideEmpty: true },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <MetricCard title={t("dashboard.orders")} value={report.totals.orderCount} variant="primary" />
        <MetricCard title={t("dashboard.netSales")} value={money(report.totals.netSales)} />
        <MetricCard title={t("dashboard.grandTotal")} value={money(report.totals.grandTotal)} />
      </div>
      {mode === "chart" ? (
        <Panel title={t("dashboard.netSales")}>
          <PieChart
            empty={t("salesSummary.empty")}
            points={sections
              .map(({ key }) => ({
                label: t(`salesSummary.${key}`),
                value: amount(report[key].totals.netSales),
                display: money(report[key].totals.netSales),
              }))
              .filter((point) => point.value > 0)}
          />
        </Panel>
      ) : null}
      {sections.map(({ key, hideEmpty }) => (
        <SpaSection
          key={key}
          title={t(`salesSummary.${key}`)}
          section={report[key]}
          hideEmpty={hideEmpty}
          money={money}
          share={share}
        />
      ))}
    </>
  );
}

function SpaSection({
  title,
  section,
  hideEmpty,
  money,
  share,
}: {
  title: string;
  section: SpaMenuSection;
  hideEmpty?: boolean;
  money: (value?: string | number | null) => string;
  share: (value?: string) => string;
}) {
  const { t } = useTranslation();
  if (hideEmpty && !section.rows.length) return null;
  return (
    <Panel title={title}>
      <p className="mb-3 text-sm text-slate-600">
        {t("dashboard.netSales")}: {money(section.totals.netSales)} · {t("salesSummary.share")}: {share(section.totals.shareOfNetSales)}
      </p>
      <SimpleTable
        empty={!section.rows.length}
        headers={[
          t("dashboard.columns.product"),
          t("salesSummary.duration"),
          t("dashboard.columns.quantity"),
          t("dashboard.netSales"),
          t("salesSummary.share"),
          t("salesSummary.compedValue"),
        ]}
        rows={section.rows.map((row) => [
          row.includes.length ? `${row.name} (${row.includes.join(", ")})` : row.name,
          row.durationMinutes == null ? "—" : t("salesSummary.minutes", { count: row.durationMinutes }),
          qty(row.quantity),
          money(row.netSales),
          share(row.shareOfNetSales),
          money(row.compedValue),
        ])}
      />
    </Panel>
  );
}

function KtvSessionPanels({
  report,
  mode,
  money,
  amount,
}: {
  report: KtvSessionsReport;
  mode: ReportMode;
  money: (value?: string | number | null) => string;
  amount: (value?: string | number | null) => number;
}) {
  const { t } = useTranslation();
  const roomLabel = (number: string, name?: string | null) => (name ? `${number} · ${name}` : number);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard title={t("salesSummary.sessionCount")} value={report.totals.sessionCount} variant="primary" />
        <MetricCard title={t("salesSummary.hoursSold")} value={qty(report.totals.hoursSold)} />
        <MetricCard title={t("salesSummary.roomSales")} value={money(report.totals.roomSales)} />
        <MetricCard title={t("salesSummary.fnbSales")} value={money(report.totals.fnbSales)} />
      </div>
      <Panel title={t("salesSummary.byRoom")}>
        {mode === "chart" ? (
          <PieChart
            empty={t("salesSummary.empty")}
            points={(report.byRoom || []).map((row) => ({
              label: roomLabel(row.roomNumber, row.roomName),
              value: amount(row.grandTotal),
              display: money(row.grandTotal),
            }))}
          />
        ) : (
          <SimpleTable
            empty={!report.byRoom.length}
            headers={[
              t("salesSummary.room"),
              t("salesSummary.sessionCount"),
              t("salesSummary.hoursSold"),
              t("salesSummary.freeHours"),
              t("dashboard.grandTotal"),
            ]}
            rows={(report.byRoom || []).map((row) => [
              roomLabel(row.roomNumber, row.roomName),
              String(row.sessionCount),
              qty(row.hoursSold),
              qty(row.freeHours),
              money(row.grandTotal),
            ])}
          />
        )}
      </Panel>
      <Panel title={t("salesSummary.sessions")}>
        <SimpleTable
          empty={!report.sessions.length}
          headers={[
            t("dashboard.columns.date"),
            t("salesSummary.room"),
            t("salesSummary.guest"),
            t("salesSummary.minutesUsed"),
            t("dashboard.netSales"),
          ]}
          rows={(report.sessions || []).map((row) => [
            row.orderNumber,
            roomLabel(row.roomNumber, row.roomName),
            `${row.guestName || "—"} · ${row.guestCount}`,
            row.minutesUsed == null ? "—" : String(row.minutesUsed),
            money(row.grandTotal),
          ])}
        />
      </Panel>
    </>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: boolean;
}) {
  const { t } = useTranslation();
  if (empty) return <p className="text-sm text-slate-500">{t("salesSummary.empty")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="py-2 pr-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-t border-slate-100">
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="py-3 pr-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
