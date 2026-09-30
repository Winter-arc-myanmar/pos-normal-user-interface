export class SalesRefundLine {
  id!: string;
  salesOrderLineId!: string;
  variantId?: string;
  returnedQuantity!: string;
  unitPrice!: string;
  lineDiscount!: string;
  taxAmount!: string;
  lineRefund!: string;

  constructor(data: Partial<SalesRefundLine>) {
    Object.assign(this, data);
  }
}

export class SalesRefund {
  returnId!: string;
  returnNumber!: string;
  salesOrderId!: string;
  reason!: string;
  refundMethod!: string;
  subtotalRefund!: string;
  taxRefund!: string;
  totalRefund!: string;
  orderStatus?: string;
  lines!: SalesRefundLine[];
  createdAt!: string;

  constructor(data: Partial<SalesRefund>) {
    Object.assign(this, data);
    this.lines = (data.lines || []).map((line) =>
      line instanceof SalesRefundLine ? line : new SalesRefundLine(line)
    );
  }
}
