import type { CSSProperties } from "react";
import type { SlipPreview as Slip, SlipPreviewRow } from "@/lib/printing/formatKdsTicket";
import { iconImage, imageRuns, PrintIcon, PrintImage } from "@/lib/printing/printImage";

const LINE = 16;
const FONT = 12;

const justify = { left: "flex-start", center: "center", right: "flex-end" } as const;

function TextRow({ row }: { row: Extract<SlipPreviewRow, { kind: "text" }> }) {
  const wide = row.size === "wide" || row.size === "huge";
  const tall = row.size === "tall" || row.size === "huge";
  const stretch: CSSProperties["transform"] =
    wide && !tall ? "scaleY(0.5)" : tall && !wide ? "scaleY(2)" : undefined;
  return (
    <div
      className={row.invert ? "bg-slate-900 text-white" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: justify[row.align],
        height: tall ? LINE * 2 : LINE,
        fontWeight: row.bold ? 700 : 400,
      }}
    >
      <span
        style={{
          display: "inline-block",
          whiteSpace: "pre",
          fontSize: wide ? FONT * 2 : FONT,
          lineHeight: `${wide ? LINE * 2 : LINE}px`,
          transform: stretch,
        }}
      >
        {row.text}
      </span>
    </div>
  );
}

/** Dots drawn as they print: the picture's own image, or its runs as an SVG. */
function Dots({ image, label, height }: { image: PrintImage; label: string; height?: number }) {
  const size = height
    ? { height, width: (height * image.width) / image.height }
    : { width: "100%", height: "auto" };
  if (image.src) {
    return <img src={image.src} alt={label} style={{ ...size, imageRendering: "pixelated" }} />;
  }
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${image.width} ${image.height}`}
      style={size}
      shapeRendering="crispEdges"
    >
      {imageRuns(image).map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} />
      ))}
    </svg>
  );
}

const iconLabel: Record<PrintIcon, string> = { phone: "Phone", email: "Email" };

/** Dots across the paper, against which a picture's width is drawn. */
const PAPER_DOTS: Record<number, number> = { 48: 576, 32: 384 };

/** A slip drawn the way the thermal printer prints it, row for row. */
export function SlipPreview({ slip }: { slip: Slip }) {
  return (
    <div
      data-testid="slip-preview"
      className="mx-auto overflow-hidden bg-white px-3 py-4 font-mono text-slate-900 shadow"
      style={{ width: `calc(${slip.columns}ch + 1.5rem)`, fontSize: FONT }}
    >
      {slip.rows.map((row, index) =>
        row.kind === "gap" ? (
          <div key={index} style={{ height: LINE }} />
        ) : row.kind === "image" ? (
          <div key={index} data-testid="slip-logo" style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: `${(row.image.width / (PAPER_DOTS[slip.columns] || 576)) * 100}%` }}>
              <Dots image={row.image} label="Logo" />
            </div>
          </div>
        ) : row.kind === "contact" ? (
          <div
            key={index}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, height: LINE }}
          >
            <Dots image={iconImage(row.icon)} label={iconLabel[row.icon]} height={LINE} />
            <span style={{ whiteSpace: "pre", lineHeight: `${LINE}px` }}>{row.text}</span>
          </div>
        ) : row.kind === "rule" ? (
          <div key={index} style={{ height: LINE, lineHeight: `${LINE}px`, whiteSpace: "pre" }}>
            {row.text}
          </div>
        ) : (
          <TextRow key={index} row={row} />
        )
      )}
    </div>
  );
}
