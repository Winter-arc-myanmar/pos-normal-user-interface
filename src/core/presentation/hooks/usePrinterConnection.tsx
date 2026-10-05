import { useCallback, useEffect, useState } from "react";
import { KdsTicket } from "../../domain/entities/Cashier";
import { IKitchenPrinterService } from "../../domain/services/IKitchenPrinterService";
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
  PrinterJob,
  StationRoute,
} from "@/lib/printing/routeKitchenPrint";
import { printPlaceToTemplateType } from "@/lib/printing/selectPrintTemplate";
import {
  PRINTER_BINDINGS_CHANGED,
  PrinterBinding,
  PrinterTransport,
  listStoredPrinterBindings,
  readPrinterBindings,
  removePrinterBinding,
  resolveBindingsForPlace,
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

  const printerService =
    container.resolve<IKitchenPrinterService>("kitchenPrinterService");

  /**
   * Last-resort print targets taken from the back-office printer list.
   *
   * A phone can end up with no local binding at all (fresh tablet, or a WebView
   * that drops localStorage). A network printer configured in the back office is
   * still reachable from the tablet, so derive a binding from the printer record
   * instead of failing with "No checkout printer is connected".
   *
   * Desktop always has its local binding, so this never runs there.
   */
  const backendTargets = useCallback(
    async (place: PrintPlace): Promise<PrinterBinding[]> => {
      if (!isBrowserPrinting() || !locationId) return [];
      try {
        const result = await printerService.list({
          page: 1,
          limit: 100,
          locationId,
        });
        return result.printers
          .filter((printer) => Boolean(printer.ipAddress))
          .filter(
            (printer) =>
              !printer.sectors?.length || printer.sectors.includes(place)
          )
          .map((printer) => ({
            id: `backend:${printer.id}`,
            backendPrinterId: printer.id,
            transport: "NETWORK" as const,
            displayName: printer.name,
            host: printer.ipAddress,
            port: printer.port,
            sectors: printer.sectors,
            lastVerifiedAt: "",
            lastError: null,
          }));
      } catch {
        return [];
      }
    },
    [locationId, printerService]
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
      const lines = slip.lines || [];
      // Station routing can leave every line unrouted (for example a category
      // with no station, or a station whose printer is not bound on this
      // device). Rather than silently printing nothing, fall back to the
      // KDS/default printer so the kitchen ticket still reaches the paper.
      let jobs: PrinterJob[] = plan.jobs;
      if (!jobs.length && lines.length) {
        const localTargets = resolveBindingsForPlace(
          current.bindings,
          current.defaultBinding,
          "KDS"
        );
        const targets = localTargets.length
          ? localTargets
          : await backendTargets("KDS");
        jobs = targets.map((binding) => ({ binding, lines }));
      }

      const failures: string[] = [];
      for (const job of jobs) {
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
    [backendTargets, currentBindings, registerId, templateFor, tenantId]
  );

  const printReceipt = useCallback(
    async (receipt: SaleReceipt) => {
      const client = await configureClient(tenantId, registerId);
      const current = currentBindings();
      const place = receipt.place || "CHECKOUT";
      const localTargets = resolveBindingsForPlace(
        current.bindings,
        current.defaultBinding,
        place
      );
      const targets = localTargets.length
        ? localTargets
        : await backendTargets(place);
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
    [backendTargets, currentBindings, registerId, templateFor, tenantId]
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
