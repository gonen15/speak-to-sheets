import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SyncResult {
  name: string;
  datasetId?: string;
  rowsProcessed?: number;
  headers?: string[];
  status: 'success' | 'error';
  error?: string;
}

interface SyncResponse {
  success: boolean;
  results: SyncResult[];
  message: string;
  error?: string;
}

export function useGoogleSheetsSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);

  const syncSheets = useCallback(async (): Promise<SyncResponse | null> => {
    setIsLoading(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to sync Google Sheets data",
          variant: "destructive"
        });
        return null;
      }

      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync sheets');
      }

      const response = data as SyncResponse;
      
      if (response.success) {
        setSyncResults(response.results);
        setLastSync(new Date());
        
        const successCount = response.results.filter(r => r.status === 'success').length;
        const errorCount = response.results.filter(r => r.status === 'error').length;
        
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${successCount} sheets${errorCount ? `, ${errorCount} failed` : ''}`,
          variant: successCount > 0 ? "default" : "destructive"
        });
        
        return response;
      } else {
        throw new Error(response.error || 'Sync failed');
      }
      
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSyncStatus = useCallback(async () => {
    try {
      const { data: datasets } = await supabase
        .from('uploaded_datasets')
        .select('name, created_at, row_count')
        .order('created_at', { ascending: false })
        .limit(10);
        
      return datasets || [];
    } catch (error) {
      console.error('Error checking sync status:', error);
      return [];
    }
  }, []);

  return {
    syncSheets,
    checkSyncStatus,
    isLoading,
    lastSync,
    syncResults
  };
}