import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";

const Datasets = () => {
  const { t } = useI18n();
  const { datasets, importCsvText } = useDataStore();
  const navigate = useNavigate();

  const onImportText = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { name: { value: string }; csv: { value: string } };
    const id = importCsvText(form.name.value || "CSV", form.csv.value);
    navigate(`/datasets/${id}`);
  };

  const onImportUrl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { name2: { value: string }; url: { value: string } };
    const res = await fetch(form.url.value);
    const text = await res.text();
    const id = importCsvText(form.name2.value || "CSV", text, form.url.value);
    navigate(`/datasets/${id}`);
  };

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — Datasets" description="Import CSV or Google Sheets (as CSV) and preview data." path="/datasets" />
      <h1 className="text-2xl font-semibold mb-6">{t("datasets")}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("pasteCsv")}</CardTitle>
            <CardDescription>Header row required</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onImportText}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" name="name" placeholder="My Dataset" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csv">{t("pasteCsv")}</Label>
                <Textarea id="csv" name="csv" rows={8} placeholder="col1,col2\nval1,val2" />
              </div>
              <Button type="submit">{t("importCsv")}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("csvUrl")}</CardTitle>
            <CardDescription>Google Sheets: File → Share → Publish to the web → CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onImportUrl}>
              <div className="space-y-2">
                <Label htmlFor="name2">{t("name")}</Label>
                <Input id="name2" name="name2" placeholder="Marketing Data" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">{t("csvUrl")}</Label>
                <Input id="url" name="url" placeholder="https://.../pub?output=csv" />
              </div>
              <Button type="submit">{t("importCsv")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-3">{t("preview")}</h2>
        <ul className="space-y-2">
          {datasets.map((d) => (
            <li key={d.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-muted-foreground">{d.rows.length} rows</div>
              </div>
              <Button asChild variant="outline"><a href={`/datasets/${d.id}`}>Open</a></Button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
};

export default Datasets;
