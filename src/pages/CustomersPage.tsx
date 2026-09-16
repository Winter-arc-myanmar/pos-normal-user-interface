import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { CardCaptureStatus } from "@/components/ui/CardCaptureStatus";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  CreateCustomerDTO,
  CreateCustomerInteractionDTO,
} from "@/core/application/dtos/CustomerDTO";
import { PaymentMethod } from "@/core/domain/entities/Cashier";
import { Customer } from "@/core/domain/entities/Customer";
import { GuestCard, GuestWallet } from "@/core/domain/entities/GuestWallet";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import { useCustomerManagement } from "@/core/presentation/hooks/useCustomerManagement";
import { useCardCapture } from "@/core/presentation/hooks/useCardCapture";
import { useGuestWalletManagement } from "@/core/presentation/hooks/useGuestWalletManagement";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { useDateFormatter } from "@/lib/i18n/formatters";

const PAGE_SIZE = 6;

const fieldClass =
  "min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500";

const emptyCustomerForm = {
  name: "",
  phone: "",
  email: "",
  accountType: "RETAIL",
  hasCreditAccount: false,
  maxCreditLimit: "0.0000",
  paymentTermsDays: "0",
  loyaltyTier: "BRONZE",
};

const emptyInteractionForm = {
  interactionChannel: "EMAIL",
  interactionType: "INQUIRY",
  summary: "",
  detailedNotes: "",
};

const emptyIssueForm = {
  guestName: "",
  guestPhone: "",
  guestIdNumber: "",
  tierId: "",
  cardUid: "",
  cardLabel: "",
  roomNumber: "",
  paymentMethodId: "",
  paymentAmount: "",
  paymentReference: "",
};

type WalletAction =
  | "topup"
  | "refund"
  | "bind"
  | "unbind"
  | "close"
  | "void"
  | "lost"
  | "replace"
  | null;

const keyboardRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function isClosedStatus(status: string): boolean {
  const value = status.toUpperCase();
  return value === "CLOSED" || value === "SETTLED" || value === "VOIDED";
}

function MemberEmptyIllustration() {
  return (
    <svg
      viewBox="0 0 160 110"
      className="mx-auto h-28 w-40 text-slate-300"
      aria-hidden="true"
    >
      <rect x="18" y="28" width="52" height="64" rx="8" fill="currentColor" opacity="0.28" />
      <circle cx="44" cy="48" r="10" fill="currentColor" opacity="0.45" />
      <rect x="30" y="64" width="28" height="16" rx="8" fill="currentColor" opacity="0.4" />
      <rect x="86" y="18" width="56" height="72" rx="8" fill="currentColor" opacity="0.22" />
      <circle cx="114" cy="42" r="11" fill="currentColor" opacity="0.4" />
      <rect x="98" y="60" width="32" height="18" rx="9" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function PosKeyboard({
  onInput,
  onBackspace,
  onEnter,
}: {
  onInput: (value: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}) {
  const [shifted, setShifted] = useState(false);

  const press = (value: string) => {
    onInput(shifted ? value.toUpperCase() : value);
    if (shifted) setShifted(false);
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-[#111111] p-2">
      {keyboardRows.map((row, index) => (
        <div key={row.join("")} className="mb-1 flex justify-center gap-1">
          {index === 3 ? (
            <button
              type="button"
              className="min-h-10 min-w-14 rounded bg-slate-800 px-2 text-xs font-semibold text-slate-200"
              onClick={() => setShifted((current) => !current)}
            >
              shift
            </button>
          ) : null}
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className="min-h-10 min-w-8 rounded bg-slate-700 px-2 text-sm font-semibold text-white hover:bg-slate-600"
              onClick={() => press(key)}
            >
              {shifted ? key.toUpperCase() : key}
            </button>
          ))}
          {index === 3 ? (
            <button
              type="button"
              className="min-h-10 min-w-16 rounded bg-slate-800 px-2 text-xs font-semibold text-slate-200"
              onClick={onBackspace}
            >
              ⌫
            </button>
          ) : null}
        </div>
      ))}
      <div className="flex justify-center gap-1">
        <button
          type="button"
          className="min-h-10 min-w-10 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput("@")}
        >
          @
        </button>
        <button
          type="button"
          className="min-h-10 min-w-10 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput(".")}
        >
          .
        </button>
        <button
          type="button"
          className="min-h-10 min-w-10 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput("/")}
        >
          /
        </button>
        <button
          type="button"
          className="min-h-10 flex-1 rounded bg-slate-700 px-3 text-sm font-semibold text-white"
          onClick={() => onInput(" ")}
        >
          space
        </button>
        <button
          type="button"
          className="min-h-10 min-w-16 rounded bg-blue-600 px-3 text-sm font-semibold text-white"
          onClick={onEnter}
        >
          ↵
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm">{value || "—"}</dd>
    </div>
  );
}

function PaymentMethodSelect({
  label,
  methods,
  value,
  onChange,
}: {
  label: string;
  methods: PaymentMethod[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      required
      aria-label={label}
      className={fieldClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{label}</option>
      {methods.map((method) => (
        <option key={method.id} value={method.id}>
          {method.name}
        </option>
      ))}
    </select>
  );
}

function pickWalletForCustomer(
  wallets: GuestWallet[],
  phone: string
): GuestWallet | undefined {
  const active = wallets.filter((wallet) => !isClosedStatus(wallet.status));
  return (
    active.find((wallet) => wallet.guestPhone === phone) ||
    wallets.find((wallet) => wallet.guestPhone === phone) ||
    active[0] ||
    wallets[0]
  );
}

export function CustomersPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormatter();
  const { user } = useAuth();
  const { requireCashierContext } = usePosWorkspace();
  const { paymentMethods, fetchPaymentMethods } = useCashier();
  const {
    customers,
    page,
    totalPages,
    currentCustomer,
    interactions,
    isLoading,
    error,
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getInteractionsForCustomer,
    createCustomerInteraction,
    deleteCustomerInteraction,
    clearCurrentCustomer,
  } = useCustomerManagement();
  const {
    currentWallet,
    cards,
    ledger,
    settlementQuote,
    audit,
    isLoading: isWalletLoading,
    error: walletError,
    listWallets,
    loadWalletDetails,
    issueWallet,
    topUpWallet,
    refundWallet,
    bindCard,
    unbindCard,
    reportCardLost,
    replaceCard,
    getSettlementQuote,
    cancelSettlement,
    settleWallet,
    voidWallet,
    auditWallet,
    lookupCard,
    clearCurrentWallet,
  } = useGuestWalletManagement();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(emptyCustomerForm);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState(emptyInteractionForm);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<WalletAction>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [collectPaymentMethodId, setCollectPaymentMethodId] = useState("");
  const [approverToken, setApproverToken] = useState("");
  const [cardUid, setCardUid] = useState("");
  const [cardLabel, setCardLabel] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [newCardUid, setNewCardUid] = useState("");
  const captureModeRef = useRef<
    "lookup" | "issue" | "bind" | "replace" | "ignore"
  >("lookup");

  const tenantId = String(user?.tenantId || "");
  const agentId = String(user?.id || "");
  const selectedCustomer = currentCustomer;
  const selectedWallet = currentWallet;
  const defaultPaymentMethodId = paymentMethods[0]?.id || "";
  const activeCards = useMemo(
    () => cards.filter((card) => card.status.toUpperCase() === "ACTIVE"),
    [cards]
  );
  const walletClosed = selectedWallet ? isClosedStatus(selectedWallet.status) : true;
  const creditLabel = useMemo(() => {
    if (!selectedCustomer) return "";
    return selectedCustomer.hasCreditAccount
      ? t("crm.creditOn")
      : t("crm.creditOff");
  }, [selectedCustomer, t]);

  useEffect(() => {
    void fetchPaymentMethods().catch(() => undefined);
  }, [fetchPaymentMethods]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void getCustomers({
      page: currentPage,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }).catch(() => undefined);
  }, [currentPage, debouncedSearch, getCustomers]);

  useEffect(() => {
    if (
      isFormOpen ||
      (walletAction && walletAction !== "bind" && walletAction !== "replace")
    ) {
      captureModeRef.current = "ignore";
      return;
    }
    if (isIssueFormOpen) {
      captureModeRef.current = "issue";
      return;
    }
    if (walletAction === "bind") {
      captureModeRef.current = "bind";
      return;
    }
    if (walletAction === "replace") {
      captureModeRef.current = "replace";
      return;
    }
    captureModeRef.current = "lookup";
  }, [isFormOpen, isIssueFormOpen, walletAction]);

  const refreshCustomers = async () => {
    await getCustomers({
      page: currentPage,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const loadWalletForCustomer = async (customer: Customer) => {
    clearCurrentWallet();
    const phone = customer.phone?.trim();
    if (!phone) return;
    const result = await listWallets({
      page: 1,
      limit: 20,
      search: phone,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    const match = pickWalletForCustomer(result.wallets, phone);
    if (match) {
      await loadWalletDetails(match.id);
    }
  };

  const openCreateForm = () => {
    setEditing(null);
    setForm(emptyCustomerForm);
    setIsFormOpen(true);
    setLocalError(null);
  };

  const openEditForm = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      accountType: customer.accountType || "RETAIL",
      hasCreditAccount: customer.hasCreditAccount,
      maxCreditLimit: customer.maxCreditLimit || "0.0000",
      paymentTermsDays: String(customer.paymentTermsDays || 0),
      loyaltyTier: customer.loyaltyTier || "BRONZE",
    });
    setIsFormOpen(true);
    setLocalError(null);
  };

  const handleSelect = async (customer: Customer) => {
    setLocalError(null);
    setNotice(null);
    resetActionForm();
    try {
      await getCustomerById(customer.id);
      await getInteractionsForCustomer(customer.id, {
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      await loadWalletForCustomer(customer);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.loadFailed")
      );
    }
  };

  const handleCardRead = async (uid: string) => {
    const mode = captureModeRef.current;
    if (mode === "ignore") return;
    if (mode === "issue") {
      setIssueForm((current) => ({ ...current, cardUid: uid }));
      setNotice(t("crm.cardCaptured", { uid }));
      return;
    }
    if (mode === "bind") {
      setCardUid(uid);
      setNotice(t("crm.cardCaptured", { uid }));
      return;
    }
    if (mode === "replace") {
      setNewCardUid(uid);
      setNotice(t("crm.cardCaptured", { uid }));
      return;
    }

    setLocalError(null);
    try {
      const card = await lookupCard(uid);
      if (card.walletId) {
        await loadWalletDetails(card.walletId);
      }
      const phone = card.wallet?.guestPhone?.trim();
      if (!phone) {
        setNotice(t("crm.cardCaptured", { uid }));
        return;
      }
      setCurrentPage(1);
      setSearch(phone);
      setDebouncedSearch(phone);
      const result = await getCustomers({
        page: 1,
        limit: PAGE_SIZE,
        search: phone,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const match =
        result.customers.find((customer) => customer.phone === phone) ||
        result.customers[0];
      if (match) {
        await getCustomerById(match.id);
        await getInteractionsForCustomer(match.id, {
          page: 1,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
      }
      setNotice(t("crm.cardCaptured", { uid }));
    } catch {
      setLocalError(t("crm.unknownCard"));
    }
  };

  const { nfcSupported, nfcActive, nfcError, lastUid, startNfc } = useCardCapture({
    onRead: (uid) => {
      void handleCardRead(uid);
    },
  });

  const handleSubmitCustomer = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    try {
      if (!tenantId) {
        throw new Error(t("cashier.errors.missingTenant"));
      }
      const payload: CreateCustomerDTO = {
        name: form.name.trim(),
        tenantId,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        accountType: form.accountType,
        hasCreditAccount: form.hasCreditAccount,
        maxCreditLimit: form.maxCreditLimit,
        paymentTermsDays: Number(form.paymentTermsDays) || 0,
        loyaltyTier: form.loyaltyTier,
      };
      const saved = editing
        ? await updateCustomer(editing.id, payload)
        : await createCustomer(payload);
      setIsFormOpen(false);
      setNotice(editing ? t("crm.updated") : t("crm.created"));
      await refreshCustomers();
      await handleSelect(saved);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.saveFailed")
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setLocalError(null);
    try {
      await deleteCustomer(selectedCustomer.id);
      clearCurrentCustomer();
      clearCurrentWallet();
      setNotice(t("crm.deleted"));
      await refreshCustomers();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.deleteFailed")
      );
    }
  };

  const handleCreateInteraction = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCustomer) return;
    setLocalError(null);
    try {
      const payload: CreateCustomerInteractionDTO = {
        tenantId,
        agentId: agentId || undefined,
        interactionChannel: interactionForm.interactionChannel,
        interactionType: interactionForm.interactionType,
        summary: interactionForm.summary.trim(),
        detailedNotes: interactionForm.detailedNotes.trim() || undefined,
      };
      await createCustomerInteraction(selectedCustomer.id, payload);
      setInteractionForm(emptyInteractionForm);
      setNotice(t("crm.interactionCreated"));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.interactionFailed")
      );
    }
  };

  const resetActionForm = () => {
    setWalletAction(null);
    setAmount("");
    setReference("");
    setNotes("");
    setPaymentMethodId("");
    setCollectPaymentMethodId("");
    setApproverToken("");
    setCardUid("");
    setCardLabel("");
    setRoomNumber("");
    setSelectedCardId("");
    setNewCardUid("");
  };

  const openIssueForm = () => {
    if (!selectedCustomer) return;
    setIssueForm({
      ...emptyIssueForm,
      guestName: selectedCustomer.name,
      guestPhone: selectedCustomer.phone || "",
      cardLabel: selectedCustomer.name,
      paymentMethodId: defaultPaymentMethodId,
    });
    setIsIssueFormOpen(true);
    setLocalError(null);
  };

  const openAction = async (action: WalletAction, card?: GuestCard) => {
    if (!selectedWallet || !action) return;
    setLocalError(null);
    setWalletAction(action);
    setAmount("");
    setReference("");
    setNotes("");
    setApproverToken("");
    setPaymentMethodId(defaultPaymentMethodId);
    setCollectPaymentMethodId(defaultPaymentMethodId);
    setCardUid("");
    setCardLabel(card?.label || selectedWallet.guestName);
    setRoomNumber(card?.roomNumber || "");
    setSelectedCardId(card?.id || activeCards[0]?.id || "");
    setNewCardUid("");
    if (action === "close") {
      try {
        await getSettlementQuote(selectedWallet.id);
      } catch (caught) {
        setLocalError(
          caught instanceof Error ? caught.message : t("crm.cardActionFailed")
        );
      }
    }
  };

  const requireWorkspace = async () => {
    try {
      return await requireCashierContext();
    } catch (caught) {
      throw new Error(
        caught instanceof Error ? caught.message : t("crm.workspaceRequired")
      );
    }
  };

  const handleIssueWallet = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    try {
      const context = await requireWorkspace();
      const wallet = await issueWallet({
        tierId: issueForm.tierId.trim(),
        guestName: issueForm.guestName.trim(),
        guestPhone: issueForm.guestPhone.trim(),
        guestIdNumber: issueForm.guestIdNumber.trim() || undefined,
        locationId: context.locationId,
        posSessionId: context.posSessionId,
        cards: [
          {
            cardUid: issueForm.cardUid.trim(),
            label: issueForm.cardLabel.trim() || undefined,
            roomNumber: issueForm.roomNumber.trim() || undefined,
          },
        ],
        payment: {
          paymentMethodId: issueForm.paymentMethodId,
          amount: issueForm.paymentAmount.trim(),
          reference: issueForm.paymentReference.trim() || undefined,
        },
      });
      setIsIssueFormOpen(false);
      setNotice(t("crm.walletIssued"));
      await loadWalletDetails(wallet.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.saveFailed")
      );
    }
  };

  const handleWalletAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedWallet || !walletAction) return;
    setLocalError(null);
    try {
      if (walletAction === "topup") {
        const context = await requireWorkspace();
        await topUpWallet(selectedWallet.id, {
          amount: amount.trim(),
          paymentMethodId,
          posSessionId: context.posSessionId,
          locationId: context.locationId,
          reference: reference.trim() || undefined,
          guestCardId: selectedCardId || undefined,
          notes: notes.trim() || undefined,
        });
        setNotice(t("crm.topupSuccess"));
      } else if (walletAction === "refund") {
        const context = await requireWorkspace();
        await refundWallet(selectedWallet.id, {
          amount: amount.trim(),
          paymentMethodId,
          posSessionId: context.posSessionId,
          locationId: context.locationId,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          approverAuthorization: approverToken.trim(),
        });
        setNotice(t("crm.refundSuccess"));
      } else if (walletAction === "bind") {
        await bindCard({
          walletId: selectedWallet.id,
          cardUid: cardUid.trim(),
          label: cardLabel.trim() || undefined,
          roomNumber: roomNumber.trim() || undefined,
        });
        setNotice(t("crm.bindSuccess"));
      } else if (walletAction === "unbind") {
        if (!selectedCardId) throw new Error(t("crm.noCards"));
        await unbindCard(selectedCardId);
        setNotice(t("crm.unbindSuccess"));
      } else if (walletAction === "lost") {
        if (!selectedCardId) throw new Error(t("crm.noCards"));
        await reportCardLost(selectedCardId);
        setNotice(t("crm.lostSuccess"));
      } else if (walletAction === "replace") {
        if (!selectedCardId) throw new Error(t("crm.noCards"));
        await replaceCard(selectedCardId, {
          newCardUid: newCardUid.trim(),
          label: cardLabel.trim() || undefined,
          roomNumber: roomNumber.trim() || undefined,
        });
        setNotice(t("crm.replaceSuccess"));
      } else if (walletAction === "void") {
        await voidWallet(selectedWallet.id, {
          approverAuthorization: approverToken.trim(),
        });
        setNotice(t("crm.voidSuccess"));
      } else if (walletAction === "close") {
        const context = await requireWorkspace();
        const refundable = Number(settlementQuote?.refundable || 0);
        const collectable = Number(settlementQuote?.collectable || 0);
        await settleWallet(selectedWallet.id, {
          posSessionId: context.posSessionId,
          locationId: context.locationId,
          refund:
            refundable > 0
              ? {
                  paymentMethodId,
                  reference: reference.trim() || undefined,
                }
              : undefined,
          collect:
            collectable > 0
              ? {
                  paymentMethodId: collectPaymentMethodId || paymentMethodId,
                  reference: reference.trim() || undefined,
                  amount: settlementQuote?.collectable || amount.trim(),
                }
              : undefined,
          notes: notes.trim() || undefined,
          approverAuthorization: approverToken.trim(),
        });
        setNotice(t("crm.closeCardSuccess"));
      }
      resetActionForm();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.cardActionFailed")
      );
    }
  };

  const handleAudit = async () => {
    if (!selectedWallet) return;
    setLocalError(null);
    try {
      await auditWallet(selectedWallet.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.cardActionFailed")
      );
    }
  };

  const handleCancelSettlement = async () => {
    if (!selectedWallet) return;
    setLocalError(null);
    try {
      await cancelSettlement(selectedWallet.id);
      setNotice(t("crm.cancelSettlement"));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("crm.cardActionFailed")
      );
    }
  };

  const actionTitle =
    walletAction === "topup"
      ? t("crm.topupTitle")
      : walletAction === "refund"
        ? t("crm.refundTitle")
        : walletAction === "bind"
          ? t("crm.bindTitle")
          : walletAction === "unbind"
            ? t("crm.unbindCard")
            : walletAction === "lost"
              ? t("crm.reportLost")
              : walletAction === "replace"
                ? t("crm.replaceCard")
                : walletAction === "void"
                  ? t("crm.voidWallet")
                  : t("crm.closeCardTitle");

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] overflow-hidden bg-slate-100">
      <aside className="flex min-h-0 flex-col bg-white">
        {(error || localError || walletError) && (
          <p className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {localError || walletError || error}
          </p>
        )}
        {notice ? (
          <p className="m-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        {!selectedCustomer ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MemberEmptyIllustration />
            <p className="mt-4 text-sm text-slate-500">{t("crm.selectMember")}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {initials(selectedCustomer.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedCustomer.name}
                  </h2>
                  <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEditForm(selectedCustomer)}
                >
                  {t("crm.edit")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleDelete()}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <Detail label={t("crm.email")} value={selectedCustomer.email || ""} />
              <Detail label={t("crm.accountType")} value={selectedCustomer.accountType} />
              <Detail label={t("crm.loyaltyTier")} value={selectedCustomer.loyaltyTier} />
              <Detail
                label={t("crm.points")}
                value={String(selectedCustomer.lifetimePointsEarned)}
              />
              <Detail
                label={t("crm.credit")}
                value={`${creditLabel} · ${selectedCustomer.currentCreditBalance} / ${selectedCustomer.maxCreditLimit}`}
              />
              <Detail
                label={t("crm.terms")}
                value={t("crm.termsDays", { days: selectedCustomer.paymentTermsDays })}
              />
            </dl>

            <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {t("crm.membershipCard")}
                </h3>
                {selectedWallet ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleAudit()}
                    >
                      {t("crm.audit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={selectedWallet.status.toUpperCase() === "ACTIVE"}
                      onClick={() => void handleCancelSettlement()}
                    >
                      {t("crm.cancelSettlement")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={walletClosed}
                      onClick={() => void openAction("void")}
                    >
                      {t("crm.voidWallet")}
                    </Button>
                  </div>
                ) : null}
              </div>

              {selectedWallet ? (
                <>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Detail
                      label={t("crm.walletNumber")}
                      value={selectedWallet.walletNumber}
                    />
                    <Detail
                      label={t("crm.guestIdNumber")}
                      value={selectedWallet.guestIdNumber || ""}
                    />
                    <Detail
                      label={t("crm.tier")}
                      value={selectedWallet.tierNameSnapshot}
                    />
                    <Detail
                      label={t("crm.discount")}
                      value={t("crm.discountBps", {
                        bps: selectedWallet.discountBpsSnapshot,
                      })}
                    />
                    <Detail
                      label={t("crm.accountType")}
                      value={
                        selectedWallet.isPostpaidSnapshot
                          ? t("crm.postpaid")
                          : t("crm.prepaid")
                      }
                    />
                    <Detail
                      label={t("crm.cardBalance")}
                      value={String(selectedWallet.balance)}
                    />
                    <Detail
                      label={t("crm.purchasedBalance")}
                      value={String(selectedWallet.purchasedBalance)}
                    />
                    <Detail
                      label={t("crm.grantedBalance")}
                      value={String(selectedWallet.grantedBalance)}
                    />
                    <Detail
                      label={t("crm.cardStatus")}
                      value={selectedWallet.status}
                    />
                    <Detail
                      label={t("crm.openedAt")}
                      value={
                        selectedWallet.openedAt
                          ? formatDateTime(selectedWallet.openedAt)
                          : ""
                      }
                    />
                  </dl>

                  {audit ? (
                    <p className="mt-3 rounded bg-white p-3 text-sm text-slate-700">
                      {t("crm.auditResult", {
                        stored: audit.storedBalance || "—",
                        replayed: audit.replayedBalance || "—",
                        drift: audit.drifted ? t("crm.auditDrift") : "",
                      })}
                    </p>
                  ) : null}

                  {cards.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">{t("crm.noCards")}</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {cards.map((card) => (
                        <li
                          key={card.id}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{card.cardUid}</p>
                              <p className="text-xs text-slate-500">
                                {card.label || "—"} · {card.roomNumber || "—"} ·{" "}
                                {card.status}
                              </p>
                            </div>
                            {card.status.toUpperCase() === "ACTIVE" ? (
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => void openAction("lost", card)}
                                >
                                  {t("crm.reportLost")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => void openAction("replace", card)}
                                >
                                  {t("crm.replaceCard")}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={walletClosed || isWalletLoading}
                      onClick={() => void openAction("topup")}
                    >
                      {t("crm.topup")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={walletClosed || isWalletLoading}
                      onClick={() => void openAction("refund")}
                    >
                      {t("crm.refund")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={walletClosed || isWalletLoading}
                      onClick={() => void openAction("bind")}
                    >
                      {t("crm.bindCard")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={
                        walletClosed || activeCards.length === 0 || isWalletLoading
                      }
                      onClick={() => void openAction("unbind")}
                    >
                      {t("crm.unbindCard")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={walletClosed || isWalletLoading}
                      onClick={() => void openAction("close")}
                    >
                      {t("crm.closeCard")}
                    </Button>
                  </div>

                  <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("crm.ledger")}
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {ledger.length === 0 ? (
                      <li className="text-sm text-slate-500">{t("crm.noLedger")}</li>
                    ) : (
                      ledger.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.entryType} · {entry.amount}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {t("crm.cardBalance")} {entry.balanceAfter}
                            {entry.reference ? ` · ${entry.reference}` : ""}
                            {entry.businessDate ? ` · ${entry.businessDate}` : ""}
                            {entry.createdAt
                              ? ` · ${formatDateTime(entry.createdAt)}`
                              : ""}
                          </p>
                          {entry.notes ? (
                            <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-slate-500">{t("crm.noWallet")}</p>
                  <div className="mt-4">
                    <Button size="sm" onClick={openIssueForm}>
                      {t("crm.issueWallet")}
                    </Button>
                  </div>
                </>
              )}
            </section>

            <section className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("crm.interactions")}
              </h3>
              <form className="mt-3 space-y-2" onSubmit={handleCreateInteraction}>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label={t("crm.channel")}
                    className={fieldClass}
                    value={interactionForm.interactionChannel}
                    onChange={(event) =>
                      setInteractionForm((current) => ({
                        ...current,
                        interactionChannel: event.target.value,
                      }))
                    }
                  >
                    <option value="EMAIL">EMAIL</option>
                    <option value="PHONE">PHONE</option>
                    <option value="IN_PERSON">IN_PERSON</option>
                    <option value="SMS">SMS</option>
                  </select>
                  <select
                    aria-label={t("crm.interactionType")}
                    className={fieldClass}
                    value={interactionForm.interactionType}
                    onChange={(event) =>
                      setInteractionForm((current) => ({
                        ...current,
                        interactionType: event.target.value,
                      }))
                    }
                  >
                    <option value="INQUIRY">INQUIRY</option>
                    <option value="COMPLAINT">COMPLAINT</option>
                    <option value="FOLLOW_UP">FOLLOW_UP</option>
                    <option value="NOTE">NOTE</option>
                  </select>
                </div>
                <input
                  required
                  aria-label={t("crm.summary")}
                  placeholder={t("crm.summary")}
                  className={fieldClass}
                  value={interactionForm.summary}
                  onChange={(event) =>
                    setInteractionForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                />
                <textarea
                  aria-label={t("crm.notes")}
                  placeholder={t("crm.notes")}
                  className={`${fieldClass} min-h-20 py-2`}
                  value={interactionForm.detailedNotes}
                  onChange={(event) =>
                    setInteractionForm((current) => ({
                      ...current,
                      detailedNotes: event.target.value,
                    }))
                  }
                />
                <Button type="submit" size="sm" isLoading={isLoading}>
                  {t("crm.addInteraction")}
                </Button>
              </form>

              <ul className="mt-4 space-y-2">
                {interactions.length === 0 ? (
                  <li className="text-sm text-slate-500">{t("crm.noInteractions")}</li>
                ) : (
                  interactions.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.summary}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.interactionType} · {item.interactionChannel} ·{" "}
                            {formatDateTime(item.interactionDate)}
                          </p>
                          {item.detailedNotes ? (
                            <p className="mt-2 text-sm text-slate-600">
                              {item.detailedNotes}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void deleteCustomerInteraction(
                              selectedCustomer.id,
                              item.id
                            )
                          }
                        >
                          {t("common.delete")}
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        )}
      </aside>

      <main className="flex min-h-0 flex-col bg-slate-950 p-4 text-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput
              aria-label={t("crm.search")}
              placeholder={t("crm.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
            />
          </div>
          <Button
            aria-label={t("crm.addCustomer")}
            onClick={openCreateForm}
            className="h-10 w-10 min-h-10 px-0"
          >
            +
          </Button>
        </div>
        <div className="mt-2">
          <CardCaptureStatus
            nfcSupported={nfcSupported}
            nfcActive={nfcActive}
            nfcError={nfcError}
            lastUid={lastUid}
            onEnableNfc={() => void startNfc()}
          />
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto">
          {customers.length === 0 ? (
            <p className="col-span-2 py-8 text-center text-sm text-slate-400">
              {isLoading ? t("crm.loading") : t("crm.empty")}
            </p>
          ) : (
            customers.map((customer) => {
              const isSelected = selectedCustomer?.id === customer.id;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => void handleSelect(customer)}
                  className={[
                    "rounded-lg border bg-white p-3 text-left text-slate-900 transition",
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-transparent hover:border-blue-300",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {initials(customer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate font-semibold">{customer.name}</p>
                        {customer.hasCreditAccount ? (
                          <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">
                            ✓
                          </span>
                        ) : null}
                        <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold uppercase text-amber-700">
                          {customer.loyaltyTier}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {customer.phone || "—"}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {customer.email || "—"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-sm text-slate-200">
          <button
            type="button"
            className="min-h-10 min-w-10 rounded bg-slate-800 disabled:opacity-40"
            disabled={page <= 1 || isLoading}
            onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
            aria-label={t("crm.prevPage")}
          >
            ‹
          </button>
          <span>
            {page} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            className="min-h-10 min-w-10 rounded bg-slate-800 disabled:opacity-40"
            disabled={page >= totalPages || isLoading}
            onClick={() =>
              setCurrentPage((current) => Math.min(totalPages, current + 1))
            }
            aria-label={t("crm.nextPage")}
          >
            ›
          </button>
        </div>

        <PosKeyboard
          onInput={(value) => setSearch((current) => current + value)}
          onBackspace={() => setSearch((current) => current.slice(0, -1))}
          onEnter={() => setDebouncedSearch(search.trim())}
        />
      </main>

      {walletAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleWalletAction}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">{actionTitle}</h2>
            <div className="mt-4 space-y-3">
              {walletAction === "topup" || walletAction === "refund" ? (
                <>
                  <input
                    required
                    inputMode="decimal"
                    aria-label={t("crm.amount")}
                    placeholder={t("crm.amount")}
                    className={fieldClass}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <PaymentMethodSelect
                    label={t("crm.paymentMethod")}
                    methods={paymentMethods}
                    value={paymentMethodId}
                    onChange={setPaymentMethodId}
                  />
                  {walletAction === "topup" && activeCards.length > 0 ? (
                    <select
                      aria-label={t("crm.cardUid")}
                      className={fieldClass}
                      value={selectedCardId}
                      onChange={(event) => setSelectedCardId(event.target.value)}
                    >
                      <option value="">{t("crm.cardUid")}</option>
                      {activeCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.cardUid}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    aria-label={t("crm.reference")}
                    placeholder={t("crm.reference")}
                    className={fieldClass}
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
                  <input
                    aria-label={t("crm.notes")}
                    placeholder={t("crm.notes")}
                    className={fieldClass}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </>
              ) : null}

              {walletAction === "refund" ||
              walletAction === "close" ||
              walletAction === "void" ? (
                <>
                  <input
                    required
                    aria-label={t("crm.approverToken")}
                    placeholder={t("crm.approverToken")}
                    className={fieldClass}
                    value={approverToken}
                    onChange={(event) => setApproverToken(event.target.value)}
                  />
                  <p className="text-xs text-slate-500">{t("crm.approverHint")}</p>
                </>
              ) : null}

              {walletAction === "bind" ? (
                <>
                  <input
                    required
                    aria-label={t("crm.cardUid")}
                    placeholder={t("crm.cardUid")}
                    className={fieldClass}
                    value={cardUid}
                    onChange={(event) => setCardUid(event.target.value)}
                  />
                  <CardCaptureStatus
                    variant="light"
                    nfcSupported={nfcSupported}
                    nfcActive={nfcActive}
                    nfcError={nfcError}
                    lastUid={lastUid}
                    onEnableNfc={() => void startNfc()}
                  />
                  <input
                    aria-label={t("crm.cardLabel")}
                    placeholder={t("crm.cardLabel")}
                    className={fieldClass}
                    value={cardLabel}
                    onChange={(event) => setCardLabel(event.target.value)}
                  />
                  <input
                    aria-label={t("crm.roomNumber")}
                    placeholder={t("crm.roomNumber")}
                    className={fieldClass}
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(event.target.value)}
                  />
                </>
              ) : null}

              {walletAction === "unbind" || walletAction === "lost" ? (
                <>
                  <p className="text-sm text-slate-600">
                    {walletAction === "unbind"
                      ? t("crm.unbindConfirm")
                      : t("crm.reportLost")}
                  </p>
                  <select
                    required
                    aria-label={t("crm.cardUid")}
                    className={fieldClass}
                    value={selectedCardId}
                    onChange={(event) => setSelectedCardId(event.target.value)}
                  >
                    {activeCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.cardUid}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}

              {walletAction === "replace" ? (
                <>
                  <select
                    required
                    aria-label={t("crm.cardUid")}
                    className={fieldClass}
                    value={selectedCardId}
                    onChange={(event) => setSelectedCardId(event.target.value)}
                  >
                    {cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.cardUid}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    aria-label={t("crm.newCardUid")}
                    placeholder={t("crm.newCardUid")}
                    className={fieldClass}
                    value={newCardUid}
                    onChange={(event) => setNewCardUid(event.target.value)}
                  />
                  <CardCaptureStatus
                    variant="light"
                    nfcSupported={nfcSupported}
                    nfcActive={nfcActive}
                    nfcError={nfcError}
                    lastUid={lastUid}
                    onEnableNfc={() => void startNfc()}
                  />
                  <input
                    aria-label={t("crm.cardLabel")}
                    placeholder={t("crm.cardLabel")}
                    className={fieldClass}
                    value={cardLabel}
                    onChange={(event) => setCardLabel(event.target.value)}
                  />
                  <input
                    aria-label={t("crm.roomNumber")}
                    placeholder={t("crm.roomNumber")}
                    className={fieldClass}
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(event.target.value)}
                  />
                </>
              ) : null}

              {walletAction === "void" ? (
                <p className="text-sm text-slate-600">{t("crm.voidConfirm")}</p>
              ) : null}

              {walletAction === "close" ? (
                <>
                  <p className="text-sm text-slate-600">{t("crm.closeCardConfirm")}</p>
                  {settlementQuote ? (
                    <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      <p>
                        {t("crm.settlementAction")}: {settlementQuote.action}
                      </p>
                      <p>
                        {t("crm.refundable")}: {settlementQuote.refundable}
                      </p>
                      <p>
                        {t("crm.forfeitable")}: {settlementQuote.forfeitable}
                      </p>
                      <p>
                        {t("crm.collectable")}: {settlementQuote.collectable}
                      </p>
                      {settlementQuote.blockers.length > 0 ? (
                        <p>
                          {t("crm.blockers")}:{" "}
                          {settlementQuote.blockers
                            .map((blocker) => blocker.label || blocker.type)
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {Number(settlementQuote?.refundable || 0) > 0 ? (
                    <PaymentMethodSelect
                      label={t("crm.paymentMethod")}
                      methods={paymentMethods}
                      value={paymentMethodId}
                      onChange={setPaymentMethodId}
                    />
                  ) : null}
                  {Number(settlementQuote?.collectable || 0) > 0 ? (
                    <PaymentMethodSelect
                      label={t("crm.paymentMethod")}
                      methods={paymentMethods}
                      value={collectPaymentMethodId}
                      onChange={setCollectPaymentMethodId}
                    />
                  ) : null}
                  <input
                    aria-label={t("crm.reference")}
                    placeholder={t("crm.reference")}
                    className={fieldClass}
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
                  <input
                    aria-label={t("crm.notes")}
                    placeholder={t("crm.notes")}
                    className={fieldClass}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </>
              ) : null}

              <div className="flex gap-2 pt-1">
                <Button
                  fullWidth
                  type="submit"
                  isLoading={isWalletLoading}
                  disabled={
                    walletAction === "close" &&
                    Boolean(settlementQuote?.blockers.length)
                  }
                >
                  {walletAction === "topup"
                    ? t("crm.confirmTopup")
                    : walletAction === "refund"
                      ? t("crm.confirmRefund")
                      : walletAction === "bind"
                        ? t("crm.confirmBind")
                        : walletAction === "unbind"
                          ? t("crm.confirmUnbind")
                          : walletAction === "lost"
                            ? t("crm.confirmLost")
                            : walletAction === "replace"
                              ? t("crm.confirmReplace")
                              : walletAction === "void"
                                ? t("crm.confirmVoid")
                                : t("crm.confirmCloseCard")}
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  type="button"
                  onClick={resetActionForm}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {isIssueFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleIssueWallet}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">
              {t("crm.registerTitle")}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                required
                aria-label={t("crm.name")}
                placeholder={t("crm.name")}
                className={fieldClass}
                value={issueForm.guestName}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    guestName: event.target.value,
                  }))
                }
              />
              <input
                required
                aria-label={t("crm.phone")}
                placeholder={t("crm.phone")}
                className={fieldClass}
                value={issueForm.guestPhone}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    guestPhone: event.target.value,
                  }))
                }
              />
              <input
                aria-label={t("crm.guestIdNumber")}
                placeholder={t("crm.guestIdNumber")}
                className={fieldClass}
                value={issueForm.guestIdNumber}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    guestIdNumber: event.target.value,
                  }))
                }
              />
              <input
                required
                aria-label={t("crm.tierId")}
                placeholder={t("crm.tierId")}
                className={fieldClass}
                value={issueForm.tierId}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    tierId: event.target.value,
                  }))
                }
              />
              <input
                required
                aria-label={t("crm.cardUid")}
                placeholder={t("crm.cardUid")}
                className={fieldClass}
                value={issueForm.cardUid}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    cardUid: event.target.value,
                  }))
                }
              />
              <CardCaptureStatus
                variant="light"
                nfcSupported={nfcSupported}
                nfcActive={nfcActive}
                nfcError={nfcError}
                lastUid={lastUid}
                onEnableNfc={() => void startNfc()}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label={t("crm.cardLabel")}
                  placeholder={t("crm.cardLabel")}
                  className={fieldClass}
                  value={issueForm.cardLabel}
                  onChange={(event) =>
                    setIssueForm((current) => ({
                      ...current,
                      cardLabel: event.target.value,
                    }))
                  }
                />
                <input
                  aria-label={t("crm.roomNumber")}
                  placeholder={t("crm.roomNumber")}
                  className={fieldClass}
                  value={issueForm.roomNumber}
                  onChange={(event) =>
                    setIssueForm((current) => ({
                      ...current,
                      roomNumber: event.target.value,
                    }))
                  }
                />
              </div>
              <PaymentMethodSelect
                label={t("crm.paymentMethod")}
                methods={paymentMethods}
                value={issueForm.paymentMethodId}
                onChange={(value) =>
                  setIssueForm((current) => ({
                    ...current,
                    paymentMethodId: value,
                  }))
                }
              />
              <input
                required
                inputMode="decimal"
                aria-label={t("crm.paymentAmount")}
                placeholder={t("crm.paymentAmount")}
                className={fieldClass}
                value={issueForm.paymentAmount}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    paymentAmount: event.target.value,
                  }))
                }
              />
              <input
                aria-label={t("crm.reference")}
                placeholder={t("crm.reference")}
                className={fieldClass}
                value={issueForm.paymentReference}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    paymentReference: event.target.value,
                  }))
                }
              />
              <div className="flex gap-2 pt-1">
                <Button fullWidth type="submit" isLoading={isWalletLoading}>
                  {t("crm.issueWallet")}
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  type="button"
                  onClick={() => setIsIssueFormOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={handleSubmitCustomer}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">
              {editing ? t("crm.editCustomer") : t("crm.addCustomer")}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                required
                aria-label={t("crm.name")}
                placeholder={t("crm.name")}
                className={fieldClass}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                aria-label={t("crm.phone")}
                placeholder={t("crm.phone")}
                className={fieldClass}
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
              <input
                type="email"
                aria-label={t("crm.email")}
                placeholder={t("crm.email")}
                className={fieldClass}
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  {t("crm.accountType")}
                  <select
                    aria-label={t("crm.accountType")}
                    className={`${fieldClass} mt-1`}
                    value={form.accountType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accountType: event.target.value,
                      }))
                    }
                  >
                    <option value="RETAIL">RETAIL</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  {t("crm.loyaltyTier")}
                  <select
                    aria-label={t("crm.loyaltyTier")}
                    className={`${fieldClass} mt-1`}
                    value={form.loyaltyTier}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        loyaltyTier: event.target.value,
                      }))
                    }
                  >
                    <option value="BRONZE">BRONZE</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.hasCreditAccount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      hasCreditAccount: event.target.checked,
                    }))
                  }
                />
                {t("crm.creditOn")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-500">
                  {t("crm.maxCredit")}
                  <input
                    aria-label={t("crm.maxCredit")}
                    className={`${fieldClass} mt-1`}
                    value={form.maxCreditLimit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxCreditLimit: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  {t("crm.terms")}
                  <input
                    aria-label={t("crm.terms")}
                    type="number"
                    min={0}
                    className={`${fieldClass} mt-1`}
                    value={form.paymentTermsDays}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        paymentTermsDays: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button fullWidth type="submit" isLoading={isLoading}>
                  {editing ? t("common.save") : t("crm.addCustomer")}
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
