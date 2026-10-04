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
} from "../../domain/entities/Report";
import { IReportRepository } from "../../domain/repositories/IReportRepository";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

interface ApiEnvelope<T> {
  data?: T;
}

const definedParams = (query: object) => {
  const params: Record<string, string | number> = {};
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params[key] = value as string | number;
  });
  return params;
};

export class ApiReportRepository implements IReportRepository {
  constructor(private readonly httpClient: HttpClient) {}

  private async getData<T>(path: string, query: object): Promise<T> {
    const response = await this.httpClient.get<ApiEnvelope<T> | T>(path, {
      params: definedParams(query),
    });
    if (response && typeof response === "object" && "data" in response) {
      return (response as ApiEnvelope<T>).data as T;
    }
    return response as T;
  }

  salesSummary(query: ReportRangeQuery) {
    return this.getData<SalesSummaryReport>(API_ENDPOINTS.REPORTS.SALES_SUMMARY, query);
  }

  posSummary(query: PosReportQuery) {
    return this.getData<SalesSummaryReport>(API_ENDPOINTS.REPORTS.POS_SUMMARY, query);
  }

  posBills(query: PosBillsQuery) {
    return this.getData<PosBillsReport>(API_ENDPOINTS.REPORTS.POS_BILLS, query);
  }

  barCategories(query: ReportRangeQuery) {
    return this.getData<BarCategoriesReport>(API_ENDPOINTS.REPORTS.BAR_CATEGORIES, query);
  }

  spaMenu(query: ReportRangeQuery) {
    return this.getData<SpaMenuReport>(API_ENDPOINTS.REPORTS.SPA_MENU, query);
  }

  ktvSessions(query: ReportRangeQuery) {
    return this.getData<KtvSessionsReport>(API_ENDPOINTS.REPORTS.KTV_SESSIONS, query);
  }

  itemSales(query: ItemSalesQuery) {
    return this.getData<ItemSalesReport>(API_ENDPOINTS.REPORTS.ITEM_SALES, query);
  }

  zReport(query: DailyReportQuery) {
    return this.getData<ZReport>(API_ENDPOINTS.REPORTS.Z_REPORT, query);
  }

  salesByCategory(query: DatedRangeQuery) {
    return this.getData<ZReport["byCategory"]>(
      API_ENDPOINTS.REPORTS.SALES_BY_CATEGORY,
      query
    );
  }

  salesByItem(query: DatedRangeQuery) {
    return this.getData<ZReport["topItems"]>(API_ENDPOINTS.REPORTS.SALES_BY_ITEM, query);
  }
}
