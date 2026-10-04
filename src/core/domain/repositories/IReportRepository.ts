import {
  DailyReportQuery,
  DatedRangeQuery,
  ItemSalesQuery,
  PosBillsQuery,
  PosReportQuery,
  ReportRangeQuery,
} from "../../application/dtos/ReportDTO";
import {
  BarCategoriesReport,
  ItemSalesReport,
  KtvSessionsReport,
  PosBillsReport,
  SalesSummaryReport,
  SpaMenuReport,
  ZReport,
} from "../entities/Report";

export interface IReportRepository {
  salesSummary(query: ReportRangeQuery): Promise<SalesSummaryReport>;
  posSummary(query: PosReportQuery): Promise<SalesSummaryReport>;
  posBills(query: PosBillsQuery): Promise<PosBillsReport>;
  barCategories(query: ReportRangeQuery): Promise<BarCategoriesReport>;
  spaMenu(query: ReportRangeQuery): Promise<SpaMenuReport>;
  ktvSessions(query: ReportRangeQuery): Promise<KtvSessionsReport>;
  itemSales(query: ItemSalesQuery): Promise<ItemSalesReport>;
  zReport(query: DailyReportQuery): Promise<ZReport>;
  salesByCategory(query: DatedRangeQuery): Promise<ZReport["byCategory"]>;
  salesByItem(query: DatedRangeQuery): Promise<ZReport["topItems"]>;
}
