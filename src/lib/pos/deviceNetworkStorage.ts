export const LOCAL_DATA_VERSION = 1;

export interface DeviceNetworkProfile {
  deviceName: string;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
}

export interface DeviceWorkstationRecord {
  version: 1;
  localDataVersion: number;
  network: DeviceNetworkProfile;
  syncPassword: string;
  updatedAt: string;
}

const keyFor = (tenantId: string, registerId: string) =>
  `pos:device:${tenantId || "unknown"}:${registerId || "default"}`;

const ipv4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const isContiguousMask = (value: string) => {
  if (!ipv4.test(value)) return false;
  const bits = value
    .split(".")
    .reduce((total, part) => ((total << 8) + Number(part)) >>> 0, 0);
  if (bits === 0) return false;
  const hostBits = ~bits >>> 0;
  return (hostBits & (hostBits + 1)) === 0;
};

export function validateDeviceNetwork(
  profile: DeviceNetworkProfile
): "name" | "ip" | "mask" | "gateway" | null {
  if (!profile.deviceName.trim()) return "name";
  if (!ipv4.test(profile.ipAddress.trim())) return "ip";
  if (!isContiguousMask(profile.subnetMask.trim())) return "mask";
  if (!ipv4.test(profile.gateway.trim())) return "gateway";
  return null;
}

const createSyncPassword = () => {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export function readDeviceWorkstation(
  tenantId: string,
  registerId: string
): DeviceWorkstationRecord | null {
  try {
    const raw = localStorage.getItem(keyFor(tenantId, registerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceWorkstationRecord;
    return parsed?.version === 1 && parsed.network ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDeviceWorkstation(
  tenantId: string,
  registerId: string,
  network: DeviceNetworkProfile
): DeviceWorkstationRecord {
  const current = readDeviceWorkstation(tenantId, registerId);
  const record: DeviceWorkstationRecord = {
    version: 1,
    localDataVersion: LOCAL_DATA_VERSION,
    network: {
      deviceName: network.deviceName.trim(),
      ipAddress: network.ipAddress.trim(),
      subnetMask: network.subnetMask.trim(),
      gateway: network.gateway.trim(),
    },
    syncPassword: current?.syncPassword || createSyncPassword(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(keyFor(tenantId, registerId), JSON.stringify(record));
  return record;
}

export function resetDeviceSyncPassword(
  tenantId: string,
  registerId: string
): string {
  const current = readDeviceWorkstation(tenantId, registerId);
  const syncPassword = createSyncPassword();
  const record: DeviceWorkstationRecord = {
    version: 1,
    localDataVersion: LOCAL_DATA_VERSION,
    network: current?.network || {
      deviceName: "",
      ipAddress: "",
      subnetMask: "",
      gateway: "",
    },
    syncPassword,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(keyFor(tenantId, registerId), JSON.stringify(record));
  return syncPassword;
}
