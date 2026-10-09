/**
 * Printer bytes from a command string. Each character up to 0xFF is one byte,
 * so the raw bytes of a logo or icon reach the printer as they are; anything
 * beyond (Burmese text) goes as UTF-8.
 */
export const encodeEscPos = (value: string): Uint8Array => {
  const bytes: number[] = [];
  const utf8 = new TextEncoder();
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code <= 0xff) bytes.push(code);
    else bytes.push(...utf8.encode(char));
  }
  return Uint8Array.from(bytes);
};

export const escPosHex = (value: string): string =>
  Array.from(encodeEscPos(value), (byte) => byte.toString(16).padStart(2, "0")).join("");

export const escPosToBase64 = (value: string): string => {
  const bytes = encodeEscPos(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

export const chunkBytes = (bytes: Uint8Array, size = 512): Uint8Array[] => {
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.length; offset += size) {
    chunks.push(bytes.subarray(offset, offset + size));
  }
  return chunks;
};
