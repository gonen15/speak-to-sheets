import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import { driveImport } from "@/lib/supabaseEdge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Datasets = () => {
  const { t } = useI18n();
  const { datasets, importCsvText, loadDemo } = useDataStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Import from Google Drive and CRM (Monday)

  const onImportDrive = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { folderUrl: { value: string } };
    const folderUrl = form.folderUrl.value.trim();
    if (!folderUrl) return;
    try {
      const res = await driveImport({ folderUrl });
      const files = (res.files || []).filter((f: any) => f.csv && !f.error);
      if (files.length === 0) {
        toast({ title: "לא נמצאו קבצי CSV/Sheets", description: "ודא שהתיקייה והקבצים משותפים כ-Anyone with the link – Viewer", variant: "destructive" as any });
        return;
      }
      for (const f of files) {
        importCsvText(f.name || "Drive CSV", f.csv, f.sourceUrl);
      }
      toast({ title: `Imported ${files.length} files`, description: "Drive folder import completed" });
    } catch (err: any) {
      toast({ title: "Import failed", description: String(err), variant: "destructive" as any });
    }
  };

  const onSyncMonday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { boardIds: { value: string } };
    const raw = form.boardIds.value.trim();
    const ids = raw
      ? raw
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
      : undefined;
    try {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; boards: number; items: number }>("monday-sync", {
        body: { boardIds: ids },
      });
      if (error || !data?.ok) throw new Error(error?.message || "Sync failed");
      toast({ title: "Monday synced", description: `${data.boards} boards • ${data.items} items` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: String(err), variant: "destructive" as any });
    }
  };
  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — Datasets" description="Import from Google Drive and sync CRM systems" path="/datasets" />
      <h1 className="text-2xl font-semibold mb-6">{t("datasets")}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Google Drive Folder</CardTitle>
            <CardDescription>Paste a shared folder URL to import all Google Sheets and CSV files.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onImportDrive}>
              <div className="space-y-2">
                <Label htmlFor="folderUrl">Folder URL</Label>
                <Input id="folderUrl" name="folderUrl" placeholder="https://drive.google.com/drive/folders/11uueYvA4ZMKzmnHWTS4YDGVJKuBYFSD8" />
              </div>
              <Button type="submit">Import from Drive</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CRM (Monday.com)</CardTitle>
            <CardDescription>Sync boards into the analytics tables. Optionally specify board IDs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSyncMonday}>
              <div className="space-y-2">
                <Label htmlFor="boardIds">Board IDs (optional)</Label>
                <Input id="boardIds" name="boardIds" placeholder="12345, 67890" />
              </div>
              <Button type="submit">Sync Monday CRM</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample dataset</CardTitle>
            <CardDescription>Load a ready-made demo CSV to explore the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              onClick={() => {
                loadDemo();
                toast({ title: "Sample dataset added", description: "Demo Ice Cream dataset was loaded" });
              }}
            >
              טען נתוני דוגמה
            </Button>
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
