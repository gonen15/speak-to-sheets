import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export type JobReportItem = { id: number; name: string; state: "queued"|"running"|"done"|"error"; action?: string; error?: string };
export type JobReport = { id: string; status: string; progress: number; done_items?: number; total_items?: number; current_file?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  job?: JobReport;
  items: JobReportItem[];
};

export default function JobReportDrawer({ open, onClose, job, items }: Props) {
  const done = items.filter((i) => i.state === "done");
  const errs = items.filter((i) => i.state === "error");

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DrawerContent className="sm:max-w-[600px] ml-auto">
        <DrawerHeader>
          <DrawerTitle>Drive Import — Report</DrawerTitle>
          <DrawerDescription>
            Job: {job?.id?.slice(0, 8)} • Status: {job?.status} • Progress: {job?.progress ?? 0}%
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-6">
          <section>
            <div className="text-sm text-muted-foreground">
              {job?.done_items ?? 0}/{job?.total_items ?? 0} processed
              {job?.current_file ? (
                <> • Current: <span className="opacity-80">{job.current_file}</span></>
              ) : null}
            </div>
            <div className="mt-3">
              <Progress value={Math.min(100, job?.progress ?? 0)} />
            </div>
          </section>

          <section>
            <div className="text-sm font-medium mb-2">Completed</div>
            {done.length === 0 ? (
              <div className="text-sm text-muted-foreground">No completed items yet.</div>
            ) : (
              <ScrollArea className="h-48 pr-2">
                <ul className="space-y-1">
                  {done.map((i) => (
                    <li key={i.id} className="flex items-center justify-between border rounded-md p-2">
                      <div className="truncate mr-2">{i.name}</div>
                      <Badge variant="secondary">{i.action || "done"}</Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </section>

          <section>
            <div className="text-sm font-medium mb-2">Errors</div>
            {errs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No errors.</div>
            ) : (
              <ScrollArea className="h-48 pr-2">
                <ul className="space-y-1">
                  {errs.map((i) => (
                    <li key={i.id} className="border rounded-md p-2">
                      <div className="font-medium text-destructive">{i.name}</div>
                      <div className="text-xs mt-1 whitespace-pre-wrap">{i.error}</div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </section>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>סגור</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
