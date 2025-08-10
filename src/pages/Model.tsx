import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { MetricDef, SemanticModel, useDataStore } from "@/store/dataStore";

const Model = () => {
  const { t } = useI18n();
  const { datasets, semanticModels, saveModel } = useDataStore();
  const [datasetId, setDatasetId] = useState<string>(datasets[0]?.id);
  const model = datasetId ? semanticModels[datasetId] : undefined;
  const [localModel, setLocalModel] = useState<SemanticModel | undefined>(model);

  const selectedDataset = useMemo(() => datasets.find((d) => d.id === datasetId), [datasets, datasetId]);

  const onAddMetric = () => {
    if (!localModel) return;
    const newMetric: MetricDef = { id: Math.random().toString(36).slice(2), name: "New Metric", expression: "sum(revenue)", format: "number" };
    setLocalModel({ ...localModel, metrics: [...localModel.metrics, newMetric] });
  };

  const onSave = () => {
    if (localModel) saveModel(localModel);
  };

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — Semantic Model" description="Define date column, dimensions and metrics for your dataset." path="/model" />
      <h1 className="text-2xl font-semibold mb-6">{t("model")}</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t("selectDataset")}</CardTitle>
            <CardDescription>Model is saved per dataset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={datasetId} onValueChange={(v) => { setDatasetId(v); setLocalModel(semanticModels[v]); }}>
              <SelectTrigger><SelectValue placeholder={t("selectDataset")} /></SelectTrigger>
              <SelectContent>
                {datasets.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
            {selectedDataset && localModel && (
              <div className="space-y-3">
                <Label>{t("dateColumn")}</Label>
                <Select value={localModel.dateColumn} onValueChange={(v) => setLocalModel({ ...localModel, dateColumn: v })}>
                  <SelectTrigger><SelectValue placeholder={t("dateColumn")} /></SelectTrigger>
                  <SelectContent>
                    {selectedDataset.columns.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("metrics")}</CardTitle>
            <CardDescription>sum(col), avg(col) + arithmetic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {localModel?.metrics.map((m, idx) => (
              <div key={m.id} className="grid md:grid-cols-3 gap-3 items-center">
                <Input value={m.name} onChange={(e) => {
                  const next = [...(localModel?.metrics || [])];
                  next[idx] = { ...m, name: e.target.value };
                  setLocalModel({ ...localModel!, metrics: next });
                }} />
                <Input value={m.expression} onChange={(e) => {
                  const next = [...(localModel?.metrics || [])];
                  next[idx] = { ...m, expression: e.target.value };
                  setLocalModel({ ...localModel!, metrics: next });
                }} />
                <Select value={m.format} onValueChange={(v) => {
                  const next = [...(localModel?.metrics || [])];
                  next[idx] = { ...m, format: v as any };
                  setLocalModel({ ...localModel!, metrics: next });
                }}>
                  <SelectTrigger><SelectValue placeholder={t("format")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="currency">currency</SelectItem>
                    <SelectItem value="percent">percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onAddMetric}>{t("addMetric")}</Button>
              <Button onClick={onSave}>{t("save")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Model;
