import type {
  EditOrderLineDTO,
  EditSalesOrderPreviewDTO,
} from "@/core/application/dtos/SalesOrderDTO";
import type { OrderPayment, PaymentMethod, SalesOrder, SalesOrderLine } from "@/core/domain/entities/Cashier";
import { lineDisplayName } from "./orderListDisplay";

/** A line in the edit: one already on the order, or one being added. */
export interface EditLine {
  key: string;
  id?: string;
  variantId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  hostessId?: string | null;
  hostessName?: string;
  removed: boolean;
}

export interface OrderEditState {
  lines: EditLine[];
  billDiscount: string;
  discountReasonId: string;
  includeTax: boolean;
  includeServiceCharge: boolean;
  customerId: string | null;
  customerName: string;
  /** Payment id to the method it was really paid with. */
  paymentMethods: Record<string, string>;
}

const NOT_CHARGED = ["VOIDED", "COMPED"];

/** Payments that moved a wallet or account balance cannot be relabelled. */
const BALANCE_KINDS = ["GUEST_CARD", "CUSTOMER_CREDIT"];

export const isChargedLine = (line: Pick<SalesOrderLine, "status">) =>
  !NOT_CHARGED.includes(String(line.status || "").toUpperCase());

const amount = (value: unknown) => Number(value) || 0;

export const initialEditState = (
  order: SalesOrder,
  lines: SalesOrderLine[],
  fallbackName: string
): OrderEditState => {
  const charged = lines.filter(isChargedLine);
  const lineDiscounts = charged.reduce((sum, line) => sum + amount(line.lineDiscount), 0);
  return {
    lines: charged.map((line) => ({
      key: line.id,
      id: line.id,
      variantId: line.variantId,
      name: lineDisplayName(line) || fallbackName,
      quantity: amount(line.quantity),
      unitPrice: String(amount(line.unitPrice)),
      hostessId: line.hostessId ?? null,
      removed: false,
    })),
    billDiscount: String(Math.max(0, amount(order.totalDiscount) - lineDiscounts)),
    discountReasonId: "",
    includeTax: amount(order.totalTax) > 0,
    includeServiceCharge: amount(order.serviceCharge) > 0,
    customerId: order.customerId || null,
    customerName: order.customerName || "",
    paymentMethods: {},
  };
};

const decimal = (value: number | string) => (Number(value) || 0).toFixed(4);

/** The order as it should be, in the shape the edit and its preview take. */
export const editPayload = (
  state: OrderEditState,
  initial: OrderEditState
): EditSalesOrderPreviewDTO => {
  const lines: EditOrderLineDTO[] = state.lines
    .filter((line) => !line.removed)
    .map((line) => {
      const before = initial.lines.find((item) => item.key === line.key);
      return {
        ...(line.id ? { id: line.id } : { variantId: line.variantId }),
        quantity: decimal(line.quantity),
        unitPrice: decimal(line.unitPrice),
        ...(line.hostessId !== before?.hostessId ? { hostessId: line.hostessId ?? null } : {}),
      };
    });
  const relabelled = Object.entries(state.paymentMethods).map(([paymentId, paymentMethodId]) => ({
    paymentId,
    paymentMethodId,
  }));
  return {
    lines,
    billDiscount: decimal(state.billDiscount),
    ...(state.discountReasonId ? { discountReasonId: state.discountReasonId } : {}),
    includeTax: state.includeTax,
    includeServiceCharge: state.includeServiceCharge,
    ...(state.customerId !== initial.customerId ? { customerId: state.customerId } : {}),
    ...(relabelled.length ? { paymentMethods: relabelled } : {}),
  };
};

export const hasEditChanges = (state: OrderEditState, initial: OrderEditState) =>
  JSON.stringify(editPayload(state, initial)) !== JSON.stringify(editPayload(initial, initial));

/** A payment taken with a method that did not move a balance, so can be relabelled. */
export const canRelabel = (payment: OrderPayment, method?: PaymentMethod) =>
  amount(payment.amount) > 0 &&
  !payment.walletLedgerEntryId &&
  !BALANCE_KINDS.includes(String(method?.kind || "").toUpperCase());

export const relabelChoices = (methods: PaymentMethod[]) =>
  methods.filter(
    (method) => method.isActive !== false && !BALANCE_KINDS.includes(String(method.kind || "").toUpperCase())
  );

export const isGuestCardMethod = (method?: PaymentMethod) =>
  String(method?.kind || "").toUpperCase() === "GUEST_CARD";
