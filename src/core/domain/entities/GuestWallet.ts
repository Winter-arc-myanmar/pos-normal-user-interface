export class GuestWallet {
  id!: string;
  tenantId!: string;
  walletNumber!: string;
  guestName!: string;
  guestPhone!: string;
  guestIdNumber?: string | null;
  tierId!: string;
  tierNameSnapshot!: string;
  discountBpsSnapshot!: number;
  isPostpaidSnapshot!: boolean;
  preloadAmountSnapshot!: string;
  preloadFundingSnapshot!: string;
  expiresAt?: string | null;
  balance!: string;
  purchasedBalance!: string;
  grantedBalance!: string;
  sequenceNo!: number;
  status!: string;
  issuedAtLocationId!: string;
  issuedByUserId!: string;
  openedAt?: string | null;
  closedAt?: string | null;
  closedByUserId?: string | null;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<GuestWallet>) {
    Object.assign(this, data);
  }
}

export class GuestCard {
  id!: string;
  tenantId!: string;
  walletId!: string;
  cardUid!: string;
  label?: string | null;
  roomNumber?: string | null;
  status!: string;
  issuedAt?: string | null;
  issuedByUserId?: string | null;
  deactivatedAt?: string | null;
  replacedByCardId?: string | null;
  createdAt!: string;
  updatedAt!: string;
  wallet?: GuestWallet | null;

  constructor(data: Partial<GuestCard>) {
    Object.assign(this, data);
  }
}

export class GuestWalletLedgerEntry {
  id!: string;
  tenantId!: string;
  walletId!: string;
  sequenceNo!: number;
  entryType!: string;
  amount!: string;
  purchasedDelta!: string;
  grantedDelta!: string;
  balanceAfter!: string;
  guestCardId?: string | null;
  locationId?: string | null;
  posSessionId?: string | null;
  staffUserId?: string | null;
  approvedByUserId?: string | null;
  sourceModule?: string | null;
  sourceRecordId?: string | null;
  correctsEntryId?: string | null;
  reference?: string | null;
  idempotencyKey?: string | null;
  businessDate?: string | null;
  notes?: string | null;
  createdAt!: string;

  constructor(data: Partial<GuestWalletLedgerEntry>) {
    Object.assign(this, data);
  }
}

export class GuestWalletSettlementBlocker {
  type!: string;
  id?: string;
  label?: string;

  constructor(data: Partial<GuestWalletSettlementBlocker>) {
    Object.assign(this, data);
  }
}

export class GuestWalletSettlementQuote {
  walletId!: string;
  walletNumber!: string;
  guestName!: string;
  status!: string;
  balance!: string;
  purchasedBalance!: string;
  grantedBalance!: string;
  action!: string;
  refundable!: string;
  forfeitable!: string;
  collectable!: string;
  blockers!: GuestWalletSettlementBlocker[];

  constructor(data: Partial<GuestWalletSettlementQuote>) {
    Object.assign(this, {
      blockers: [],
      ...data,
    });
  }
}

export class GuestWalletAudit {
  walletId?: string;
  storedBalance?: string;
  replayedBalance?: string;
  drifted?: boolean;
  message?: string;

  constructor(data: Partial<GuestWalletAudit>) {
    Object.assign(this, data);
  }
}
