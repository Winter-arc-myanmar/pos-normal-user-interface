import {
  DailyReportQuery,
  DatedRangeQuery,
  ItemSalesQuery,
  PosBillsQuery,
  PosReportQuery,
  ReportRangeQuery,
} from "../dtos/ReportDTO";
import {
  BarCategoriesReport,
  ItemSalesReport,
  KtvSessionsReport,
  PosBillsReport,
  SalesSummaryReport,
  SpaMenuReport,
  ZReport,
} from "../../domain/entities/Report";
import { IReportRepository } from "../../domain/repositories/IReportRepository";
import { IReportService } from "../../domain/services/IReportService";

const POS_TYPES = new Set(["SPA", "KTV", "BAR"]);

const requireDate = (value: string, label: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
};

const requirePosType = (value: string) => {
  if (!POS_TYPES.has(value)) {
    throw new Error("posType must be SPA, KTV, or BAR");
  }
};

const requireRange = (query: ReportRangeQuery) => {
  requireDate(query.from, "from");
  if (query.to) requireDate(query.to, "to");
};

const padHours = (report: SalesSummaryReport): SalesSummaryReport => {
  const byHour = Array.from({ length: 24 }, (_, hour) => {
    const row = report.byHour?.find((item) => item.hour === hour);
    return row || { hour, orderCount: 0, netSales: "0.0000", grandTotal: "0.0000" };
  });
  return { ...report, byHour };
};

export class ReportService implements IReportService {
  constructor(private readonly repository: IReportRepository) {}

  salesSummary(query: ReportRangeQuery): Promise<SalesSummaryReport> {
    requireRange(query);
    return this.repository.salesSummary(query);
  }

  async posSummary(query: PosReportQuery): Promise<SalesSummaryReport> {
    requireRange(query);
    requirePosType(query.posType);
    return padHours(await this.repository.posSummary(query));
  }

  posBills(query: PosBillsQuery): Promise<PosBillsReport> {
    requireRange(query);
    requirePosType(query.posType);
    return this.repository.posBills(query);
  }

  barCategories(query: ReportRangeQuery): Promise<BarCategoriesReport> {
    requireRange(query);
    return this.repository.barCategories(query);
  }

  spaMenu(query: ReportRangeQuery): Promise<SpaMenuReport> {
    requireRange(query);
    return this.repository.spaMenu(query);
  }

  ktvSessions(query: ReportRangeQuery): Promise<KtvSessionsReport> {
    requireRange(query);
    return this.repository.ktvSessions(query);
  }

  itemSales(query: ItemSalesQuery): Promise<ItemSalesReport> {
    requireDate(query.from, "from");
    if (query.to) requireDate(query.to, "to");
    return this.repository.itemSales(query);
  }

  zReport(query: DailyReportQuery): Promise<ZReport> {
    requireDate(query.date, "date");
    return this.repository.zReport(query);
  }

  salesByCategory(query: DatedRangeQuery) {
    requireDate(query.fromDate, "fromDate");
    requireDate(query.toDate, "toDate");
    return this.repository.salesByCategory(query);
  }

  salesByItem(query: DatedRangeQuery) {
    requireDate(query.fromDate, "fromDate");
    requireDate(query.toDate, "toDate");
    return this.repository.salesByItem(query);
  }
}
