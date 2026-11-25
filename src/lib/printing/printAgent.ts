/**
 * Client half of the desktop print agent (vision-pos-print-agent).
 *
 * The agent listens on loopback only. The page reads its token from /v1/health,
 * keeps it in memory, and sends it with every printing request. Neither the
 * address nor the token is ever written to storage.
 */

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
  removedQueues?: string[];
  failedQueues?: string[];
}

export const PRINT_AGENT_UNAVAILABLE =
  "The print agent is not running on this computer. Install and start the LnkitsPrintAgent service, then reload this page.";

/** The agent answered the probe but dropped the connection mid-request. */
export const PRINT_AGENT_CONNECTION_LOST =
  "The print agent closed the connection before the job finished. Check the LnkitsPrintAgent service, then print again.";

const PRINT_AGENT_UNAVAILABLE_CODE = "PRINT_AGENT_UNAVAILABLE";
const PRINT_AGENT_CONNECTION_LOST_CODE = "PRINT_AGENT_CONNECTION_LOST";

/** The agent address. Loopback only, and never persisted. */
const DEFAULT_AGENT_URL = "http://127.0.0.1:8735";
const PROBE_TIMEOUT_MS = 700;
// The second (no-cors) probe must be at least as patient as the first: a busy
// till that needs 400 ms to accept the follow-up must not look like "absent".
const NO_CORS_PROBE_TIMEOUT_MS = PROBE_TIMEOUT_MS;
const REQUEST_TIMEOUT_MS = 20000;

/** Contract version this POS speaks. An agent that declares another is too new/old. */
export const SUPPORTED_AGENT_CONTRACT = 1;

/**
 * What the probe found on loopback:
 * - ready        an agent answered, is allowed to talk to this POS and speaks our contract
 * - absent       nothing is listening on the agent port (QZ or the browser takes over silently)
 * - unreachable  something answered, but the POS could not use it (HTTP error, timeout,
 *                unreadable body, missing token, or the origin was refused)
 * - incompatible an agent answered, but it speaks another contract version
 */
export type PrintAgentStatus = "ready" | "absent" | "unreachable" | "incompatible";

export interface PrintAgentProbe {
  status: PrintAgentStatus;
  health: PrintAgentHealth | null;
  error: string | null;
  httpStatus?: number;
}

let cachedProbe: PrintAgentProbe | null = null;
let inFlightProbe: Promise<PrintAgentProbe> | null = null;
/** Bumped on reset so a probe that was already running cannot repopulate the cache. */
let probeGeneration = 0;

/** The address the operator may have to allow in the agent's allowOrigins list. */
const posOrigin = (): string => {
  try {
    return window.location.origin;
  } catch {
    return "window.location.origin";
  }
};

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "AbortError";

export const printAgentProbe = (): PrintAgentProbe | null => cachedProbe;

export const printAgentHealth = (): PrintAgentHealth | null => cachedProbe?.health ?? null;

/** True only when the agent answered, is reachable from this POS and speaks our contract. */
export function isPrintAgentAvailable(): boolean {
  return cachedProbe?.status === "ready";
}

export function resetPrintAgentProbe(): void {
  probeGeneration += 1;
  cachedProbe = null;
  inFlightProbe = null;
}

/** Probes /v1/health once and caches the answer (700 ms budget). */
export function probePrintAgent(force = false): Promise<PrintAgentProbe> {
  if (inFlightProbe) return inFlightProbe;
  if (!force && cachedProbe) return Promise.resolve(cachedProbe);
  const generation = probeGeneration;
  const run = loadProbe()
    .then((probe) => {
      // A reset while this probe was in flight means its answer is stale.
      if (generation === probeGeneration) cachedProbe = probe;
      return probe;
    })
    .finally(() => {
      // Only the probe of the current generation owns the in-flight handle; a
      // reset clears it immediately, and a newer probe must not be clobbered.
      if (generation === probeGeneration) inFlightProbe = null;
    });
  inFlightProbe = run;
  return run;
}

/**
 * Asks the agent port whether anything is listening, without reading the answer.
 *
 * A refused CORS request and a dead port both surface as a network TypeError, so
 * a second, no-cors request is the only way to tell "the agent is not installed"
 * from "the agent is running but this POS is not in allowOrigins".
 */
async function agentPortAnswers(): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), NO_CORS_PROBE_TIMEOUT_MS);
  try {
    await fetch(DEFAULT_AGENT_URL, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

async function loadProbe(): Promise<PrintAgentProbe> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${DEFAULT_AGENT_URL}/v1/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    window.clearTimeout(timer);
    const httpStatus = response.status;

    if (!response.ok) {
      return {
        status: "unreachable",
        health: null,
        error:
          httpStatus === 403
            ? `The print agent refused this POS address (HTTP 403). Add ${posOrigin()} to allowOrigins in the print agent configuration, then reload.`
            : `The print agent answered HTTP ${httpStatus}.`,
        httpStatus,
      };
    }

    let payload: Partial<PrintAgentHealth> | null = null;
    try {
      payload = (await response.json()) as Partial<PrintAgentHealth> | null;
    } catch {
      // A 2xx answer the POS cannot read is not a working agent.
      payload = null;
    }
    if (!payload || payload.ok !== true || !payload.token) {
      return {
        status: "unreachable",
        health: null,
        error: "The print agent answered, but not with the health report this POS needs.",
        httpStatus,
      };
    }

    const contract = payload.contractVersion;
    if (contract !== undefined && contract !== null && contract !== SUPPORTED_AGENT_CONTRACT) {
      return {
        status: "incompatible",
        health: null,
        error: `The print agent speaks contract ${String(contract)}, but this POS needs contract ${SUPPORTED_AGENT_CONTRACT}. Update the older of the two.`,
        httpStatus,
      };
    }

    return {
      status: "ready",
      health: payload as PrintAgentHealth,
      error: null,
      httpStatus,
    };
  } catch (caught) {
    if (isAbortError(caught)) {
      return {
        status: "unreachable",
        health: null,
        error: "The print agent did not answer in time.",
      };
    }
    const listening = await agentPortAnswers();
    if (listening) {
      return {
        status: "unreachable",
        health: null,
        error: `Something answered on ${DEFAULT_AGENT_URL}, but the POS was refused. Add ${posOrigin()} to allowOrigins in the print agent configuration, then reload.`,
      };
    }
    // Nothing is listening: the caller falls back to QZ or the browser, silently.
    return { status: "absent", health: null, error: null };
  } finally {
    window.clearTimeout(timer);
  }
}

/** The agent's own error payload, as every /v1 route reports a refusal. */
interface AgentErrorPayload {
  code?: string;
  message?: string;
  printers?: AgentPrinter[];
}

/**
 * A refusal from the print agent, carrying the agent's machine-readable code so
 * the POS can tell a refused connection from a missing printer queue.
 */
export class PrintAgentError extends Error {
  readonly code: string;
  readonly printers?: AgentPrinter[];

  constructor(code: string, message: string, printers?: AgentPrinter[]) {
    super(message);
    this.name = "PrintAgentError";
    this.code = code;
    if (printers) this.printers = printers;
  }
}

/** True when the failure means the agent connection itself dropped. */
export function isPrintAgentConnectionError(error: unknown): boolean {
  return (
    error instanceof PrintAgentError &&
    (error.code === PRINT_AGENT_CONNECTION_LOST_CODE ||
      error.code === PRINT_AGENT_UNAVAILABLE_CODE)
  );
}

/** What the operator should do about an agent refusal, appended to its message. */
const withGuidance = (code: string, message: string): string => {
  switch (code) {
    case "PRINTER_NOT_FOUND":
      return `${message} Open Settings > Printer, run Discover, then pick the printer's Windows queue again.`;
    case "ORIGIN_NOT_ALLOWED":
      return `${message} Add this POS address (${posOrigin()}) to allowOrigins in the print agent configuration, then reload.`;
    case "UNAUTHORIZED":
      return `${message} Reload the POS page so it reads a fresh print agent token.`;
    default:
      // PRINTER_QUEUE_MISSING and anything else keep the agent's own wording.
      return message;
  }
};

/** A refusal without a code still has to name a cause the POS can act on. */
const fallbackCode = (httpStatus: number): string => {
  if (httpStatus === 403) return "ORIGIN_NOT_ALLOWED";
  if (httpStatus === 401) return "UNAUTHORIZED";
  return "PRINT_AGENT_REFUSED";
};

/** Calls the agent, turning its error payload into a PrintAgentError with a POS message. */
export async function callPrintAgent<T>(
  path: string,
  body?: unknown,
  options: { timeoutMs?: number } = {}
): Promise<T> {
  const probe = await probePrintAgent();
  if (probe.status !== "ready" || !probe.health) {
    // Keep the probe's own diagnosis: a CORS/allowOrigins refusal or a contract
    // mismatch must not be reported as "the agent is not installed".
    throw new PrintAgentError(
      probe.status === "incompatible"
        ? "PRINT_AGENT_INCOMPATIBLE"
        : PRINT_AGENT_UNAVAILABLE_CODE,
      probe.error || PRINT_AGENT_UNAVAILABLE
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(`${DEFAULT_AGENT_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pos-Agent-Token": probe.health.token,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as AgentErrorPayload | null;
    if (!response.ok) {
      const code = payload?.code || fallbackCode(response.status);
      throw new PrintAgentError(
        code,
        withGuidance(
          code,
          payload?.message || `The print agent refused the request (HTTP ${response.status}).`
        ),
        payload?.printers
      );
    }
    if (payload === null) {
      throw new PrintAgentError(
        "PRINT_AGENT_REFUSED",
        "The print agent returned an empty response. Check the LnkitsPrintAgent service, then print again."
      );
    }
    return payload as T;
  } catch (caught) {
    if (caught instanceof PrintAgentError) throw caught;
    if (isAbortError(caught)) {
      throw new PrintAgentError("PRINT_AGENT_TIMEOUT", "The print agent did not answer in time.");
    }
    if (caught instanceof TypeError) {
      // The probe already proved the agent is installed, so a transport failure
      // here means the connection dropped — not that the service is missing.
      throw new PrintAgentError(PRINT_AGENT_CONNECTION_LOST_CODE, PRINT_AGENT_CONNECTION_LOST);
    }
    throw caught;
  } finally {
    window.clearTimeout(timer);
  }
}

