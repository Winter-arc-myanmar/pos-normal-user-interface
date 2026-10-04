import { useCallback, useEffect, useState } from "react";
import { KdsTicket } from "../../domain/entities/Cashier";
import { IPrintTemplateService } from "../../domain/services/IPrintTemplateService";
import container from "../../infrastructure/di/container";
import { browserPrinterClient } from "../../infrastructure/printing/BrowserPrinterClient";
import { getPrinterClient } from "../../infrastructure/printing/getPrinterClient";
import type { IPrinterClient } from "../../infrastructure/printing/IPrinterClient";
import { isBrowserPrinting } from "../../infrastructure/printing/PrinterClient";
import {
  kdsTicketPrintLines,
  KitchenSlip,
  PrintPlace,
  SaleReceipt,
} from "@/lib/printing/formatKdsTicket";
import { hasNativePrinterBridge } from "@/lib/printing/webPrinterTransports";
import {
  groupKitchenJobs,
  KitchenPrintPlan,
  KitchenRoutingOptions,
  StationRoute,
} from "@/lib/printing/routeKitchenPrint";
import { printPlaceToTemplateType } from "@/lib/printing/selectPrintTemplate";
import {
  PRINTER_BINDINGS_CHANGED,
  PrinterBinding,
  PrinterTransport,
  bindingsForSector,
  listStoredPrinterBindings,
  readPrinterBindings,
  removePrinterBinding,
  savePrinterBinding,
  setDefaultPrinterBinding,
} from "@/lib/pos/printerBindingStorage";

const configureClient = async (
  tenantId: string,
  registerId: string
): Promise<IPrinterClient> => {
  const client = await getPrinterClient();
  if (client === browserPrinterClient) {
    browserPrinterClient.configureScope(tenantId, registerId);
  }
  return client;
};

export function usePrinterConnection(
  tenantId: string,
  registerId: string,
  locationId?: string
) {
  const [, setRevision] = useState(0);
  const [deviceNames, setDeviceNames] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(isBrowserPrinting());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener(PRINTER_BINDINGS_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PRINTER_BINDINGS_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const store = readPrinterBindings(tenantId, registerId);
  const bindings = Object.values(store.bindings);
  const defaultBinding = store.defaultBindingId
    ? store.bindings[store.defaultBindingId] || null
    : null;

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const client = await configureClient(tenantId, registerId);
      await client.connect();
      setIsConnected(client.isConnected());
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : isBrowserPrinting()
            ? "Unable to start mobile printing"
            : "Unable to connect to QZ Tray";
      setError(message);
      setIsConnected(false);
      throw caught;
    } finally {
      setIsConnecting(false);
    }
  }, [registerId, tenantId]);

  useEffect(() => {
    void connect().catch(() => undefined);
  }, [connect]);

  const discover = useCallback(
    async (transport?: PrinterTransport) => {
      setIsConnecting(true);
      setError(null);
      try {
        const client = await configureClient(tenantId, registerId);
        const names = await client.findPrinters(transport);
        setDeviceNames(names);
        setIsConnected(client.isConnected());
        return names;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Unable to discover printers";
        setError(message);
        throw caught;
      } finally {
        setIsConnecting(false);
      }
    },
    [registerId, tenantId]
  );

  const verify = useCallback(
    async (binding: PrinterBinding) => {
      setIsConnecting(true);
      setError(null);
      try {
        const client = await configureClient(tenantId, registerId);
        await client.testPrint(binding);
        setIsConnected(client.isConnected());
        return { ...binding, lastVerifiedAt: new Date().toISOString(), lastError: null };
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Printer test failed";
        setError(message);
        throw caught;
      } finally {
        setIsConnecting(false);
      }
    },
    [registerId, tenantId]
  );

  const saveBinding = useCallback(
    (binding: PrinterBinding, makeDefault = false) =>
      savePrinterBinding(tenantId, registerId, binding, makeDefault),
    [registerId, tenantId]
  );

  const removeBinding = useCallback(
    (id: string) => removePrinterBinding(tenantId, registerId, id),
    [registerId, tenantId]
  );

  const makeDefault = useCallback(
    (id: string) => setDefaultPrinterBinding(tenantId, registerId, id),
    [registerId, tenantId]
  );

  const currentBindings = useCallback(
    () => listStoredPrinterBindings(tenantId, registerId),
    [registerId, tenantId]
  );

  const templateFor = useCallback(
    async (place: PrintPlace) => {
      try {
        const service = container.resolve<IPrintTemplateService>("printTemplateService");
        const resolved = await service.resolve({
          type: printPlaceToTemplateType(place),
          ...(locationId ? { locationId } : {}),
        });
        return resolved.settings;
      } catch {
        return undefined;
      }
    },
    [locationId]
  );

  const printKitchen = useCallback(
    async (
      slip: KitchenSlip,
      stations: StationRoute[] = [],
      options: KitchenRoutingOptions = {}
    ): Promise<KitchenPrintPlan> => {
      const client = await configureClient(tenantId, registerId);
      const current = currentBindings();
      const template = slip.template || (await templateFor("KDS"));
      const plan = groupKitchenJobs(
        slip.lines || [],
        current.bindings,
        current.defaultBinding,
        slip.stationId,
        stations,
        options
      );
      const failures: string[] = [];
      for (const job of plan.jobs) {
        try {
          await client.printKitchen(job.binding, {
            ...slip,
            template,
            lines: job.lines,
            stationId: job.station?.id || slip.stationId,
            stationName: job.station?.name || slip.stationName,
          });
        } catch (caught) {
          const message =
            caught instanceof Error ? caught.message : "Printer communication failed";
          failures.push(`${job.binding.displayName}: ${message}`);
        }
      }
      if (failures.length) {
        throw new Error(failures.join(" "));
      }
      return plan;
    },
    [currentBindings, registerId, templateFor, tenantId]
  );

  const printReceipt = useCallback(
    async (receipt: SaleReceipt) => {
      const client = await configureClient(tenantId, registerId);
      const current = currentBindings();
      const place = receipt.place || "CHECKOUT";
      const targets = bindingsForSector(current.bindings, place);
      if (!targets.length) {
        throw new Error(
          place === "FINANCE"
            ? "No finance printer is connected"
            : place === "KDS"
              ? "No KDS printer is connected"
              : "No checkout printer is connected"
        );
      }
      const template = receipt.template || (await templateFor(place));
      const failures: string[] = [];
      for (const target of targets) {
        try {
          await client.printReceipt(target, {
            ...receipt,
            place,
            template,
            showLogo: receipt.showLogo,
          });
        } catch (caught) {
          const message =
            caught instanceof Error
              ? caught.message
              : "Printer communication failed";
          failures.push(`${target.displayName}: ${message}`);
        }
      }
      if (failures.length) throw new Error(failures.join(" "));
    },
    [currentBindings, registerId, templateFor, tenantId]
  );

  const printTicket = useCallback(
    async (ticket: KdsTicket, stations: StationRoute[] = []) => {
      const stationId = ticket.stationId || ticket.station?.id;
      const listed = stationId
        ? stations.find((station) => station.id === stationId)
        : undefined;
      const station: StationRoute | undefined = listed
        ? {
            ...listed,
            printerIds: listed.printerIds.length
              ? listed.printerIds
              : ticket.station?.printerIds || [],
            name: ticket.station?.name || listed.name,
          }
        : ticket.station
          ? {
              id: ticket.station.id,
              name: ticket.station.name,
              printerIds: ticket.station.printerIds,
              categoryIds: [],
            }
          : undefined;
      return printKitchen(
        {
          title: ticket.ticketNumber || ticket.id,
          status: ticket.status,
          courseType: ticket.courseType,
          firedAt: ticket.firedAt,
          stationId,
          stationName: station?.name,
          orderRef: ticket.salesOrderId,
          lines: kdsTicketPrintLines(ticket),
        },
        station ? [station] : []
      );
    },
    [printKitchen]
  );

  return {
    bindings,
    defaultBinding,
    deviceNames,
    isConnected,
    isConnecting,
    error,
    nativeBridge: hasNativePrinterBridge(),
    connect,
    discover,
    verify,
    saveBinding,
    removeBinding,
    makeDefault,
    printKitchen,
    printReceipt,
    printTicket,
    clearError: () => setError(null),
  };
}
