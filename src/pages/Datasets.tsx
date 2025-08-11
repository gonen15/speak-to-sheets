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
import { datasetReplace, librarySave, libraryDelete, driveSync } from "@/lib/supabaseEdge";

const Datasets = () => {
  const { t } = useI18n();
  const { datasets, importCsvText, loadDemo, replaceDataset } = useDataStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingReplace, setPendingReplace] = React.useState<null | { id: string; text: string; name: string }>(null);
  const [driveQueue, setDriveQueue] = React.useState<Array<{ text: string; name: string; sourceUrl?: string }>>([]);
  const [driveStats, setDriveStats] = React.useState({ imported: 0, replaced: 0, skipped: 0 });
  const [savedFolders, setSavedFolders] = React.useState<Record<string, { id: string; name: string }>>({});

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

  const upsertCsv = async (name: string, csv: string, sourceUrl?: string) => {
    // For now, use simple deduplication logic until RPC types are updated
    const existing = datasets.find((d) => d.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      const yes = window.confirm(`כבר קיים קובץ בשם "${name}". להחליף את התוכן?`);
      if (!yes) return { id: existing.id, action: "exists" };
      await replaceDataset(existing.id, csv);
      return { id: existing.id, action: "replaced" };
    }
    const id = importCsvText(name, csv, sourceUrl);
    return { id, action: "created" };
  };

  const onUploadCsv = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement & { file: { files: FileList }; name?: { value: string } };
    const file = form.file.files?.[0];
    if (!file) return;
    const desiredName = normalizeFileName((form.name?.value || file.name || "").trim());
    const text = await file.text();
    try {
      const res = await upsertCsv(desiredName || file.name, text);
      toast({ 
        title: res.action === "replaced" ? "הוחלף בהצלחה" : "הועלה בהצלחה", 
        description: desiredName 
      });
      navigate(`/datasets/${res.id}`);
    } catch (err: any) {
      toast({ title: "העלאה נכשלה", description: String(err), variant: "destructive" as any });
    }
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

  const handleSaveFolder = async (folderUrl: string, folderName: string) => {
    try {
      const folderId = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/)?.[1];
      const { ok, sourceId } = await librarySave({
        kind: "drive_folder",
        name: folderName,
        config: { folderId, folderUrl },
        syncEnabled: true,
        syncIntervalMins: 60
      });

      if (!ok) throw new Error('Save failed');

      setSavedFolders(prev => ({
        ...prev,
        [folderUrl]: { id: sourceId, name: folderName }
      }));

      toast({ title: "תיקייה נשמרה", description: "התיקייה נוספה לספרייה" });
    } catch (err: any) {
      toast({ title: "שמירה נכשלה", description: String(err), variant: "destructive" as any });
    }
  };

  const handleDeleteFolder = async (sourceId: string, folderUrl: string) => {
    try {
      const { ok } = await libraryDelete({ sourceId, deleteDatasets: false });
      if (!ok) throw new Error('Delete failed');

      setSavedFolders(prev => {
        const newFolders = { ...prev };
        delete newFolders[folderUrl];
        return newFolders;
      });

      toast({ title: "תיקייה נמחקה", description: "התיקייה הוסרה מהספרייה" });
    } catch (err: any) {
      toast({ title: "מחיקה נכשלה", description: String(err), variant: "destructive" as any });
    }
  };

  const handleSyncFolder = async (sourceId: string) => {
    try {
      const { ok, imported, updated, skipped } = await driveSync({ sourceId });
      if (!ok) throw new Error('Sync failed');

      toast({ 
        title: "סנכרון הושלם", 
        description: `יובאו: ${imported}, עודכנו: ${updated}, דולגו: ${skipped}` 
      });
    } catch (err: any) {
      toast({ title: "סנכרון נכשל", description: String(err), variant: "destructive" as any });
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
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">{t("preview")}</h2>
          <Button asChild variant="outline">
            <Link to="/library">ספרייה</Link>
          </Button>
        </div>
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
