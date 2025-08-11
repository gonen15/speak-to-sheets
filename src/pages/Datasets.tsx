import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageMeta from "@/components/common/PageMeta";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { normalizeFileName } from "@/lib/fileHash";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import DriveImportPanel from "@/components/upload/DriveImportPanel";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { datasetReplace, librarySave, libraryDelete, driveSync, uploadStart, ingestCsv } from "@/lib/supabaseEdge";

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
  const [uploading, setUploading] = React.useState(false);
  const [uploadingDrive, setUploadingDrive] = React.useState(false);
  const [syncingMonday, setSyncingMonday] = React.useState(false);
  
  // Pilot state
  const [pilotUrl, setPilotUrl] = React.useState<string>(
    "https://docs.google.com/spreadsheets/d/1GsGdNfcSU3QtqtiKUkdQiC4XXRp1DT-W5j55DSHPTxg/edit?usp=drive_link"
  );
  const [pilotBusy, setPilotBusy] = React.useState(false);
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

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        // 1) Start upload job
        const startResult = await uploadStart({
          sourceKind: "file",
          name: file.name,
          sizeBytes: file.size,
          mime: file.type
        });

        if (!startResult?.ok || !startResult.jobId) {
          toast({ title: "נכשל ביצירת משימה", description: file.name, variant: "destructive" });
          continue;
        }

        const jobId = startResult.jobId;

        // 2) Upload to Storage
        const path = `incoming/${jobId}.csv`;
        const { error: uploadError } = await supabase.storage
          .from("incoming")
          .upload(path, file, { upsert: true });

        if (uploadError) {
          await markJobFailed(jobId, uploadError.message);
          continue;
        }

        // 3) Process in Edge Function (dedup/replace happens inside)
        const ingestResult = await ingestCsv({
          jobId,
          datasetName: normalizeFileName(file.name)
        });

        if (!ingestResult?.ok) {
          toast({ 
            title: "עיבוד נכשל", 
            description: ingestResult?.error || "שגיאה לא ידועה", 
            variant: "destructive" 
          });
        }
      } catch (err: any) {
        toast({ 
          title: "שגיאה בעיבוד קובץ", 
          description: `${file.name}: ${err.message}`, 
          variant: "destructive" 
        });
      }
    }
  };

  const markJobFailed = async (jobId: string, error: string) => {
    try {
      await supabase
        .from("upload_jobs")
        .update({
          status: "failed",
          error,
          finished_at: new Date().toISOString()
        })
        .eq("id", jobId);
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }
  };

  const onUploadCsv = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (uploading) return;
    
    const form = e.currentTarget as HTMLFormElement & { file: { files: FileList }; name?: { value: string } };
    const file = form.file.files?.[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      await handleFiles([file]);
      form.reset();
    } finally {
      setUploading(false);
    }
  };
  const onSyncMonday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (syncingMonday) return;
    
    const form = e.currentTarget as HTMLFormElement & { boardIds: { value: string } };
    const raw = form.boardIds.value.trim();
    const ids = raw
      ? raw
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
      : undefined;
    
    setSyncingMonday(true);
    toast({ title: "מתחבר ל-Monday...", description: "מתחיל סנכרון" });
    
    try {
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; boards: number; items: number }>("monday-sync", {
        body: { boardIds: ids },
      });
      if (error || !data?.ok) throw new Error(error?.message || "Sync failed");
      toast({ title: "Monday synced", description: `${data.boards} boards • ${data.items} items` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: String(err), variant: "destructive" as any });
    } finally {
      setSyncingMonday(false);
    }
  };

  // Google Sheet single import
  const parseSheetFromUrl = (url: string): { sheetId: string; gid: string } | null => {
    const sheetMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetMatch) return null;
    const gidMatch = url.match(/[?&]gid=(\d+)/);
    return { sheetId: sheetMatch[1], gid: gidMatch ? gidMatch[1] : "0" };
  };

  const onImportGoogleSheet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pilotBusy) return;
    setPilotBusy(true);
    try {
      const info = parseSheetFromUrl(pilotUrl.trim());
      if (!info) throw new Error("כתובת לא תקינה");
      const { data, error } = await supabase.functions.invoke<{ ok: boolean; csv?: string; error?: string }>("sheet-fetch", {
        body: info,
      });
      if (error || !data?.ok || !data.csv) throw new Error(data?.error || error?.message || "שגיאת ייבוא");

      const desiredName = normalizeFileName("דוח פיילוט");
      const { data: upsert, error: upErr } = await supabase.rpc(
        "dataset_upsert_from_csv",
        {
          p_name: desiredName,
          p_csv: data.csv,
          p_source_url: pilotUrl.trim(),
          p_replace: true,
        }
      );
      if (upErr) throw upErr;
      const result: any = Array.isArray(upsert) ? upsert[0] : upsert;
      const datasetId = result?.dataset_id as string | undefined;
      const action = result?.action as string | undefined;
      if (datasetId) {
        toast({ title: "הייבוא הושלם", description: action === "replaced" ? "הוחלף" : "נוצר" });
        navigate(`/dashboards/dataset/${datasetId}`);
      }
    } catch (err: any) {
      toast({ title: "ייבוא נכשל", description: String(err?.message || err), variant: "destructive" as any });
    } finally {
      setPilotBusy(false);
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
      <PageMeta title="דאטהסטים — העלאה וייבוא" description="העלאת CSV וייבוא מתיקיית Google Drive בצורה פשוטה" path="/datasets" />
      <h1 className="text-2xl font-semibold mb-6">דאטהסטים</h1>


      <UploadProgress 
        onJobComplete={(job) => {
          if (job.dataset_id) {
            navigate(`/datasets/${job.dataset_id}?tab=view`);
          }
        }}
        onNavigateToDataset={(datasetId) => navigate(`/datasets/${datasetId}?tab=view`)}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Google Sheet (URL)</CardTitle>
            <CardDescription>הדבק קישור של Google Sheets לייבוא הטאב הראשון</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onImportGoogleSheet}>
              <div className="space-y-2">
                <Label htmlFor="gsheet">Google Sheet URL</Label>
                <Input id="gsheet" value={pilotUrl} onChange={(e)=>setPilotUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
              </div>
              <Button type="submit" disabled={pilotBusy}>{pilotBusy ? "מייבא..." : "ייבוא"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>Upload a CSV file. If the same name exists, you can replace its content.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onUploadCsv}>
              <div className="space-y-2">
                <Label htmlFor="file">CSV File</Label>
                <Input 
                  id="file" 
                  name="file" 
                  type="file" 
                  accept=".csv,text/csv" 
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 1) {
                      setUploading(true);
                      handleFiles(files).finally(() => setUploading(false));
                    }
                  }}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input id="name" name="name" placeholder="Dataset name" />
              </div>
              <Button type="submit" disabled={uploading}>
                {uploading ? "מעלה..." : "Upload"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Drive Folder</CardTitle>
            <CardDescription>Paste a shared folder URL to import all Google Sheets and CSV files.</CardDescription>
          </CardHeader>
          <CardContent>
            <DriveImportPanel />
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
              <Button asChild variant="outline"><Link to={`/datasets/${d.id}?tab=view`}>Open</Link></Button>
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
