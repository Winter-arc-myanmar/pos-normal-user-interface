export interface MoneyCount {
  count: number;
  amount: string;
}

export interface PaymentMethodTotal {
  paymentMethodId: string;
  name: string;
  kind: string;
  count: number;
  amount: string;
}

export interface SalesSummaryReport {
  from: string;
  to: string;
  locationIds: string[];
  orders: {
    count: number;
    averageNetSales: string;
    averageGrandTotal: string;
    voided: MoneyCount;
  };
  sales: {
    grossSales: string;
    lineDiscounts: string;
    orderDiscounts: string;
    totalDiscounts: string;
    netSales: string;
    serviceCharge: string;
    tax: string;
    tips: string;
    grandTotal: string;
  };
  refunds: {
    count: number;
    subtotal: string;
    tax: string;
    total: string;
    byMethod: Array<{ refundMethod: string; count: number; amount: string }>;
  };
  netAfterRefunds: string;
  voidedLines: MoneyCount;
  compedLines: MoneyCount;
  payments: {
    byMethod: PaymentMethodTotal[];
    tendered: string;
    changeGiven: string;
  };
  byDay: Array<{
    businessDate: string;
    orderCount: number;
    netSales: string;
    grandTotal: string;
    refunds: string;
  }>;
  byHour: Array<{
    hour: number;
    orderCount: number;
    netSales: string;
    grandTotal: string;
  }>;
  byOutlet: Array<{
    locationId: string;
    locationName: string;
    orderCount: number;
    netSales: string;
    grandTotal: string;
  }>;
  byServiceType: Array<{
    serviceType: string;
    orderCount: number;
    netSales: string;
    grandTotal: string;
  }>;
}

export interface ItemSalesReport {
  from: string;
  to: string;
  locationIds: string[];
  totals: {
    itemCount: number;
    quantitySold: string;
    grossSales: string;
    lineDiscounts: string;
    orderDiscounts: string;
    netSales: string;
    quantityReturned: string;
    refundAmount: string;
    netAfterRefunds: string;
    quantityVoided: string;
    voidedValue: string;
    quantityComped: string;
    compedValue: string;
  };
  categories: Array<{
    categoryId: string;
    categoryName: string;
    orderCount: number;
    quantitySold: string;
    netSales: string;
    shareOfNetSales: string;
    refundAmount: string;
  }>;
  items: Array<{
    variantId: string;
    productId: string;
    productName: string;
    variantSku: string;
    categoryId: string;
    categoryName: string;
    orderCount: number;
    quantitySold: string;
    averagePrice: string;
    grossSales: string;
    lineDiscounts: string;
    orderDiscounts: string;
    netSales: string;
    shareOfNetSales: string;
    quantityReturned: string;
    refundAmount: string;
    netQuantity: string;
    netAfterRefunds: string;
    quantityVoided: string;
    voidedValue: string;
    quantityComped: string;
    compedValue: string;
  }>;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ZReport {
  locationId: string;
  date: string;
  orders: { completed: number; voided: number; refunded: number };
  totals: {
    subtotal: string;
    totalDiscount: string;
    totalTax: string;
    tipAmount: string;
    serviceCharge: string;
    grandTotal: string;
  };
  payments: Array<{
    paymentMethodId: string;
    method: string;
    total: string;
    tip: string;
  }>;
  topItems: Array<{
    variantId: string;
    productName: string;
    variantSku: string;
    quantitySold: string;
    totalRevenue: string;
  }>;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    orderCount: number;
    totalRevenue: string;
  }>;
}
