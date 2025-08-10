import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";

const Dashboards = () => {
  const { t } = useI18n();
  const { dashboards } = useDataStore();

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — Dashboards" description="Create and view dashboards from your datasets." path="/dashboards" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{t("dashboards")}</h1>
        <Button variant="outline" disabled>New (soon)</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </main>
  );
};

export default Dashboards;
