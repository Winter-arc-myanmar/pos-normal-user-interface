/**
 * Client half of the desktop print agent (vision-pos-print-agent).
 *
 * The agent listens on loopback only. The page reads its token from /v1/health,
 * keeps it in memory, and sends it with every printing request. No token is ever
 * written to localStorage.
 */

/** Fired after the boot probe learns whether the agent is running. */
export const PRINT_ENGINE_CHANGED = "pos:print-engine-changed";

export interface PrintAgentHealth {
  ok: boolean;
  agentVersion: string;
  contractVersion: number;
  platform: string;
  elevated: boolean;
  capabilities: string[];
  allowOrigins: string[];
  uptimeMs: number;
  token: string;
}

export interface AgentPrinter {
  id: string;
  kind: string;
  name: string;
  port?: string;
  driver?: string;
  model?: string;
  vendorId?: string;
  productId?: string;
  serial?: string;
  connected: boolean;
  stale: boolean;
  status?: string;
}

export interface AgentPrintJob {
  jobId?: string;
  transport: "NETWORK" | "USB" | "BLUETOOTH";
  printerId?: string;
  deviceId?: string;
  host?: string;
  port?: number;
  dataBase64: string;
  encoding: "base64";
  timeoutMs?: number;
}

export interface AgentPrintReport {
  success: boolean;
  bytesWritten: number;
  via: string;
  durationMs: number;
  rebound: boolean;
  printer?: AgentPrinter;
}

export interface AgentCleanupReport {
  removedQueues: string[];
  failedQueues?: string[];
}

export const PRINT_AGENT_UNAVAILABLE =
  "The print agent is not running on this computer. Install and start the LnkitsPrintAgent service, then reload this page.";

/** The agent answered the probe but dropped the connection mid-request. */
export const PRINT_AGENT_CONNECTION_LOST =
  "The print agent closed the connection before the job finished. Check the LnkitsPrintAgent service, then print again.";

const AGENT_URL_KEY = "pos:printAgentUrl";
const DEFAULT_AGENT_URL = "http://127.0.0.1:8735";
const PROBE_TIMEOUT_MS = 700;
const REQUEST_TIMEOUT_MS = 20000;

let cachedHealth: PrintAgentHealth | null = null;
let inFlight: Promise<PrintAgentHealth | null> | null = null;

/** The agent address, overridable from Settings for a non-default port. */
export const printAgentUrl = (): string => {
  try {
    const saved = localStorage.getItem(AGENT_URL_KEY)?.trim();
    if (saved) return saved.replace(/\/+$/, "");
  } catch {
    // Storage blocked: fall back to the loopback default.
  }
  return DEFAULT_AGENT_URL;
};

export const setPrintAgentUrl = (url: string): void => {
  try {
    if (url.trim()) localStorage.setItem(AGENT_URL_KEY, url.trim());
    else localStorage.removeItem(AGENT_URL_KEY);
  } catch {
    // Storage blocked: the default stays in effect for this session.
  }
  resetPrintAgentProbe();
};

export const printAgentHealth = (): PrintAgentHealth | null => cachedHealth;

/** True once the boot probe found a running agent. */
export const isPrintAgentAvailable = (): boolean => Boolean(cachedHealth?.ok);

export function resetPrintAgentProbe(): void {
  cachedHealth = null;
  inFlight = null;
}

/** Probes /v1/health once and caches the answer (700 ms budget). */
export function probePrintAgent(force = false): Promise<PrintAgentHealth | null> {
  if (!force && cachedHealth) return Promise.resolve(cachedHealth);
  if (!force && inFlight) return inFlight;
  inFlight = loadHealth().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function loadHealth(): Promise<PrintAgentHealth | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${printAgentUrl()}/v1/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const health = (await response.json()) as PrintAgentHealth;
    if (!health?.ok || !health.token) return null;
    cachedHealth = health;
    return health;
  } catch {
    // No agent on this computer: the caller falls back to QZ or the browser.
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Calls the agent, turning its error payload into an Error with a POS message. */
export async function callPrintAgent<T>(
  path: string,
  body?: unknown,
  options: { timeoutMs?: number } = {}
): Promise<T> {
  const health = await probePrintAgent();
  if (!health) throw new Error(PRINT_AGENT_UNAVAILABLE);

  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${printAgentUrl()}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pos-Agent-Token": health.token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    if (!response.ok) {
      throw new Error(
        payload?.message || `The print agent refused the request (HTTP ${response.status}).`
      );
    }
    return payload as T;
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") {
      throw new Error("The print agent did not answer in time.");
    }
    if (caught instanceof TypeError) {
      // The probe already proved the agent is installed, so a transport failure
      // here means the connection dropped — not that the service is missing.
      throw new Error(
        body === undefined ? PRINT_AGENT_UNAVAILABLE : PRINT_AGENT_CONNECTION_LOST
      );
    }
    throw caught;
  } finally {
    window.clearTimeout(timer);
  }
}
