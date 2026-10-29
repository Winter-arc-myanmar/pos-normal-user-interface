/** A fee the cashier adds to a bill, such as a plastic container or delivery. */
export interface ExtraFee {
  id: string;
  name: string;
  /** What the till fills in; the cashier may change it. */
  amount: number;
  variantId: string;
  isActive: boolean;
  /** The built-in "Other": the cashier types its name and amount. */
  isOther: boolean;
}

/** A fee as the cashier puts it on a bill. */
export interface ChosenFee {
  variantId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}
