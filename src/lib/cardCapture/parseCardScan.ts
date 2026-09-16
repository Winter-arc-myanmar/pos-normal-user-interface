const MIN_UID_LENGTH = 4;

function fromTrack(raw: string): string | null {
  const track2 = raw.match(/;([0-9]{4,19})(?:[=?]|[\s]|$)/);
  if (track2?.[1]) return track2[1];
  const track1 = raw.match(/%B([0-9]{4,19})/);
  if (track1?.[1]) return track1[1];
  return null;
}

function fromNfcRecord(record: {
  recordType?: string;
  data?: BufferSource;
  encoding?: string;
}): string | null {
  if (!record.data) return null;
  try {
    const decoder = new TextDecoder(record.encoding || "utf-8");
    const text = decoder.decode(record.data).trim();
    return text ? parseCardScan(text) : null;
  } catch {
    return null;
  }
}

export function parseCardScan(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const track = fromTrack(trimmed);
  if (track) return track;

  if (/^[0-9A-Fa-f][0-9A-Fa-f:\-\s]*$/.test(trimmed) && /[:\-\s]/.test(trimmed)) {
    const hex = trimmed.replace(/[:\-\s]/g, "").toUpperCase();
    return hex.length >= MIN_UID_LENGTH ? hex : "";
  }

  const compact = trimmed.replace(/\s+/g, "").toUpperCase();
  return compact.length >= MIN_UID_LENGTH ? compact : "";
}

export function parseNfcReading(reading: {
  serialNumber?: string;
  message?: {
    records?: Array<{
      recordType?: string;
      data?: BufferSource;
      encoding?: string;
    }>;
  };
}): string {
  const serial = parseCardScan(reading.serialNumber || "");
  if (serial) return serial;

  const records = reading.message?.records || [];
  for (const record of records) {
    const fromRecord = fromNfcRecord(record);
    if (fromRecord) return fromRecord;
  }
  return "";
}

export const CARD_SCAN_MIN_LENGTH = MIN_UID_LENGTH;
export const CARD_SCAN_KEY_GAP_MS = 50;
export const CARD_SCAN_FLUSH_MS = 120;
