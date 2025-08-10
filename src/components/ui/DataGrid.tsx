import React from "react";
import { cn } from "@/lib/utils";

type Column = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  format?: (value: any) => string;
  className?: string;
};

type DataGridProps = {
  columns: Column[];
  data: Array<Record<string, any>>;
  stickyHeader?: boolean;
  summaryRow?: Record<string, any>;
  className?: string;
  emptyMessage?: string;
  maxHeight?: string;
};

const formatValue = (value: any, format?: (value: any) => string) => {
  if (format) return format(value);
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return new Intl.NumberFormat().format(value);
  return String(value);
};

export default function DataGrid({
  columns,
  data,
  stickyHeader = true,
  summaryRow,
  className,
  emptyMessage = "אין נתונים להצגה",
  maxHeight = "400px"
}: DataGridProps) {
  if (data.length === 0) {
    return (
      <div className={cn("julius-card p-8 text-center", className)}>
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={cn("julius-card overflow-hidden", className)}>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full">
          <thead
            className={cn(
              "bg-muted/30 border-b border-border",
              stickyHeader && "sticky top-0 z-10"
            )}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "julius-label text-left p-3 font-medium",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.className
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "p-3 text-sm",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.className
                    )}
                  >
                    {formatValue(row[col.key], col.format)}
                  </td>
                ))}
              </tr>
            ))}
            
            {summaryRow && (
              <tr className="border-t-2 border-border bg-muted/20 font-medium">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "p-3 text-sm font-medium",
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      col.className
                    )}
                  >
                    {formatValue(summaryRow[col.key], col.format)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}