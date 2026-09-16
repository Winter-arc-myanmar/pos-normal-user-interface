import { useCallback, useState } from "react";
import {
  BindGuestCardDTO,
  GuestWalletFilterDTO,
  GuestWalletLedgerListResponseDTO,
  GuestWalletListResponseDTO,
  IssueGuestWalletDTO,
  RefundGuestWalletDTO,
  ReplaceGuestCardDTO,
  SettleGuestWalletDTO,
  TopUpGuestWalletDTO,
  VoidGuestWalletDTO,
} from "../../application/dtos/GuestWalletDTO";
import {
  GuestCard,
  GuestWallet,
  GuestWalletAudit,
  GuestWalletLedgerEntry,
  GuestWalletSettlementQuote,
} from "../../domain/entities/GuestWallet";
import { IGuestWalletService } from "../../domain/services/IGuestWalletService";
import container from "../../infrastructure/di/container";

interface UseGuestWalletManagementReturn {
  wallets: GuestWallet[];
  totalWallets: number;
  page: number;
  limit: number;
  totalPages: number;
  currentWallet: GuestWallet | null;
  cards: GuestCard[];
  ledger: GuestWalletLedgerEntry[];
  ledgerTotal: number;
  ledgerPage: number;
  ledgerTotalPages: number;
  settlementQuote: GuestWalletSettlementQuote | null;
  audit: GuestWalletAudit | null;
  isLoading: boolean;
  error: string | null;
  listWallets: (
    params?: GuestWalletFilterDTO
  ) => Promise<GuestWalletListResponseDTO>;
  getWallet: (id: string) => Promise<GuestWallet>;
  loadWalletDetails: (id: string) => Promise<GuestWallet>;
  issueWallet: (payload: IssueGuestWalletDTO) => Promise<GuestWallet>;
  topUpWallet: (
    id: string,
    payload: TopUpGuestWalletDTO
  ) => Promise<GuestWalletLedgerEntry>;
  refundWallet: (
    id: string,
    payload: RefundGuestWalletDTO
  ) => Promise<GuestWallet>;
  bindCard: (payload: BindGuestCardDTO) => Promise<GuestCard>;
  unbindCard: (id: string) => Promise<GuestCard>;
  reportCardLost: (id: string) => Promise<GuestCard>;
  replaceCard: (id: string, payload: ReplaceGuestCardDTO) => Promise<GuestCard>;
  getSettlementQuote: (id: string) => Promise<GuestWalletSettlementQuote>;
  beginSettlement: (id: string) => Promise<GuestWallet>;
  cancelSettlement: (id: string) => Promise<GuestWallet>;
  settleWallet: (
    id: string,
    payload: SettleGuestWalletDTO
  ) => Promise<GuestWallet>;
  voidWallet: (id: string, payload: VoidGuestWalletDTO) => Promise<GuestWallet>;
  auditWallet: (id: string) => Promise<GuestWalletAudit>;
  lookupCard: (cardUid: string) => Promise<GuestCard>;
  loadLedger: (
    id: string,
    params?: GuestWalletFilterDTO
  ) => Promise<GuestWalletLedgerListResponseDTO>;
  clearCurrentWallet: () => void;
  clearError: () => void;
}

const toErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const response = (err as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
};

export function useGuestWalletManagement(): UseGuestWalletManagementReturn {
  const guestWalletService = container.resolve<IGuestWalletService>(
    "guestWalletService"
  );

  const [wallets, setWallets] = useState<GuestWallet[]>([]);
  const [totalWallets, setTotalWallets] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [currentWallet, setCurrentWallet] = useState<GuestWallet | null>(null);
  const [cards, setCards] = useState<GuestCard[]>([]);
  const [ledger, setLedger] = useState<GuestWalletLedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [settlementQuote, setSettlementQuote] =
    useState<GuestWalletSettlementQuote | null>(null);
  const [audit, setAudit] = useState<GuestWalletAudit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const clearCurrentWallet = useCallback(() => {
    setCurrentWallet(null);
    setCards([]);
    setLedger([]);
    setLedgerTotal(0);
    setLedgerPage(1);
    setLedgerTotalPages(1);
    setSettlementQuote(null);
    setAudit(null);
  }, []);

  const applyList = (result: GuestWalletListResponseDTO) => {
    setWallets(result.wallets);
    setTotalWallets(result.total);
    setPage(result.page);
    setLimit(result.limit);
    setTotalPages(result.totalPages);
  };

  const applyLedger = (result: GuestWalletLedgerListResponseDTO) => {
    setLedger(result.entries);
    setLedgerTotal(result.total);
    setLedgerPage(result.page);
    setLedgerTotalPages(result.totalPages);
  };

  const listWallets = useCallback(
    async (params?: GuestWalletFilterDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await guestWalletService.listWallets(params);
        applyList(result);
        return result;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to load guest wallets");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const getWallet = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const wallet = await guestWalletService.getWallet(id);
        setCurrentWallet(wallet);
        setWallets((current) =>
          current.map((item) => (item.id === wallet.id ? wallet : item))
        );
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to load guest wallet");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const loadWalletDetails = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const [wallet, walletCards, ledgerResult] = await Promise.all([
          guestWalletService.getWallet(id),
          guestWalletService.listWalletCards(id),
          guestWalletService.listWalletLedger(id, { page: 1, limit: 20 }),
        ]);
        setCurrentWallet(wallet);
        setCards(walletCards);
        applyLedger(ledgerResult);
        setWallets((current) =>
          current.map((item) => (item.id === wallet.id ? wallet : item))
        );
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to load membership details");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const issueWallet = useCallback(
    async (payload: IssueGuestWalletDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const wallet = await guestWalletService.issueWallet(payload);
        setCurrentWallet(wallet);
        setWallets((current) => [wallet, ...current.filter((item) => item.id !== wallet.id)]);
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to register guest wallet");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const refreshDetails = useCallback(
    async (id: string) => {
      const [wallet, walletCards, ledgerResult] = await Promise.all([
        guestWalletService.getWallet(id),
        guestWalletService.listWalletCards(id),
        guestWalletService.listWalletLedger(id, { page: 1, limit: 20 }),
      ]);
      setCurrentWallet(wallet);
      setCards(walletCards);
      applyLedger(ledgerResult);
      setWallets((current) =>
        current.map((item) => (item.id === wallet.id ? wallet : item))
      );
      return wallet;
    },
    [guestWalletService]
  );

  const topUpWallet = useCallback(
    async (id: string, payload: TopUpGuestWalletDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const entry = await guestWalletService.topUpWallet(id, payload);
        await refreshDetails(id);
        return entry;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to top up wallet");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService, refreshDetails]
  );

  const refundWallet = useCallback(
    async (id: string, payload: RefundGuestWalletDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const wallet = await guestWalletService.refundWallet(id, payload);
        await refreshDetails(id);
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to refund wallet");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService, refreshDetails]
  );

  const bindCard = useCallback(
    async (payload: BindGuestCardDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const card = await guestWalletService.bindCard(payload);
        if (payload.walletId) await refreshDetails(payload.walletId);
        return card;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to bind card");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService, refreshDetails]
  );

  const unbindCard = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const card = await guestWalletService.unbindCard(id);
        if (currentWallet?.id) await refreshDetails(currentWallet.id);
        return card;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to unbind card");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, currentWallet?.id, guestWalletService, refreshDetails]
  );

  const reportCardLost = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const card = await guestWalletService.reportCardLost(id);
        if (currentWallet?.id) await refreshDetails(currentWallet.id);
        return card;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to report lost card");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, currentWallet?.id, guestWalletService, refreshDetails]
  );

  const replaceCard = useCallback(
    async (id: string, payload: ReplaceGuestCardDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const card = await guestWalletService.replaceCard(id, payload);
        if (currentWallet?.id) await refreshDetails(currentWallet.id);
        return card;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to replace card");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, currentWallet?.id, guestWalletService, refreshDetails]
  );

  const getSettlementQuote = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const quote = await guestWalletService.getSettlementQuote(id);
        setSettlementQuote(quote);
        return quote;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to load settlement quote");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const beginSettlement = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const wallet = await guestWalletService.beginSettlement(id);
        setCurrentWallet(wallet);
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to begin settlement");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const cancelSettlement = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const wallet = await guestWalletService.cancelSettlement(id);
        await refreshDetails(id);
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to cancel settlement");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService, refreshDetails]
  );

  const settleWallet = useCallback(
    async (id: string, payload: SettleGuestWalletDTO) => {
      try {
        setIsLoading(true);
        clearError();
        await guestWalletService.beginSettlement(id).catch(() => undefined);
        const wallet = await guestWalletService.settleWallet(id, payload);
        await refreshDetails(id);
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to close wallet");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService, refreshDetails]
  );

  const voidWallet = useCallback(
    async (id: string, payload: VoidGuestWalletDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const wallet = await guestWalletService.voidWallet(id, payload);
        await refreshDetails(id);
        return wallet;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to void wallet");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService, refreshDetails]
  );

  const auditWallet = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await guestWalletService.auditWallet(id);
        setAudit(result);
        return result;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to audit wallet");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const lookupCard = useCallback(
    async (cardUid: string) => {
      try {
        setIsLoading(true);
        clearError();
        return await guestWalletService.lookupCard(cardUid);
      } catch (err) {
        const message = toErrorMessage(err, "Unable to look up card");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  const loadLedger = useCallback(
    async (id: string, params?: GuestWalletFilterDTO) => {
      try {
        setIsLoading(true);
        clearError();
        const result = await guestWalletService.listWalletLedger(id, params);
        applyLedger(result);
        return result;
      } catch (err) {
        const message = toErrorMessage(err, "Unable to load wallet ledger");
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, guestWalletService]
  );

  return {
    wallets,
    totalWallets,
    page,
    limit,
    totalPages,
    currentWallet,
    cards,
    ledger,
    ledgerTotal,
    ledgerPage,
    ledgerTotalPages,
    settlementQuote,
    audit,
    isLoading,
    error,
    listWallets,
    getWallet,
    loadWalletDetails,
    issueWallet,
    topUpWallet,
    refundWallet,
    bindCard,
    unbindCard,
    reportCardLost,
    replaceCard,
    getSettlementQuote,
    beginSettlement,
    cancelSettlement,
    settleWallet,
    voidWallet,
    auditWallet,
    lookupCard,
    loadLedger,
    clearCurrentWallet,
    clearError,
  };
}
