import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

interface UploadJob {
  id: string;
  name: string;
  status: string;
  progress: number;
  error?: string;
  action?: string;
  dataset_id?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  stats?: any;
  source_kind: string;
  size_bytes: number;
}

interface UploadJobLog {
  id: number;
  job_id: string;
  ts: string;
  level: string;
  message: string;
  ctx?: any;
}

interface UploadJobItem {
  id: number;
  name: string;
  state: 'queued' | 'running' | 'done' | 'error';
  action?: string;
  error?: string;
}

interface JobDetailProps {
  jobId: string;
  onClose?: () => void;
  onNavigateToDataset?: (datasetId: string) => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ jobId, onClose, onNavigateToDataset }) => {
  const [job, setJob] = useState<UploadJob | null>(null);
  const [logs, setLogs] = useState<UploadJobLog[]>([]);
  const [items, setItems] = useState<UploadJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadJobData();

    const reloadItems = async () => {
      const { data } = await supabase
        .from("upload_job_items")
        .select("*")
        .eq("job_id", jobId)
        .order("id", { ascending: true });
      setItems(((data as any[]) || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        state: i.state,
        action: i.action,
        error: i.error,
      })));
    };

    // Set up real-time subscriptions
    const jobChannel = supabase
      .channel('job-detail-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upload_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          setJob(payload.new as UploadJob);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'upload_job_logs',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          const newLog = payload.new as UploadJobLog;
          setLogs(prev => [...prev, newLog]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upload_job_items',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          reloadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
    };
  }, [jobId]);

  const loadJobData = async () => {
    try {
      // Load job status
      const { data: jobData } = await supabase
        .from("upload_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (jobData) {
        setJob(jobData);
      }

      // Load logs
      const { data: logsData } = await supabase
        .from("upload_job_logs")
        .select("*")
        .eq("job_id", jobId)
        .order("ts", { ascending: true });

      if (logsData) {
        setLogs(logsData);
      }

      // Load processed items
      const { data: itemsData } = await supabase
        .from("upload_job_items")
        .select("*")
        .eq("job_id", jobId)
        .order("id", { ascending: true });

      if (itemsData) {
        setItems((itemsData as any[]).map((i: any) => ({
          id: i.id,
          name: i.name,
          state: i.state,
          action: i.action,
          error: i.error,
        })));
      }
    } catch (error: any) {
      toast({
        title: "שגיאה בטעינת נתונים",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'running': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'queued': return 'בתור';
      case 'running': return 'רץ';
      case 'completed': return 'הושלם';
      case 'failed': return 'נכשל';
      default: return status;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mr-2">טוען פרטי משימה...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">משימה לא נמצאה</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(job.status)}
              {job.name}
            </CardTitle>
            <CardDescription>
              {job.source_kind} • {formatFileSize(job.size_bytes)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={getStatusVariant(job.status)}>
              {getStatusText(job.status)}
            </Badge>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                סגור
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {job.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>התקדמות</span>
              <span>{job.progress}%</span>
            </div>
            <Progress value={job.progress} />
          </div>
        )}

        {/* Error */}
        {job.status === 'failed' && job.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{job.error}</p>
          </div>
        )}

        {/* Success actions */}
        {job.status === 'completed' && (
          <div className="flex gap-2">
            {job.dataset_id && onNavigateToDataset && (
              <Button 
                size="sm" 
                onClick={() => onNavigateToDataset(job.dataset_id!)}
              >
                צפה בדאטהסט
              </Button>
            )}
            <Badge variant="outline">
              {job.action === 'replaced' ? 'הוחלף' : 'נוצר'}
            </Badge>
          </div>
        )}

        {/* Stats */}
        {job.stats && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">סטטיסטיקות</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              {job.stats.headers && (
                <div>עמודות: {job.stats.headers.length}</div>
              )}
              {job.stats.sampled && (
                <div>נבדקו: {job.stats.sampled} שורות</div>
              )}
              {job.stats.bad_rows && (
                <div className="text-yellow-600">שורות פגומות: {job.stats.bad_rows}</div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">פריטים</h4>
          <ScrollArea className="h-32 w-full border rounded-md p-2">
            <div className="space-y-1">
              {items.map((it) => (
                <div key={it.id} className="text-xs flex justify-between items-center">
                  <span className="truncate mr-2">{it.name}</span>
                  <span className={`ml-2 ${it.state === 'error' ? 'text-red-600' : it.state === 'done' ? 'text-green-600' : it.state === 'running' ? 'text-blue-600' : 'text-gray-600'}`}>
                    {it.state}{it.action ? ` • ${it.action}` : ''}
                  </span>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-muted-foreground text-center py-2">אין פריטים</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">לוגים</h4>
          <ScrollArea className="h-32 w-full border rounded-md p-2">
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="text-xs">
                  <span className="text-muted-foreground">
                    {new Date(log.ts).toLocaleTimeString('he-IL')}
                  </span>
                  <span className={`mr-2 font-medium ${getLogLevelColor(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span>{log.message}</span>
                  {log.ctx && Object.keys(log.ctx).length > 0 && (
                    <span className="text-muted-foreground">
                      {' '}({JSON.stringify(log.ctx)})
                    </span>
                  )}
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-muted-foreground text-center py-2">אין לוגים</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};