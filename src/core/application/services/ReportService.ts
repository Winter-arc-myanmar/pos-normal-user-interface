import {
  DailyReportQuery,
  DatedRangeQuery,
  ItemSalesQuery,
  ReportRangeQuery,
} from "../dtos/ReportDTO";
import {
  ItemSalesReport,
  SalesSummaryReport,
  ZReport,
} from "../../domain/entities/Report";
import { IReportRepository } from "../../domain/repositories/IReportRepository";
import { IReportService } from "../../domain/services/IReportService";

const requireDate = (value: string, label: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
};

export class ReportService implements IReportService {
  constructor(private readonly repository: IReportRepository) {}

  salesSummary(query: ReportRangeQuery): Promise<SalesSummaryReport> {
    requireDate(query.from, "from");
    if (query.to) requireDate(query.to, "to");
    return this.repository.salesSummary(query);
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
