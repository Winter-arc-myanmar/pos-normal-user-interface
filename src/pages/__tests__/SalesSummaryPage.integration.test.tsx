import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesSummaryPage } from "../SalesSummaryPage";

const mocks = vi.hoisted(() => ({
  posSummary: vi.fn(),
  posBills: vi.fn(),
  barCategories: vi.fn(),
  spaMenu: vi.fn(),
  ktvSessions: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        "salesSummary.title": "POS sales summary",
        "salesSummary.description": "POS totals",
        "salesSummary.posType": "POS type",
        "salesSummary.searchBills": "Search bills",
        "salesSummary.empty": "No sales in this range.",
        "salesSummary.billCount": "Bills",
        "salesSummary.compedItems": "FOC items",
        "salesSummary.compedValue": "FOC value",
        "salesSummary.refundAmount": "Refunds",
        "salesSummary.share": "Share",
        "salesSummary.spaMenu": "SPA menu",
        "salesSummary.roomMenuPackages": "Room menu packages",
        "salesSummary.roomServices": "Room services",
        "salesSummary.roomTime": "Room time",
        "salesSummary.sessionCount": "Sessions",
        "salesSummary.hoursSold": "Hours sold",
        "salesSummary.roomSales": "Room sales",
        "salesSummary.fnbSales": "F&B sales",
        "salesSummary.byRoom": "By room",
        "salesSummary.sessions": "Sessions list",
        "salesSummary.room": "Room",
        "salesSummary.guest": "Guest",
        "salesSummary.minutesUsed": "Minutes used",
        "salesSummary.freeHours": "Free hours",
        "salesSummary.uncategorized": "Uncategorized",
        "salesSummary.page": `Page ${options?.page ?? ""} of ${options?.total ?? ""}`,
        "salesSummary.previous": "Previous",
        "salesSummary.next": "Next",
        "salesSummary.tabs.posSummary": "POS summary",
        "salesSummary.tabs.posBills": "POS bills",
        "salesSummary.tabs.bar": "Bar by category",
        "salesSummary.tabs.spaMenu": "SPA by menu",
        "salesSummary.tabs.ktv": "KTV sessions",
        "salesSummary.posTypes.SPA": "SPA",
        "salesSummary.posTypes.KTV": "KTV",
        "salesSummary.posTypes.BAR": "Bar",
        "dashboard.from": "From",
        "dashboard.to": "To",
        "dashboard.netSales": "Net sales",
        "dashboard.grossSales": "Gross sales",
        "dashboard.orders": "Orders",
        "dashboard.grandTotal": "Grand total",
        "dashboard.netAfterRefunds": "Net after refunds",
        "dashboard.discounts": "Discounts",
        "dashboard.payments": "Payments",
        "dashboard.byDay": "By day",
        "dashboard.byHour": "By hour",
        "dashboard.byOutlet": "By outlet",
        "dashboard.serviceTypes": "Service types",
        "dashboard.categories": "Category sales",
        "dashboard.columns.category": "Category",
        "dashboard.columns.quantity": "Quantity",
        "dashboard.columns.product": "Product",
        "dashboard.columns.date": "Date",
        "dashboard.columns.hour": "Hour",
        "dashboard.columns.outlet": "Outlet",
        "dashboard.textMode": "Text",
        "dashboard.chartMode": "Charts",
        "common.loading": "Loading...",
        "common.clearSearch": "Clear search",
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useNumberFormatter: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

vi.mock("@/core/presentation/hooks/useReports", () => ({
  useReports: () => ({
    isLoading: false,
    error: null,
    posSummary: mocks.posSummary,
    posBills: mocks.posBills,
    barCategories: mocks.barCategories,
    spaMenu: mocks.spaMenu,
    ktvSessions: mocks.ktvSessions,
  }),
}));

const posSummary = {
  from: "2026-10-01",
  to: "2026-10-04",
  locationIds: null,
  posType: "SPA",
  orders: {
    count: 42,
    averageNetSales: "48500.0000",
    averageGrandTotal: "48500.0000",
    voided: { count: 1, amount: "45000.0000" },
  },
  sales: {
    grossSales: "2142000.0000",
    lineDiscounts: "105000.0000",
    orderDiscounts: "0.0000",
    totalDiscounts: "105000.0000",
    netSales: "2037000.0000",
    serviceCharge: "0.0000",
    tax: "0.0000",
    tips: "0.0000",
    grandTotal: "2037000.0000",
  },
  refunds: { count: 1, subtotal: "6000.0000", tax: "0.0000", total: "6000.0000", byMethod: [] },
  netAfterRefunds: "2031000.0000",
  voidedLines: { count: 2, amount: "9000.0000" },
  compedLines: { count: 3, amount: "18000.0000" },
  payments: {
    byMethod: [{ paymentMethodId: "pm-1", name: "Member card", kind: "GUEST_CARD", count: 51, amount: "2037000.0000" }],
    tendered: "2037000.0000",
    changeGiven: "0.0000",
  },
  byDay: [
    { businessDate: "2026-10-01", orderCount: 9, netSales: "436500.0000", grandTotal: "436500.0000", refunds: "0.0000" },
  ],
  byHour: [{ hour: 14, orderCount: 8, netSales: "390000.0000", grandTotal: "390000.0000" }],
  byOutlet: [
    { locationId: "loc-1", locationName: "SPA Floor 3", orderCount: 42, netSales: "2037000.0000", grandTotal: "2037000.0000" },
  ],
  byServiceType: [{ serviceType: "DINE_IN", orderCount: 42, netSales: "2037000.0000", grandTotal: "2037000.0000" }],
};

const posBills = {
  from: "2026-10-01",
  to: "2026-10-04",
  posType: "SPA",
  totals: {
    billCount: 42,
    grossSales: "2142000.0000",
    discounts: "105000.0000",
    netSales: "2037000.0000",
    tax: "0.0000",
    grandTotal: "2037000.0000",
  },
  bills: [
    {
      orderId: "order-1",
      orderNumber: "SO-S01-20261004-0007",
      businessDate: "2026-10-04",
      soldAt: "2026-10-04T08:12:00.000Z",
      place: "Room S2",
      guestName: "Su Su",
      items: [{ name: "Thai massage 90 min", quantity: "1.0000", netSales: "40500.0000" }],
      compedItems: [{ name: "Orange juice", quantity: "1.0000", value: "6000.0000" }],
      grossSales: "51000.0000",
      discounts: "5100.0000",
      netSales: "45900.0000",
      tax: "0.0000",
      grandTotal: "45900.0000",
      payments: [{ name: "Member card", amount: "45900.0000" }],
    },
  ],
  meta: { total: 42, page: 1, limit: 50, totalPages: 1 },
};

beforeEach(() => {
  mocks.posSummary.mockResolvedValue(posSummary);
  mocks.posBills.mockResolvedValue(posBills);
  mocks.barCategories.mockResolvedValue({
    from: "2026-10-01",
    to: "2026-10-04",
    totals: {
      orderCount: 120,
      quantity: "640.0000",
      grossSales: "1300000.0000",
      discounts: "20000.0000",
      netSales: "1280000.0000",
      refundAmount: "5000.0000",
      compedValue: "10000.0000",
    },
    categories: [
      {
        categoryId: "c1",
        categoryName: "Drinks",
        orderCount: 98,
        quantity: "460.0000",
        grossSales: "815000.0000",
        discounts: "15000.0000",
        netSales: "800000.0000",
        shareOfNetSales: "62.50",
        compedQuantity: "2.0000",
        compedValue: "10000.0000",
        refundAmount: "5000.0000",
        subCategories: [
          {
            categoryId: "c2",
            categoryName: "Beer",
            orderCount: 70,
            quantity: "300.0000",
            grossSales: "500000.0000",
            discounts: "10000.0000",
            netSales: "490000.0000",
            shareOfNetSales: "38.28",
            compedQuantity: "2.0000",
            compedValue: "10000.0000",
            refundAmount: "5000.0000",
          },
        ],
      },
    ],
  });
  mocks.spaMenu.mockResolvedValue({
    from: "2026-10-01",
    to: "2026-10-04",
    totals: { orderCount: 42, netSales: "2037000.0000", grandTotal: "2037000.0000" },
    spaMenu: {
      totals: {
        quantity: "30.0000",
        grossSales: "1350000.0000",
        discounts: "67500.0000",
        netSales: "1282500.0000",
        shareOfNetSales: "62.96",
        compedValue: "0.0000",
      },
      rows: [
        {
          variantId: "v1",
          name: "Thai massage 90 min",
          durationMinutes: 90,
          includes: [],
          orderCount: 22,
          quantity: "22.0000",
          grossSales: "990000.0000",
          discounts: "49500.0000",
          netSales: "940500.0000",
          shareOfNetSales: "46.17",
          compedQuantity: "0.0000",
          compedValue: "0.0000",
        },
      ],
    },
    roomMenuPackages: {
      totals: {
        quantity: "16.0000",
        grossSales: "560000.0000",
        discounts: "28000.0000",
        netSales: "532000.0000",
        shareOfNetSales: "26.12",
        compedValue: "0.0000",
      },
      rows: [
        {
          variantId: "v2",
          name: "Foot massage + juice",
          durationMinutes: 60,
          includes: ["1 × Orange juice"],
          orderCount: 16,
          quantity: "16.0000",
          grossSales: "560000.0000",
          discounts: "28000.0000",
          netSales: "532000.0000",
          shareOfNetSales: "26.12",
          compedQuantity: "0.0000",
          compedValue: "0.0000",
        },
      ],
    },
    roomServices: {
      totals: {
        quantity: "80.0000",
        grossSales: "232000.0000",
        discounts: "9500.0000",
        netSales: "222500.0000",
        shareOfNetSales: "10.92",
        compedValue: "18000.0000",
      },
      rows: [],
    },
    roomTime: {
      totals: {
        quantity: "0.0000",
        grossSales: "0.0000",
        discounts: "0.0000",
        netSales: "0.0000",
        shareOfNetSales: "0.00",
        compedValue: "0.0000",
      },
      rows: [],
    },
  });
  mocks.ktvSessions.mockResolvedValue({
    from: "2026-10-01",
    to: "2026-10-04",
    totals: {
      sessionCount: 12,
      hoursSold: "30.0000",
      freeHours: "2.0000",
      roomSales: "900000.0000",
      fnbSales: "350000.0000",
      discounts: "0.0000",
      compedValue: "60000.0000",
      netSales: "1250000.0000",
      grandTotal: "1250000.0000",
    },
    byRoom: [
      {
        roomId: "r1",
        roomNumber: "K1",
        roomName: "Gold",
        sessionCount: 5,
        hoursSold: "14.0000",
        freeHours: "1.0000",
        roomSales: "420000.0000",
        fnbSales: "160000.0000",
        grandTotal: "580000.0000",
      },
    ],
    sessions: [
      {
        sessionId: "s1",
        orderId: "o1",
        orderNumber: "SO-K01-20261004-0003",
        businessDate: "2026-10-04",
        roomNumber: "K1",
        roomName: "Gold",
        guestName: "Aung Aung",
        guestCount: 6,
        openedAt: "2026-10-04T13:00:00.000Z",
        closedAt: "2026-10-04T16:10:00.000Z",
        minutesUsed: 180,
        hoursSold: "2.0000",
        freeHours: "1.0000",
        roomSales: "60000.0000",
        fnbSales: "20000.0000",
        discounts: "0.0000",
        compedValue: "30000.0000",
        netSales: "80000.0000",
        grandTotal: "80000.0000",
        payments: [{ name: "Member card", amount: "80000.0000" }],
      },
    ],
  });
});

describe("SalesSummaryPage", () => {
  it("loads POS summary for the selected POS type", async () => {
    render(<SalesSummaryPage />);
    await waitFor(() => expect(mocks.posSummary).toHaveBeenCalled());
    expect(mocks.posSummary).toHaveBeenCalledWith(
      expect.objectContaining({ posType: "SPA" })
    );
    expect(await screen.findByText("SPA Floor 3")).toBeInTheDocument();
    expect(screen.getByText("Member card")).toBeInTheDocument();
  });

  it("loads bills, bar categories, SPA menu, and KTV sessions from their hooks", async () => {
    render(<SalesSummaryPage />);
    await waitFor(() => expect(mocks.posSummary).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "POS bills" }));
    expect(await screen.findByText("SO-S01-20261004-0007")).toBeInTheDocument();
    expect(screen.getByText("Room S2 · Su Su", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Orange juice × 1")).toBeInTheDocument();
    expect(mocks.posBills).toHaveBeenCalledWith(
      expect.objectContaining({ posType: "SPA", page: 1, limit: 50 })
    );

    fireEvent.click(screen.getByRole("button", { name: "Bar by category" }));
    expect(await screen.findByText("Drinks")).toBeInTheDocument();
    expect(screen.getByText("↳ Beer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "SPA by menu" }));
    expect(await screen.findByText("Thai massage 90 min")).toBeInTheDocument();
    expect(screen.getByText("Foot massage + juice (1 × Orange juice)")).toBeInTheDocument();
    expect(screen.queryByText("Room time")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "KTV sessions" }));
    expect(await screen.findByText("SO-K01-20261004-0003")).toBeInTheDocument();
    expect(screen.getAllByText("K1 · Gold").length).toBeGreaterThan(0);
  });
});
