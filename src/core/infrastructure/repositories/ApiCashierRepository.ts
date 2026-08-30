import {
  CheckoutRequestDTO,
  CreateOrderPaymentDTO,
  CreateSalesOrderDTO,
  CreateTipPoolDTO,
  CreateWaitlistEntryDTO,
  DiningTableFilterDTO,
  FireKdsDTO,
  OpenTableSessionDTO,
  PosRegisterFilterDTO,
  PosSessionFilterDTO,
  ProductFilterDTO,
  SalesOrderFilterDTO,
  SeatWaitlistEntryDTO,
  TableSessionCheckoutDTO,
  TableSessionFilterDTO,
  CreatePosRegisterDTO,
  CreatePosSessionDTO,
  TipPoolAllocationDTO,
  TipPoolFilterDTO,
  fromApiServiceType,
  UpdateTableSessionStateDTO,
  UpdateSalesOrderLineDTO,
  UpdateTipPoolDTO,
  UpdateWaitlistEntryDTO,
  UpsertSalesOrderLineDTO,
  WaitlistFilterDTO,
} from "../../application/dtos/CashierDTO";
import { ICashierRepository } from "../../domain/repositories/ICashierRepository";
import {
  AdjustmentReason,
  DiningTable,
  DiningZone,
  InventoryLocation,
  OrderPayment,
  PaymentMethod,
  PosRegister,
  PosSession,
  Product,
  ProductVariant,
  SalesOrder,
  SalesOrderLine,
  TableSession,
  TipPool,
  TipPoolAllocation,
  WaitlistEntry,
} from "../../domain/entities/Cashier";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS } from "../api/constants";

interface ApiEnvelope<T> {
  data: T;
}

const unwrap = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return unwrap((response as ApiEnvelope<T>).data);
  }
  return response as T;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toDecimalString = (value: unknown, fallback = "0.0000"): string => {
  const parsed = toNumber(value);
  if (parsed === undefined) return fallback;
  return parsed.toFixed(4);
};

const normalizePartialLinePayload = (
  payload: UpdateSalesOrderLineDTO
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};

  if (payload.variantId !== undefined) normalized.variantId = payload.variantId;
  if (payload.quantity !== undefined) {
    normalized.quantity = Math.max(0.0001, toNumber(payload.quantity) ?? 1);
  }
  if (payload.unitPrice !== undefined) {
    normalized.unitPrice = toNumber(payload.unitPrice) ?? 0;
  }
  if (payload.lineDiscount !== undefined) {
    normalized.lineDiscount = toNumber(payload.lineDiscount) ?? 0;
  }
  if (payload.taxRateId !== undefined) normalized.taxRateId = payload.taxRateId;
  if (payload.taxAmount !== undefined) {
    normalized.taxAmount = toNumber(payload.taxAmount) ?? 0;
  }
  if (payload.appliedPromotionId !== undefined) {
    normalized.appliedPromotionId = payload.appliedPromotionId;
  }
  if (payload.courseType !== undefined) normalized.courseType = payload.courseType;
  if (payload.seatNumber !== undefined) normalized.seatNumber = payload.seatNumber;
  if (payload.selectedModifiers !== undefined) {
    normalized.selectedModifiers = payload.selectedModifiers.map((modifier) => ({
      ...modifier,
      priceDelta: toNumber(modifier.priceDelta) ?? 0,
    }));
  }

  return normalized;
};

const normalizeUpsertLinePayload = (
  payload: UpsertSalesOrderLineDTO
): Record<string, unknown> => {
  const quantity = Math.max(0.0001, toNumber(payload.quantity) ?? 1);
  const unitPrice = toNumber(payload.unitPrice) ?? 0;
  const lineDiscount = toNumber(payload.lineDiscount) ?? 0;
  const taxAmount =
    payload.taxAmount !== undefined ? toNumber(payload.taxAmount) : undefined;

  return {
    variantId: payload.variantId,
    quantity,
    unitPrice,
    lineDiscount,
    ...(payload.taxRateId ? { taxRateId: payload.taxRateId } : {}),
    ...(taxAmount !== undefined ? { taxAmount } : {}),
    ...(payload.appliedPromotionId
      ? { appliedPromotionId: payload.appliedPromotionId }
      : {}),
    ...(payload.courseType ? { courseType: payload.courseType } : {}),
    ...(payload.selectedModifiers
      ? {
          selectedModifiers: payload.selectedModifiers.map((modifier) => ({
            ...modifier,
            priceDelta: toNumber(modifier.priceDelta) ?? 0,
          })),
        }
      : {}),
    ...(payload.seatNumber !== undefined ? { seatNumber: payload.seatNumber } : {}),
  };
};

const normalizePaymentEntriesAsNumbers = (
  payments: Array<{
    paymentMethodId: string;
    amount: string;
    tipAmount?: string;
    transactionReference?: string;
  }>
) =>
  payments.map((payment) => ({
    paymentMethodId: payment.paymentMethodId,
    amount: Math.max(0, toNumber(payment.amount) ?? 0),
    ...(payment.tipAmount !== undefined
      ? { tipAmount: Math.max(0, toNumber(payment.tipAmount) ?? 0) }
      : {}),
    ...(payment.transactionReference
      ? { transactionReference: payment.transactionReference }
      : {}),
  }));

const normalizePaymentEntriesAsDecimals = (
  payments: Array<{
    paymentMethodId: string;
    amount: string;
    tipAmount?: string;
    transactionReference?: string;
  }>
) =>
  payments.map((payment) => ({
    paymentMethodId: payment.paymentMethodId,
    amount: toDecimalString(payment.amount),
    ...(payment.tipAmount !== undefined
      ? { tipAmount: toDecimalString(payment.tipAmount) }
      : {}),
    ...(payment.transactionReference
      ? { transactionReference: payment.transactionReference }
      : {}),
  }));

const normalizeTableSessionCheckoutPayload = (
  payload: TableSessionCheckoutDTO
): Record<string, unknown> => ({
  payments: normalizePaymentEntriesAsNumbers(payload.payments),
  ...(payload.tipAmount !== undefined ? { tipAmount: payload.tipAmount } : {}),
  ...(payload.serviceCharge !== undefined
    ? { serviceCharge: payload.serviceCharge }
    : {}),
  ...(payload.discountReasonId
    ? { discountReasonId: payload.discountReasonId }
    : {}),
  ...(payload.totalDiscount !== undefined
    ? { totalDiscount: payload.totalDiscount }
    : {}),
});

const normalizeCheckoutPayload = (
  payload: CheckoutRequestDTO
): Record<string, unknown> => ({
  tenantId: payload.tenantId,
  locationId: payload.locationId,
  salesChannel: payload.salesChannel,
  serviceType: payload.serviceType,
  ...(payload.customerId ? { customerId: payload.customerId } : {}),
  ...(payload.posSessionId ? { posSessionId: payload.posSessionId } : {}),
  ...(payload.lineStatus ? { lineStatus: payload.lineStatus } : {}),
  ...(payload.idempotencyKey ? { idempotencyKey: payload.idempotencyKey } : {}),
  ...(payload.discountReasonId
    ? { discountReasonId: payload.discountReasonId }
    : {}),
  ...(payload.tipAmount !== undefined
    ? { tipAmount: toDecimalString(payload.tipAmount) }
    : {}),
  ...(payload.serviceCharge !== undefined
    ? { serviceCharge: toDecimalString(payload.serviceCharge) }
    : {}),
  items: payload.items.map((item) => ({
    variantId: item.variantId,
    quantity: toDecimalString(Math.max(0.0001, toNumber(item.quantity) ?? 1)),
    lineDiscount: toDecimalString(item.lineDiscount ?? "0"),
  })),
  payments: normalizePaymentEntriesAsDecimals(payload.payments),
});

const toBoolean = (value: unknown): boolean | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;

const asList = <T>(response: unknown): T[] => {
  const value = unwrap(response);
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const container = value as Record<string, unknown>;
  const listKeys = [
    "items",
    "results",
    "rows",
    "records",
    "products",
    "variants",
    "orders",
    "lines",
    "payments",
    "methods",
    "zones",
    "tables",
    "sessions",
    "reasons",
    "waitlist",
    "tipPools",
    "allocations",
    "locations",
  ];

  for (const key of listKeys) {
    const candidate = container[key];
    if (Array.isArray(candidate)) return candidate as T[];
    if (candidate && typeof candidate === "object") {
      const nested = asList<T>(candidate);
      if (nested.length) return nested;
    }
  }

  return [];
};

const toWaitlistEntry = (item: Record<string, unknown>) =>
  new WaitlistEntry({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    locationId: String(item.locationId || ""),
    customerId: item.customerId ? String(item.customerId) : undefined,
    guestName: String(item.guestName || ""),
    guestPhone: String(item.guestPhone || ""),
    partySize: Number(item.partySize || 0),
    joinedAt: String(item.joinedAt || ""),
    estimatedWaitMins:
      item.estimatedWaitMins !== undefined ? Number(item.estimatedWaitMins) : undefined,
    preferredZoneId: item.preferredZoneId ? String(item.preferredZoneId) : undefined,
    assignedTableId: item.assignedTableId ? String(item.assignedTableId) : undefined,
    tableSessionId: item.tableSessionId ? String(item.tableSessionId) : undefined,
    notifiedAt: item.notifiedAt ? String(item.notifiedAt) : null,
    seatedAt: item.seatedAt ? String(item.seatedAt) : null,
    canceledAt: item.canceledAt ? String(item.canceledAt) : null,
    notes: item.notes ? String(item.notes) : null,
    status: String(item.status || "WAITING") as WaitlistEntry["status"],
  });

const toTipPool = (item: Record<string, unknown>) =>
  new TipPool({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    locationId: String(item.locationId || ""),
    name: String(item.name || ""),
    periodStart: String(item.periodStart || ""),
    periodEnd: String(item.periodEnd || ""),
    distributionMethod: String(item.distributionMethod || ""),
    totalTips: String(item.totalTips || "0.0000"),
    totalServiceCharge: String(item.totalServiceCharge || "0.0000"),
    includeServiceCharge: Boolean(item.includeServiceCharge),
    serviceChargeShareBps: Number(item.serviceChargeShareBps || 0),
    totalDistributable: String(item.totalDistributable || "0.0000"),
    status: String(item.status || "OPEN") as TipPool["status"],
    settledAt: item.settledAt ? String(item.settledAt) : null,
    settledBy: item.settledBy ? String(item.settledBy) : null,
    notes: item.notes ? String(item.notes) : null,
  });

const toTipPoolAllocation = (item: Record<string, unknown>) =>
  new TipPoolAllocation({
    id: String(item.id || ""),
    poolId: String(item.poolId || ""),
    userId: String(item.userId || ""),
    role: String(item.role || ""),
    hoursWorked: String(item.hoursWorked || "0"),
    weight: String(item.weight || "0"),
    amount: String(item.amount || "0"),
    notes: item.notes ? String(item.notes) : null,
  });

const toInventoryLocation = (item: Record<string, unknown>) =>
  new InventoryLocation({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    name: String(item.name || ""),
    type: String(item.type || ""),
    parentLocationId: item.parentLocationId
      ? String(item.parentLocationId)
      : null,
  });

const toPosRegister = (item: Record<string, unknown>) =>
  new PosRegister({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    locationId: String(item.locationId || ""),
    code: String(item.code || ""),
    name: String(item.name || ""),
    macAddress: item.macAddress ? String(item.macAddress) : undefined,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
  });

const toPosSession = (item: Record<string, unknown>) =>
  new PosSession({
    id: String(item.id || ""),
    tenantId: String(item.tenantId || ""),
    registerId: String(item.registerId || ""),
    cashierId: String(item.cashierId || ""),
    openedAt: item.openedAt ? String(item.openedAt) : undefined,
    closedAt: item.closedAt ? String(item.closedAt) : null,
    openingCashFloat: item.openingCashFloat
      ? String(item.openingCashFloat)
      : undefined,
    expectedClosingCash: item.expectedClosingCash
      ? String(item.expectedClosingCash)
      : undefined,
    actualClosingCash: item.actualClosingCash
      ? String(item.actualClosingCash)
      : undefined,
    cashVariance: item.cashVariance ? String(item.cashVariance) : undefined,
    status: String(item.status || "OPEN") as PosSession["status"],
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
  });

const flattenInventoryLocations = (
  nodes: unknown[]
): InventoryLocation[] => {
  const results: InventoryLocation[] = [];

  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;

    const item = node as Record<string, unknown>;
    if (item.id) {
      results.push(toInventoryLocation(item));
    }

    for (const childKey of ["subLocations", "children", "locations"]) {
      const children = item[childKey];
      if (Array.isArray(children) && children.length) {
        results.push(...flattenInventoryLocations(children));
      }
    }
  }

  return results;
};

export class ApiCashierRepository implements ICashierRepository {
  constructor(private readonly httpClient: HttpClient) {}

  async getInventoryLocations(): Promise<InventoryLocation[]> {
    const listResponse = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.LOCATIONS.LIST,
      { params: { page: 1, limit: 100 } }
    );
    const listed = flattenInventoryLocations(
      asList<Record<string, unknown>>(listResponse)
    );
    if (listed.length) {
      return listed;
    }

    const treeResponse = await this.httpClient.get<ApiEnvelope<unknown>>(
      API_ENDPOINTS.LOCATIONS.TREE
    );
    const treeValue = unwrap(treeResponse);
    const treeNodes = Array.isArray(treeValue) ? treeValue : [treeValue];
    return flattenInventoryLocations(treeNodes);
  }

  async getProducts(params?: ProductFilterDTO): Promise<Product[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.PRODUCTS.LIST,
      { params }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) => {
      const taxRate = asRecord(item.taxRate);
      return new Product({
        id: String(item.id || ""),
        tenantId: String(item.tenantId || ""),
        categoryId: item.categoryId ? String(item.categoryId) : undefined,
        name: String(item.name || ""),
        basePrice: String(item.basePrice || "0"),
        baseSku: item.baseSku ? String(item.baseSku) : undefined,
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        totalOnHand: item.totalOnHand ? String(item.totalOnHand) : undefined,
        isTaxable: toBoolean(item.isTaxable),
        taxRate:
          toNumber(item.taxRateRatePercentage) ??
          toNumber(item.taxRatePercentage) ??
          toNumber(item.ratePercentage) ??
          toNumber(taxRate?.ratePercentage) ??
          toNumber(item.taxRate),
        isPriceInclusive:
          toBoolean(item.taxRateIsPriceInclusive) ??
          toBoolean(item.isPriceInclusive) ??
          toBoolean(item.priceInclusive) ??
          toBoolean(taxRate?.isPriceInclusive),
      });
    });
  }

  async getVariants(productId: string): Promise<ProductVariant[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.PRODUCTS.VARIANTS(productId).LIST
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) => {
      const taxRate = asRecord(item.taxRate);
      return new ProductVariant({
        id: String(item.id || ""),
        productId: String(item.productId || productId),
        variantSku: item.variantSku ? String(item.variantSku) : undefined,
        barcode: item.barcode ? String(item.barcode) : undefined,
        priceModifier: item.priceModifier ? String(item.priceModifier) : undefined,
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        matrixOptions:
          item.matrixOptions && typeof item.matrixOptions === "object"
            ? (item.matrixOptions as Record<string, unknown>)
            : undefined,
        isTaxable: toBoolean(item.isTaxable),
        taxRate:
          toNumber(item.taxRateRatePercentage) ??
          toNumber(item.taxRatePercentage) ??
          toNumber(item.ratePercentage) ??
          toNumber(taxRate?.ratePercentage) ??
          toNumber(item.taxRate),
        isPriceInclusive:
          toBoolean(item.taxRateIsPriceInclusive) ??
          toBoolean(item.isPriceInclusive) ??
          toBoolean(item.priceInclusive) ??
          toBoolean(taxRate?.isPriceInclusive),
      });
    });
  }

  async getSalesOrders(params?: SalesOrderFilterDTO): Promise<SalesOrder[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.SALES_ORDERS.LIST,
      { params }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) =>
      new SalesOrder({
        id: String(item.id || ""),
        tenantId: String(item.tenantId || ""),
        customerId: item.customerId ? String(item.customerId) : undefined,
        locationId: String(item.locationId || ""),
        orderNumber: String(item.orderNumber || ""),
        salesChannel: String(item.salesChannel || "POS"),
        serviceType: fromApiServiceType(String(item.serviceType || "DINE_IN")),
        status: String(item.status || "DRAFT") as SalesOrder["status"],
        subtotal: String(item.subtotal || "0"),
        totalDiscount: String(item.totalDiscount || "0"),
        totalTax: String(item.totalTax || "0"),
        grandTotal: String(item.grandTotal || "0"),
        createdAt: String(item.createdAt || ""),
        updatedAt: String(item.updatedAt || ""),
      })
    );
  }

  async getSalesOrderById(id: string): Promise<SalesOrder> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.SALES_ORDERS.BY_ID(id)
    );
    const item = unwrap(response);
    return new SalesOrder({
      id: String(item.id || ""),
      tenantId: String(item.tenantId || ""),
      customerId: item.customerId ? String(item.customerId) : undefined,
      locationId: String(item.locationId || ""),
      orderNumber: String(item.orderNumber || ""),
      salesChannel: String(item.salesChannel || "POS"),
      serviceType: fromApiServiceType(String(item.serviceType || "DINE_IN")),
      status: String(item.status || "DRAFT") as SalesOrder["status"],
      subtotal: String(item.subtotal || "0"),
      totalDiscount: String(item.totalDiscount || "0"),
      totalTax: String(item.totalTax || "0"),
      grandTotal: String(item.grandTotal || "0"),
      createdAt: String(item.createdAt || ""),
      updatedAt: String(item.updatedAt || ""),
    });
  }

  async createSalesOrder(payload: CreateSalesOrderDTO): Promise<SalesOrder> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.SALES_ORDERS.CREATE,
      {
        tenantId: payload.tenantId,
        locationId: payload.locationId,
        customerId: payload.customerId,
        orderNumber: payload.orderNumber,
        salesChannel: payload.salesChannel,
        idempotencyKey: payload.idempotencyKey,
        subtotal: payload.subtotal,
        totalDiscount: payload.totalDiscount,
        totalTax: payload.totalTax,
        grandTotal: payload.grandTotal,
        status: payload.status,
      }
    );
    const item = unwrap(response);
    return new SalesOrder({
      id: String(item.id || ""),
      tenantId: String(item.tenantId || ""),
      customerId: item.customerId ? String(item.customerId) : undefined,
      locationId: String(item.locationId || ""),
      orderNumber: String(item.orderNumber || ""),
      salesChannel: String(item.salesChannel || "POS"),
      serviceType: fromApiServiceType(String(item.serviceType || "DINE_IN")),
      status: String(item.status || "DRAFT") as SalesOrder["status"],
      subtotal: String(item.subtotal || "0"),
      totalDiscount: String(item.totalDiscount || "0"),
      totalTax: String(item.totalTax || "0"),
      grandTotal: String(item.grandTotal || "0"),
      createdAt: String(item.createdAt || ""),
      updatedAt: String(item.updatedAt || ""),
    });
  }

  async addSalesOrderLine(
    salesOrderId: string,
    payload: UpsertSalesOrderLineDTO
  ): Promise<SalesOrderLine> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.SALES_ORDERS.LINES(salesOrderId).CREATE,
      normalizeUpsertLinePayload(payload)
    );
    const item = unwrap(response);
    return new SalesOrderLine({
      id: String(item.id || ""),
      salesOrderId: String(item.salesOrderId || salesOrderId),
      variantId: String(item.variantId || payload.variantId),
      quantity: String(item.quantity || payload.quantity),
      unitPrice: String(item.unitPrice || payload.unitPrice),
      lineDiscount: item.lineDiscount ? String(item.lineDiscount) : undefined,
      taxAmount: item.taxAmount ? String(item.taxAmount) : undefined,
      status: item.status ? String(item.status) : undefined,
      seatNumber:
        typeof item.seatNumber === "number" ? item.seatNumber : payload.seatNumber,
      createdAt: item.createdAt ? String(item.createdAt) : undefined,
    });
  }

  async updateSalesOrderLine(
    salesOrderId: string,
    lineId: string,
    payload: UpdateSalesOrderLineDTO
  ): Promise<SalesOrderLine> {
    const response = await this.httpClient.patch<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.SALES_ORDERS.LINES(salesOrderId).UPDATE(lineId),
      normalizePartialLinePayload(payload)
    );
    const item = unwrap(response);
    return new SalesOrderLine({
      id: String(item.id || lineId),
      salesOrderId: String(item.salesOrderId || salesOrderId),
      variantId: String(item.variantId || payload.variantId || ""),
      quantity: String(item.quantity || payload.quantity || "0"),
      unitPrice: String(item.unitPrice || payload.unitPrice || "0"),
      lineDiscount:
        item.lineDiscount !== undefined
          ? String(item.lineDiscount)
          : payload.lineDiscount,
      taxAmount: item.taxAmount ? String(item.taxAmount) : payload.taxAmount,
      status: item.status ? String(item.status) : undefined,
      seatNumber:
        typeof item.seatNumber === "number" ? item.seatNumber : payload.seatNumber,
      createdAt: item.createdAt ? String(item.createdAt) : undefined,
    });
  }

  async deleteSalesOrderLine(salesOrderId: string, lineId: string): Promise<void> {
    await this.httpClient.delete(
      API_ENDPOINTS.SALES_ORDERS.LINES(salesOrderId).DELETE(lineId)
    );
  }

  async getSalesOrderLines(salesOrderId: string): Promise<SalesOrderLine[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.SALES_ORDERS.LINES(salesOrderId).LIST
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) =>
      new SalesOrderLine({
        id: String(item.id || ""),
        salesOrderId: String(item.salesOrderId || salesOrderId),
        variantId: String(item.variantId || ""),
        quantity: String(item.quantity || "0"),
        unitPrice: String(item.unitPrice || "0"),
        lineDiscount: item.lineDiscount ? String(item.lineDiscount) : undefined,
        taxAmount: item.taxAmount ? String(item.taxAmount) : undefined,
        status: item.status ? String(item.status) : undefined,
        seatNumber: typeof item.seatNumber === "number" ? item.seatNumber : undefined,
        createdAt: item.createdAt ? String(item.createdAt) : undefined,
      })
    );
  }

  async createOrderPayment(
    salesOrderId: string,
    payload: CreateOrderPaymentDTO
  ): Promise<OrderPayment> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.SALES_ORDERS.PAYMENTS(salesOrderId).CREATE,
      payload
    );
    const item = unwrap(response);
    return new OrderPayment({
      id: String(item.id || ""),
      salesOrderId: String(item.salesOrderId || salesOrderId),
      paymentMethodId: String(item.paymentMethodId || payload.paymentMethodId),
      amount: String(item.amount || payload.amount),
      tipAmount: item.tipAmount ? String(item.tipAmount) : payload.tipAmount,
      transactionReference: item.transactionReference
        ? String(item.transactionReference)
        : payload.transactionReference,
      paymentDate: item.paymentDate ? String(item.paymentDate) : undefined,
    });
  }

  async getOrderPayments(salesOrderId: string): Promise<OrderPayment[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.SALES_ORDERS.PAYMENTS(salesOrderId).LIST
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) =>
      new OrderPayment({
        id: String(item.id || ""),
        salesOrderId: String(item.salesOrderId || salesOrderId),
        paymentMethodId: String(item.paymentMethodId || ""),
        amount: String(item.amount || "0"),
        tipAmount: item.tipAmount ? String(item.tipAmount) : undefined,
        transactionReference: item.transactionReference
          ? String(item.transactionReference)
          : undefined,
        paymentDate: item.paymentDate ? String(item.paymentDate) : undefined,
      })
    );
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.PAYMENT_METHODS.LIST,
      { params: { page: 1, limit: 100 } }
    );
    const data = unwrap(response);
    return (Array.isArray(data) ? data : []).map((item) =>
      new PaymentMethod({
        id: String(item.id || ""),
        tenantId: String(item.tenantId || ""),
        name: String(item.name || ""),
      })
    );
  }

  async getPosRegisters(params?: PosRegisterFilterDTO): Promise<PosRegister[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.POS_REGISTERS.LIST,
      { params: { page: 1, limit: 100, ...params } }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) => toPosRegister(item));
  }

  async createPosRegister(payload: CreatePosRegisterDTO): Promise<PosRegister> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.POS_REGISTERS.CREATE,
      payload
    );
    return toPosRegister(unwrap(response));
  }

  async getPosSessions(params?: PosSessionFilterDTO): Promise<PosSession[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.POS_SESSIONS.LIST,
      { params: { page: 1, limit: 200, ...params } }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) => toPosSession(item));
  }

  async createPosSession(payload: CreatePosSessionDTO): Promise<PosSession> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.POS_SESSIONS.CREATE,
      payload
    );
    return toPosSession(unwrap(response));
  }

  async closePosSession(sessionId: string): Promise<PosSession> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.POS_SESSIONS.CLOSE(sessionId)
    );
    return toPosSession(unwrap(response));
  }

  async getDiningZones(): Promise<DiningZone[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.DINING_ZONES.LIST,
      { params: { page: 1, limit: 100 } }
    );
    const data = asList<Record<string, unknown>>(response);
    return data
      .map(
        (item) =>
          new DiningZone({
            id: String(item.id || ""),
            tenantId: String(item.tenantId || ""),
            name: String(item.name || ""),
            sortOrder: Number(item.sortOrder || 0),
            layoutSvg: item.layoutSvg ? String(item.layoutSvg) : undefined,
          })
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  async getDiningTables(params?: DiningTableFilterDTO): Promise<DiningTable[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.DINING_TABLES.LIST,
      { params }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map(
      (item) =>
        new DiningTable({
          id: String(item.id || ""),
          tenantId: String(item.tenantId || ""),
          zoneId: String(item.zoneId || ""),
          tableNumber: String(item.tableNumber || ""),
          maxSeats: Number(item.maxSeats || 0),
          posX: item.posX ? String(item.posX) : undefined,
          posY: item.posY ? String(item.posY) : undefined,
          shape: item.shape ? String(item.shape) : undefined,
          status: String(item.status || "AVAILABLE") as DiningTable["status"],
        })
    );
  }

  async updateDiningTableStatus(
    tableId: string,
    status: DiningTable["status"]
  ): Promise<DiningTable> {
    const response = await this.httpClient.patch<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.DINING_TABLES.UPDATE_STATUS(tableId),
      { status }
    );
    const item = unwrap(response);
    return new DiningTable({
      id: String(item.id || ""),
      tenantId: String(item.tenantId || ""),
      zoneId: String(item.zoneId || ""),
      tableNumber: String(item.tableNumber || ""),
      maxSeats: Number(item.maxSeats || 0),
      posX: item.posX ? String(item.posX) : undefined,
      posY: item.posY ? String(item.posY) : undefined,
      shape: item.shape ? String(item.shape) : undefined,
      status: String(item.status || "AVAILABLE") as DiningTable["status"],
    });
  }

  async getTableSessions(params?: TableSessionFilterDTO): Promise<TableSession[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.TABLE_SESSIONS.LIST,
      { params }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map(
      (item) =>
        new TableSession({
          id: String(item.id || ""),
          tenantId: String(item.tenantId || ""),
          tableId: String(item.tableId || ""),
          waiterId: item.waiterId ? String(item.waiterId) : undefined,
          guestCount: Number(item.guestCount || 0),
          openedAt: String(item.openedAt || ""),
          closedAt: item.closedAt ? String(item.closedAt) : null,
          salesOrderId: String(item.salesOrderId || ""),
          sessionState: String(item.sessionState || "SEATED") as TableSession["sessionState"],
          posRegisterId: item.posRegisterId ? String(item.posRegisterId) : undefined,
          openedByPosSessionId: item.openedByPosSessionId
            ? String(item.openedByPosSessionId)
            : undefined,
        })
    );
  }

  async openTableSession(payload: OpenTableSessionDTO): Promise<TableSession> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TABLE_SESSIONS.CREATE,
      payload
    );
    const item = unwrap(response);
    return new TableSession({
      id: String(item.id || ""),
      tenantId: String(item.tenantId || ""),
      tableId: String(item.tableId || ""),
      waiterId: item.waiterId ? String(item.waiterId) : undefined,
      guestCount: Number(item.guestCount || payload.guestCount),
      openedAt: String(item.openedAt || ""),
      closedAt: item.closedAt ? String(item.closedAt) : null,
      salesOrderId: String(item.salesOrderId || ""),
      sessionState: String(item.sessionState || "SEATED") as TableSession["sessionState"],
      posRegisterId: item.posRegisterId ? String(item.posRegisterId) : undefined,
      openedByPosSessionId: item.openedByPosSessionId
        ? String(item.openedByPosSessionId)
        : undefined,
    });
  }

  async updateTableSessionState(
    sessionId: string,
    payload: UpdateTableSessionStateDTO
  ): Promise<TableSession> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TABLE_SESSIONS.STATE(sessionId),
      payload
    );
    const item = unwrap(response);
    return new TableSession({
      id: String(item.id || ""),
      tenantId: String(item.tenantId || ""),
      tableId: String(item.tableId || ""),
      waiterId: item.waiterId ? String(item.waiterId) : undefined,
      guestCount: Number(item.guestCount || 0),
      openedAt: String(item.openedAt || ""),
      closedAt: item.closedAt ? String(item.closedAt) : null,
      salesOrderId: String(item.salesOrderId || ""),
      sessionState: String(item.sessionState || payload.sessionState) as TableSession["sessionState"],
      posRegisterId: item.posRegisterId ? String(item.posRegisterId) : undefined,
      openedByPosSessionId: item.openedByPosSessionId
        ? String(item.openedByPosSessionId)
        : undefined,
    });
  }

  async addTableSessionLine(
    sessionId: string,
    payload: UpsertSalesOrderLineDTO
  ): Promise<SalesOrderLine> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TABLE_SESSIONS.LINES(sessionId),
      normalizeUpsertLinePayload(payload)
    );
    const item = unwrap(response);
    return new SalesOrderLine({
      id: String(item.id || ""),
      salesOrderId: String(item.salesOrderId || ""),
      variantId: String(item.variantId || payload.variantId),
      quantity: String(item.quantity || payload.quantity),
      unitPrice: String(item.unitPrice || payload.unitPrice),
      status: item.status ? String(item.status) : undefined,
      seatNumber:
        typeof item.seatNumber === "number" ? item.seatNumber : payload.seatNumber,
    });
  }

  async checkoutTableSession(
    sessionId: string,
    payload: TableSessionCheckoutDTO
  ): Promise<TableSession> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TABLE_SESSIONS.CHECKOUT(sessionId),
      normalizeTableSessionCheckoutPayload(payload)
    );
    const item = unwrap(response);
    return new TableSession({
      id: String(item.id || ""),
      tenantId: String(item.tenantId || ""),
      tableId: String(item.tableId || ""),
      waiterId: item.waiterId ? String(item.waiterId) : undefined,
      guestCount: Number(item.guestCount || 0),
      openedAt: String(item.openedAt || ""),
      closedAt: item.closedAt ? String(item.closedAt) : null,
      salesOrderId: String(item.salesOrderId || ""),
      sessionState: String(item.sessionState || "CLOSED") as TableSession["sessionState"],
      posRegisterId: item.posRegisterId ? String(item.posRegisterId) : undefined,
      openedByPosSessionId: item.openedByPosSessionId
        ? String(item.openedByPosSessionId)
        : undefined,
    });
  }

  async fireToKds(payload: FireKdsDTO): Promise<Record<string, unknown>> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.KDS.FIRE,
      payload
    );
    return unwrap(response);
  }

  async getDiscountReasons(activeOnly: boolean = true): Promise<AdjustmentReason[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.DISCOUNT_REASONS.LIST,
      { params: { page: 1, limit: 100, activeOnly: activeOnly ? "true" : "false" } }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map(
      (item) =>
        new AdjustmentReason({
          id: String(item.id || ""),
          tenantId: String(item.tenantId || ""),
          code: String(item.code || ""),
          name: String(item.name || ""),
          description: item.description ? String(item.description) : undefined,
          isActive: Boolean(item.isActive),
          requiresManagerOverride: Boolean(item.requiresManagerOverride),
        })
    );
  }

  async getVoidReasons(activeOnly: boolean = true): Promise<AdjustmentReason[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.VOID_REASONS.LIST,
      { params: { page: 1, limit: 100, activeOnly: activeOnly ? "true" : "false" } }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map(
      (item) =>
        new AdjustmentReason({
          id: String(item.id || ""),
          tenantId: String(item.tenantId || ""),
          code: String(item.code || ""),
          name: String(item.name || ""),
          description: item.description ? String(item.description) : undefined,
          isActive: Boolean(item.isActive),
          requiresManagerOverride: Boolean(item.requiresManagerOverride),
        })
    );
  }

  async getWaitlist(params?: WaitlistFilterDTO): Promise<WaitlistEntry[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.WAITLIST.LIST,
      { params }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) => toWaitlistEntry(item));
  }

  async createWaitlistEntry(payload: CreateWaitlistEntryDTO): Promise<WaitlistEntry> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.WAITLIST.CREATE,
      payload
    );
    return toWaitlistEntry(unwrap(response));
  }

  async updateWaitlistEntry(
    id: string,
    payload: UpdateWaitlistEntryDTO
  ): Promise<WaitlistEntry> {
    const response = await this.httpClient.patch<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.WAITLIST.UPDATE(id),
      payload
    );
    return toWaitlistEntry(unwrap(response));
  }

  async notifyWaitlistEntry(id: string): Promise<WaitlistEntry> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.WAITLIST.NOTIFY(id)
    );
    return toWaitlistEntry(unwrap(response));
  }

  async seatWaitlistEntry(
    id: string,
    payload: SeatWaitlistEntryDTO
  ): Promise<WaitlistEntry> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.WAITLIST.SEAT(id),
      payload
    );
    const data = unwrap(response);
    const nestedReservation =
      data && typeof data.reservation === "object"
        ? (data.reservation as Record<string, unknown>)
        : data;
    return toWaitlistEntry(nestedReservation);
  }

  async cancelWaitlistEntry(id: string): Promise<WaitlistEntry> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.WAITLIST.CANCEL(id)
    );
    return toWaitlistEntry(unwrap(response));
  }

  async noShowWaitlistEntry(id: string): Promise<WaitlistEntry> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.WAITLIST.NO_SHOW(id)
    );
    return toWaitlistEntry(unwrap(response));
  }

  async getTipPools(params?: TipPoolFilterDTO): Promise<TipPool[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.TIP_POOLS.LIST,
      { params }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) => toTipPool(item));
  }

  async getTipPoolById(id: string): Promise<TipPool> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TIP_POOLS.BY_ID(id)
    );
    return toTipPool(unwrap(response));
  }

  async createTipPool(payload: CreateTipPoolDTO): Promise<TipPool> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TIP_POOLS.CREATE,
      payload
    );
    return toTipPool(unwrap(response));
  }

  async updateTipPool(id: string, payload: UpdateTipPoolDTO): Promise<TipPool> {
    const response = await this.httpClient.patch<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TIP_POOLS.UPDATE(id),
      payload
    );
    return toTipPool(unwrap(response));
  }

  async distributeTipPool(id: string): Promise<TipPool> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TIP_POOLS.DISTRIBUTE(id)
    );
    return toTipPool(unwrap(response));
  }

  async settleTipPool(id: string): Promise<TipPool> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TIP_POOLS.SETTLE(id)
    );
    return toTipPool(unwrap(response));
  }

  async getTipPoolAllocations(poolId: string): Promise<TipPoolAllocation[]> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>[]>>(
      API_ENDPOINTS.TIP_POOLS.ALLOCATIONS.LIST(poolId),
      { params: { page: 1, limit: 200 } }
    );
    const data = asList<Record<string, unknown>>(response);
    return data.map((item) => toTipPoolAllocation(item));
  }

  async createTipPoolAllocation(
    poolId: string,
    payload: TipPoolAllocationDTO
  ): Promise<TipPoolAllocation> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TIP_POOLS.ALLOCATIONS.CREATE(poolId),
      payload
    );
    return toTipPoolAllocation(unwrap(response));
  }

  async updateTipPoolAllocation(
    poolId: string,
    allocationId: string,
    payload: Partial<TipPoolAllocationDTO>
  ): Promise<TipPoolAllocation> {
    const response = await this.httpClient.patch<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.TIP_POOLS.ALLOCATIONS.UPDATE(poolId, allocationId),
      payload
    );
    return toTipPoolAllocation(unwrap(response));
  }

  async deleteTipPoolAllocation(poolId: string, allocationId: string): Promise<void> {
    await this.httpClient.delete(
      API_ENDPOINTS.TIP_POOLS.ALLOCATIONS.DELETE(poolId, allocationId)
    );
  }

  async getCounterOrderById(id: string): Promise<Record<string, unknown>> {
    const response = await this.httpClient.get<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.COUNTER_ORDERS.BY_ID(id)
    );
    return unwrap(response);
  }

  async pickupCounterOrder(id: string): Promise<Record<string, unknown>> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.COUNTER_ORDERS.PICKUP(id)
    );
    return unwrap(response);
  }

  async checkout(payload: CheckoutRequestDTO): Promise<Record<string, unknown>> {
    const response = await this.httpClient.post<ApiEnvelope<Record<string, unknown>>>(
      API_ENDPOINTS.CHECKOUT.PROCESS,
      normalizeCheckoutPayload(payload)
    );
    return unwrap(response);
  }
}
