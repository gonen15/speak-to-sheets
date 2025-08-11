import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageMeta from "@/components/common/PageMeta";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useI18n } from "@/i18n/i18n";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Folder, Trash2, RefreshCw, Clock } from "lucide-react";

const Library = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [sources, setSources] = React.useState<any[]>([]);
  const [sourceDatasets, setSourceDatasets] = React.useState<Record<string, any[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string; deleteDatasets: boolean } | null>(null);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      // Load saved sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('data_sources')
        .select('*')
        .eq('is_saved', true)
        .order('created_at', { ascending: false });

      if (sourcesError) throw sourcesError;

      setSources(sourcesData || []);

      // Load datasets for each source
      if (sourcesData && sourcesData.length > 0) {
        const { data: relationsData, error: relationsError } = await supabase
          .from('data_source_datasets')
          .select(`
            source_id,
            dataset_id,
            uploaded_datasets!inner (
              id,
              name,
              row_count,
              created_at
            )
          `)
          .in('source_id', sourcesData.map(s => s.id));

        if (relationsError) throw relationsError;

        const datasetsBySource: Record<string, any[]> = {};
        relationsData?.forEach((rel: any) => {
          if (!datasetsBySource[rel.source_id]) {
            datasetsBySource[rel.source_id] = [];
          }
          datasetsBySource[rel.source_id].push(rel.uploaded_datasets);
        });

        setSourceDatasets(datasetsBySource);
      }
    } catch (err: any) {
      toast({ title: "טעינה נכשלה", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadLibrary();
  }, []);

  const handleDelete = async (source: any, deleteDatasets: boolean) => {
    setDeleteTarget({ id: source.id, name: source.name, deleteDatasets });
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { data, error } = await supabase.functions.invoke('library-delete', {
        body: { 
          sourceId: deleteTarget.id, 
          deleteDatasets: deleteTarget.deleteDatasets 
        }
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Delete failed');

      toast({ 
        title: "נמחק בהצלחה", 
        description: deleteTarget.deleteDatasets ? "המקור והדאטהסטים נמחקו" : "המקור נמחק"
      });

      setConfirmOpen(false);
      setDeleteTarget(null);
      loadLibrary();
    } catch (err: any) {
      toast({ title: "מחיקה נכשלה", description: String(err), variant: "destructive" });
    }
  };

  const handleSync = async (source: any) => {
    if (source.kind !== 'drive_folder') {
      toast({ title: "שגיאה", description: "רק תיקיות Drive ניתנות לסנכרון", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('drive-sync', {
        body: { sourceId: source.id }
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Sync failed');

      toast({ 
        title: "סנכרון הושלם", 
        description: `יובאו: ${data.imported}, עודכנו: ${data.updated}, דולגו: ${data.skipped}`
      });

      loadLibrary();
    } catch (err: any) {
      toast({ title: "סנכרון נכשל", description: String(err), variant: "destructive" });
    }
  };

  const getSourceIcon = (kind: string) => {
    switch (kind) {
      case 'drive_folder': return <Folder className="h-4 w-4" />;
      default: return <Folder className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <main className="container mx-auto py-10">
        <div className="text-center">טוען...</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-10">
      <PageMeta 
        title="CGC DataHub — Library" 
        description="Manage saved data sources and datasets" 
        path="/library" 
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">ספרייה</h1>
        <Button asChild variant="outline">
          <Link to="/datasets">חזור לדאטהסטים</Link>
        </Button>
      </div>

      {sources.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">אין מקורות שמורים בספרייה</p>
            <Button asChild className="mt-4">
              <Link to="/datasets">יבא מתיקיית Drive</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(source.kind)}
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                    <Badge variant="secondary">
                      {source.kind === 'drive_folder' ? 'תיקיית Drive' : source.kind}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {source.kind === 'drive_folder' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSync(source)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        סנכרון
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(source, false)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      מחק
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-4">
                  {source.last_synced_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      סנכרון אחרון: {formatDate(source.last_synced_at)}
                    </span>
                  )}
                  {source.sync_enabled && (
                    <Badge variant="outline">סנכרון אוטומטי</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium">דאטהסטים ({sourceDatasets[source.id]?.length || 0})</h4>
                  {sourceDatasets[source.id]?.length > 0 ? (
                    <div className="grid gap-2">
                      {sourceDatasets[source.id].map((dataset) => (
                        <Link
                          key={dataset.id}
                          to={`/dashboards/dataset/${dataset.id}`}
                          className="flex justify-between items-center p-2 border rounded hover:bg-accent/30 transition-colors"
                          aria-label={`פתח דוח עבור ${dataset.name}`}
                       >
                          <div>
                            <div className="font-medium">{dataset.name}</div>
                            <div className="text-sm text-muted-foreground">{dataset.row_count} שורות</div>
                          </div>
                          <Button variant="outline" size="sm">פתח</Button>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">אין דאטהסטים</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="אישור מחיקה"
        message={`האם למחוק את המקור "${deleteTarget?.name}"?`}
        confirmText="מחק"
        cancelText="ביטול"
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </main>
  );
};

export default Library;