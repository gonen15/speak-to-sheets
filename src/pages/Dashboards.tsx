import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import { supabase } from "@/integrations/supabase/client";
const Dashboards = () => {
  const { t } = useI18n();
  const { dashboards } = useDataStore();

  const [uploadedDatasets, setUploadedDatasets] = useState<Array<{ id: string; name: string; row_count: number }>>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("uploaded_datasets")
        .select("id,name,row_count,created_at")
        .order("created_at", { ascending: false });
      if (!error && isMounted) setUploadedDatasets((data as any) || []);
    })();
    return () => { isMounted = false; };
  }, []);

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — Dashboards" description="Create and view dashboards from your datasets." path="/dashboards" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t("dashboards")}</h1>
        <Button variant="outline" disabled>New (soon)</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to={`/dashboards/master`}>
          <Card>
            <CardHeader>
              <CardTitle>Master Dashboard</CardTitle>
              <CardDescription>Unified KPIs across all sources</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Open central master dashboard</p>
            </CardContent>
          </Card>
        </Link>
        {dashboards.map((d) => (
          <Link to={`/dashboards/${d.id}`} key={d.id}>
            <Card>
              <CardHeader>
                <CardTitle>{d.name}</CardTitle>
                <CardDescription>Dataset: {d.datasetId || "—"}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Open to explore.</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {dashboards.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No dashboards yet</CardTitle>
              <CardDescription>Load the demo to see one instantly.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {uploadedDatasets.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Uploaded datasets</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedDatasets.map((ds) => (
              <Link to={`/dashboards/dataset/${ds.id}`} key={ds.id}>
                <Card>
                  <CardHeader>
                    <CardTitle>{ds.name}</CardTitle>
                    <CardDescription>{ds.row_count ?? 0} rows</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Open dataset dashboard</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
};

export default Dashboards;
