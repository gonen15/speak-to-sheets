import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";

const Chat = () => {
  const { t } = useI18n();
  const { datasets, semanticModels, aggregate } = useDataStore();
  const [datasetId] = useState<string>(datasets[0]?.id);
  const model = datasetId ? semanticModels[datasetId] : undefined;
  const [question, setQuestion] = useState("");
  const [sql, setSql] = useState<string>("");
  const [ran, setRan] = useState(false);

  const data = useMemo(() => (ran && model) ? aggregate({ datasetId, metricName: model.metrics[0]?.name || "Revenue", dimension: model.dimensions[0] }) : [], [ran, model]);

  const draftSql = () => {
    if (!model) return;
    const table = `data_${datasetId}`;
    const metric = model.metrics[0];
    const dim = model.dimensions[0] || (model.dateColumn ? `date_trunc('month', ${model.dateColumn})` : undefined);
    const sqlText = `SELECT ${dim ? `${dim} AS bucket, ` : ''}${metric.expression.replace(/sum\(/g, 'SUM(')} AS value FROM ${table}${dim ? ` GROUP BY 1 ORDER BY 1` : ''} LIMIT 1000;`;
    setSql(sqlText);
    setRan(false);
  };

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — ChatSQL" description="Ask in natural language, preview SQL, then execute safely." path="/chat" />
      <h1 className="text-2xl font-semibold mb-6">{t("chat")}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("ask")}</CardTitle>
            <CardDescription>Preview before run</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={6} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="לדוגמה: השווה GM% בין מותגים ברוסיה ביוני 2025" />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={draftSql}>Draft SQL</Button>
              <Button onClick={() => setRan(true)} disabled={!sql}>{t("run")}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("sqlPreview")}</CardTitle>
            <CardDescription>needsApproval: true</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-3 rounded-md overflow-auto"><code>{sql || "-- Draft SQL will appear here"}</code></pre>
          </CardContent>
        </Card>
      </div>

      {ran && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("results")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-4 border-b">bucket</th>
                    <th className="text-left py-2 pr-4 border-b">value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.key} className="border-b"><td className="py-2 pr-4">{r.key}</td><td className="py-2 pr-4">{r.value.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
};

export default Chat;
