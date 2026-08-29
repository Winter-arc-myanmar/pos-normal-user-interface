import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  OrderStatus,
  ServiceType,
  TableSessionState,
  toApiServiceType,
} from "@/core/application/dtos/CashierDTO";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCashier } from "@/core/presentation/hooks/useCashier";
import { CashierBoard } from "./cashier/CashierBoard";
import { OrderPanel } from "./cashier/OrderPanel";
import { ProductMenu } from "./cashier/ProductMenu";

const BOARD_PAGE_SIZE = 15;

export function CashierPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    products,
    variantsByProductId,
    salesOrders,
    selectedOrder,
    selectedOrderLines,
    paymentMethods,
    diningZones,
    diningTables,
    tableSessions,
    activeServiceType,
    setActiveServiceType,
    activeLocationId,
    fetchInventoryLocations,
    isLocationsLoading,
    isLoading,
    error,
    fetchProducts,
    fetchProductVariants,
    fetchSalesOrders,
    fetchPaymentMethods,
    fetchDiningZones,
    fetchDiningTables,
    fetchTableSessions,
    updateDiningTableStatus,
    openTableSession,
    checkoutTableSession,
    updateTableSessionState,
    fireToKds,
    getLatestSessionByTableId,
    selectOrder,
    selectOrderById,
    createOrder,
    addProductToOrder,
    updateOrderLine,
    removeOrderLine,
    addProductToTableSession,
    getCounterOrderById,
    pickupCounterOrder,
    processCheckout,
    clearError,
  } = useCashier();

  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [boardPage, setBoardPage] = useState(1);
  const [paymentAmount, setPaymentAmount] = useState("0.0000");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [directCartLines, setDirectCartLines] = useState<typeof selectedOrderLines>([]);
  const [isDirectCheckoutMode, setIsDirectCheckoutMode] = useState(false);
  const paymentInputRef = useRef<HTMLInputElement>(null);

  const tenantId = String(user?.tenantId || "");
  const locationId = activeLocationId;
  const activeView = searchParams.get("view") || "orders";
  const isTableService = activeServiceType === "TABLE";

  useEffect(() => {
    if (!tenantId) return;
    void fetchInventoryLocations(tenantId);
  }, [fetchInventoryLocations, tenantId]);

  const loadData = useCallback(async () => {
    clearError();
    await Promise.allSettled([
      fetchProducts({
        page: 1,
        limit: 100,
        inStockOnly: true,
        locationId: locationId || undefined,
      }),
      fetchSalesOrders({ page: 1, limit: 100 }),
      fetchPaymentMethods(),
      fetchDiningZones(),
      fetchDiningTables({ page: 1, limit: 200 }),
      fetchTableSessions({
        page: 1,
        limit: 200,
        sortBy: "openedAt",
        sortOrder: "desc",
      }),
    ]);
  }, [
    clearError,
    fetchDiningTables,
    fetchDiningZones,
    fetchPaymentMethods,
    fetchProducts,
    fetchSalesOrders,
    fetchTableSessions,
    locationId,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!paymentMethods.length || paymentMethodId) return;
    setPaymentMethodId(paymentMethods[0].id);
  }, [paymentMethodId, paymentMethods]);

  const selectedOrderSession = useMemo(
    () =>
      selectedOrder
        ? tableSessions.find(
            (session) =>
              session.salesOrderId === selectedOrder.id && !session.closedAt
          ) || null
        : null,
    [selectedOrder, tableSessions]
  );

  const selectedOrderTable = useMemo(
    () =>
      selectedOrderSession
        ? diningTables.find(
            (table) => table.id === selectedOrderSession.tableId
          ) || null
        : null,
    [diningTables, selectedOrderSession]
  );

  const activeOrderLines = useMemo(
    () => (isDirectCheckoutMode ? directCartLines : selectedOrderLines),
    [directCartLines, isDirectCheckoutMode, selectedOrderLines]
  );

  const orderTotal = useMemo(() => {
    const lineTotal = activeOrderLines.reduce((sum, line) => {
      const quantity = Number(line.quantity || 0);
      const unitPrice = Number(line.unitPrice || 0);
      const discount = Number(line.lineDiscount || 0);
      const tax = Number(line.taxAmount || 0);
      return sum + quantity * unitPrice - discount + tax;
    }, 0);
    const backendTotal = Number(selectedOrder?.grandTotal || 0);
    return (lineTotal > 0 ? lineTotal : backendTotal).toFixed(4);
  }, [activeOrderLines, selectedOrder?.grandTotal]);

  useEffect(() => {
    setPaymentAmount(orderTotal);
  }, [isDirectCheckoutMode, orderTotal, selectedOrder?.id]);

  useEffect(() => {
    if (activeView === "pay") {
      paymentInputRef.current?.focus();
      paymentInputRef.current?.select();
    }
  }, [activeView, selectedOrder?.id]);

  const filteredOrders = useMemo(
    () =>
      salesOrders.filter((order) => {
        const serviceMatches =
          activeServiceType === "TABLE"
            ? order.serviceType === "DINE_IN"
            : order.serviceType === activeServiceType;
        const statusMatches =
          statusFilter === "ALL" || order.status === statusFilter;
        return serviceMatches && statusMatches;
      }),
    [activeServiceType, salesOrders, statusFilter]
  );

  const filteredTables = useMemo(() => {
    const mappedStatus = (
      sessionState?: TableSessionState
    ): OrderStatus | "ALL" => {
      if (!sessionState) return "ALL";
      if (["SEATED", "ORDERING"].includes(sessionState)) return "DRAFT";
      if (["SERVED", "PAYMENT_PENDING"].includes(sessionState)) {
        return "CONFIRMED";
      }
      if (sessionState === "CLOSED") return "COMPLETED";
      return "ALL";
    };

    return diningTables.filter((table) => {
      if (zoneFilter !== "ALL" && table.zoneId !== zoneFilter) return false;
      if (statusFilter === "ALL") return true;
      return (
        mappedStatus(getLatestSessionByTableId(table.id)?.sessionState) ===
        statusFilter
      );
    });
  }, [
    diningTables,
    getLatestSessionByTableId,
    statusFilter,
    zoneFilter,
  ]);

  const boardItems =
    activeServiceType === "TABLE" ? filteredTables : filteredOrders;
  const boardPageCount = Math.max(
    1,
    Math.ceil(boardItems.length / BOARD_PAGE_SIZE)
  );
  const pageStart = (boardPage - 1) * BOARD_PAGE_SIZE;
  const pagedTables =
    activeServiceType === "TABLE"
      ? filteredTables.slice(pageStart, pageStart + BOARD_PAGE_SIZE)
      : [];
  const pagedOrders =
    activeServiceType === "TABLE"
      ? []
      : filteredOrders.slice(pageStart, pageStart + BOARD_PAGE_SIZE);

  useEffect(() => {
    setBoardPage(1);
  }, [activeServiceType, statusFilter, zoneFilter]);

  useEffect(() => {
    if (boardPage > boardPageCount) setBoardPage(boardPageCount);
  }, [boardPage, boardPageCount]);

  useEffect(() => {
    if (isTableService && isDirectCheckoutMode) {
      setIsDirectCheckoutMode(false);
      setDirectCartLines([]);
    }
  }, [isDirectCheckoutMode, isTableService]);

  const requireCashierContext = useCallback(async () => {
    if (!tenantId) {
      throw new Error(t("cashier.errors.missingTenant"));
    }

    const resolvedLocationId =
      locationId || (await fetchInventoryLocations(tenantId));
    if (!resolvedLocationId) {
      throw new Error(t("cashier.errors.missingLocation"));
    }

    return { tenantId, locationId: resolvedLocationId };
  }, [fetchInventoryLocations, locationId, t, tenantId]);

  const handleCreateOrder = async () => {
    setLocalError(null);
    try {
      const context = await requireCashierContext();
      if (!isTableService) {
        setIsDirectCheckoutMode(true);
        setDirectCartLines([]);
        setNotice("New cart started");
        setSearchParams({ view: "menu" });
        return;
      }
      await createOrder({
        tenantId: context.tenantId,
        locationId: context.locationId,
        salesChannel: "POS",
        status: "DRAFT",
        subtotal: "0.0000",
        totalDiscount: "0.0000",
        totalTax: "0.0000",
        grandTotal: "0.0000",
        idempotencyKey: `cashier-${Date.now()}`,
      });
      setSearchParams({ view: "menu" });
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : t("cashier.errors.createOrder")
      );
    }
  };

  const handleTableTap = async (tableId: string) => {
    setLocalError(null);
    setNotice(null);
    setIsDirectCheckoutMode(false);
    setDirectCartLines([]);
    const table = diningTables.find((item) => item.id === tableId);
    if (!table) return;

    try {
      const context = await requireCashierContext();
      const latestSession = getLatestSessionByTableId(table.id);
      if (latestSession && !latestSession.closedAt && latestSession.salesOrderId) {
        await selectOrderById(latestSession.salesOrderId);
        return;
      }

      const newSession = await openTableSession({
        tenantId: context.tenantId,
        tableId: table.id,
        locationId: context.locationId,
        guestCount: Math.max(1, table.maxSeats || 1),
        salesChannel: "POS",
      });
      if (newSession.salesOrderId) {
        await selectOrderById(newSession.salesOrderId);
      }
      setSearchParams({ view: "menu" });
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : t("cashier.errors.openTable")
      );
    }
  };

  const handleAddProduct = async (
    product: (typeof products)[number],
    variantId: string,
    quantity: number
  ) => {
    if (selectedOrderSession) {
      await addProductToTableSession(
        selectedOrderSession.id,
        product,
        variantId,
        quantity
      );
      if (selectedOrderSession.sessionState === "SEATED") {
        await updateTableSessionState(selectedOrderSession.id, {
          sessionState: "ORDERING",
        });
      }
    } else if (selectedOrder) {
      await addProductToOrder(
        selectedOrder.id,
        product,
        variantId,
        quantity
      );
    } else if (!isTableService) {
      setIsDirectCheckoutMode(true);
      setDirectCartLines((current) => {
        const existing = current.find((line) => line.variantId === variantId);
        if (existing) {
          return current.map((line) =>
            line.variantId === variantId
              ? {
                  ...line,
                  quantity: (Number(line.quantity || 0) + Math.max(1, quantity)).toFixed(4),
                }
              : line
          );
        }
        return [
          ...current,
          {
            id: `direct-${variantId}`,
            salesOrderId: "direct-checkout",
            variantId,
            quantity: Math.max(1, quantity).toFixed(4),
            unitPrice: product.basePrice || "0.0000",
            lineDiscount: "0.0000",
            taxAmount: "0.0000",
            status: "PENDING",
          },
        ];
      });
    } else {
      throw new Error(t("cashier.errors.selectOrder"));
    }
  };

  const handleCheckout = async () => {
    setLocalError(null);
    setNotice(null);

    try {
      const context = await requireCashierContext();
      if (!activeOrderLines.length) {
        throw new Error("Add at least one item before checkout");
      }
      if (!paymentMethodId) {
        throw new Error(t("cashier.errors.paymentMethodRequired"));
      }
      if (!Number.isFinite(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      if (selectedOrderSession && selectedOrder) {
        await checkoutTableSession(selectedOrderSession.id, {
          payments: [{ paymentMethodId, amount: paymentAmount }],
        });
      } else {
        const selectedServiceType = selectedOrder
          ? selectedOrder.serviceType
          : activeServiceType;
        await processCheckout({
          tenantId: context.tenantId,
          locationId: selectedOrder?.locationId || context.locationId,
          salesChannel: "POS",
          serviceType: toApiServiceType(selectedServiceType),
          idempotencyKey: `checkout-${selectedOrder?.id || "direct"}-${Date.now()}`,
          items: activeOrderLines.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
            lineDiscount: line.lineDiscount || "0.0000",
          })),
          payments: [{ paymentMethodId, amount: paymentAmount }],
        });
      }

      await loadData();
      setIsDirectCheckoutMode(false);
      setDirectCartLines([]);
      setNotice(t("cashier.orderPanel.checkoutSuccess"));
      setSearchParams({ view: "orders" });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : t("cashier.errors.checkout");
      setLocalError(message);
    }
  };

  const mutateOrderLineQuantity = async (lineId: string, nextQty: number) => {
    const targetLine = activeOrderLines.find((line) => line.id === lineId);
    if (!targetLine) return;

    const quantity = Number.isFinite(nextQty) ? Math.max(0, nextQty) : 0;
    if (isDirectCheckoutMode) {
      if (quantity <= 0) {
        setDirectCartLines((current) => current.filter((line) => line.id !== lineId));
      } else {
        setDirectCartLines((current) =>
          current.map((line) =>
            line.id === lineId ? { ...line, quantity: quantity.toFixed(4) } : line
          )
        );
      }
      return;
    }

    if (!selectedOrder) return;
    if (quantity <= 0) {
      await removeOrderLine(selectedOrder.id, lineId);
      return;
    }

    await updateOrderLine(selectedOrder.id, lineId, {
      variantId: targetLine.variantId,
      quantity: quantity.toFixed(4),
      unitPrice: targetLine.unitPrice || "0.0000",
      lineDiscount: targetLine.lineDiscount || "0.0000",
      taxAmount: targetLine.taxAmount || "0.0000",
      seatNumber: targetLine.seatNumber,
    });
  };

  const handleIncreaseLineQuantity = async (line: (typeof activeOrderLines)[number]) => {
    try {
      setLocalError(null);
      setNotice(null);
      await mutateOrderLineQuantity(line.id, Number(line.quantity || 0) + 1);
      setNotice(t("cashier.orderPanel.itemUpdated"));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.errors.updateOrderLine")
      );
    }
  };

  const handleDecreaseLineQuantity = async (line: (typeof activeOrderLines)[number]) => {
    try {
      setLocalError(null);
      setNotice(null);
      await mutateOrderLineQuantity(line.id, Number(line.quantity || 0) - 1);
      setNotice(t("cashier.orderPanel.itemUpdated"));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.errors.updateOrderLine")
      );
    }
  };

  const handleRemoveLine = async (line: (typeof activeOrderLines)[number]) => {
    try {
      setLocalError(null);
      setNotice(null);
      if (isDirectCheckoutMode) {
        setDirectCartLines((current) => current.filter((entry) => entry.id !== line.id));
      } else if (selectedOrder) {
        await removeOrderLine(selectedOrder.id, line.id);
      }
      setNotice(t("cashier.orderPanel.itemRemoved"));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("cashier.errors.removeOrderLine")
      );
    }
  };

  const handleFireKds = async () => {
    if (!selectedOrder) return;
    setLocalError(null);
    setNotice(null);
    try {
      await fireToKds(
        selectedOrderSession
          ? { sessionId: selectedOrderSession.id }
          : { salesOrderId: selectedOrder.id }
      );
      setNotice("Order sent to KDS");
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Failed to send order to KDS"
      );
    }
  };

  const handleTableStatusChange = async (
    status: (typeof diningTables)[number]["status"]
  ) => {
    if (!selectedOrderTable) return;
    setLocalError(null);
    setNotice(null);
    try {
      await updateDiningTableStatus(selectedOrderTable.id, status);
      setNotice(`Table marked ${status.toLowerCase()}`);
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to update table status"
      );
    }
  };

  const handleSessionStateChange = async (sessionState: TableSessionState) => {
    if (!selectedOrderSession) return;
    setLocalError(null);
    setNotice(null);
    try {
      await updateTableSessionState(selectedOrderSession.id, { sessionState });
      setNotice(`Session moved to ${sessionState.toLowerCase()}`);
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : "Unable to update table session"
      );
    }
  };

  const handlePickup = async () => {
    if (!selectedOrder) return;
    setLocalError(null);
    try {
      await getCounterOrderById(selectedOrder.id);
      await pickupCounterOrder(selectedOrder.id);
      await selectOrderById(selectedOrder.id);
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : t("cashier.errors.pickupFailed")
      );
    }
  };

  const handleServiceTypeChange = (type: ServiceType) => {
    setActiveServiceType(type);
    setSearchParams({ view: "orders" });
  };

  const handleOrderSelect = async (order: (typeof salesOrders)[number]) => {
    setIsDirectCheckoutMode(false);
    setDirectCartLines([]);
    setNotice(null);
    await selectOrder(order);
  };

  return (
    <section className="grid h-full min-h-0 min-w-0 grid-cols-[13rem_minmax(0,1fr)_5.5rem] overflow-hidden bg-[#070707] text-white min-[1100px]:grid-cols-[18rem_minmax(0,1fr)_8rem]">
      <OrderPanel
        selectedOrder={selectedOrder}
        selectedOrderLines={activeOrderLines}
        products={products}
        variantsByProductId={variantsByProductId}
        paymentMethods={paymentMethods}
        paymentMethodId={paymentMethodId}
        paymentAmount={paymentAmount}
        total={orderTotal}
        selectedTable={selectedOrderTable}
        selectedSession={selectedOrderSession}
        paymentInputRef={paymentInputRef}
        isLoading={isLoading || isLocationsLoading}
        canCreateOrder={Boolean(tenantId && locationId)}
        feedback={notice}
        errorMessage={localError}
        onCreateOrder={() => void handleCreateOrder()}
        onIncreaseLineQuantity={(line) => void handleIncreaseLineQuantity(line)}
        onDecreaseLineQuantity={(line) => void handleDecreaseLineQuantity(line)}
        onRemoveLine={(line) => void handleRemoveLine(line)}
        onPaymentAmountChange={setPaymentAmount}
        onPaymentMethodChange={setPaymentMethodId}
        onCheckout={() => void handleCheckout()}
        onFireKds={() => void handleFireKds()}
        onPickup={() => void handlePickup()}
        onTableStatusChange={(status) => void handleTableStatusChange(status)}
        onSessionStateChange={(state) => void handleSessionStateChange(state)}
      />

      <main className="min-h-0 min-w-0">
        {activeView === "menu" ? (
          <ProductMenu
            products={products}
            variantsByProductId={variantsByProductId}
            disabled={isTableService && !selectedOrder}
            onLoadVariants={fetchProductVariants}
            onAdd={handleAddProduct}
            onClose={() => setSearchParams({ view: "orders" })}
          />
        ) : (
          <CashierBoard
            serviceType={activeServiceType}
            statusFilter={statusFilter}
            tables={pagedTables}
            orders={pagedOrders}
            selectedOrderId={selectedOrder?.id}
            isLoading={isLoading}
            error={error}
            page={boardPage}
            pageCount={boardPageCount}
            getLatestSession={getLatestSessionByTableId}
            onServiceTypeChange={handleServiceTypeChange}
            onStatusFilterChange={setStatusFilter}
            onTableSelect={(tableId) => void handleTableTap(tableId)}
            onOrderSelect={(order) => void handleOrderSelect(order)}
            onPageChange={setBoardPage}
          />
        )}
      </main>

      <aside className="flex min-h-0 flex-col border-l border-slate-800 bg-[#222] p-1.5 min-[1100px]:p-2">
        <button
          type="button"
          onClick={() => setZoneFilter("ALL")}
          className={[
            "mb-1 min-h-10 rounded px-2 py-2 text-left text-xs min-[1100px]:text-sm",
            zoneFilter === "ALL" ? "bg-blue-600" : "bg-slate-500",
          ].join(" ")}
        >
          {t("cashier.locations.all")}
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {diningZones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => setZoneFilter(zone.id)}
              className={[
                "mb-1 min-h-10 w-full rounded px-2 py-2 text-left text-xs min-[1100px]:text-sm",
                zoneFilter === zone.id ? "bg-blue-600" : "bg-slate-500",
              ].join(" ")}
            >
              {zone.name}
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}
