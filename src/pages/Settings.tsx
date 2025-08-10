import { useState } from "react";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/common/PageMeta";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSyncMonday = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const { data, error } = await supabase.functions.invoke("monday-sync", { body: {} });
      if (error) {
        console.error(error);
        setStatus(`שגיאה בסנכרון: ${error.message}`);
      } else {
        setStatus(`סנכרון הושלם: ${data?.boards ?? 0} לוחות, ${data?.items ?? 0} פריטים`);
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`שגיאה בסנכרון: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — Settings" description="Connect Supabase, Google OAuth and OpenAI to enable backend features." path="/settings" />
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="space-y-6 max-w-2xl">
        <section className="space-y-2">
          <p className="text-muted-foreground">
            חיבורי Backend (Supabase + NextAuth/Google + OpenAI) נדרשים כדי להפעיל אחסון, הרשאות ו-ChatSQL אמיתי.
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>חברו את הפרויקט ל-Supabase (כפתור ירוק למעלה ב-Lovable).</li>
            <li>הוסיפו מפתחות ENV ל-OpenAI ו-Google OAuth.</li>
            <li>לאחר החיבור נוכל להוסיף DB + RLS, OAuth, CRON ו-API מלאים.</li>
          </ol>
          <a className="underline" href="https://docs.lovable.dev/integrations/supabase/" target="_blank" rel="noreferrer">Supabase integration docs</a>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Monday Sync</h2>
          <p className="text-muted-foreground">הפעילו סנכרון ידני של Monday עכשיו. ניתן להגדיר CRON/WBH בהמשך.</p>
          <Button onClick={handleSyncMonday} disabled={loading}>
            {loading ? "מסנכרן…" : "Sync Monday Now"}
          </Button>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </section>
      </div>
    </main>
  );
};

export default Settings;
