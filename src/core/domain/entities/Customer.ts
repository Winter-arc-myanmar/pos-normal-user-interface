export type CustomerAccountType = "RETAIL";
export type CustomerLoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type InteractionChannel = "EMAIL" | "PHONE" | "IN_PERSON" | "SMS";
export type InteractionType = "INQUIRY" | "COMPLAINT" | "FOLLOW_UP" | "NOTE";

export class Customer {
  id!: string;
  tenantId!: string;
  accountType!: CustomerAccountType | string;
  name!: string;
  phone!: string;
  email!: string;
  hasCreditAccount!: boolean;
  maxCreditLimit!: string;
  currentCreditBalance!: string;
  paymentTermsDays!: number;
  loyaltyTier!: string;
  lifetimePointsEarned!: number;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<Customer>) {
    Object.assign(this, data);
  }
}

export class CustomerInteraction {
  id!: string;
  tenantId!: string;
  customerId!: string;
  agentId?: string;
  interactionChannel!: string;
  interactionType!: string;
  summary!: string;
  detailedNotes?: string;
  externalReferenceId?: string;
  interactionDate!: string;
  updatedAt!: string;

  constructor(data: Partial<CustomerInteraction>) {
    Object.assign(this, data);
  }
}
