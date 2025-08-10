import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "he" | "en";

type Dict = Record<string, string>;

const dicts: Record<Locale, Dict> = {
  he: {
    appName: "CGC DataHub",
    mainNav: "ניווט ראשי",
    loadDemo: "טען דמו",
    demoLoaded: "הדמו נטען",
    demoLoadedDesc: "דשבורד הדגמה מוכן לצפייה",
    datasets: "מקורות נתונים",
    model: "מודל סמנטי",
    dashboards: "דשבורדים",
    chat: "ChatSQL",
    settings: "הגדרות",
    welcomeTitle: "BI מודרני ל-Google Sheets ו-CSV",
    welcomeSubtitle: "ייבוא מהיר, מודל סמנטי, דשבורדים ו-Chat לנתונים בעברית.",
    quickLinks: "קישורים מהירים",
    importCsv: "ייבוא CSV",
    pasteCsv: "הדבק CSV",
    csvUrl: "כתובת CSV",
    name: "שם",
    preview: "תצוגה מקדימה",
    syncNow: "סנכרן עכשיו",
    selectDataset: "בחר מקור נתונים",
    dateColumn: "עמודת תאריך",
    dimensions: "ממדים",
    metrics: "מדדים",
    addMetric: "הוסף מדד",
    expression: "ביטוי",
    format: "פורמט",
    save: "שמור",
    run: "הרץ",
    ask: "שאלו את הנתונים",
    sqlPreview: "תצוגת SQL",
    results: "תוצאות",
    toggleLang: "החלף שפה",
  },
  en: {
    appName: "CGC DataHub",
    mainNav: "Main navigation",
    loadDemo: "Load demo",
    demoLoaded: "Demo loaded",
    demoLoadedDesc: "Demo dashboard is ready",
    datasets: "Datasets",
    model: "Semantic Model",
    dashboards: "Dashboards",
    chat: "ChatSQL",
    settings: "Settings",
    welcomeTitle: "Modern BI for Google Sheets & CSV",
    welcomeSubtitle: "Quick import, semantic model, dashboards and Chat-to-Data.",
    quickLinks: "Quick links",
    importCsv: "Import CSV",
    pasteCsv: "Paste CSV",
    csvUrl: "CSV URL",
    name: "Name",
    preview: "Preview",
    syncNow: "Sync now",
    selectDataset: "Select dataset",
    dateColumn: "Date column",
    dimensions: "Dimensions",
    metrics: "Metrics",
    addMetric: "Add metric",
    expression: "Expression",
    format: "Format",
    save: "Save",
    run: "Run",
    ask: "Ask the data",
    sqlPreview: "SQL Preview",
    results: "Results",
    toggleLang: "Toggle language",
  },
};

interface I18nContextType {
  locale: Locale;
  t: (key: keyof typeof dicts["he"]) => string;
  toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>("he");

  useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = locale === "he" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<I18nContextType>(() => ({
    locale,
    t: (key) => dicts[locale][key] ?? key,
    toggleLocale: () => setLocale((prev) => (prev === "he" ? "en" : "he")),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
