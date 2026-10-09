import { describe, expect, it } from "vitest";
import { defaultPrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import { encodeEscPos } from "../escPosBytes";
import {
  buildSaleReceiptLines,
  formatSaleReceipt,
  saleReceiptPreview,
  SaleReceipt,
} from "../formatKdsTicket";
import {
  ditherToImage,
  iconImage,
  imageFromRows,
  imageRuns,
  inlineIconCommand,
  isDot,
  rasterCommand,
} from "../printImage";
import { logoSize } from "../printLogo";

const GS = "\x1d";
const ESC = "\x1b";

describe("printer dots", () => {
  it("packs a drawn picture eight dots to a byte, left dot high", () => {
    const image = imageFromRows(["#.......#", "........."]);
    expect(image.width).toBe(9);
    expect(Array.from(image.bits)).toEqual([0x80, 0x80, 0, 0]);
    expect(isDot(image, 0, 0)).toBe(true);
    expect(isDot(image, 8, 0)).toBe(true);
    expect(isDot(image, 1, 0)).toBe(false);
  });

  it("prints dark pixels, leaves light and transparent ones as paper", () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255, // black
      255, 255, 255, 255, // white
      0, 0, 0, 0, // transparent black
    ]);
    const image = ditherToImage(pixels, 3, 1);
    expect([0, 1, 2].map((x) => isDot(image, x, 0))).toEqual([true, false, false]);
  });

  it("shades a mid grey as roughly half the dots", () => {
    const pixels = new Uint8ClampedArray(16 * 16 * 4).fill(128);
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
    const image = ditherToImage(pixels, 16, 16);
    const dots = imageRuns(image).reduce((sum, run) => sum + run.width, 0);
    expect(dots).toBeGreaterThan(256 * 0.4);
    expect(dots).toBeLessThan(256 * 0.6);
  });

  it("sends a picture as raster bands the printer can keep up with", () => {
    const image = imageFromRows(Array.from({ length: 100 }, () => "#".repeat(16)));
    const command = rasterCommand(image);
    const bands = command.split(`${GS}v0\x00`).slice(1);
    expect(bands).toHaveLength(2);
    // 2 bytes a row, 64 rows, then the 36 left over.
    expect(bands[0].slice(0, 4)).toBe("\x02\x00\x40\x00");
    expect(bands[1].slice(0, 4)).toBe("\x02\x00\x24\x00");
    expect(bands[0]).toHaveLength(4 + 2 * 64);
  });

  it("puts an icon inside a line of text, 24 dots high", () => {
    const command = inlineIconCommand("phone");
    expect(command.startsWith(`${ESC}*\x21\x18\x00`)).toBe(true);
    expect(command).toHaveLength(5 + 24 * 3);
    expect(iconImage("email").height).toBe(24);
  });

  it("keeps the picture's bytes as bytes on the way to the printer", () => {
    expect(Array.from(encodeEscPos("\x80\xff"))).toEqual([0x80, 0xff]);
    expect(Array.from(encodeEscPos("က"))).toEqual([0xe1, 0x80, 0x80]);
  });

  it("fits a logo to half the roll and 160 dots high, in whole bytes", () => {
    expect(logoSize(1000, 500, "MM80")).toEqual({ width: 288, height: 144 });
    expect(logoSize(1000, 500, "MM58")).toEqual({ width: 192, height: 96 });
    expect(logoSize(200, 800, "MM80")).toEqual({ width: 40, height: 160 });
    expect(logoSize(64, 32, "MM80")).toEqual({ width: 64, height: 32 });
  });
});

describe("the receipt header", () => {
  const logo = imageFromRows(["########", "########"]);
  const receipt = (over: Partial<SaleReceipt> = {}): SaleReceipt => ({
    title: "Receipt",
    lines: [],
    total: "1000",
    company: {
      name: "Grand Spa",
      phone: "09 123 456 789",
      email: "hello@grandspa.com",
    },
    logo,
    template: defaultPrintTemplateSettings(),
    ...over,
  });

  it("prints the logo first, then the name, then phone and email after their icons", () => {
    const escPos = formatSaleReceipt(receipt());
    const logoAt = escPos.indexOf(`${GS}v0`);
    const nameAt = escPos.indexOf("GRAND SPA");
    const phoneAt = escPos.indexOf(`${inlineIconCommand("phone")} 09 123 456 789`);
    const emailAt = escPos.indexOf(`${inlineIconCommand("email")} hello@grandspa.com`);
    expect(logoAt).toBeGreaterThan(-1);
    expect(nameAt).toBeGreaterThan(logoAt);
    expect(phoneAt).toBeGreaterThan(nameAt);
    expect(emailAt).toBeGreaterThan(phoneAt);
  });

  it("leaves out whatever the template switches off", () => {
    const template = defaultPrintTemplateSettings();
    template.header.logo = false;
    template.header.email = false;
    const escPos = formatSaleReceipt(receipt({ template }));
    expect(escPos).not.toContain(`${GS}v0`);
    expect(escPos).not.toContain("hello@grandspa.com");
    expect(escPos).toContain("09 123 456 789");
  });

  it("prints no logo when the business has none", () => {
    expect(formatSaleReceipt(receipt({ logo: null }))).not.toContain(`${GS}v0`);
  });

  it("writes Tel and Email where icons cannot be drawn", () => {
    const text = buildSaleReceiptLines(receipt()).join("\n");
    expect(text).toContain("Tel 09 123 456 789");
    expect(text).toContain("Email hello@grandspa.com");
  });

  it("previews the logo and the icon lines", () => {
    const rows = saleReceiptPreview(receipt()).rows;
    expect(rows[0]).toEqual({ kind: "image", image: logo });
    expect(rows).toContainEqual({ kind: "contact", icon: "email", text: "hello@grandspa.com" });
  });
});
