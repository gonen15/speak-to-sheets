import PageMeta from "@/components/common/PageMeta";

const Settings = () => {
  return (
    <main className="container mx-auto py-10">
      <PageMeta title="CGC DataHub — Settings" description="Connect Supabase, Google OAuth and OpenAI to enable backend features." path="/settings" />
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="space-y-4 max-w-2xl">
        <p className="text-muted-foreground">
          חיבורי Backend (Supabase + NextAuth/Google + OpenAI) נדרשים כדי להפעיל אחסון, הרשאות ו-ChatSQL אמיתי.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>חברו את הפרויקט ל-Supabase (כפתור ירוק למעלה ב-Lovable).</li>
          <li>הוסיפו מפתחות ENV ל-OpenAI ו-Google OAuth.</li>
          <li>לאחר החיבור נוכל להוסיף DB + RLS, OAuth, CRON ו-API מלאים.</li>
        </ol>
        <a className="underline" href="https://docs.lovable.dev/integrations/supabase/" target="_blank" rel="noreferrer">Supabase integration docs</a>
      </div>
    </main>
  );
};

export default Settings;
