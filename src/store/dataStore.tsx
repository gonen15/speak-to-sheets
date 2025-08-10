import React, { createContext, useContext, useMemo, useState } from "react";
import Papa from "papaparse";

export type Row = Record<string, any>;

export type Dataset = {
  id: string;
  name: string;
  sourceType: "csv";
  sourceUrl?: string;
  columns: string[];
  rows: Row[];
  lastSyncAt?: string;
  status?: "ready" | "syncing" | "error";
};

export type MetricFormat = "number" | "currency" | "percent";

export type MetricDef = {
  id: string;
  name: string;
  expression: string; // e.g., sum(revenue) - sum(cost)
  format: MetricFormat;
};

export type SemanticModel = {
  datasetId: string;
  dateColumn?: string;
  dimensions: string[];
  metrics: MetricDef[];
};

export type Dashboard = { id: string; name: string; datasetId?: string };

interface DataStoreContextType {
  datasets: Dataset[];
  dashboards: Dashboard[];
  semanticModels: Record<string, SemanticModel>;
  loadDemo: () => void;
  importCsvText: (name: string, csvText: string, sourceUrl?: string) => string; // returns datasetId
  getDataset: (id: string) => Dataset | undefined;
  saveModel: (model: SemanticModel) => void;
  aggregate: (params: { datasetId: string; metricName: string; dimension?: string }) => { key: string; value: number }[];
}

const DataStoreContext = createContext<DataStoreContextType | null>(null);

const DEMO_CSV = `date,brand,channel,country,revenue,cost,units
2025-05-01,FRANUI,Quick Commerce,RU,12500,7800,940
2025-05-02,FRANUI,Retail,RU,8700,5600,600
2025-05-03,MINI MELTS,Retail,IL,5400,3300,410
2025-06-01,FRANUI,Quick Commerce,RU,14200,8800,1020
2025-06-05,FRANUI,Retail,RU,9100,5900,640
2025-06-07,MINI MELTS,Retail,IL,6200,3700,480
2025-07-01,FRANUI,Quick Commerce,RU,15800,9700,1090
2025-07-06,FRANUI,Retail,RU,9800,6200,680
2025-07-08,MINI MELTS,Retail,IL,6600,3900,500`;

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function parseCsv(csvText: string): { rows: Row[]; columns: string[] } {
  const res = Papa.parse<Row>(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const rows = (res.data as Row[]).filter((r) => Object.values(r).some((v) => v !== null && v !== undefined && `${v}`.trim() !== ""));
  const columns = (res.meta.fields || Object.keys(rows[0] || {})).map(String);
  return { rows, columns };
}

function defaultModel(datasetId: string, columns: string[]): SemanticModel {
  const dateColumn = columns.includes("date") ? "date" : columns.find((c) => /date/i.test(c));
  const dims = ["brand", "channel", "country"].filter((d) => columns.includes(d));
  const metrics: MetricDef[] = [];
  const has = (c: string) => columns.includes(c);
  if (has("revenue")) metrics.push({ id: genId("m"), name: "Revenue", expression: "sum(revenue)", format: "currency" });
  if (has("cost")) metrics.push({ id: genId("m"), name: "Cost", expression: "sum(cost)", format: "currency" });
  if (has("units")) metrics.push({ id: genId("m"), name: "Units", expression: "sum(units)", format: "number" });
  if (has("revenue") && has("cost")) {
    metrics.push({ id: genId("m"), name: "Gross Margin", expression: "sum(revenue) - sum(cost)", format: "currency" });
    metrics.push({ id: genId("m"), name: "GM%", expression: "(sum(revenue) - sum(cost)) / sum(revenue)", format: "percent" });
  }
  return { datasetId, dateColumn, dimensions: dims, metrics };
}

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [semanticModels, setSemanticModels] = useState<Record<string, SemanticModel>>({});

  const importCsvText = (name: string, csvText: string, sourceUrl?: string) => {
    const { rows, columns } = parseCsv(csvText);
    const id = genId("ds");
    const ds: Dataset = { id, name, sourceType: "csv", sourceUrl, columns, rows, status: "ready", lastSyncAt: new Date().toISOString() };
    setDatasets((prev) => [ds, ...prev]);
    setSemanticModels((prev) => ({ ...prev, [id]: defaultModel(id, columns) }));
    return id;
  };

  const loadDemo = () => {
    const datasetId = importCsvText("Demo Ice Cream", DEMO_CSV);
    setDashboards((prev) => [{ id: genId("db"), name: "Demo Dashboard", datasetId }, ...prev]);
  };

  const getDataset = (id: string) => datasets.find((d) => d.id === id);

  const saveModel = (model: SemanticModel) => {
    setSemanticModels((prev) => ({ ...prev, [model.datasetId]: model }));
  };

  function safeEvalExpression(expr: string): number {
    // Allow only numbers, operators and dots
    if (!/^[-+*/(). 0-9]+$/.test(expr)) return 0;
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expr});`);
      const v = fn();
      return typeof v === "number" && isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  }

  const aggregate: DataStoreContextType["aggregate"] = ({ datasetId, metricName, dimension }) => {
    const ds = getDataset(datasetId);
    if (!ds) return [];
    const model = semanticModels[datasetId];
    const metric = model?.metrics.find((m) => m.name === metricName);
    if (!metric) return [];

    const dim = dimension && ds.columns.includes(dimension) ? dimension : undefined;
    const groups = new Map<string, Row[]>();
    const keyFor = (row: Row) => {
      if (!dim && model?.dateColumn && row[model.dateColumn]) {
        const d = new Date(row[model.dateColumn]);
        if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // month bucket
      }
      return dim ? String(row[dim] ?? "-") : "Total";
    };
    ds.rows.forEach((r) => {
      const k = keyFor(r);
      const arr = groups.get(k) || [];
      arr.push(r);
      groups.set(k, arr);
    });

    const result: { key: string; value: number }[] = [];
    groups.forEach((rows, key) => {
      const sums: Record<string, number> = {};
      rows.forEach((r) => {
        Object.entries(r).forEach(([c, v]) => {
          if (typeof v === "number") sums[c] = (sums[c] || 0) + v;
        });
      });
      let expr = metric.expression.replace(/sum\(([^)]+)\)/g, (_, col) => String(sums[col.trim()] ?? 0));
      expr = expr.replace(/[^0-9+\-*/(). ]/g, "");
      const value = safeEvalExpression(expr);
      result.push({ key, value });
    });

    return result.sort((a, b) => a.key.localeCompare(b.key));
  };

  const value = useMemo<DataStoreContextType>(
    () => ({ datasets, dashboards, semanticModels, loadDemo, importCsvText, getDataset, saveModel, aggregate }),
    [datasets, dashboards, semanticModels]
  );

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
};

export const useDataStore = () => {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
};
