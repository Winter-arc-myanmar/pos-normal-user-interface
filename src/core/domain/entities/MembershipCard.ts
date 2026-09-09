export type MembershipCardStatus =
  | "ACTIVE"
  | "BOUND"
  | "UNBOUND"
  | "CLOSED";

export class MembershipCard {
  id!: string;
  tenantId!: string;
  customerId!: string;
  cardNumber!: string;
  balance!: string;
  status!: MembershipCardStatus | string;
  boundAt?: string | null;
  closedAt?: string | null;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<MembershipCard>) {
    Object.assign(this, data);
  }
}
