import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import packageJson from "../../../package.json";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useKitchenPrinterManagement } from "@/core/presentation/hooks/useKitchenPrinterManagement";
import { usePosSync } from "@/core/presentation/hooks/usePosSync";
import { usePosWorkspace } from "@/core/presentation/hooks/usePosWorkspace";
import { usePrinterConnection } from "@/core/presentation/hooks/usePrinterConnection";
import {
  LOCAL_DATA_VERSION,
  readDeviceWorkstation,
  resetDeviceSyncPassword,
  saveDeviceWorkstation,
  validateDeviceNetwork,
} from "@/lib/pos/deviceNetworkStorage";
import { SettingsField, SettingsSection } from "./settingsUi";

const qzVersion = String(packageJson.dependencies["qz-tray"] || "").replace(
  /^[\^~]/,
  ""
);

const bootedAt = new Date();

function formatClock(value: Date): string {
  return value.toLocaleString();
}

function formatUptime(from: Date): string {
  const minutes = Math.max(0, Math.floor((Date.now() - from.getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  return `${days}d ${hours}h ${rest}m`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm last:border-b-0">
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={[
            "h-2.5 w-2.5 shrink-0 rounded-full",
            ok ? "bg-emerald-500" : "bg-slate-300",
          ].join(" ")}
        />
        <span className="truncate text-slate-700">{label}</span>
      </span>
      <span className="truncate font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function DevicesSettingsPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    activeLocationId,
    activePosRegisterId,
    activePosSessionId,
    posRegisters = [],
  } = usePosWorkspace();
  const tenantId = String(user?.tenantId || "");
  const connection = usePrinterConnection(tenantId, activePosRegisterId);
  const { printers, listPrinters } = useKitchenPrinterManagement();
  const sync = usePosSync({
    tenantId,
    locationId: activeLocationId,
    posRegisterId: activePosRegisterId,
    posSessionId: activePosSessionId,
  });
  const register = posRegisters.find((item) => item.id === activePosRegisterId);
  const [deviceName, setDeviceName] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const [subnetMask, setSubnetMask] = useState("");
  const [gateway, setGateway] = useState("");
  const [syncPassword, setSyncPassword] = useState("");
  const [loadedScope, setLoadedScope] = useState("");
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const workstationScope = `${tenantId}:${activePosRegisterId}`;

  if (loadedScope !== workstationScope) {
    const saved = readDeviceWorkstation(tenantId, activePosRegisterId);
    setLoadedScope(workstationScope);
    setDeviceName(saved?.network.deviceName || register?.name || "");
    setDeviceIp(saved?.network.ipAddress || "");
    setSubnetMask(saved?.network.subnetMask || "");
    setGateway(saved?.network.gateway || "");
    setSyncPassword(saved?.syncPassword || "");
  }

  useEffect(() => {
    void listPrinters({ page: 1, limit: 100 }).catch(() => undefined);
  }, [listPrinters]);

  const systemVersion =
    typeof navigator === "undefined"
      ? "Web POS"
      : navigator.platform || "Web POS";
  const localDataReady = Boolean(sync.lastSettingsSyncAt && sync.lastItemSyncAt);
  const invalidKey = {
    name: "settings.devices.invalidName",
    ip: "settings.devices.invalidIp",
    mask: "settings.devices.invalidMask",
    gateway: "settings.devices.invalidGateway",
  } as const;

  const saveNetwork = () => {
    const profile = {
      deviceName,
      ipAddress: deviceIp,
      subnetMask,
      gateway,
    };
    const invalid = validateDeviceNetwork(profile);
    if (invalid) {
      setLocalError(t(invalidKey[invalid]));
      setLocalMessage(null);
      return;
    }
    const saved = saveDeviceWorkstation(tenantId, activePosRegisterId, profile);
    setSyncPassword(saved.syncPassword);
    setLocalError(null);
    setLocalMessage(t("settings.devices.networkSaved"));
  };

  const resetPassword = () => {
    const password = resetDeviceSyncPassword(tenantId, activePosRegisterId);
    setSyncPassword(password);
    setLocalError(null);
    setLocalMessage(t("settings.devices.syncPasswordReset", { password }));
  };

  const reloadLocalData = async () => {
    setLocalError(null);
    setLocalMessage(null);
    try {
      await sync.pullLatestSettings();
      await sync.pullItemUpdates();
      setLocalMessage(t("settings.devices.localDataReady"));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : t("settings.devices.localDataMissing")
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsSection title={t("settings.devices.information")}>
          <dl>
            <InfoRow
              label={t("settings.devices.deviceId")}
              value={register?.code || activePosRegisterId}
            />
            <InfoRow label={t("settings.devices.storeId")} value={activeLocationId} />
            <InfoRow
              label={t("settings.devices.productVersion")}
              value={packageJson.version}
            />
            <InfoRow label={t("settings.devices.systemVersion")} value={systemVersion} />
            <InfoRow
              label={t("settings.devices.deviceModel")}
              value={deviceName || register?.name || t("settings.devices.browserPos")}
            />
            <InfoRow
              label={t("settings.devices.databaseVersion")}
              value={String(LOCAL_DATA_VERSION)}
            />
            <InfoRow label={t("settings.devices.ipAddress")} value={deviceIp || "—"} />
            <InfoRow
              label={t("settings.devices.syncPassword")}
              value={
                syncPassword
                  ? t("settings.devices.syncPasswordSet")
                  : t("settings.devices.syncPasswordMissing")
              }
            />
            <InfoRow
              label={t("settings.devices.systemTime")}
              value={formatClock(new Date())}
            />
            <InfoRow
              label={t("settings.devices.bootingTime")}
              value={formatClock(bootedAt)}
            />
            <InfoRow label={t("settings.devices.uptime")} value={formatUptime(bootedAt)} />
            <InfoRow
              label={t("settings.devices.macAddress")}
              value={register?.macAddress || "—"}
            />
          </dl>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {t("settings.devices.deviceKeyNote")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              isLoading={sync.isLoading}
              onClick={() => void reloadLocalData()}
            >
              {t("settings.devices.initializeData")}
            </Button>
            <Button type="button" variant="secondary" onClick={resetPassword}>
              {t("settings.devices.resetSyncPassword")}
            </Button>
          </div>
          {localMessage || localError || sync.notice || sync.error ? (
            <p
              className={`mt-3 text-sm ${
                localError || sync.error ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {localError || sync.error || localMessage || sync.notice}
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection title={t("settings.devices.networkService")}>
          <div
            className={[
              "mb-3 rounded-lg px-3 py-2 text-sm",
              localDataReady
                ? "bg-emerald-500 text-white"
                : "bg-amber-100 text-amber-900",
            ].join(" ")}
          >
            {localDataReady
              ? t("settings.devices.localDataReady")
              : t("settings.devices.localDataMissing")}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mb-3"
            isLoading={sync.isLoading}
            onClick={() => void reloadLocalData()}
          >
            {t("settings.devices.recoverData")}
          </Button>
          <StatusRow
            label={t("settings.devices.printingDeployment")}
            value={qzVersion || "—"}
            ok={connection.isConnected}
          />
          <StatusRow
            label={t("settings.devices.licensePrinting")}
            value={t("settings.devices.qzFreeLicense")}
            ok={connection.isConnected}
          />
          <StatusRow
            label={t("settings.devices.qzTray")}
            value={
              connection.isConnected
                ? t("settings.printer.connected")
                : t("settings.printer.disconnected")
            }
            ok={connection.isConnected}
          />
          <StatusRow
            label={t("settings.devices.localPrinting")}
            value={connection.defaultBinding?.displayName || t("counterOrders.noPrinter")}
            ok={Boolean(connection.defaultBinding)}
          />
          {printers.map((printer) => (
            <StatusRow
              key={printer.id}
              label={printer.name}
              value={`${printer.ipAddress}:${printer.port}`}
              ok={printer.isActive}
            />
          ))}
          <StatusRow
            label={t("settings.devices.prepaidCard")}
            value={
              activeLocationId
                ? t("settings.devices.prepaidReady")
                : t("settings.devices.prepaidMissing")
            }
            ok={Boolean(activeLocationId)}
          />
          <div className="mt-4 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate("/settings/printer")}
              className="text-sm font-semibold text-blue-600"
            >
              {t("settings.devices.openPrinters")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/cards")}
              className="text-sm font-semibold text-blue-600"
            >
              {t("settings.devices.prepaidCard")}
            </button>
          </div>
        </SettingsSection>
      </div>

      <SettingsSection title={t("settings.devices.title")}>
        <div className="space-y-3">
          <SettingsField
            label={t("settings.devices.deviceName")}
            value={deviceName}
            onChange={setDeviceName}
            placeholder={t("settings.devices.deviceNamePlaceholder")}
          />
          <SettingsField
            label={t("settings.devices.ipAddress")}
            value={deviceIp}
            onChange={setDeviceIp}
          />
          <SettingsField
            label={t("settings.devices.subnetMask")}
            value={subnetMask}
            onChange={setSubnetMask}
          />
          <SettingsField
            label={t("settings.devices.gateway")}
            value={gateway}
            onChange={setGateway}
          />
        </div>
        <Button type="button" className="mt-4" onClick={saveNetwork}>
          {t("settings.devices.saveNetwork")}
        </Button>
        <p className="mt-4 text-xs text-slate-400">{t("settings.devices.hint")}</p>
      </SettingsSection>
    </div>
  );
}
