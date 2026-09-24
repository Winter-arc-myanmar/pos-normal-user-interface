import { useCallback, useState } from "react";
import {
  DailyReportQuery,
  DatedRangeQuery,
  ItemSalesQuery,
  ReportRangeQuery,
} from "../../application/dtos/ReportDTO";
import { IReportService } from "../../domain/services/IReportService";
import container from "../../infrastructure/di/container";

const reportService = container.resolve<IReportService>("reportService");

export function useReports() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Report request failed";
      setError(message);
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const salesSummary = useCallback(
    (query: ReportRangeQuery) => run(() => reportService.salesSummary(query)),
    [run]
  );
  const itemSales = useCallback(
    (query: ItemSalesQuery) => run(() => reportService.itemSales(query)),
    [run]
  );
  const zReport = useCallback(
    (query: DailyReportQuery) => run(() => reportService.zReport(query)),
    [run]
  );
  const salesByCategory = useCallback(
    (query: DatedRangeQuery) => run(() => reportService.salesByCategory(query)),
    [run]
  );
  const salesByItem = useCallback(
    (query: DatedRangeQuery) => run(() => reportService.salesByItem(query)),
    [run]
  );

  return { isLoading, error, salesSummary, itemSales, zReport, salesByCategory, salesByItem };
}
