import React, { useState } from "react";
import { Calendar, Building, User, RefreshCw, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import PillFilters from "./PillFilters";

type FilterBarProps = {
  period?: string;
  onPeriodChange?: (value: string) => void;
  department?: string;
  onDepartmentChange?: (value: string) => void;
  entity?: string;
  onEntityChange?: (value: string) => void;
  onApply?: () => void;
  onReset?: () => void;
  onSave?: () => void;
  loading?: boolean;
  className?: string;
};

const periodOptions = [
  { label: "רבעון נוכחי", value: "current_quarter" },
  { label: "שנה עד כה", value: "ytd" },
  { label: "90 יום", value: "90d" },
  { label: "30 יום", value: "30d" }
];

const departmentOptions = [
  { label: "כל המחלקות", value: "all" },
  { label: "מכירות", value: "sales" },
  { label: "כספים", value: "finance" },
  { label: "שיווק", value: "marketing" }
];

export default function GlobalFilterBar({
  period = "current_quarter",
  onPeriodChange,
  department = "all",
  onDepartmentChange,
  entity = "",
  onEntityChange,
  onApply,
  onReset,
  onSave,
  loading = false,
  className
}: FilterBarProps) {
  const [localEntity, setLocalEntity] = useState(entity);

  const handleEntitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEntityChange?.(localEntity);
  };

  return (
    <div className={cn("julius-card p-4", className)}>
      <div className="julius-grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Period Filter */}
        <div>
          <label className="julius-label mb-2 block">תקופה</label>
          <PillFilters
            options={periodOptions}
            value={period}
            onChange={(v) => onPeriodChange?.(v)}
          />
        </div>

        {/* Department Filter */}
        <div>
          <label className="julius-label mb-2 block">מחלקה</label>
          <PillFilters
            options={departmentOptions}
            value={department}
            onChange={(v) => onDepartmentChange?.(v)}
          />
        </div>

        {/* Entity Search */}
        <div>
          <label className="julius-label mb-2 block">ישות</label>
          <form onSubmit={handleEntitySubmit} className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={localEntity}
                onChange={(e) => setLocalEntity(e.target.value)}
                placeholder="חפש לקוח, ספק..."
                className="julius-input pl-10 w-full"
              />
            </div>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex items-end gap-2">
          <button
            onClick={onApply}
            disabled={loading}
            className="julius-btn primary flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            החל
          </button>
          
          {onReset && (
            <button onClick={onReset} className="julius-btn flex items-center gap-2">
              <X className="h-4 w-4" />
              איפוס
            </button>
          )}
          
          {onSave && (
            <button onClick={onSave} className="julius-btn flex items-center gap-2">
              <Save className="h-4 w-4" />
              שמור
            </button>
          )}
        </div>
      </div>
    </div>
  );
}