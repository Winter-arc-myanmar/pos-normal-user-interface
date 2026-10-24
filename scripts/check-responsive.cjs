/* Browser geometry smoke checks. API requests are intercepted: no real sales or
 * customer data are read or changed. Install Playwright separately and expose it
 * via NODE_PATH, or set PLAYWRIGHT_MODULE to its absolute module directory. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const base = process.env.RESPONSIVE_BASE_URL || "http://127.0.0.1:3000";
const output = process.env.RESPONSIVE_OUTPUT || path.join(require("node:os").tmpdir(), "pos-responsive-results");
const routes = [
  "/dashboard", "/sales-summary", "/cashier", "/ktv", "/ktv/room/layout-room",
  "/spa", "/waitlist", "/dining-tables", "/products", "/categories",
  "/tip-pools", "/counter-orders", "/sales-orders", "/refunds", "/users",
  "/customers", "/cards", "/cards/refund", "/sync", "/settings/cashier",
  "/settings/printer", "/settings/devices", "/tablet", "/kds",
];
const sizes = [[320, 568], [844, 390], [800, 480], [1024, 600], [1280, 800]];
const summary = {
  from: "2026-10-24", to: "2026-10-24", locationIds: [],
  orders: { count: 0, averageNetSales: "0", averageGrandTotal: "0", voided: { count: 0, amount: "0" } },
  sales: { grossSales: "0", lineDiscounts: "0", orderDiscounts: "0", totalDiscounts: "0", netSales: "0", serviceCharge: "0", tax: "0", tips: "0", grandTotal: "0" },
  refunds: { count: 0, subtotal: "0", tax: "0", total: "0", byMethod: [] },
  netAfterRefunds: "0", voidedLines: { count: 0, amount: "0" }, compedLines: { count: 0, amount: "0" },
  payments: { byMethod: [], tendered: "0", changeGiven: "0" }, byDay: [], byHour: [], byOutlet: [], byServiceType: [],
};

function apiFixture(url) {
  if (/reports\/.*summary/.test(url.pathname)) return { data: summary };
  if (/reports\/item-sales/.test(url.pathname)) return { data: { items: [], categories: [], totals: {}, meta: { total: 0, page: 1, limit: 50, totalPages: 1 } } };
  if (/reports\/z-report/.test(url.pathname)) return { data: { orders: { completed: 0, voided: 0, refunded: 0 }, totals: {}, byCategory: [], topItems: [], payments: [] } };
  return { data: [], items: [], total: 0 };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  });
  const results = [];
  try {
    for (const [width, height] of sizes) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      await context.addInitScript(() => {
        const payload = btoa(JSON.stringify({ sub: "layout-user", exp: Math.floor(Date.now() / 1000) + 3600 }));
        sessionStorage.setItem("wms_token", `layout.${payload}.test`);
        // No tenant deliberately prevents real workspace/bootstrap operations.
        sessionStorage.setItem("wms_user", JSON.stringify({ id: "layout-user", name: "Layout test", role: "ADMIN" }));
      });
      await context.route("**/*", (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const local = url.origin === new URL(base).origin;
        if (local && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/csrf/") && !url.pathname.startsWith("/iam/")) {
          return route.continue();
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiFixture(url)) });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of routes) {
        errors.length = 0;
        try {
          // Report pages poll: networkidle is not a meaningful readiness signal.
          await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.locator("main").first().waitFor({ timeout: 10000 });
          await page.waitForTimeout(500);
          const geometry = await page.evaluate(() => {
            const root = document.getElementById("root");
            const main = document.querySelector("main");
            const shell = document.querySelector(".pos-app-shell");
            const bounds = main.getBoundingClientRect();
            return {
              documentWidth: document.documentElement.scrollWidth,
              rootChildren: root.children.length,
              main: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
              shellHeight: shell?.getBoundingClientRect().height,
              textLength: main.textContent.trim().length,
            };
          });
          assert.equal(new URL(page.url()).pathname, route, "Unexpected redirect instead of page under test");
          assert.deepEqual(errors, [], "Uncaught JavaScript error");
          assert(geometry.documentWidth <= width + 1, "Document spills horizontally");
          assert(geometry.main.width > 0 && geometry.main.height > 0, "Main area collapsed");
          assert(geometry.main.x >= -1 && geometry.main.x + geometry.main.width <= width + 1, "Main area outside viewport");
          assert(geometry.textLength > 0, "Main area blank");
          if (geometry.shellHeight !== undefined) assert(Math.abs(geometry.shellHeight - height) <= 1, "Shell does not match viewport height");
          results.push({ route, width, height, status: "passed", geometry });
        } catch (error) {
          const screenshot = `${width}x${height}-${route.replace(/\W/g, "_")}.png`;
          await page.screenshot({ path: path.join(output, screenshot) }).catch(() => {});
          results.push({ route, width, height, status: "failed", message: error.message, errors, screenshot });
        }
        console.log(`${width}x${height} ${route}: ${results[results.length - 1].status}`);
      }
      await context.close();
    }

    // Anonymous login: top must be reachable, and the full card must be
    // reachable at maximum scroll, including a keyboard-reduced viewport.
    for (const [width, height] of [...sizes, [1024, 280]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await page.goto(base + "/login", { waitUntil: "networkidle" });
        await page.locator("#userId").waitFor();
        const geometry = await page.evaluate(() => {
          const viewport = document.querySelector(".pos-login");
          const card = viewport.firstElementChild;
          viewport.scrollTop = 0;
          const top = card.getBoundingClientRect().top;
          viewport.scrollTop = 100000;
          return { top, bottom: card.getBoundingClientRect().bottom, height: innerHeight };
        });
        assert(geometry.top >= 0, "Login card top unreachable");
        assert(geometry.bottom <= height + 1, "Login card bottom unreachable");
        results.push({ route: "/login", width, height, status: "passed", geometry });
      } catch (error) {
        results.push({ route: "/login", width, height, status: "failed", message: error.message });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify(results, null, 2));
  }
  const failed = results.filter((result) => result.status === "failed");
  console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, failures: failed, output }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });