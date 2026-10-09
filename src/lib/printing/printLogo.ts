import type { PrintPaperWidth } from "@/core/domain/entities/PrintTemplate";
import { ditherToImage, imageRuns, PrintImage } from "./printImage";

/** Dots across the roll: 576 on 80mm paper, 384 on 58mm. */
const PAPER_DOTS: Record<PrintPaperWidth, number> = { MM80: 576, MM58: 384 };
const MAX_HEIGHT = 160;

/** How big a logo prints: half the roll at most, and never taller than 160 dots. */
export function logoSize(
  width: number,
  height: number,
  paperWidth: PrintPaperWidth = "MM80"
): { width: number; height: number } {
  const maxWidth = Math.round(PAPER_DOTS[paperWidth] * 0.5);
  const scale = Math.min(1, maxWidth / width, MAX_HEIGHT / height);
  return {
    width: Math.max(8, Math.round((width * scale) / 8) * 8),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const toSrc = (image: PrintImage) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, image.width, image.height);
  context.fillStyle = "#000";
  for (const run of imageRuns(image)) context.fillRect(run.x, run.y, run.width, 1);
  return canvas.toDataURL("image/png");
};

async function loadLogo(url: string, paperWidth: PrintPaperWidth): Promise<PrintImage | null> {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) return null;
  const bitmap = await createImageBitmap(await response.blob());
  const size = logoSize(bitmap.width, bitmap.height, paperWidth);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  const pixels = context.getImageData(0, 0, size.width, size.height);
  const image = ditherToImage(pixels.data, size.width, size.height);
  return { ...image, src: toSrc(image) };
}

const logos = new Map<string, Promise<PrintImage | null>>();

/**
 * The tenant's logo as printer dots, loaded once per address and paper width.
 * Null when it cannot be read - the host refuses this origin, it is not a
 * picture, or there is no canvas - and the slip prints without it.
 */
export function printLogoFor(
  url: string,
  paperWidth: PrintPaperWidth = "MM80"
): Promise<PrintImage | null> {
  const key = `${paperWidth} ${url}`;
  let logo = logos.get(key);
  if (!logo) {
    logo = loadLogo(url, paperWidth).catch(() => {
      logos.delete(key);
      return null;
    });
    logos.set(key, logo);
  }
  return logo;
}
