import { useCallback, useMemo, useState } from "react";
import {
  CheckoutRequestDTO,
  CreateOrderPaymentDTO,
  CreateSalesOrderDTO,
  CreateTipPoolDTO,
  CreateWaitlistEntryDTO,
  DiningTableFilterDTO,
  FireKdsDTO,
  OpenTableSessionDTO,
  PosRegisterFilterDTO,
  PosSessionFilterDTO,
  ProductFilterDTO,
  SalesOrderFilterDTO,
  SeatWaitlistEntryDTO,
  ServiceType,
  TableSessionCheckoutDTO,
  TableSessionFilterDTO,
  CreatePosRegisterDTO,
  CreatePosSessionDTO,
  TipPoolAllocationDTO,
  TipPoolFilterDTO,
  UpdateSalesOrderLineDTO,
  UpdateTableSessionStateDTO,
  UpdateTipPoolDTO,
  UpdateWaitlistEntryDTO,
  WaitlistFilterDTO,
} from "../../application/dtos/CashierDTO";
import {
  AdjustmentReason,
  DiningTable,
  DiningZone,
  InventoryLocation,
  OrderPayment,
  PaymentMethod,
  PosRegister,
  PosSession,
  Product,
  ProductVariant,
  SalesOrder,
  SalesOrderLine,
  TableSession,
  TipPool,
  TipPoolAllocation,
  WaitlistEntry,
} from "../../domain/entities/Cashier";
import { ICashierService } from "../../domain/services/ICashierService";
import container from "../../infrastructure/di/container";
import {
  readStoredActiveLocationId,
  resolveActiveLocationId,
  writeStoredActiveLocationId,
} from "@/lib/pos/activeLocation";

interface UseCashierReturn {
  products: Product[];
  inventoryLocations: InventoryLocation[];
  activeLocationId: string;
  setActiveLocationId: (locationId: string) => void;
  salesOrders: SalesOrder[];
  selectedOrder: SalesOrder | null;
  selectedOrderLines: SalesOrderLine[];
  selectedOrderPayments: OrderPayment[];
  paymentMethods: PaymentMethod[];
  discountReasons: AdjustmentReason[];
  voidReasons: AdjustmentReason[];
  diningZones: DiningZone[];
  diningTables: DiningTable[];
  tableSessions: TableSession[];
  waitlistEntries: WaitlistEntry[];
  tipPools: TipPool[];
  tipPoolAllocations: TipPoolAllocation[];
  variantsByProductId: Record<string, ProductVariant[]>;
  activeServiceType: ServiceType;
  setActiveServiceType: (type: ServiceType) => void;
  isLoading: boolean;
  isLocationsLoading: boolean;
  error: string | null;
  fetchInventoryLocations: (
    tenantId: string,
    options?: { ignoreStored?: boolean }
  ) => Promise<string>;
  fetchProducts: (params?: ProductFilterDTO) => Promise<void>;
  fetchProductVariants: (productId: string) => Promise<ProductVariant[]>;
  fetchSalesOrders: (params?: SalesOrderFilterDTO) => Promise<void>;
  fetchPaymentMethods: () => Promise<void>;
  fetchPosRegisters: (params?: PosRegisterFilterDTO) => Promise<PosRegister[]>;
  createPosRegister: (payload: CreatePosRegisterDTO) => Promise<PosRegister>;
  fetchPosSessions: (params?: PosSessionFilterDTO) => Promise<PosSession[]>;
  createPosSession: (payload: CreatePosSessionDTO) => Promise<PosSession>;
  closePosSession: (sessionId: string) => Promise<PosSession>;
  fetchDiningZones: () => Promise<void>;
  fetchDiningTables: (params?: DiningTableFilterDTO) => Promise<void>;
  fetchTableSessions: (params?: TableSessionFilterDTO) => Promise<void>;
  updateDiningTableStatus: (
    tableId: string,
    status: DiningTable["status"]
  ) => Promise<DiningTable>;
  updateTableSessionState: (
    sessionId: string,
    payload: UpdateTableSessionStateDTO
  ) => Promise<TableSession>;
  fetchDiscountReasons: () => Promise<void>;
  fetchVoidReasons: () => Promise<void>;
  fetchWaitlist: (params?: WaitlistFilterDTO) => Promise<void>;
  createWaitlistEntry: (payload: CreateWaitlistEntryDTO) => Promise<WaitlistEntry>;
  updateWaitlistEntry: (
    id: string,
    payload: UpdateWaitlistEntryDTO
  ) => Promise<WaitlistEntry>;
  notifyWaitlistEntry: (id: string) => Promise<WaitlistEntry>;
  seatWaitlistEntry: (id: string, payload: SeatWaitlistEntryDTO) => Promise<WaitlistEntry>;
  cancelWaitlistEntry: (id: string) => Promise<WaitlistEntry>;
  noShowWaitlistEntry: (id: string) => Promise<WaitlistEntry>;
  fetchTipPools: (params?: TipPoolFilterDTO) => Promise<void>;
  getTipPoolById: (poolId: string) => Promise<TipPool>;
  createTipPool: (payload: CreateTipPoolDTO) => Promise<TipPool>;
  updateTipPool: (poolId: string, payload: UpdateTipPoolDTO) => Promise<TipPool>;
  distributeTipPool: (poolId: string) => Promise<TipPool>;
  settleTipPool: (poolId: string) => Promise<TipPool>;
  fetchTipPoolAllocations: (poolId: string) => Promise<void>;
  createTipPoolAllocation: (
    poolId: string,
    payload: TipPoolAllocationDTO
  ) => Promise<TipPoolAllocation>;
  updateTipPoolAllocation: (
    poolId: string,
    allocationId: string,
    payload: Partial<TipPoolAllocationDTO>
  ) => Promise<TipPoolAllocation>;
  deleteTipPoolAllocation: (
    poolId: string,
    allocationId: string
  ) => Promise<void>;
  openTableSession: (payload: OpenTableSessionDTO) => Promise<TableSession>;
  checkoutTableSession: (
    sessionId: string,
    payload: TableSessionCheckoutDTO
  ) => Promise<TableSession>;
  fireToKds: (payload: FireKdsDTO) => Promise<Record<string, unknown>>;
  getLatestSessionByTableId: (tableId: string) => TableSession | undefined;
  selectOrder: (order: SalesOrder) => Promise<void>;
  selectOrderById: (orderId: string) => Promise<void>;
  createOrder: (payload: CreateSalesOrderDTO) => Promise<SalesOrder>;
  addProductToOrder: (
    orderId: string,
    product: Product,
    variantId?: string,
    quantity?: number
  ) => Promise<void>;
  updateOrderLine: (
    orderId: string,
    lineId: string,
    payload: UpdateSalesOrderLineDTO
  ) => Promise<void>;
  removeOrderLine: (orderId: string, lineId: string) => Promise<void>;
  addProductToTableSession: (
    sessionId: string,
    product: Product,
    variantId?: string,
    quantity?: number
  ) => Promise<SalesOrderLine>;
  getCounterOrderById: (counterOrderId: string) => Promise<Record<string, unknown>>;
  pickupCounterOrder: (counterOrderId: string) => Promise<Record<string, unknown>>;
  addPayment: (orderId: string, payload: CreateOrderPaymentDTO) => Promise<void>;
  processCheckout: (payload: CheckoutRequestDTO) => Promise<Record<string, unknown>>;
  clearOrderSelection: () => void;
  clearError: () => void;
}

export function useCashier(): UseCashierReturn {
  const cashierService = container.resolve<ICashierService>("cashierService");
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<InventoryLocation[]>(
    []
  );
  const [activeLocationId, setActiveLocationIdState] = useState("");
  const [isLocationsLoading, setIsLocationsLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [selectedOrderLines, setSelectedOrderLines] = useState<SalesOrderLine[]>([]);
  const [selectedOrderPayments, setSelectedOrderPayments] = useState<OrderPayment[]>(
    []
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [discountReasons, setDiscountReasons] = useState<AdjustmentReason[]>([]);
  const [voidReasons, setVoidReasons] = useState<AdjustmentReason[]>([]);
  const [diningZones, setDiningZones] = useState<DiningZone[]>([]);
  const [diningTables, setDiningTables] = useState<DiningTable[]>([]);
  const [tableSessions, setTableSessions] = useState<TableSession[]>([]);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [tipPools, setTipPools] = useState<TipPool[]>([]);
  const [tipPoolAllocations, setTipPoolAllocations] = useState<TipPoolAllocation[]>([]);
  const [variantsByProductId, setVariantsByProductId] = useState<
    Record<string, ProductVariant[]>
  >({});
  const [activeServiceType, setActiveServiceType] = useState<ServiceType>("TABLE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const setActiveLocationId = useCallback((locationId: string) => {
    setActiveLocationIdState(locationId);
    const tenantId = inventoryLocations[0]?.tenantId;
    if (tenantId && locationId) {
      writeStoredActiveLocationId(tenantId, locationId);
    }
  }, [inventoryLocations]);

  const fetchInventoryLocations = useCallback(
    async (
      tenantId: string,
      options?: { ignoreStored?: boolean }
    ): Promise<string> => {
      if (!tenantId?.trim()) {
        setInventoryLocations([]);
        setActiveLocationIdState("");
        return "";
      }

      clearError();
      setIsLocationsLoading(true);
      try {
        const locations = await cashierService.getInventoryLocations();
        setInventoryLocations(locations);

        const storedId = options?.ignoreStored
          ? null
          : readStoredActiveLocationId(tenantId);
        const resolvedId =
          storedId && locations.some((location) => location.id === storedId)
            ? storedId
            : resolveActiveLocationId(tenantId, locations, {
                ignoreStored: options?.ignoreStored,
              });

        setActiveLocationIdState(resolvedId);
        return resolvedId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch inventory locations";
        setError(message);
        throw err;
      } finally {
        setIsLocationsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchProducts = useCallback(
    async (params?: ProductFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const result = await cashierService.getProducts(params);
        setProducts(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch products";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchSalesOrders = useCallback(
    async (params?: SalesOrderFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const result = await cashierService.getSalesOrders(params);
        setSalesOrders(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch sales orders";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const clearOrderSelection = useCallback(() => {
    setSelectedOrder(null);
    setSelectedOrderLines([]);
    setSelectedOrderPayments([]);
  }, []);

  const selectOrder = useCallback(
    async (order: SalesOrder) => {
      setIsLoading(true);
      clearError();
      try {
        setSelectedOrder(order);
        const [lines, payments] = await Promise.all([
          cashierService.getSalesOrderLines(order.id),
          cashierService.getOrderPayments(order.id),
        ]);
        setSelectedOrderLines(lines);
        setSelectedOrderPayments(payments);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load order";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const createOrder = useCallback(
    async (payload: CreateSalesOrderDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const order = await cashierService.createSalesOrder(payload);
        setSalesOrders((prev) => [order, ...prev]);
        await selectOrder(order);
        return order;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create order";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError, selectOrder]
  );

  const ensureVariants = useCallback(
    async (productId: string) => {
      if (variantsByProductId[productId]?.length) return variantsByProductId[productId];
      const variants = await cashierService.getVariants(productId);
      setVariantsByProductId((prev) => ({ ...prev, [productId]: variants }));
      return variants;
    },
    [cashierService, variantsByProductId]
  );

  const fetchProductVariants = useCallback(
    async (productId: string) => {
      setIsLoading(true);
      clearError();
      try {
        return await ensureVariants(productId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch product variants";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, ensureVariants]
  );

  const addProductToOrder = useCallback(
    async (
      orderId: string,
      product: Product,
      variantId?: string,
      quantity: number = 1
    ) => {
      setIsLoading(true);
      clearError();
      try {
        const variants = await ensureVariants(product.id);
        const selectedVariant =
          variants.find((variant) => variant.id === variantId) || variants[0];

        if (!selectedVariant?.id) {
          throw new Error(`No variant found for product ${product.name}`);
        }

        await cashierService.addSalesOrderLine(orderId, {
          variantId: selectedVariant.id,
          quantity: Math.max(1, quantity).toFixed(4),
          unitPrice: product.basePrice || "0.0000",
          lineDiscount: "0.0000",
        });
        const lines = await cashierService.getSalesOrderLines(orderId);
        setSelectedOrderLines(lines);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add product";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError, ensureVariants]
  );

  const updateOrderLine = useCallback(
    async (orderId: string, lineId: string, payload: UpdateSalesOrderLineDTO) => {
      setIsLoading(true);
      clearError();
      try {
        await cashierService.updateSalesOrderLine(orderId, lineId, payload);
        const lines = await cashierService.getSalesOrderLines(orderId);
        setSelectedOrderLines(lines);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update order line";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const removeOrderLine = useCallback(
    async (orderId: string, lineId: string) => {
      setIsLoading(true);
      clearError();
      try {
        await cashierService.deleteSalesOrderLine(orderId, lineId);
        const lines = await cashierService.getSalesOrderLines(orderId);
        setSelectedOrderLines(lines);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove order line";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const addPayment = useCallback(
    async (orderId: string, payload: CreateOrderPaymentDTO) => {
      setIsLoading(true);
      clearError();
      try {
        await cashierService.createOrderPayment(orderId, payload);
        const payments = await cashierService.getOrderPayments(orderId);
        setSelectedOrderPayments(payments);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add payment";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchPaymentMethods = useCallback(async () => {
    setIsLoading(true);
    clearError();
    try {
      const methods = await cashierService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch payment methods";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cashierService, clearError]);

  const fetchPosRegisters = useCallback(
    async (params?: PosRegisterFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.getPosRegisters(params);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch POS registers";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const createPosRegister = useCallback(
    async (payload: CreatePosRegisterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.createPosRegister(payload);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create POS register";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchPosSessions = useCallback(
    async (params?: PosSessionFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.getPosSessions(params);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch POS sessions";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const createPosSession = useCallback(
    async (payload: CreatePosSessionDTO) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.createPosSession(payload);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create POS session";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const closePosSession = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.closePosSession(sessionId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to close POS session";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchDiscountReasons = useCallback(async () => {
    setIsLoading(true);
    clearError();
    try {
      const reasons = await cashierService.getDiscountReasons(true);
      setDiscountReasons(reasons);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch discount reasons";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cashierService, clearError]);

  const fetchVoidReasons = useCallback(async () => {
    setIsLoading(true);
    clearError();
    try {
      const reasons = await cashierService.getVoidReasons(true);
      setVoidReasons(reasons);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch void reasons";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cashierService, clearError]);

  const fetchWaitlist = useCallback(
    async (params?: WaitlistFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const entries = await cashierService.getWaitlist(params);
        setWaitlistEntries(entries);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch waitlist";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const createWaitlistEntry = useCallback(
    async (payload: CreateWaitlistEntryDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const entry = await cashierService.createWaitlistEntry(payload);
        setWaitlistEntries((prev) => [entry, ...prev]);
        return entry;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create waitlist entry";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const updateWaitlistEntry = useCallback(
    async (id: string, payload: UpdateWaitlistEntryDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.updateWaitlistEntry(id, payload);
        setWaitlistEntries((current) =>
          current.map((entry) => (entry.id === id ? updated : entry))
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update waitlist entry";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const notifyWaitlistEntry = useCallback(
    async (id: string) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.notifyWaitlistEntry(id);
        setWaitlistEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to notify waitlist entry";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const seatWaitlistEntry = useCallback(
    async (id: string, payload: SeatWaitlistEntryDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.seatWaitlistEntry(id, payload);
        setWaitlistEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        const [tables, sessions] = await Promise.all([
          cashierService.getDiningTables({ page: 1, limit: 200 }),
          cashierService.getTableSessions({ page: 1, limit: 200 }),
        ]);
        setDiningTables(tables);
        setTableSessions(sessions);
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to seat waitlist entry";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const cancelWaitlistEntry = useCallback(
    async (id: string) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.cancelWaitlistEntry(id);
        setWaitlistEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to cancel waitlist entry";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const noShowWaitlistEntry = useCallback(
    async (id: string) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.noShowWaitlistEntry(id);
        setWaitlistEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to mark waitlist no-show";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchTipPools = useCallback(
    async (params?: TipPoolFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const pools = await cashierService.getTipPools(params);
        setTipPools(pools);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch tip pools";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const getTipPoolById = useCallback(
    async (poolId: string) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.getTipPoolById(poolId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load tip pool";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const createTipPool = useCallback(
    async (payload: CreateTipPoolDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const pool = await cashierService.createTipPool(payload);
        setTipPools((prev) => [pool, ...prev]);
        return pool;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create tip pool";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const updateTipPool = useCallback(
    async (poolId: string, payload: UpdateTipPoolDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.updateTipPool(poolId, payload);
        setTipPools((current) =>
          current.map((pool) => (pool.id === poolId ? updated : pool))
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update tip pool";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const distributeTipPool = useCallback(
    async (poolId: string) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.distributeTipPool(poolId);
        setTipPools((prev) => prev.map((p) => (p.id === poolId ? updated : p)));
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to distribute tip pool";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const settleTipPool = useCallback(
    async (poolId: string) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.settleTipPool(poolId);
        setTipPools((prev) => prev.map((p) => (p.id === poolId ? updated : p)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to settle tip pool";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchTipPoolAllocations = useCallback(
    async (poolId: string) => {
      setIsLoading(true);
      clearError();
      try {
        const allocations = await cashierService.getTipPoolAllocations(poolId);
        setTipPoolAllocations(allocations);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch tip allocations";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const createTipPoolAllocation = useCallback(
    async (poolId: string, payload: TipPoolAllocationDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const allocation = await cashierService.createTipPoolAllocation(
          poolId,
          payload
        );
        setTipPoolAllocations((current) => [...current, allocation]);
        return allocation;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create allocation";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const updateTipPoolAllocation = useCallback(
    async (
      poolId: string,
      allocationId: string,
      payload: Partial<TipPoolAllocationDTO>
    ) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.updateTipPoolAllocation(
          poolId,
          allocationId,
          payload
        );
        setTipPoolAllocations((current) =>
          current.map((allocation) =>
            allocation.id === allocationId ? updated : allocation
          )
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update allocation";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const deleteTipPoolAllocation = useCallback(
    async (poolId: string, allocationId: string) => {
      setIsLoading(true);
      clearError();
      try {
        await cashierService.deleteTipPoolAllocation(poolId, allocationId);
        setTipPoolAllocations((current) =>
          current.filter((allocation) => allocation.id !== allocationId)
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete allocation";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchDiningZones = useCallback(async () => {
    setIsLoading(true);
    clearError();
    try {
      const zones = await cashierService.getDiningZones();
      setDiningZones(zones);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch zones";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cashierService, clearError]);

  const fetchDiningTables = useCallback(
    async (params?: DiningTableFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const tables = await cashierService.getDiningTables(params);
        setDiningTables(tables);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch tables";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const fetchTableSessions = useCallback(
    async (params?: TableSessionFilterDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const sessions = await cashierService.getTableSessions(params);
        setTableSessions(sessions);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch table sessions";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const updateDiningTableStatus = useCallback(
    async (tableId: string, status: DiningTable["status"]) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.updateDiningTableStatus(tableId, status);
        setDiningTables((current) =>
          current.map((table) => (table.id === tableId ? updated : table))
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update table status";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const updateTableSessionState = useCallback(
    async (sessionId: string, payload: UpdateTableSessionStateDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const updated = await cashierService.updateTableSessionState(
          sessionId,
          payload
        );
        setTableSessions((current) =>
          current.map((session) => (session.id === sessionId ? updated : session))
        );
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update table session";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const selectOrderById = useCallback(
    async (orderId: string) => {
      setIsLoading(true);
      clearError();
      try {
        const order = await cashierService.getSalesOrderById(orderId);
        await selectOrder(order);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load order";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError, selectOrder]
  );

  const openTableSession = useCallback(
    async (payload: OpenTableSessionDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const session = await cashierService.openTableSession(payload);
        setTableSessions((prev) => [session, ...prev]);
        const updatedTables = await cashierService.getDiningTables({
          page: 1,
          limit: 200,
        });
        setDiningTables(updatedTables);
        if (session.salesOrderId) {
          await selectOrderById(session.salesOrderId);
        }
        return session;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to open table session";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError, selectOrderById]
  );

  const checkoutTableSession = useCallback(
    async (sessionId: string, payload: TableSessionCheckoutDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const session = await cashierService.checkoutTableSession(sessionId, payload);
        const [tables, sessions] = await Promise.all([
          cashierService.getDiningTables({ page: 1, limit: 200 }),
          cashierService.getTableSessions({ page: 1, limit: 200 }),
        ]);
        setDiningTables(tables);
        setTableSessions(sessions);
        clearOrderSelection();
        return session;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to checkout table session";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError, clearOrderSelection]
  );

  const fireToKds = useCallback(
    async (payload: FireKdsDTO) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.fireToKds(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fire to KDS";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const getLatestSessionByTableId = useCallback(
    (tableId: string) => {
      return tableSessions
        .filter((session) => session.tableId === tableId)
        .sort(
          (a, b) =>
            new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime()
        )[0];
    },
    [tableSessions]
  );

  const addProductToTableSession = useCallback(
    async (
      sessionId: string,
      product: Product,
      variantId?: string,
      quantity: number = 1
    ) => {
      setIsLoading(true);
      clearError();
      try {
        const variants = await ensureVariants(product.id);
        const selectedVariant =
          variants.find((variant) => variant.id === variantId) || variants[0];

        if (!selectedVariant?.id) {
          throw new Error(`No variant found for product ${product.name}`);
        }

        const variantModifier = Number(selectedVariant?.priceModifier || 0);
        const unitPrice = Number(product.basePrice || 0) + variantModifier;

        const line = await cashierService.addTableSessionLine(sessionId, {
          variantId: selectedVariant.id,
          quantity: Math.max(1, quantity).toFixed(4),
          unitPrice: unitPrice.toFixed(4),
          lineDiscount: "0.0000",
        });

        if (line.salesOrderId) {
          await selectOrderById(line.salesOrderId);
        }

        return line;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add product to table";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError, ensureVariants, selectOrderById]
  );

  const pickupCounterOrder = useCallback(
    async (counterOrderId: string) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.pickupCounterOrder(counterOrderId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to mark order picked up";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const getCounterOrderById = useCallback(
    async (counterOrderId: string) => {
      setIsLoading(true);
      clearError();
      try {
        return await cashierService.getCounterOrderById(counterOrderId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load counter order";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError]
  );

  const processCheckout = useCallback(
    async (payload: CheckoutRequestDTO) => {
      setIsLoading(true);
      clearError();
      try {
        const result = await cashierService.checkout(payload);
        await fetchSalesOrders({ page: 1, limit: 100 });
        clearOrderSelection();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Checkout failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cashierService, clearError, clearOrderSelection, fetchSalesOrders]
  );

  const value = useMemo(
    () => ({
      products,
      inventoryLocations,
      activeLocationId,
      setActiveLocationId,
      salesOrders,
      selectedOrder,
      selectedOrderLines,
      selectedOrderPayments,
      paymentMethods,
      discountReasons,
      voidReasons,
      diningZones,
      diningTables,
      tableSessions,
      waitlistEntries,
      tipPools,
      tipPoolAllocations,
      variantsByProductId,
      activeServiceType,
      setActiveServiceType,
      isLoading,
      isLocationsLoading,
      error,
      fetchInventoryLocations,
      fetchProducts,
      fetchProductVariants,
      fetchSalesOrders,
      fetchPaymentMethods,
      fetchPosRegisters,
      createPosRegister,
      fetchPosSessions,
      createPosSession,
      closePosSession,
      fetchDiscountReasons,
      fetchVoidReasons,
      fetchDiningZones,
      fetchDiningTables,
      fetchTableSessions,
      updateDiningTableStatus,
      updateTableSessionState,
      fetchWaitlist,
      createWaitlistEntry,
      updateWaitlistEntry,
      notifyWaitlistEntry,
      seatWaitlistEntry,
      cancelWaitlistEntry,
      noShowWaitlistEntry,
      fetchTipPools,
      getTipPoolById,
      createTipPool,
      updateTipPool,
      distributeTipPool,
      settleTipPool,
      fetchTipPoolAllocations,
      createTipPoolAllocation,
      updateTipPoolAllocation,
      deleteTipPoolAllocation,
      openTableSession,
      checkoutTableSession,
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
      addPayment,
      processCheckout,
      clearOrderSelection,
      clearError,
    }),
    [
      products,
      inventoryLocations,
      activeLocationId,
      setActiveLocationId,
      salesOrders,
      selectedOrder,
      selectedOrderLines,
      selectedOrderPayments,
      paymentMethods,
      discountReasons,
      voidReasons,
      diningZones,
      diningTables,
      tableSessions,
      waitlistEntries,
      tipPools,
      tipPoolAllocations,
      variantsByProductId,
      activeServiceType,
      isLoading,
      isLocationsLoading,
      error,
      fetchInventoryLocations,
      fetchProducts,
      fetchProductVariants,
      fetchSalesOrders,
      fetchPaymentMethods,
      fetchPosRegisters,
      createPosRegister,
      fetchPosSessions,
      createPosSession,
      closePosSession,
      fetchDiscountReasons,
      fetchVoidReasons,
      fetchDiningZones,
      fetchDiningTables,
      fetchTableSessions,
      updateDiningTableStatus,
      updateTableSessionState,
      fetchWaitlist,
      createWaitlistEntry,
      updateWaitlistEntry,
      notifyWaitlistEntry,
      seatWaitlistEntry,
      cancelWaitlistEntry,
      noShowWaitlistEntry,
      fetchTipPools,
      getTipPoolById,
      createTipPool,
      updateTipPool,
      distributeTipPool,
      settleTipPool,
      fetchTipPoolAllocations,
      createTipPoolAllocation,
      updateTipPoolAllocation,
      deleteTipPoolAllocation,
      openTableSession,
      checkoutTableSession,
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
      addPayment,
      processCheckout,
      clearOrderSelection,
      clearError,
    ]
  );

  return value;
}
