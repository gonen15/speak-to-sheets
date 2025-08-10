import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";

const Index = () => {
  const { t } = useI18n();
  const { loadDemo } = useDataStore();

  return (
    <main>
      <PageMeta title="CGC DataHub — Home" description="Modern BI on Google Sheets & CSV with semantic model, dashboards and ChatSQL." path="/" />
      <section className="container mx-auto py-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t("welcomeTitle")}</h1>
          <p className="text-lg text-muted-foreground">{t("welcomeSubtitle")}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="hero" onClick={loadDemo}>{t("loadDemo")}</Button>
            <Link to="/datasets"><Button variant="outline">{t("importCsv")}</Button></Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto pb-16">
        <h2 className="text-xl font-semibold mb-4">{t("quickLinks")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/datasets">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("datasets")}</CardTitle>
                <CardDescription>CSV, Google Sheets (בקרוב)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">ייבוא, תצוגה מקדימה וסנכרון.</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/model">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("model")}</CardTitle>
                <CardDescription>Dimensions & Metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">הגדרת מודל סמנטי ושמירה.</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/dashboards">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("dashboards")}</CardTitle>
                <CardDescription>Bar/Line/Pie/KPI</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">גרפים ופילטרים בסיסיים.</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/chat">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("chat")}</CardTitle>
                <CardDescription>Preview SQL לפני ריצה</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">שאלו בעברית או אנגלית.</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/settings">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t("settings")}</CardTitle>
                <CardDescription>OAuth, ENV, RBAC (בקרוב)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">חיבורי Supabase ו-OpenAI בהמשך.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Index;
