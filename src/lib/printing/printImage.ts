const ESC = "\x1b";
const GS = "\x1d";

/**
 * A picture as printer dots: one bit a dot, each row packed eight dots to a
 * byte with the leftmost dot in the high bit, as ESC/POS raster commands take it.
 */
export interface PrintImage {
  width: number;
  height: number;
  bits: Uint8Array;
  /** The same dots as an image URL, for a preview; only where a canvas exists. */
  src?: string;
}

export type PrintIcon = "phone" | "email";

const ICON_ROWS: Record<PrintIcon, string[]> = {
  phone: [
    "........................",
    ".....##.................",
    "...######...............",
    "...######...............",
    "..########..............",
    "..########..............",
    "...######...............",
    "...######...............",
    "...####.................",
    "...####.................",
    "...####.................",
    "...####.................",
    "....####................",
    "....#####...............",
    "....#####...............",
    ".....#####.........##...",
    "......######.....######.",
    ".......######....######.",
    "........################",
    ".........###############",
    "..........#############.",
    ".............##########.",
    "...................##...",
    "........................",
  ],
  email: [
    "........................",
    "........................",
    "........................",
    "........................",
    ".######################.",
    ".######################.",
    ".####..............####.",
    ".##.##............##.##.",
    ".##..##..........##..##.",
    ".##...##........##...##.",
    ".##....##......##....##.",
    ".##.....##....##.....##.",
    ".##......##..##......##.",
    ".##.......####.......##.",
    ".##........##........##.",
    ".##..................##.",
    ".##..................##.",
    ".##..................##.",
    ".######################.",
    ".######################.",
    "........................",
    "........................",
    "........................",
    "........................",
  ],
};

const bytesPerRow = (width: number) => Math.ceil(width / 8);

export function isDot(image: PrintImage, x: number, y: number): boolean {
  const byte = image.bits[y * bytesPerRow(image.width) + (x >> 3)];
  return Boolean(byte & (0x80 >> (x & 7)));
}

/** A picture drawn as text, "#" for a dot. */
export function imageFromRows(rows: string[]): PrintImage {
  const width = rows[0]?.length || 0;
  const stride = bytesPerRow(width);
  const bits = new Uint8Array(stride * rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x += 1) {
      if (row[x] === "#") bits[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
    }
  });
  return { width, height: rows.length, bits };
}

export const iconImage = (icon: PrintIcon) => imageFromRows(ICON_ROWS[icon]);

/**
 * Turns RGBA pixels into dots, spreading each pixel's error to its neighbours
 * (Floyd-Steinberg) so greys and photos keep their shading. Transparent
 * pixels count as the paper.
 */
export function ditherToImage(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): PrintImage {
  const grey = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const alpha = rgba[i * 4 + 3] / 255;
    const luminance =
      0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    grey[i] = luminance * alpha + 255 * (1 - alpha);
  }
  const stride = bytesPerRow(width);
  const bits = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const dark = grey[i] < 128;
      if (dark) bits[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
      const error = grey[i] - (dark ? 0 : 255);
      if (x + 1 < width) grey[i + 1] += (error * 7) / 16;
      if (y + 1 < height) {
        if (x > 0) grey[i + width - 1] += (error * 3) / 16;
        grey[i + width] += (error * 5) / 16;
        if (x + 1 < width) grey[i + width + 1] += error / 16;
      }
    }
  }
  return { width, height, bits };
}

const byteText = (bytes: ArrayLike<number>) => {
  let text = "";
  for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]);
  return text;
};

/** Rows sent per raster command: small printers drop a long one. */
const BAND = 64;

/** GS v 0: prints the picture on lines of its own, in bands. */
export function rasterCommand(image: PrintImage): string {
  const stride = bytesPerRow(image.width);
  let out = "";
  for (let top = 0; top < image.height; top += BAND) {
    const rows = Math.min(BAND, image.height - top);
    out +=
      `${GS}v0\x00` +
      String.fromCharCode(stride & 0xff, stride >> 8, rows & 0xff, rows >> 8) +
      byteText(image.bits.subarray(top * stride, (top + rows) * stride));
  }
  return out;
}

/**
 * ESC * 33: a 24-dot-high picture that sits inside a line of text, so an icon
 * prints beside the words that follow it. Each column is three bytes, top first.
 */
export function inlineIconCommand(icon: PrintIcon): string {
  const image = iconImage(icon);
  const columns: number[] = [];
  for (let x = 0; x < image.width; x += 1) {
    for (let band = 0; band < 3; band += 1) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        const y = band * 8 + bit;
        if (y < image.height && isDot(image, x, y)) byte |= 0x80 >> bit;
      }
      columns.push(byte);
    }
  }
  return `${ESC}*\x21${String.fromCharCode(image.width & 0xff, image.width >> 8)}${byteText(columns)}`;
}

/** The dots as horizontal runs, to draw a preview without a canvas. */
export function imageRuns(image: PrintImage): Array<{ x: number; y: number; width: number }> {
  const runs: Array<{ x: number; y: number; width: number }> = [];
  for (let y = 0; y < image.height; y += 1) {
    let start = -1;
    for (let x = 0; x <= image.width; x += 1) {
      const dot = x < image.width && isDot(image, x, y);
      if (dot && start < 0) start = x;
      if (!dot && start >= 0) {
        runs.push({ x: start, y, width: x - start });
        start = -1;
      }
    }
  }
  return runs;
}
