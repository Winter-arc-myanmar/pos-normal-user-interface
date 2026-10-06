/** A charge a table offers: a service charge, a VIP room fee, pool table time. */
export interface TableChargeOffer {
  variantId: string;
  name: string;
  unitPrice: number;
  soldBy: "EACH" | "TIME";
  timeBlockMinutes: number | null;
  minimumBlocks: number | null;
  chargeMode: "PAY_FIRST" | "CLOCK" | null;
  autoApply: boolean;
}

/** A clock running on a table's bill, e.g. a pool table in play. */
export interface RunningTableCharge {
  variantId: string;
  name: string;
  startedAt: string;
}

export interface TableCharges {
  offered: TableChargeOffer[];
  running: RunningTableCharge[];
}
