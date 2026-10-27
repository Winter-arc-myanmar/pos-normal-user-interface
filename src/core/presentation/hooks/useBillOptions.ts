import { useCallback, useEffect, useState } from "react";
import type {
  SalesOrderBillDTO,
  SalesOrderBillQueryDTO,
} from "../../application/dtos/SalesOrderDTO";

/** Per-bill choices. A server quote must succeed before an adjusted bill can be paid. */
export function useBillOptions({
  billKey,
  orderId,
  discount,
  revision,
  fetchBill,
}: {
  billKey: string;
  orderId?: string;
  discount: string;
  revision: string;
  fetchBill: (id: string, query: SalesOrderBillQueryDTO) => Promise<SalesOrderBillDTO>;
}) {
  const [selection, setSelection] = useState({
    billKey,
    includeTax: true,
    includeServiceCharge: true,
    changed: false,
    version: 0,
  });
  const current = selection.billKey === billKey
    ? selection
    : { billKey, includeTax: true, includeServiceCharge: true, changed: false, version: 0 };
  if (selection.billKey !== billKey) setSelection(current);
  const { includeTax, includeServiceCharge, changed } = current;
  const query = { discount, includeTax, includeServiceCharge };
  const requestKey = JSON.stringify([billKey, orderId, discount, revision, includeTax, includeServiceCharge, current.version]);
  const [result, setResult] = useState<{
    key: string;
    bill?: SalesOrderBillDTO;
    error?: string;
  } | null>(null);
  const needsQuote = changed && Boolean(orderId);

  useEffect(() => {
    if (!needsQuote || !orderId) return;
    let cancelled = false;
    void fetchBill(orderId, { discount, includeTax, includeServiceCharge })
      .then((bill) => {
        if (!cancelled) setResult({ key: requestKey, bill });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            error: error instanceof Error ? error.message : "Unable to update the bill.",
          });
        }
      });
    return () => { cancelled = true; };
  }, [fetchBill, needsQuote, orderId, discount, includeTax, includeServiceCharge, requestKey]);

  const choose = (field: "includeTax" | "includeServiceCharge", value: boolean) => {
    setSelection({ ...current, [field]: value, changed: true, version: current.version + 1 });
  };
  const reset = useCallback(() => {
    setSelection({ billKey, includeTax: true, includeServiceCharge: true, changed: false, version: 0 });
    setResult(null);
  }, [billKey]);
  const matchingResult = result?.key === requestKey ? result : null;

  return {
    includeTax,
    includeServiceCharge,
    changed,
    query,
    bill: needsQuote ? matchingResult?.bill : undefined,
    error: needsQuote ? matchingResult?.error : undefined,
    isLoading: needsQuote && !matchingResult,
    choose,
    acceptBill: (bill: SalesOrderBillDTO) => setResult({ key: requestKey, bill }),
    reset,
  };
}