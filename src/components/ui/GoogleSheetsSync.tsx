import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Database, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';
import { supabase } from '@/integrations/supabase/client';

interface DatasetInfo {
  name: string;
  created_at: string;
  row_count: number;
}

export function GoogleSheetsSync() {
  const { syncSheets, checkSyncStatus, isLoading, lastSync, syncResults } = useGoogleSheetsSync();
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);

  useEffect(() => {
    loadDatasets();
  }, [lastSync]);

  const loadDatasets = async () => {
    const data = await checkSyncStatus();
    setDatasets(data);
  };

  const handleSync = async () => {
    await syncSheets();
    await loadDatasets();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Google Sheets Sync
            </CardTitle>
            <CardDescription>
              Sync data from your Google Sheets to the dashboard
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last sync: {lastSync.toLocaleString()}
          </div>
        )}

        {syncResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Sync Results:</h4>
            {syncResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {result.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{result.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {result.rowsProcessed && (
                    <Badge variant="secondary" className="text-xs">
                      {result.rowsProcessed} rows
                    </Badge>
                  )}
                  <Badge 
                    variant={result.status === 'success' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {result.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {datasets.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Available Datasets:</h4>
            <div className="grid gap-2">
              {datasets.map((dataset, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <span className="text-sm font-medium">{dataset.name}</span>
                    <p className="text-xs text-muted-foreground">
                      Updated: {new Date(dataset.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {dataset.row_count} rows
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {datasets.length === 0 && !isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No datasets synced yet</p>
            <p className="text-xs">Click "Sync Now" to import your Google Sheets</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}