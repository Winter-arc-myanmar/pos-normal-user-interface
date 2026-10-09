import type { CSSProperties } from "react";
import type { SlipPreview as Slip, SlipPreviewRow } from "@/lib/printing/formatKdsTicket";

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
