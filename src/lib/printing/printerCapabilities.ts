import { PrinterBinding } from "@/lib/pos/printerBindingStorage";
import { isBrowserPrinting } from "@/core/infrastructure/printing/PrinterClient";
import {
  hasNativePrinterBridge,
  isWebBluetoothSupported,
  isWebUsbSupported,
} from "@/lib/printing/webPrinterTransports";

export { hasNativePrinterBridge };

/** True when this device can send ESC/POS bytes to the configured binding. */
export function canSendRawEscPos(binding: PrinterBinding): boolean {
  // The native Android/Median bridge handles every transport - including the raw
  // TCP:9100 socket no mobile browser can open - so it always wins when present.
  if (hasNativePrinterBridge()) return true;
  switch (binding.transport) {
    case "NETWORK":
      // Without the bridge, mobile browsers cannot open raw TCP, so fall back to
      // the Android print dialog (PDF) instead of direct ESC/POS.
      return !isBrowserPrinting();
    case "USB":
      return isWebUsbSupported();
    case "BLUETOOTH":
      return isWebBluetoothSupported();
    default:
      return false;
  }
}
