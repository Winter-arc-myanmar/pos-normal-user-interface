import {
  DailyReportQuery,
  DatedRangeQuery,
  ItemSalesQuery,
  ReportRangeQuery,
} from "../../application/dtos/ReportDTO";
import {
  ItemSalesReport,
  SalesSummaryReport,
  ZReport,
} from "../entities/Report";

export interface IReportRepository {
  salesSummary(query: ReportRangeQuery): Promise<SalesSummaryReport>;
  itemSales(query: ItemSalesQuery): Promise<ItemSalesReport>;
  zReport(query: DailyReportQuery): Promise<ZReport>;
  salesByCategory(query: DatedRangeQuery): Promise<ZReport["byCategory"]>;
  salesByItem(query: DatedRangeQuery): Promise<ZReport["topItems"]>;
}
