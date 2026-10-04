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
  locationIds: string[] | null;
  posType?: string;
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

export interface PosBillLine {
  name: string;
  quantity: string;
  netSales?: string;
  value?: string;
}

export interface PosBill {
  orderId: string;
  orderNumber: string;
  businessDate: string;
  soldAt: string;
  place: string | null;
  guestName?: string | null;
  items: PosBillLine[];
  compedItems: PosBillLine[];
  grossSales: string;
  discounts: string;
  netSales: string;
  tax: string;
  grandTotal: string;
  payments: Array<{ name: string; amount: string }>;
}

export interface PosBillsReport {
  from: string;
  to: string;
  posType: string;
  totals: {
    billCount: number;
    grossSales: string;
    discounts: string;
    netSales: string;
    tax: string;
    grandTotal: string;
  };
  bills: PosBill[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface BarCategoryRow {
  categoryId: string | null;
  categoryName: string;
  orderCount: number;
  quantity: string;
  grossSales: string;
  discounts: string;
  netSales: string;
  shareOfNetSales: string;
  compedQuantity: string;
  compedValue: string;
  refundAmount: string;
  subCategories?: BarCategoryRow[];
}

export interface BarCategoriesReport {
  from: string;
  to: string;
  totals: {
    orderCount: number;
    quantity: string;
    grossSales: string;
    discounts: string;
    netSales: string;
    refundAmount: string;
    compedValue: string;
  };
  categories: BarCategoryRow[];
}

export interface SpaMenuRow {
  variantId: string;
  name: string;
  durationMinutes: number | null;
  includes: string[];
  orderCount: number;
  quantity: string;
  grossSales: string;
  discounts: string;
  netSales: string;
  shareOfNetSales: string;
  compedQuantity: string;
  compedValue: string;
}

export interface SpaMenuSection {
  totals: {
    quantity: string;
    grossSales: string;
    discounts: string;
    netSales: string;
    shareOfNetSales: string;
    compedValue: string;
  };
  rows: SpaMenuRow[];
}

export interface SpaMenuReport {
  from: string;
  to: string;
  totals: {
    orderCount: number;
    netSales: string;
    grandTotal: string;
  };
  spaMenu: SpaMenuSection;
  roomMenuPackages: SpaMenuSection;
  roomServices: SpaMenuSection;
  roomTime: SpaMenuSection;
}

export interface KtvRoomRow {
  roomId: string;
  roomNumber: string;
  roomName: string | null;
  sessionCount: number;
  hoursSold: string;
  freeHours: string;
  roomSales: string;
  fnbSales: string;
  grandTotal: string;
}

export interface KtvSessionRow {
  sessionId: string;
  orderId: string;
  orderNumber: string;
  businessDate: string;
  roomNumber: string;
  roomName: string | null;
  guestName?: string | null;
  guestCount: number;
  openedAt: string;
  closedAt: string | null;
  minutesUsed: number | null;
  hoursSold: string;
  freeHours: string;
  roomSales: string;
  fnbSales: string;
  discounts: string;
  compedValue: string;
  netSales: string;
  grandTotal: string;
  payments: Array<{ name: string; amount: string }>;
}

export interface KtvSessionsReport {
  from: string;
  to: string;
  totals: {
    sessionCount: number;
    hoursSold: string;
    freeHours: string;
    roomSales: string;
    fnbSales: string;
    discounts: string;
    compedValue: string;
    netSales: string;
    grandTotal: string;
  };
  byRoom: KtvRoomRow[];
  sessions: KtvSessionRow[];
}
