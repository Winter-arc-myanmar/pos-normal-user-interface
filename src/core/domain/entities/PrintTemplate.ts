export const PRINT_TEMPLATE_TYPES = ["RECEIPT", "KITCHEN", "FINANCE"] as const;
export type PrintTemplateType = (typeof PRINT_TEMPLATE_TYPES)[number];

export const isPrintTemplateType = (value: string): value is PrintTemplateType =>
  (PRINT_TEMPLATE_TYPES as readonly string[]).includes(value);

export type PrintPaperWidth = "MM58" | "MM80";

/** The money a business charges in: 100,000 MMK or $ 100,000. */
export type PriceCurrency = "MMK" | "USD";

/** The company a customer's receipt is from. */
export interface PrintCompany {
  name: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
}
export type PrintTemplateSource = "LOCATION" | "TENANT" | "BUILTIN";

export interface PrintTemplateSettings {
  language: string;
  copies: string[];
  header: {
    logo: boolean;
    outletName: boolean;
    address: boolean;
    contact: boolean;
  };
  item: {
    bilingual: boolean;
    fontSize: string;
    qtyFirst: boolean;
    categorySubtotal: boolean;
    hidePriceOnOrderBill: boolean;
    itemTextScale: string;
    otherTextScale: string;
    productRemarks: boolean;
    modifiers: boolean;
    price: boolean;
  };
  bill: {
    amountAfterDiscount: boolean;
    totalPayment: boolean;
    payTime: boolean;
    rounding: boolean;
  };
  other: {
    orderNumber: boolean;
    cashier: boolean;
    serviceType: boolean;
    tableOrRoom: boolean;
    pickupCode: boolean;
    footerText: string;
  };
}

export class PrintTemplate {
  id!: string;
  tenantId?: string;
  locationId?: string;
  type!: PrintTemplateType;
  name!: string;
  paperWidth!: PrintPaperWidth;
  isDefault?: boolean;
  source?: PrintTemplateSource;
  settings!: PrintTemplateSettings;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  constructor(data: Partial<PrintTemplate>) {
    Object.assign(this, data);
  }
}

export const defaultPrintTemplateSettings = (): PrintTemplateSettings => ({
  language: "FOLLOW_POS",
  copies: ["CUSTOMER"],
  header: {
    logo: true,
    outletName: true,
    address: true,
    contact: true,
  },
  item: {
    bilingual: false,
    fontSize: "MIDDLE",
    qtyFirst: true,
    categorySubtotal: false,
    hidePriceOnOrderBill: false,
    itemTextScale: "1H1W",
    otherTextScale: "1H1W",
    productRemarks: true,
    modifiers: true,
    price: true,
  },
  bill: {
    amountAfterDiscount: true,
    totalPayment: true,
    payTime: false,
    rounding: false,
  },
  other: {
    orderNumber: true,
    cashier: true,
    serviceType: true,
    tableOrRoom: true,
    pickupCode: false,
    footerText: "Thank you!",
  },
});
