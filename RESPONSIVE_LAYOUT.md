# Responsive layout fixes (October 24, 2026)

## Changes

- Login uses auto margins on a non-shrinking card: centered when it fits,
  top-reachable and scrollable when the window/keyboard makes it too short.
- The application shell retains its fixed viewport and independently scrolling
  panes. Shared height uses `100vh` with a supported `100dvh` override.
- Navigation/action rails scroll on short windows; the action buttons do not
  shrink away. Generic dialog defaults apply at desktop widths too, without
  overriding panel-specific overflow utilities or nesting rules.
- Shared CSS no longer forces child-count-based split-pane columns or squeezes
  all data tables. Pages own their breakpoints and tables retain local scrolling.
- Phone layouts stack cashier, member, card, refund, order, waitlist, tip and
  room panes with nonzero row minima. Settings tabs scroll horizontally on phones.
- Payment methods, menu variants, tablet setup and small forms have appropriate
  scrolling, wrapping, and shrink-to-fit boundaries.

No auth, permission, pricing, payment, reporting or printing handlers were changed.

## Validation

`npm run build` passed with `VITE_API_URL=https://api1.mmlnkits.com`.

The standalone `scripts/check-responsive.cjs` uses Playwright supplied externally;
it adds no application dependency. Set `PLAYWRIGHT_MODULE` to the installed
Playwright module, `CHROME_PATH` if needed, and `RESPONSIVE_BASE_URL` to a running
production preview (`npm run preview -- --host 127.0.0.1 --port 4173`).
`RESPONSIVE_OUTPUT` sets the report/screenshot directory.

The browser run passed 126 checks: 24 routes at 320x568, 844x390, 800x480,
1024x600 and 1280x800, plus six login tests including 1024x280. Checks cover
rendering without uncaught errors, visible main bounds, no document-width spill,
fixed shell height, and reachable login-card ends. Separate checks confirmed
Pay, navigation footers and workspace setup dialog buttons are reachable at
320x568, 844x390, 800x480 and 1280x280.

These tests intercept APIs, use empty report/list fixtures and do not contact
production APIs or create transactions. They do not prove every populated-data
layout, dialog, browser version or device. Test actual device keyboards, touch
scrolling, long translated labels and populated sales/payment screens before
production rollout. No Android hardware was connected for printing validation.

The final full suite passed 440/443 tests across 94 passing files; three existing
failures remain in the cashier status assertion and Burmese locale coverage
(two files). The deployment workflow already documents these baseline failures.
All 23 focused responsive tests passed. The responsive task does not change
business behavior or translations to mask those failures. Android compilation
and signing passed, but Android lint still reports 12 pre-existing Bluetooth
permission errors; a lint-clean or production-release APK is not claimed.

## Deployment is separate from APK installation

The Android APK is a WebView host for `https://yankinfoodhouse.mmlnkits.com`.
Its login-only CSS safeguard is not a replacement for deploying these frontend
sources. The APK permits user/device-selected orientation and disables overview
zoom so the frontend uses its responsive viewport.

The production workflow in `.github/workflows/deploy.yml` deploys **both** frontends
when approved changes reach `main`; its site-specific builds select the right
backend. Review and follow that deployment process. The local Yankin web archive
contains a Yankin-only static build and must not be used on the other site.

Publish these fixes by committing and pushing to `main`; the existing workflow
builds and deploys both frontends. Direct SSH deployment from the workstation is
not required. After the workflow succeeds, clear/reload the app's WebView cache
and verify the served assets match the new build.