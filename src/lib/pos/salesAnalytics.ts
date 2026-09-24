import {
  OrderPayment,
  PaymentMethod,
  PosSession,
  SalesOrder,
  SalesOrderLine,
} from "@/core/domain/entities/Cashier";

export interface RankedTotal {
  name: string;
  quantity: number;
  amount: number;
}

export interface SalesAnalytics {
  orderCount: number;
  netSales: number;
  discounts: number;
  tax: number;
  averageTicket: number;
  payments: RankedTotal[];
  items: RankedTotal[];
  categories: RankedTotal[];
  shifts: PosSession[];
}

const money = (value?: string | number | null) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const addRank = (
  rows: Map<string, RankedTotal>,
  name: string,
  quantity: number,
  amount: number
) => {
  const current = rows.get(name) || { name, quantity: 0, amount: 0 };
  current.quantity += quantity;
  current.amount += amount;
  rows.set(name, current);
};

const ranked = (rows: Map<string, RankedTotal>) =>
  Array.from(rows.values()).sort((left, right) => right.amount - left.amount);

export function buildSalesAnalytics(input: {
  orders: SalesOrder[];
  lines: SalesOrderLine[];
  payments: OrderPayment[];
  methods: PaymentMethod[];
  shifts: PosSession[];
  uncategorized: string;
}): SalesAnalytics {
  const netSales = input.orders.reduce(
    (sum, order) => sum + money(order.grandTotal),
    0
  );
  const discounts = input.orders.reduce(
    (sum, order) => sum + money(order.totalDiscount),
    0
  );
  const tax = input.orders.reduce((sum, order) => sum + money(order.totalTax), 0);
  const methodNames = new Map(
    input.methods.map((method) => [method.id, method.name || method.code || method.id])
  );
  const payments = new Map<string, RankedTotal>();
  input.payments.forEach((payment) => {
    addRank(
      payments,
      methodNames.get(payment.paymentMethodId) || payment.paymentMethodId,
      1,
      money(payment.amount)
    );
  });
  const items = new Map<string, RankedTotal>();
  const categories = new Map<string, RankedTotal>();
  input.lines
    .filter((line) => !line.voidedAt)
    .forEach((line) => {
      const quantity = money(line.quantity);
      const amount = quantity * money(line.unitPrice);
      const name = line.productName || line.variantName || line.sku || line.variantId;
      addRank(items, name, quantity, amount);
      addRank(categories, line.categoryName || input.uncategorized, quantity, amount);
    });

  return {
    orderCount: input.orders.length,
    netSales,
    discounts,
    tax,
    averageTicket: input.orders.length ? netSales / input.orders.length : 0,
    payments: ranked(payments),
    items: ranked(items),
    categories: ranked(categories),
    shifts: input.shifts,
  };
}

export function sessionOnDate(session: PosSession, date: string) {
  return String(session.openedAt || "").slice(0, 10) === date;
}
