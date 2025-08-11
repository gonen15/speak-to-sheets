import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadJob {
  id: string;
  name: string;
  status: string;
  progress: number;
  error?: string;
  action?: string;
  dataset_id?: string;
  created_at: string;
}

interface UploadProgressProps {
  onJobComplete?: (job: UploadJob) => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ onJobComplete }) => {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Initial load
    loadJobs();

    // Real-time subscription
    const subscription = supabase
      .channel('upload_jobs_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upload_jobs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as UploadJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as UploadJob;
            setJobs(prev => prev.map(job => 
              job.id === updatedJob.id ? updatedJob : job
            ));

            // Notify on completion
            if (updatedJob.status === 'completed' && onJobComplete) {
              onJobComplete(updatedJob);
              toast({
                title: "העלאה הושלמה",
                description: `${updatedJob.name} ${updatedJob.action === 'replaced' ? 'הוחלף' : 'נוצר'} בהצלחה`
              });
            } else if (updatedJob.status === 'failed') {
              toast({
                title: "העלאה נכשלה",
                description: updatedJob.error || "שגיאה לא ידועה",
                variant: "destructive"
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onJobComplete, toast]);

  const loadJobs = async () => {
    const { data } = await supabase
      .from('upload_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setJobs(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'queued': return 'בתור';
      case 'running': return 'מעלה...';
      case 'completed': return 'הושלם';
      case 'failed': return 'נכשל';
      default: return status;
    }
  };

  if (jobs.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>סטטוס העלאות</CardTitle>
        <CardDescription>מעקב אחר קבצים שמועלים</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{job.name}</span>
                <span className={`text-sm ${getStatusColor(job.status)}`}>
                  {getStatusText(job.status)}
                </span>
              </div>
              {job.status === 'running' && (
                <Progress value={job.progress} className="h-2" />
              )}
              {job.status === 'failed' && job.error && (
                <p className="text-sm text-red-600">{job.error}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};