import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  emptyState?: ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
};

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  className = "",
  onRowClick,
}: DataTableProps<T>) {
  const { t } = useTranslation();

  return (
    <div
      className={[
        "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      ].join(" ")}
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  "px-4 py-3.5 text-xs font-semibold uppercase tracking-wider",
                  "text-slate-600 bg-slate-50 border-b border-slate-200",
                  col.headerClassName ?? "",
                ].join(" ")}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center"
              >
                {emptyState ?? (
                  <div className="text-slate-400 text-sm">
                    {t("common.noDataAvailable")}
                  </div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row, rowIndex)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  "transition-colors duration-100",
                  // Zebra striping
                  rowIndex % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                  // Hover
                  "hover:bg-slate-50",
                  onRowClick ? "cursor-pointer" : "",
                ].join(" ")}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      "px-4 py-3 text-sm text-slate-700 border-b border-slate-100",
                      col.className ?? "",
                    ].join(" ")}
                  >
                    {col.render
                      ? col.render(row, rowIndex)
                      : (row[col.key] as ReactNode) ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

