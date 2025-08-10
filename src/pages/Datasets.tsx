import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageMeta from "@/components/common/PageMeta";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { normalizeFileName } from "@/lib/fileHash";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import { driveImport } from "@/lib/supabaseEdge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { datasetReplace } from "@/lib/supabaseEdge";

const Datasets = () => {
  const { t } = useI18n();
  const { datasets, importCsvText, loadDemo, replaceDataset } = useDataStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingReplace, setPendingReplace] = React.useState<null | { id: string; text: string; name: string }>(null);
  const [driveQueue, setDriveQueue] = React.useState<Array<{ text: string; name: string; sourceUrl?: string }>>([]);
  const [driveStats, setDriveStats] = React.useState({ imported: 0, replaced: 0, skipped: 0 });

  const processNextDrive = async () => {
    if (pendingReplace || confirmOpen) return; // wait for decision
    if (driveQueue.length === 0) {
      const total = driveStats.imported + driveStats.replaced + driveStats.skipped;
      if (total > 0) {
        toast({ title: `Drive import finished`, description: `Imported ${driveStats.imported}, Replaced ${driveStats.replaced}, Skipped ${driveStats.skipped}` });
      }
      return;
    }
    const item = driveQueue[0];
    const desiredName = normalizeFileName(item.name || "Drive CSV");
    const existing = datasets.find((d) => d.name.toLowerCase() === desiredName.toLowerCase() || (!!item.sourceUrl && d.sourceUrl === item.sourceUrl));
    if (existing) {
      setPendingReplace({ id: existing.id, text: item.text, name: existing.name });
      setConfirmOpen(true);
      return;
    }
    importCsvText(desiredName, item.text, item.sourceUrl);
    setDriveStats((s) => ({ ...s, imported: s.imported + 1 }));
    setDriveQueue((q) => q.slice(1));
    setTimeout(processNextDrive, 0);
  };

  const onUploadCsv = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { file: { files: FileList }; name?: { value: string } };
    const file = form.file.files?.[0];
    if (!file) return;
    const desiredName = normalizeFileName((form.name?.value || file.name || "").trim());
    const text = await file.text();
    const existing = datasets.find((d) => d.name.toLowerCase() === desiredName.toLowerCase());
    if (existing) {
      setPendingReplace({ id: existing.id, text, name: existing.name });
      setConfirmOpen(true);
      return;
    }
    const id = importCsvText(desiredName || file.name, text, null);
    toast({ title: "הועלה בהצלחה", description: desiredName });
    navigate(`/datasets/${id}`);
  };
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
      setDriveStats({ imported: 0, replaced: 0, skipped: 0 });
      setDriveQueue(files.map((f: any) => ({ text: f.csv as string, name: (f.name as string) || "Drive CSV", sourceUrl: f.sourceUrl as string | undefined })));
      setTimeout(processNextDrive, 0);
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
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>Upload a CSV file. If the same name exists, you can replace its content.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onUploadCsv}>
              <div className="space-y-2">
                <Label htmlFor="file">CSV File</Label>
                <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input id="name" name="name" placeholder="Dataset name" />
              </div>
              <Button type="submit">Upload</Button>
            </form>
          </CardContent>
        </Card>

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
              <Button asChild variant="outline"><Link to={`/datasets/${d.id}`}>Open</Link></Button>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="קובץ בשם זה כבר קיים"
        message="האם להחליף את התוכן של הקובץ הקיים בנתונים החדשים?"
        confirmText="החלף"
        cancelText="ביטול"
        onCancel={() => {
          setConfirmOpen(false);
          if (driveQueue.length) {
            // Skip current queued item and continue
            setDriveStats((s) => ({ ...s, skipped: s.skipped + 1 }));
            setDriveQueue((q) => q.slice(1));
            setPendingReplace(null);
            setTimeout(processNextDrive, 0);
          } else {
            setPendingReplace(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingReplace) return;
          try {
            await replaceDataset(pendingReplace.id, pendingReplace.text);
            setConfirmOpen(false);
            setPendingReplace(null);
            if (driveQueue.length) {
              setDriveStats((s) => ({ ...s, replaced: s.replaced + 1 }));
              setDriveQueue((q) => q.slice(1));
              setTimeout(processNextDrive, 0);
            } else {
              toast({ title: "הוחלף בהצלחה", description: pendingReplace.name });
              navigate(`/datasets/${pendingReplace.id}`);
            }
          } catch (e: any) {
            toast({ title: "החלפה נכשלה", description: String(e), variant: "destructive" as any });
          }
        }}
      />
    </main>
  );
};

export default Datasets;
