# Android printing — next steps & known limitations

Companion notes for the Android native print bridge that this POS app talks to.

- **Web side (this repo):** the client is already implemented — see
  [docs/median-android-printing.md](./median-android-printing.md) and
  `src/lib/printing/webPrinterTransports.ts`.
- **Native side (separate repo):**
  `https://github.com/mhkhizil/printer-bridge-for-pos-median-compatible`
  (its `docs/NEXT_STEPS.md` has the same handoff notes).

## Your next steps

1. **Point the Android app at your POS.** In the bridge repo, edit
   `app/build.gradle.kts` and set the deployed POS web app URL:

   ```kotlin
   buildConfigField("String", "POS_URL", "\"https://<your-deployed-pos>\"")
   ```

2. **Build the Android app.** Open the bridge repo in Android Studio (it generates
   the Gradle wrapper jar, which is not committed as a binary) and press ▶ Run, or:

   ```bash
   gradle wrapper --gradle-version 8.7
   ./gradlew :app:assembleDebug     # or :app:installDebug
   ```

3. **Test on device** (Wi‑Fi → USB → Bluetooth; expect a silent print with **no**
   Android print dialog; in this app, Settings → Printer should show the badge
   **“Android direct printing ready”**, and Settings → Devices the row
   **“Direct printing (Android)”**).

4. **Median.co alternative.** If you ship via Median.co instead of the bridge
   repo's WebView shell, ask them for a **private plugin** exposing this same
   `median.posPrinter` contract — this app needs no changes either way.

## Contract this app calls (implemented by the bridge)

```
window.median.posPrinter = {
  connect(options)      // options.callback optional; may return a Promise
  disconnect(options)
  discover(options)     // -> { devices: [{ id, name }] }
  printRaw(options)     // -> { success: true } | { success: false, error }
}
```

`printRaw` receives
`{ transport: "NETWORK"|"USB"|"BLUETOOTH", host?, port?, deviceId?, dataBase64, encoding: "base64" }`,
where `dataBase64` is the raw ESC/POS byte stream.

## Honest limitations

- The Android app was **not compiled in the authoring environment** (no JDK /
  Gradle / Android SDK there). The first real `assembleDebug` must be run on your
  machine or CI.
- **BLE GATT** is a generic fallback (first writable characteristic); classic SPP
  is the primary, well-tested path.
- **Release signing / Play upload is yours** — keystore, AAB, and on-device
  acceptance testing are not included.

## Quick reference

| Item | Value |
| --- | --- |
| Bridge object (native) | `window.__posPrinterNative` |
| Contract exposed to the page | `window.median.posPrinter.{connect,disconnect,discover,printRaw}` |
| POS URL build field (bridge repo) | `BuildConfig.POS_URL` (`app/build.gradle.kts`) |
| Default network print port | `9100` |
| USB device id shape | `usb:<vendorId>:<productId>` (e.g. `usb:04b8:0e15`) |
| Bluetooth device id shape | MAC address (e.g. `66:12:AB:34:CD:EF`) |
| Bluetooth SPP UUID | `00001101-0000-1000-8000-00805F9B34FB` |
| Min / target / compile SDK | 24 / 34 / 34 |
| Kotlin / AGP | 1.9.24 / 8.5.2 |
