import { PrinterBinding } from "@/lib/pos/printerBindingStorage";
import { isBrowserPrinting } from "@/core/infrastructure/printing/PrinterClient";
import {
  isWebBluetoothSupported,
  isWebUsbSupported,
  medianPosPrinter,
} from "@/lib/printing/webPrinterTransports";

/** True when this device can send ESC/POS bytes to the configured binding. */
export function canSendRawEscPos(binding: PrinterBinding): boolean {
  if (medianPosPrinter()) return true;
  switch (binding.transport) {
    case "NETWORK":
      // Android/Median cannot open raw TCP; use PDF + native print dialog instead.
      return !isBrowserPrinting();
    case "USB":
      return isWebUsbSupported();
    case "BLUETOOTH":
      return isWebBluetoothSupported();
    default:
      return false;
  }
}
