import { describe, expect, it } from "vitest";
import { PrinterBinding } from "@/lib/pos/printerBindingStorage";
import {
  formatKdsTicket,
  formatKitchenSlip,
  formatSaleReceipt,
} from "../formatKdsTicket";
import { KdsTicket } from "@/core/domain/entities/Cashier";
import {
  PrintTemplate,
  defaultPrintTemplateSettings,
} from "@/core/domain/entities/PrintTemplate";
import { groupKitchenJobs } from "../routeKitchenPrint";
import { modifierPrintText } from "../modifierText";
import {
  PrintTemplateSelectionError,
  selectPrintTemplate,
} from "../selectPrintTemplate";

const binding = (id: string, backendPrinterId: string): PrinterBinding => ({
  id,
  backendPrinterId,
  transport: "NETWORK",
  displayName: id,
  lastVerifiedAt: "",
});

describe("station print routing", () => {
  it("sends drinks to the bar printer and snacks to fast food", () => {
    const plan = groupKitchenJobs(
      [
        { name: "Water", quantity: "1", categoryId: "drink" },
        { name: "Beer", quantity: "1", categoryId: "alcohol" },
        { name: "Fried chicken", quantity: "1", categoryId: "snack" },
      ],
      [binding("bar-printer", "printer-bar"), binding("food-printer", "printer-food")],
      null,
      undefined,
      [
        {
          id: "bar",
          name: "Bar",
          printerIds: ["printer-bar"],
          categoryIds: ["drink", "alcohol"],
        },
        {
          id: "fast-food",
          name: "Fast food",
          printerIds: ["printer-food"],
          categoryIds: ["snack"],
        },
      ]
    );

    expect(plan.unrouted).toEqual([]);
    expect(plan.jobs).toEqual([
      expect.objectContaining({
        lines: [
          expect.objectContaining({ name: "Water" }),
          expect.objectContaining({ name: "Beer" }),
        ],
      }),
      expect.objectContaining({
        lines: [expect.objectContaining({ name: "Fried chicken" })],
      }),
    ]);
    expect(plan.jobs[0].binding.id).toBe("bar-printer");
    expect(plan.jobs[1].binding.id).toBe("food-printer");
  });

  it("leaves items with no station match unrouted", () => {
    const fallback = binding("main", "printer-main");
    const plan = groupKitchenJobs(
      [{ name: "Soup", quantity: "1", categoryId: "other" }],
      [fallback],
      fallback,
      undefined,
      [
        {
          id: "bar",
          name: "Bar",
          printerIds: ["printer-bar"],
          categoryIds: ["drink"],
        },
      ]
    );

    expect(plan.jobs).toEqual([]);
    expect(plan.unrouted).toEqual([
      expect.objectContaining({ name: "Soup" }),
    ]);
  });

  it("reprints a counter ticket on that station printer", () => {
    const plan = groupKitchenJobs(
      [{ name: "Fried chicken", quantity: "1" }],
      [binding("food-printer", "printer-food")],
      null,
      "fast-food",
      [
        {
          id: "fast-food",
          name: "Fast food",
          printerIds: ["printer-food"],
          categoryIds: ["snack"],
        },
      ]
    );

    expect(plan.unrouted).toEqual([]);
    expect(plan.jobs).toHaveLength(1);
    expect(plan.jobs[0].binding.id).toBe("food-printer");
    expect(plan.jobs[0].lines).toEqual([
      expect.objectContaining({ name: "Fried chicken" }),
    ]);
  });

  it("prints the same station ticket on every assigned printer", () => {
    const plan = groupKitchenJobs(
      [{ name: "Fried chicken", quantity: "1", categoryId: "snack" }],
      [
        binding("food-printer-1", "printer-food-1"),
        {
          id: "food-printer-2",
          backendPrinterId: "printer-food-2",
          transport: "USB",
          displayName: "Connected kitchen printer",
          deviceName: "XPrinter POS-80",
          lastVerifiedAt: "",
        },
      ],
      null,
      undefined,
      [
        {
          id: "fast-food",
          name: "Fast food",
          printerIds: ["printer-food-1", "printer-food-2"],
          categoryIds: ["snack"],
        },
      ]
    );

    expect(plan.jobs).toHaveLength(2);
    expect(plan.jobs.map((job) => job.binding.id)).toEqual([
      "food-printer-1",
      "food-printer-2",
    ]);
    expect(plan.jobs.every((job) => job.lines[0].name === "Fried chicken")).toBe(
      true
    );
  });

  it("reports a station printer that is not configured on this POS", () => {
    const plan = groupKitchenJobs(
      [{ name: "Fried chicken", quantity: "1", categoryId: "snack" }],
      [binding("food-printer", "printer-food")],
      null,
      undefined,
      [
        {
          id: "fast-food",
          name: "Fast food",
          printerIds: ["printer-food", "printer-food-copy"],
          categoryIds: ["snack"],
        },
      ]
    );

    expect(plan.jobs).toHaveLength(1);
    expect(plan.unrouted).toEqual([]);
    expect(plan.missingPrinterRoutes).toEqual([
      {
        stationId: "fast-food",
        stationName: "Fast food",
        printerIds: ["printer-food-copy"],
      },
    ]);
  });

  it("does not duplicate a category assigned to more than one station", () => {
    const plan = groupKitchenJobs(
      [{ name: "Beer", quantity: "1", categoryId: "drink" }],
      [
        binding("bar-printer", "printer-bar"),
        binding("food-printer", "printer-food"),
      ],
      null,
      undefined,
      [
        {
          id: "bar",
          name: "Bar",
          printerIds: ["printer-bar"],
          categoryIds: ["drink"],
        },
        {
          id: "food",
          name: "Food",
          printerIds: ["printer-food"],
          categoryIds: ["drink"],
        },
      ]
    );

    expect(plan.jobs).toEqual([]);
    expect(plan.unrouted).toEqual([
      expect.objectContaining({ name: "Beer" }),
    ]);
  });

  it("keeps prices off the KDS slip and the logo off the finance slip", () => {
    const kitchen = formatKitchenSlip({
      title: "KDS",
      lines: [{ name: "Beer", quantity: "1", unitPrice: "5.00" }],
    });
    const finance = formatSaleReceipt({
      title: "FINANCE",
      place: "FINANCE",
      lines: [{ name: "Beer", quantity: "1", unitPrice: "5.00" }],
      total: "5.00",
    });
    const checkout = formatSaleReceipt({
      title: "RECEIPT",
      place: "CHECKOUT",
      showLogo: true,
      lines: [{ name: "Beer", quantity: "1", unitPrice: "5.00" }],
      total: "5.00",
    });

    expect(kitchen).not.toContain("5.00");
    expect(finance).not.toContain("LOGO");
    expect(finance).toContain("5.00");
    expect(checkout).not.toContain("LOGO");
    expect(checkout).toContain("5.00");
  });

  it("prints ticket items and the station name from kdsTicketLines", () => {
    const slip = formatKdsTicket(
      new KdsTicket({
        ticketNumber: "KDS-1",
        stationId: "station-1",
        station: { id: "station-1", name: "Hot line", printerId: "printer-hot" },
        kdsTicketLines: [
          {
            id: "line-1",
            ticketId: "ticket-1",
            salesOrderLineId: "order-line-1",
            productName: "Dish Soap",
            quantity: "2.0000",
            kitchenModifiers: "No ice",
            status: "PENDING",
            createdAt: "",
            updatedAt: "",
          },
        ],
      })
    );

    expect(slip).toContain("Dish Soap");
    expect(slip).toContain("2  Dish Soap");
    expect(slip).toContain("No ice");
    expect(slip).toContain("Station: Hot line");
  });

  it("prints from the saved template for that section", () => {
    const checkoutSettings = defaultPrintTemplateSettings();
    checkoutSettings.header.logo = false;
    checkoutSettings.item.price = false;
    checkoutSettings.bill.totalPayment = false;
    checkoutSettings.other.footerText = "See you";
    const slip = formatSaleReceipt({
      title: "RECEIPT",
      place: "CHECKOUT",
      template: checkoutSettings,
      lines: [{ name: "Beer", quantity: "1", unitPrice: "5.00" }],
      total: "5.00",
    });

    expect(slip).not.toContain("LOGO");
    expect(slip).not.toContain("5.00");
    expect(slip).toContain("Beer");
    expect(slip).toContain("See you");
  });

  it("prints every enabled template section for checkout, finance, and kitchen", () => {
    const settings = defaultPrintTemplateSettings();
    settings.header.logo = true;
    settings.item.bilingual = true;
    settings.item.categorySubtotal = true;
    settings.bill.payTime = true;
    settings.bill.rounding = true;
    settings.other.footerText = "Thank you!";
    const party = {
      outletName: "Main outlet",
      address: "12 River Road",
      contact: "09-123",
      cashier: "Aung",
      serviceType: "Dine in",
      tableOrRoom: "Table 4",
      pickupCode: "12",
      paidAt: "09:50",
      rounding: "0.00",
    };
    const lines = [
      {
        name: "Coffee",
        altName: "ကော်ဖီ",
        quantity: "1",
        unitPrice: "10.00",
        categoryName: "Drinks",
        modifiers: "Large",
        remarks: "Less sugar",
      },
    ];

    const checkout = formatSaleReceipt({
      title: "RECEIPT",
      place: "CHECKOUT",
      template: settings,
      receiptId: "No.001",
      lines,
      subtotal: "10.00",
      total: "10.00",
      ...party,
    });
    const financeSettings = defaultPrintTemplateSettings();
    financeSettings.header.logo = false;
    financeSettings.header.address = false;
    financeSettings.other.footerText = "Finance copy";
    const finance = formatSaleReceipt({
      title: "FINANCE",
      place: "FINANCE",
      template: financeSettings,
      lines,
      total: "10.00",
      outletName: "Main outlet",
    });
    const kitchenSettings = defaultPrintTemplateSettings();
    kitchenSettings.item.price = false;
    kitchenSettings.other.footerText = "Kitchen";
    const kitchen = formatKitchenSlip({
      title: "KITCHEN",
      template: kitchenSettings,
      lines,
      outletName: "Main outlet",
      tableOrRoom: "Table 4",
    });

    expect(checkout).toContain("Main outlet");
    expect(checkout).toContain("No.001");
    expect(checkout).toContain("Dine in");
    expect(checkout).toContain("Table 4");
    expect(checkout).toContain("Aung");
    expect(checkout).toContain("Large");
    expect(checkout).toContain("Drinks");
    expect(checkout).toContain("09:50");
    expect(checkout).toContain("Thank you!");

    expect(finance).not.toContain("LOGO");
    expect(finance).not.toContain("12 River Road");
    expect(finance).toContain("Main outlet");
    expect(finance).toContain("Finance copy");

    expect(kitchen).toContain("Main outlet");
    expect(kitchen).toContain("Coffee");
    expect(kitchen).not.toContain("10.00");
    expect(kitchen).toContain("Kitchen");
  });

  it("uses the kitchen template for KDS and the non-default receipt for finance", () => {
    const kitchen = new PrintTemplate({
      id: "kitchen",
      type: "KITCHEN",
      isDefault: true,
      settings: defaultPrintTemplateSettings(),
    });
    const checkout = new PrintTemplate({
      id: "checkout",
      type: "RECEIPT",
      isDefault: true,
      locationId: "location-1",
      settings: defaultPrintTemplateSettings(),
    });
    const financeSettings = defaultPrintTemplateSettings();
    financeSettings.header.logo = false;
    const finance = new PrintTemplate({
      id: "finance",
      type: "RECEIPT",
      isDefault: false,
      locationId: "location-1",
      settings: financeSettings,
    });

    expect(selectPrintTemplate("KDS", [kitchen, checkout, finance])?.header.logo).toBe(
      true
    );
    expect(
      selectPrintTemplate("CHECKOUT", [kitchen, checkout, finance], "location-1")
    ).toBe(checkout.settings);
    expect(
      selectPrintTemplate("FINANCE", [kitchen, checkout, finance], "location-1")?.header
        .logo
    ).toBe(false);
  });

  it("refuses to pick a template when a print section has duplicates", () => {
    const first = new PrintTemplate({
      id: "kitchen-a",
      type: "KITCHEN",
      isDefault: true,
      settings: defaultPrintTemplateSettings(),
    });
    const second = new PrintTemplate({
      id: "kitchen-b",
      type: "KITCHEN",
      isDefault: true,
      settings: defaultPrintTemplateSettings(),
    });

    expect(() => selectPrintTemplate("KDS", [first, second])).toThrow(
      PrintTemplateSelectionError
    );
  });

  it("prints item prices and modifier prices when the price option is on", () => {
    const settings = defaultPrintTemplateSettings();
    settings.item.price = true;
    settings.item.hidePriceOnOrderBill = true;
    settings.item.modifiers = true;
    const slip = formatSaleReceipt({
      title: "RECEIPT",
      place: "CHECKOUT",
      template: settings,
      lines: [
        {
          name: "Coffee",
          quantity: "1",
          unitPrice: "10.00",
          modifiers: "Large",
          modifierPrices: "2.00",
        },
      ],
      total: "12.00",
    });

    expect(slip).toContain("10.00");
    expect(slip).toContain("Large +2.00");
  });

  it("reads modifier names and prices from order lines", () => {
    expect(
      modifierPrintText([
        { modifierId: "mod-1", name: "Large", priceDelta: "2.0000" },
        { modifier: { name: "Oat milk" }, priceDelta: "0" },
      ])
    ).toEqual({
      names: "Large, Oat milk",
      prices: "2.0000, -",
    });
  });
});
