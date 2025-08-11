import React, { useEffect, useRef, useState } from "react";
import { driveSyncStart, driveSyncStep } from "@/lib/supabaseEdge";
import JobReportDrawer from "@/components/ui/JobReportDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export type Job = { id: string; status: string; progress: number; done_items?: number; total_items?: number; current_file?: string };
export type Item = { id: number; name: string; state: "queued"|"running"|"done"|"error"; action?: string; error?: string };

export default function DriveImportPanel(){
  const [folderUrl, setFolderUrl] = useState("");
  const [replace, setReplace] = useState(false);
  const [job, setJob] = useState<Job|undefined>();
  const [items, setItems] = useState<Item[]>([]);
  const [openReport, setOpenReport] = useState(false);
  const timer = useRef<number|undefined>(undefined);

  useEffect(()=> {
    const stored = localStorage.getItem("driveJobId");
    if(stored) resume(stored);
    return ()=> { if(timer.current) window.clearTimeout(timer.current); };
  }, []);

  async function start(){
    if(!folderUrl) return alert("הדבק/י קישור תיקייה של Google Drive");
    const s = await driveSyncStart({ folderUrl }).catch(e => ({ ok:false, error:String(e) })) as any;
    if(!s?.ok) return alert(s?.error || "Drive start failed");
    const j: Job = { id: s.jobId, status: "running", progress: 2, done_items: 0, total_items: s.total||0 };
    setJob(j); setItems([]); localStorage.setItem("driveJobId", j.id);
    loop(j.id);
  }

  async function resume(jobId: string){
    const step = await driveSyncStep({ jobId }).catch(()=>null) as any;
    if(step?.ok){
      setJob(step.job);
      setItems(prev => prev.length ? prev : (step.items||[]).map((i:any)=>({ ...i, state: i.state as Item["state"] })));
      if(step.job?.status !== "completed") loop(step.job.id);
      else localStorage.removeItem("driveJobId");
    }else{
      localStorage.removeItem("driveJobId");
    }
  }

  async function loop(jobId: string){
    const step = await driveSyncStep({ jobId, batchSize: 5, replace }).catch(e => ({ ok:false, error:String(e) })) as any;
    if(!step?.ok){
      alert(step?.error || "Drive step failed");
      localStorage.removeItem("driveJobId");
      return;
    }
    setJob(step.job);
    setItems(prev => [...prev, ...(step.items||[]).map((i:any)=>({ ...i, state: i.state as Item["state"] }))]);
    if(step.job?.status !== "completed"){
      timer.current = window.setTimeout(()=> loop(jobId), 2000);
    }else{
      localStorage.removeItem("driveJobId");
    }
  }

  const pct = Math.min(100, job?.progress ?? 0);

  return (
    <div className="space-y-3">
      <Input placeholder="https://drive.google.com/drive/folders/..." value={folderUrl} onChange={(e)=>setFolderUrl(e.target.value)} />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="replace" checked={replace} onCheckedChange={(v)=>setReplace(Boolean(v))} />
          <Label htmlFor="replace">להחליף אם קיים (Replace duplicates)</Label>
        </div>
        <Button onClick={start} disabled={!folderUrl || job?.status==="running"}>שמור</Button>
        {job ? <Button variant="outline" onClick={()=>setOpenReport(true)}>הצג דוח</Button> : null}
      </div>

      {job && (
        <div className="border rounded-md p-3">
          <div className="flex justify-between">
            <div className="text-sm text-muted-foreground">Job: {job.id.slice(0,8)} • Status: {job.status}</div>
            <div className="text-sm">{job.done_items ?? 0}/{job.total_items ?? 0}</div>
          </div>
          <div className="mt-2">
            <Progress value={pct} />
          </div>
          {job.current_file && <div className="text-xs text-muted-foreground mt-2 truncate">Current: {job.current_file}</div>}
          <div className="mt-2">
            <div className="text-sm font-medium mb-1">Recent</div>
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Waiting for first batch…</div>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-auto">
                {items.slice(-8).map(it=> (
                  <li key={it.id} className="flex justify-between border rounded-md p-2">
                    <div className="truncate mr-2">{it.name}</div>
                    <div className={`text-xs ${it.state==="error"?"text-destructive":it.state==="done"?"text-primary":"text-muted-foreground"}`}>
                      {it.state}{it.action ? ` • ${it.action}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <JobReportDrawer open={openReport} onClose={()=>setOpenReport(false)} job={job} items={items} />
    </div>
  );
}
