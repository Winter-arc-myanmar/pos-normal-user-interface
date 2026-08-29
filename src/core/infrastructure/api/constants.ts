export const API_CONFIG = {
  // In dev, always use same-origin requests so Vite proxy handles CORS.
  BASE_URL: import.meta.env.DEV
    ? ""
    : import.meta.env.VITE_API_URL || "",
} as const;

/**
 * Template endpoint map.
 * Replace paths with your backend contract when starting a new project.
 */
export const API_ENDPOINTS = {
  ROOT: "/",

  AUTH: {
    SIGNIN: "/api/v1/auth/signin",
    SESSION: "/api/v1/auth/session",
    SET_ACTIVE_BRANCH: "/api/v1/auth/set-active-branch",
  },

  USERS: {
    BASE: "/api/v1/users",
    CREATE: "/api/v1/users",
    GET_BY_ID: "/api/v1/users/by-id",
    GET_LIST: "/api/v1/users",
    UPDATE: "/api/v1/users/update",
    UPDATE_PROFILE: "/api/v1/users/profile",
    UPLOAD_PROFILE_IMAGE: "/api/v1/users/upload-profile-image",
    DELETE: (id: string) => `/api/v1/users/${id}`,
  },

  // Example resource — copy this pattern for new features
  CUSTOMERS: {
    BASE: "/api/v1/customers",
    CREATE: "/api/v1/customers",
    GET_ALL: "/api/v1/customers",
    GET_ALL_NO_PAGINATION: "/api/v1/customers/all",
    GET_BY_ID: (id: string) => `/api/v1/customers/${id}`,
    UPDATE: (id: string) => `/api/v1/customers/${id}`,
    DELETE: (id: string) => `/api/v1/customers/${id}`,
    GET_BY_EMAIL: (email: string) => `/api/v1/customers/email/${email}`,
    GET_BY_PHONE: (phone: string) => `/api/v1/customers/phone/${phone}`,
  },

  LOCATIONS: {
    LIST: "/api/v1/locations",
    TREE: "/api/v1/locations/tree",
    BY_ID: (id: string) => `/api/v1/locations/${id}`,
  },

  PRODUCTS: {
    LIST: "/api/v1/products",
    BY_ID: (id: string) => `/api/v1/products/${id}`,
    VARIANTS: (productId: string) => ({
      LIST: `/api/v1/products/${productId}/variants`,
      BY_ID: (id: string) => `/api/v1/products/${productId}/variants/${id}`,
    }),
  },

  SALES_ORDERS: {
    LIST: "/api/v1/sales-orders",
    BY_ID: (id: string) => `/api/v1/sales-orders/${id}`,
    CREATE: "/api/v1/sales-orders",
    LINES: (salesOrderId: string) => ({
      LIST: `/api/v1/sales-orders/${salesOrderId}/lines`,
      CREATE: `/api/v1/sales-orders/${salesOrderId}/lines`,
      UPDATE: (lineId: string) =>
        `/api/v1/sales-orders/${salesOrderId}/lines/${lineId}`,
      DELETE: (lineId: string) =>
        `/api/v1/sales-orders/${salesOrderId}/lines/${lineId}`,
    }),
    PAYMENTS: (salesOrderId: string) => ({
      LIST: `/api/v1/sales-orders/${salesOrderId}/payments`,
      CREATE: `/api/v1/sales-orders/${salesOrderId}/payments`,
    }),
  },

  CHECKOUT: {
    PROCESS: "/api/v1/checkout",
  },

  PAYMENT_METHODS: {
    LIST: "/api/v1/payment-methods",
  },

  POS_REGISTERS: {
    LIST: "/api/v1/pos-registers",
    CREATE: "/api/v1/pos-registers",
    BY_ID: (id: string) => `/api/v1/pos-registers/${id}`,
    UPDATE: (id: string) => `/api/v1/pos-registers/${id}`,
    DELETE: (id: string) => `/api/v1/pos-registers/${id}`,
  },

  POS_SESSIONS: {
    LIST: "/api/v1/pos-sessions",
    CREATE: "/api/v1/pos-sessions",
    BY_ID: (id: string) => `/api/v1/pos-sessions/${id}`,
    UPDATE: (id: string) => `/api/v1/pos-sessions/${id}`,
    DELETE: (id: string) => `/api/v1/pos-sessions/${id}`,
    CLOSE: (id: string) => `/api/v1/pos-sessions/${id}/close`,
    SUMMARY: (id: string) => `/api/v1/pos-sessions/${id}/summary`,
  },

  DINING_ZONES: {
    LIST: "/api/v1/dining-zones",
  },

  DINING_TABLES: {
    LIST: "/api/v1/dining-tables",
    UPDATE_STATUS: (id: string) => `/api/v1/dining-tables/${id}/status`,
  },

  TABLE_SESSIONS: {
    LIST: "/api/v1/table-sessions",
    CREATE: "/api/v1/table-sessions",
    BY_ID: (id: string) => `/api/v1/table-sessions/${id}`,
    STATE: (id: string) => `/api/v1/table-sessions/${id}/state`,
    LINES: (id: string) => `/api/v1/table-sessions/${id}/lines`,
    CHECKOUT: (id: string) => `/api/v1/table-sessions/${id}/checkout`,
  },

  KDS: {
    FIRE: "/api/v1/kds/fire",
  },

  DISCOUNT_REASONS: {
    LIST: "/api/v1/discount-reasons",
  },

  VOID_REASONS: {
    LIST: "/api/v1/void-reasons",
  },

  WAITLIST: {
    LIST: "/api/v1/waitlist",
    CREATE: "/api/v1/waitlist",
    BY_ID: (id: string) => `/api/v1/waitlist/${id}`,
    UPDATE: (id: string) => `/api/v1/waitlist/${id}`,
    NOTIFY: (id: string) => `/api/v1/waitlist/${id}/notify`,
    SEAT: (id: string) => `/api/v1/waitlist/${id}/seat`,
    CANCEL: (id: string) => `/api/v1/waitlist/${id}/cancel`,
    NO_SHOW: (id: string) => `/api/v1/waitlist/${id}/no-show`,
  },

  TIP_POOLS: {
    LIST: "/api/v1/tip-pools",
    CREATE: "/api/v1/tip-pools",
    BY_ID: (id: string) => `/api/v1/tip-pools/${id}`,
    UPDATE: (id: string) => `/api/v1/tip-pools/${id}`,
    DISTRIBUTE: (id: string) => `/api/v1/tip-pools/${id}/distribute`,
    SETTLE: (id: string) => `/api/v1/tip-pools/${id}/settle`,
    ALLOCATIONS: {
      LIST: (id: string) => `/api/v1/tip-pools/${id}/allocations`,
      CREATE: (id: string) => `/api/v1/tip-pools/${id}/allocations`,
      UPDATE: (id: string, allocationId: string) =>
        `/api/v1/tip-pools/${id}/allocations/${allocationId}`,
      DELETE: (id: string, allocationId: string) =>
        `/api/v1/tip-pools/${id}/allocations/${allocationId}`,
    },
  },

  COUNTER_ORDERS: {
    BY_ID: (id: string) => `/api/v1/counter-orders/${id}`,
    PICKUP: (id: string) => `/api/v1/counter-orders/${id}/pickup`,
  },

  CSRF: {
    TOKEN: "/csrf/token",
  },
} as const;

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
} as const;

export type ApiEndpoint = typeof API_ENDPOINTS;
export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];
