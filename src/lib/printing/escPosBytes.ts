export const encodeEscPos = (value: string): Uint8Array =>
  new TextEncoder().encode(value);

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
