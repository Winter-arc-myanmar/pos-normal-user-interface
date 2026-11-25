import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRINT_AGENT_UNAVAILABLE,
  PrintAgentError,
  SUPPORTED_AGENT_CONTRACT,
  callPrintAgent,
  isPrintAgentAvailable,
  isPrintAgentConnectionError,
  printAgentHealth,
  printAgentProbe,
  probePrintAgent,
  resetPrintAgentProbe,
} from "../printAgent";

const AGENT_URL = "http://127.0.0.1:8735";

/** The /v1/health body a healthy agent returns. */
const health = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  agentVersion: "1.2.0",
  contractVersion: SUPPORTED_AGENT_CONTRACT,
  platform: "win-x64",
  elevated: true,
  capabilities: ["spooler", "raw-tcp"],
  allowOrigins: ["http://localhost:3000"],
  uptimeMs: 1200,
  token: "agent-token",
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

const unreadableResponse = (status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON");
    },
  }) as unknown as Response;

/** What the browser throws when nothing listens on the port, or CORS refuses it. */
const networkError = () => new TypeError("Failed to fetch");

const abortError = () => new DOMException("The operation was aborted.", "AbortError");

let fetchMock: ReturnType<typeof vi.fn>;

/** A fetch stub that answers the health probe and then the agent call. */
const stubFetch = (...answers: Array<() => Promise<Response>>) => {
  fetchMock = vi.fn();
  for (const answer of answers) fetchMock.mockImplementationOnce(answer);
  vi.stubGlobal("fetch", fetchMock);
};

const probeCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes("/v1/health"));

const noCorsCalls = () =>
  fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.mode === "no-cors"
  );

beforeEach(() => {
  resetPrintAgentProbe();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetPrintAgentProbe();
});


describe("probePrintAgent", () => {
  it("reports a ready agent and keeps the token in memory", async () => {
    stubFetch(async () => jsonResponse(health()));

    const probe = await probePrintAgent();

    expect(probe).toMatchObject({ status: "ready", error: null, httpStatus: 200 });
    expect(probe.health?.token).toBe("agent-token");
    expect(isPrintAgentAvailable()).toBe(true);
    expect(printAgentHealth()?.agentVersion).toBe("1.2.0");
    expect(printAgentProbe()).toBe(probe);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${AGENT_URL}/v1/health`);
  });

  it("accepts an agent that declares no contract version", async () => {
    const body = health();
    delete (body as { contractVersion?: number }).contractVersion;
    stubFetch(async () => jsonResponse(body));

    expect((await probePrintAgent()).status).toBe("ready");
  });

  it("reports absent when the health call and the no-cors call both fail", async () => {
    stubFetch(
      async () => Promise.reject(networkError()),
      async () => Promise.reject(networkError())
    );

    const probe = await probePrintAgent();

    expect(probe).toEqual({ status: "absent", health: null, error: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = noCorsCalls()[0];
    expect(String(url)).toBe(AGENT_URL);
    expect(init).toMatchObject({ mode: "no-cors", cache: "no-store" });
    expect(isPrintAgentAvailable()).toBe(false);
  });

  it("reports unreachable when something answers but the POS is refused", async () => {
    stubFetch(
      async () => Promise.reject(networkError()),
      async () => jsonResponse("", 200)
    );

    const probe = await probePrintAgent();

    expect(probe.status).toBe("unreachable");
    expect(probe.error).toMatch(/allowOrigins/);
    expect(noCorsCalls()).toHaveLength(1);
  });

  it("reports unreachable and the HTTP status of a refused health call", async () => {
    stubFetch(async () => jsonResponse({}, 500));

    const probe = await probePrintAgent();

    expect(probe).toMatchObject({ status: "unreachable", httpStatus: 500 });
    expect(probe.error).toMatch(/HTTP 500/);
  });

  it("mentions allowOrigins when the health call is answered with 403", async () => {
    stubFetch(async () => jsonResponse({ message: "Origin not allowed" }, 403));

    const probe = await probePrintAgent();

    expect(probe).toMatchObject({ status: "unreachable", httpStatus: 403 });
    expect(probe.error).toMatch(/allowOrigins/);
  });

  it("reports unreachable when the agent does not answer in time", async () => {
    stubFetch(async () => Promise.reject(abortError()));

    const probe = await probePrintAgent();

    expect(probe.status).toBe("unreachable");
    expect(probe.error).toMatch(/did not answer in time/);
    // A timeout is not the "nothing installed" case, so no no-cors probe follows.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports unreachable for a body the POS cannot read", async () => {
    stubFetch(async () => unreadableResponse());

    const probe = await probePrintAgent();

    expect(probe).toMatchObject({ status: "unreachable", httpStatus: 200 });
    expect(probe.health).toBeNull();
  });

  it("reports unreachable for a health report without a token", async () => {
    stubFetch(async () => jsonResponse(health({ token: "" })));

    expect((await probePrintAgent()).status).toBe("unreachable");
  });

  it("reports unreachable for a health report that is not ok", async () => {
    stubFetch(async () => jsonResponse(health({ ok: false })));

    expect((await probePrintAgent()).status).toBe("unreachable");
  });

  it("reports an incompatible agent and names the contract it speaks", async () => {
    stubFetch(async () => jsonResponse(health({ contractVersion: 7 })));

    const probe = await probePrintAgent();

    expect(probe.status).toBe("incompatible");
    expect(probe.error).toContain("contract 7");
    expect(probe.error).toContain(`contract ${SUPPORTED_AGENT_CONTRACT}`);
    expect(probe.health).toBeNull();
    expect(isPrintAgentAvailable()).toBe(false);
  });

  it("caches the answer and probes once for concurrent callers", async () => {
    fetchMock = vi.fn(async () => jsonResponse(health()));
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([probePrintAgent(), probePrintAgent()]);
    const cached = await probePrintAgent();

    expect(first).toBe(second);
    expect(cached).toBe(first);
    expect(probeCalls()).toHaveLength(1);
  });

  it("re-probes when forced", async () => {
    stubFetch(
      async () => jsonResponse(health()),
      async () => jsonResponse(health({ token: "restarted" }))
    );

    await probePrintAgent();
    const forced = await probePrintAgent(true);

    expect(forced.health?.token).toBe("restarted");
    expect(probeCalls()).toHaveLength(2);
  });
});

describe("callPrintAgent", () => {
  /** A ready agent, then the answer the agent gives to the call under test. */
  const agentAnswers = (answer: () => Promise<Response>) =>
    stubFetch(async () => jsonResponse(health()), answer);

  const printAndCatch = async (body?: unknown): Promise<PrintAgentError> => {
    try {
      await callPrintAgent("/v1/print", body ?? {});
    } catch (error) {
      return error as PrintAgentError;
    }
    throw new Error("callPrintAgent resolved; it should have thrown");
  };

  it("sends the token the probe found", async () => {
    agentAnswers(async () => jsonResponse({ success: true, bytesWritten: 4 }));

    await callPrintAgent("/v1/print", { dataBase64: "AA==" });

    const [, init] = fetchMock.mock.calls[1];
    expect((init as RequestInit).headers).toMatchObject({
      "X-Pos-Agent-Token": "agent-token",
    });
  });

  it("keeps the agent's code and tells the operator to pick the queue again", async () => {
    agentAnswers(async () =>
      jsonResponse({ code: "PRINTER_NOT_FOUND", message: "No printer named POS-80." }, 404)
    );

    const error = await printAndCatch();

    expect(error).toBeInstanceOf(PrintAgentError);
    expect(error.code).toBe("PRINTER_NOT_FOUND");
    expect(error.message).toContain("No printer named POS-80.");
    expect(error.message).toContain("Open Settings > Printer, run Discover");
    expect(isPrintAgentConnectionError(error)).toBe(false);
  });

  it("tells the operator to allow this POS address", async () => {
    agentAnswers(async () =>
      jsonResponse({ code: "ORIGIN_NOT_ALLOWED", message: "Origin not allowed." }, 403)
    );

    const error = await printAndCatch();

    expect(error.code).toBe("ORIGIN_NOT_ALLOWED");
    expect(error.message).toContain("allowOrigins");
    expect(error.message).toContain(window.location.origin);
  });

  it("tells the operator to reload for a fresh token", async () => {
    agentAnswers(async () => jsonResponse({ code: "UNAUTHORIZED", message: "Bad token." }, 401));

    const error = await printAndCatch();

    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toContain("Reload the POS page so it reads a fresh print agent token.");
  });

  it("keeps the agent's message for a missing queue", async () => {
    agentAnswers(async () =>
      jsonResponse(
        { code: "PRINTER_QUEUE_MISSING", message: "The queue POS-80 (Copy 1) is gone." },
        404
      )
    );

    const error = await printAndCatch();

    expect(error.code).toBe("PRINTER_QUEUE_MISSING");
    expect(error.message).toBe("The queue POS-80 (Copy 1) is gone.");
  });

  it("carries the printers the agent offered", async () => {
    agentAnswers(async () =>
      jsonResponse(
        {
          code: "PRINTER_NOT_FOUND",
          message: "No printer named POS-80.",
          printers: [
            { id: "usbprint:abc", kind: "USB", name: "POS-80", connected: true, stale: false },
          ],
        },
        404
      )
    );

    const error = await printAndCatch();

    expect(error.printers).toEqual([
      expect.objectContaining({ name: "POS-80", id: "usbprint:abc" }),
    ]);
  });

  it("reports a dropped connection when the POST fails on the network", async () => {
    agentAnswers(async () => Promise.reject(networkError()));

    const error = await printAndCatch();

    expect(error.code).toBe("PRINT_AGENT_CONNECTION_LOST");
    expect(isPrintAgentConnectionError(error)).toBe(true);
  });

  it("reports the agent as unavailable when the probe did not find it", async () => {
    stubFetch(async () => Promise.reject(networkError()), async () => Promise.reject(networkError()));

    const error = await printAndCatch();

    expect(error.code).toBe("PRINT_AGENT_UNAVAILABLE");
    expect(error.message).toBe(PRINT_AGENT_UNAVAILABLE);
    expect(isPrintAgentConnectionError(error)).toBe(true);
  });

  it("keeps the probe's allowOrigins diagnosis instead of claiming the agent is missing", async () => {
    stubFetch(async () => jsonResponse({}, 403));

    const error = await printAndCatch();

    expect(error.code).toBe("PRINT_AGENT_UNAVAILABLE");
    expect(error.message).toContain("HTTP 403");
    expect(error.message).toContain("allowOrigins");
  });

  it("reports an incompatible agent with the contract detail", async () => {
    stubFetch(async () => jsonResponse(health({ contractVersion: 7 })));

    const error = await printAndCatch();

    expect(error.code).toBe("PRINT_AGENT_INCOMPATIBLE");
    expect(error.message).toContain("contract 7");
    expect(isPrintAgentConnectionError(error)).toBe(false);
  });

  it("marks a refusal by its HTTP status when the agent sends no code", async () => {
    agentAnswers(async () => jsonResponse({}, 403));

    const error = await printAndCatch();

    expect(error.code).toBe("ORIGIN_NOT_ALLOWED");
    expect(error.message).toContain("allowOrigins");
  });

  it("does not treat an operator error as a connection problem", () => {
    expect(isPrintAgentConnectionError(new Error("boom"))).toBe(false);
    expect(isPrintAgentConnectionError(new PrintAgentError("PRINTER_NOT_FOUND", "no"))).toBe(false);
  });
});

