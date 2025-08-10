import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const DashboardDetail = () => {
  const { t } = useI18n();
  const { id } = useParams();
  const { dashboards, datasets, semanticModels, aggregate } = useDataStore();
  const dashboard = dashboards.find((d) => d.id === id);

  const [datasetId, setDatasetId] = useState<string>(dashboard?.datasetId || datasets[0]?.id);
  const model = datasetId ? semanticModels[datasetId] : undefined;
  const [metricName, setMetricName] = useState<string>(model?.metrics[0]?.name || "Revenue");
  const [dimension, setDimension] = useState<string | undefined>(model?.dimensions[0]);

  const data = useMemo(() => datasetId && metricName ? aggregate({ datasetId, metricName, dimension }) : [], [datasetId, metricName, dimension]);

  return (
    <main className="container mx-auto py-10">
      <PageMeta title={`Dashboard — ${dashboard?.name || ''}`} description="Interactive dashboard with filters and charts." path={`/dashboards/${id}`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{dashboard?.name || "Dashboard"}</h1>
      </div>

      {model && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Select value={datasetId} onValueChange={(v) => setDatasetId(v)}>
            <SelectTrigger><SelectValue placeholder={t("selectDataset")} /></SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={metricName} onValueChange={(v) => setMetricName(v)}>
            <SelectTrigger><SelectValue placeholder={t("metrics")} /></SelectTrigger>
            <SelectContent>
              {model.metrics.map((m) => (<SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={dimension ?? "__none"} onValueChange={(v) => setDimension(v === "__none" ? undefined : v)}>
            <SelectTrigger><SelectValue placeholder={t("dimensions")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Time (month)</SelectItem>
              {model.dimensions.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{metricName} by {dimension || "month"}</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--brand))" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </main>
  );
};

export default DashboardDetail;
