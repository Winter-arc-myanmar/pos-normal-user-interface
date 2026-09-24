import { useCallback, useState } from "react";
import { SalesOrder, SalesOrderLine, OrderPayment, PaymentMethod, PosSession } from "../../domain/entities/Cashier";
import { ICashierService } from "../../domain/services/ICashierService";
import { ISalesOrderService } from "../../domain/services/ISalesOrderService";
import container from "../../infrastructure/di/container";

const salesOrderService = container.resolve<ISalesOrderService>("salesOrderService");
const cashierService = container.resolve<ICashierService>("cashierService");

export interface SalesAnalyticsLoad {
  orders: SalesOrder[];
  lines: SalesOrderLine[];
  payments: OrderPayment[];
  methods: PaymentMethod[];
  shifts: PosSession[];
}

export function useSalesAnalytics() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string): Promise<SalesAnalyticsLoad> => {
    setIsLoading(true);
    setError(null);
    try {
      const [listed, methods, shifts] = await Promise.all([
        salesOrderService.getSalesOrders({
          status: "COMPLETED",
          dateFrom: date,
          dateTo: date,
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
        cashierService.getPaymentMethods(),
        cashierService.getPosSessions({ page: 1, limit: 50 }),
      ]);
      const details = await Promise.all(
        listed.orders.map(async (order) => {
          const [lines, payments] = await Promise.all([
            salesOrderService.getSalesOrderLines(order.id, { page: 1, limit: 100 }),
            cashierService.getOrderPayments(order.id),
          ]);
          return { lines: lines.lines, payments };
        })
      );
      return {
        orders: listed.orders,
        lines: details.flatMap((detail) => detail.lines),
        payments: details.flatMap((detail) => detail.payments),
        methods,
        shifts,
      };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to load sales analytics";
      setError(message);
      throw caught;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { load, isLoading, error };
}
