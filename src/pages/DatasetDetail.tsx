import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import GlobalFilterBar from "@/components/ui/GlobalFilterBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { filtersSave, filtersGet } from "@/lib/supabaseEdge";
const DatasetDetail = () => {
  const { t } = useI18n();
  const { id } = useParams();
  const { getDataset, syncDataset } = useDataStore();
  const navigate = useNavigate();
  const ds = id ? getDataset(id) : undefined;

  // Filters state
  const [period, setPeriod] = useState<string>("current_quarter");
  const [department, setDepartment] = useState<string>("all");
  const [entity, setEntity] = useState<string>("");
  const [filterLoading, setFilterLoading] = useState(false);
  const [filteredRows, setFilteredRows] = useState<any[]>(ds?.rows ?? []);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'view';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Redirect to visual dashboard if ID is a UUID (server dataset)
  useEffect(() => {
    if (id && !ds && /^[0-9a-fA-F-]{36}$/.test(id)) {
      navigate(`/dashboards/dataset/${id}`, { replace: true });
    }
  }, [id, ds, navigate]);

  // Load saved filters for this dataset
  useEffect(() => {
    (async () => {
      if (!ds?.id) return;
      try {
        const res = await filtersGet(`dataset:${ds.id}`);
        const val = (res as any)?.value || {};
        if (val.period) setPeriod(val.period);
        if (val.department) setDepartment(val.department);
        if (val.entity) setEntity(val.entity);
      } catch {}
    })();
  }, [ds?.id]);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const applyFilters = () => {
    if (!ds) return;
    setFilterLoading(true);
    try {
      let base = [...ds.rows];
      const hasDept = base.length && base[0] && 'department' in base[0];
      const hasCust = base.length && base[0] && ('customer' in base[0] || 'client' in base[0]);
      const hasDate = base.length && base[0] && 'date' in base[0];

      if (department !== 'all' && hasDept) {
        base = base.filter(r => String((r as any).department ?? '').toLowerCase() === department.toLowerCase());
      }
      if (entity && hasCust) {
        const ent = entity.toLowerCase();
        base = base.filter(r => {
          const c1 = String((r as any).customer ?? '').toLowerCase();
          const c2 = String((r as any).client ?? '').toLowerCase();
          return c1.includes(ent) || c2.includes(ent);
        });
      }
      if (hasDate) {
        const now = new Date();
        let from: Date | null = null;
        if (period === '30d') from = new Date(now.getTime() - 30*24*60*60*1000);
        else if (period === '90d') from = new Date(now.getTime() - 90*24*60*60*1000);
        else if (period === 'ytd') from = new Date(now.getFullYear(), 0, 1);
        else if (period === 'current_quarter') {
          const q = Math.floor(now.getMonth()/3);
          from = new Date(now.getFullYear(), q*3, 1);
        }
        if (from) {
          base = base.filter(r => {
            const d = new Date((r as any).date as any);
            return !isNaN(d as any) && d >= from!;
          });
        }
      }
      setFilteredRows(base);
    } finally {
      setFilterLoading(false);
    }
  };

  const resetFilters = () => {
    setPeriod('current_quarter');
    setDepartment('all');
    setEntity('');
    setFilteredRows(ds?.rows ?? []);
  };

  const saveFilters = async () => {
    if (!ds) return;
    await filtersSave({ key: `dataset:${ds.id}`, value: { period, department, entity } });
  };

  if (!ds) return <main className="container mx-auto py-10">Dataset not found</main>;
  return (
    <main className="container mx-auto py-10">
      <PageMeta title={`Dataset — ${ds.name}`} description="Preview imported data and sync." path={`/datasets/${ds.id}`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{ds.name}</h1>
        <Button variant="outline" onClick={() => syncDataset(ds.id)} disabled={ds.status === "syncing" || !ds.sourceUrl}>{t("syncNow")}</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="view">תצוגה</TabsTrigger>
          <TabsTrigger value="filters">פילטרים</TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>{t("preview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      {ds.columns.map((c) => (
                        <th key={c} className="text-left py-2 pr-4 border-b">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredRows ?? ds.rows).slice(0, 500).map((r, i) => (
                      <tr key={`${i}-${(r as any)?.id ?? (r as any)?._id ?? ''}`} className="border-b">
                        {ds.columns.map((c) => (
                          <td key={`${c}-${i}`} className="py-2 pr-4">{String((r as any)[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters">
          <Card>
            <CardHeader>
              <CardTitle>סינון נתונים</CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalFilterBar
                period={period}
                onPeriodChange={setPeriod}
                department={department}
                onDepartmentChange={setDepartment}
                entity={entity}
                onEntityChange={setEntity}
                onApply={applyFilters}
                onReset={resetFilters}
                onSave={saveFilters}
                loading={filterLoading}
                className="mb-6"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default DatasetDetail;
