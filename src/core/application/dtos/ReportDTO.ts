export interface ReportRangeQuery {
  from: string;
  to?: string;
  locationId?: string;
}

export interface ItemSalesQuery extends ReportRangeQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  sortBy?:
    | "netSales"
    | "grossSales"
    | "quantitySold"
    | "refundAmount"
    | "productName"
    | "categoryName";
  sortOrder?: "asc" | "desc";
}

export interface DailyReportQuery {
  date: string;
  locationId?: string;
}

export interface DatedRangeQuery {
  fromDate: string;
  toDate: string;
  locationId?: string;
  limit?: number;
}
