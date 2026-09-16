import { useCallback, useEffect, useRef, useState } from "react";
import {
  CARD_SCAN_FLUSH_MS,
  CARD_SCAN_KEY_GAP_MS,
  CARD_SCAN_MIN_LENGTH,
  parseCardScan,
  parseNfcReading,
} from "@/lib/cardCapture/parseCardScan";

type NfcReadingEvent = {
  serialNumber?: string;
  message?: {
    records?: Array<{
      recordType?: string;
      data?: BufferSource;
      encoding?: string;
    }>;
  };
};

type NfcReader = {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  addEventListener: (
    type: "reading",
    listener: (event: NfcReadingEvent) => void
  ) => void;
  removeEventListener: (
    type: "reading",
    listener: (event: NfcReadingEvent) => void
  ) => void;
};

function getNdefConstructor(): (new () => NfcReader) | null {
  const ctor = (window as unknown as { NDEFReader?: new () => NfcReader })
    .NDEFReader;
  return ctor || null;
}

function isPasswordField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLInputElement)) return false;
  return target.type === "password";
}

interface UseCardCaptureOptions {
  enabled?: boolean;
  onRead: (uid: string) => void;
}

interface UseCardCaptureReturn {
  nfcSupported: boolean;
  nfcActive: boolean;
  nfcError: string | null;
  lastUid: string;
  startNfc: () => Promise<void>;
}

export function useCardCapture({
  enabled = true,
  onRead,
}: UseCardCaptureOptions): UseCardCaptureReturn {
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [lastUid, setLastUid] = useState("");
  const nfcAbortRef = useRef<AbortController | null>(null);

  const emit = useCallback((uid: string) => {
    const parsed = parseCardScan(uid);
    if (!parsed) return;
    setLastUid(parsed);
    onReadRef.current(parsed);
  }, []);

  useEffect(() => {
    setNfcSupported(Boolean(getNdefConstructor()));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let buffer = "";
    let lastAt = 0;
    let flushTimer = 0;

    const reset = () => {
      buffer = "";
      lastAt = 0;
      window.clearTimeout(flushTimer);
    };

    const flush = () => {
      const snapshot = buffer;
      reset();
      if (snapshot.length >= CARD_SCAN_MIN_LENGTH) emit(snapshot);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
        return;
      }
      if (isPasswordField(event.target)) return;

      const now = Date.now();
      if (event.key === "Enter") {
        const looksLikeScan =
          buffer.length >= CARD_SCAN_MIN_LENGTH &&
          lastAt > 0 &&
          now - lastAt <= CARD_SCAN_KEY_GAP_MS * 4;
        if (looksLikeScan) {
          event.preventDefault();
          event.stopPropagation();
          flush();
          return;
        }
        reset();
        return;
      }

      if (event.key.length !== 1) {
        if (event.key !== "Shift") reset();
        return;
      }

      if (lastAt && now - lastAt > CARD_SCAN_KEY_GAP_MS * 2) {
        buffer = "";
      }

      const isBurst = lastAt > 0 && now - lastAt <= CARD_SCAN_KEY_GAP_MS;
      buffer += event.key;
      lastAt = now;

      if (isBurst || buffer.length >= CARD_SCAN_MIN_LENGTH) {
        event.preventDefault();
        event.stopPropagation();
      }

      window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(flush, CARD_SCAN_FLUSH_MS);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.clearTimeout(flushTimer);
    };
  }, [emit, enabled]);

  const stopNfc = useCallback(() => {
    nfcAbortRef.current?.abort();
    nfcAbortRef.current = null;
    setNfcActive(false);
  }, []);

  const startNfc = useCallback(async () => {
    const Ctor = getNdefConstructor();
    if (!Ctor) {
      setNfcSupported(false);
      return;
    }

    stopNfc();
    const abort = new AbortController();
    nfcAbortRef.current = abort;
    setNfcError(null);

    try {
      const reader = new Ctor();
      const onReading = (event: NfcReadingEvent) => {
        const uid = parseNfcReading(event);
        if (uid) emit(uid);
      };
      reader.addEventListener("reading", onReading);
      await reader.scan({ signal: abort.signal });
      setNfcActive(true);
      abort.signal.addEventListener(
        "abort",
        () => reader.removeEventListener("reading", onReading),
        { once: true }
      );
    } catch (caught) {
      if (abort.signal.aborted) return;
      setNfcActive(false);
      setNfcError(
        caught instanceof Error ? caught.message : "Unable to start NFC scanning."
      );
    }
  }, [emit, stopNfc]);

  useEffect(() => {
    if (!enabled) {
      stopNfc();
      return;
    }
    void startNfc();
    return () => stopNfc();
  }, [enabled, startNfc, stopNfc]);

  return {
    nfcSupported,
    nfcActive,
    nfcError,
    lastUid,
    startNfc,
  };
}
