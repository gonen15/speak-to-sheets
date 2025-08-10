import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";

const DatasetDetail = () => {
  const { t } = useI18n();
  const { id } = useParams();
  const { getDataset, syncDataset } = useDataStore();
  const ds = id ? getDataset(id) : undefined;

  if (!ds) return <main className="container mx-auto py-10">Dataset not found</main>;

  return (
    <main className="container mx-auto py-10">
      <PageMeta title={`Dataset — ${ds.name}`} description="Preview imported data and sync." path={`/datasets/${ds.id}`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{ds.name}</h1>
        <Button variant="outline" onClick={() => syncDataset(ds.id)} disabled={ds.status === "syncing"}>{t("syncNow")}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("preview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {ds.columns.map((c) => (
                    <th key={c} className="text-left py-2 pr-4 border-b">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ds.rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="border-b">
                    {ds.columns.map((c) => (
                      <td key={c} className="py-2 pr-4">{String(r[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default DatasetDetail;
