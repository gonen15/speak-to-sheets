import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import { toast } from "@/hooks/use-toast";

const AppHeader = () => {
  const { t, locale, toggleLocale } = useI18n();
  const navigate = useNavigate();
  const { loadDemo } = useDataStore();

  const onLoadDemo = () => {
    loadDemo();
    toast({ title: t("demoLoaded"), description: t("demoLoadedDesc") });
    navigate("/dashboards");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`;

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border ambient-glow">
      <div className="container mx-auto flex items-center justify-between h-16">
        <Link to="/" className="font-semibold tracking-tight">
          CGC DataHub
        </Link>
        <nav className="hidden md:flex items-center gap-1" aria-label={t("mainNav")}>
          <NavLink to="/datasets" className={linkClass}>
            {t("datasets")}
          </NavLink>
          <NavLink to="/model" className={linkClass}>
            {t("model")}
          </NavLink>
          <NavLink to="/dashboards" className={linkClass}>
            {t("dashboards")}
          </NavLink>
          <NavLink to="/dashboards/sales" className={linkClass}>
            מכירות
          </NavLink>
          <NavLink to="/dashboards/departments" className={linkClass}>
            מחלקות
          </NavLink>
          <NavLink to="/dashboards/builder" className={linkClass}>
            Builder
          </NavLink>
          <NavLink to="/chat" className={linkClass}>
            {t("chat")}
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            {t("settings")}
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="hero" onClick={onLoadDemo}>{t("loadDemo")}</Button>
          <Button variant="outline" onClick={toggleLocale} aria-label={t("toggleLang")}>
            {locale === "he" ? "EN" : "HE"}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
