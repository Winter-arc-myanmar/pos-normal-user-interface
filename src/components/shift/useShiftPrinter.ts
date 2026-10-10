import { useCallback } from "react";
import type { ShiftSummary } from "@/core/domain/entities/Shift";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { usePrinterConnection } from "@/core/presentation/hooks/usePrinterConnection";
import { shiftSlip } from "@/lib/printing/shiftSlip";

/** Prints a shift's report on this till's receipt printer. */
export function useShiftPrinter() {
  const { user } = useAuth();
  const { activeLocationId, activePosRegisterId } = usePosWorkspace();
  const printer = usePrinterConnection(
    String(user?.tenantId || ""),
    activePosRegisterId,
    activeLocationId
  );
  const { printReceipt } = printer;
  return useCallback(
    (summary: ShiftSummary) => printReceipt(shiftSlip(summary)),
    [printReceipt]
  );
}
