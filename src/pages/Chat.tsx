import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import PageMeta from "@/components/common/PageMeta";
import { useI18n } from "@/i18n/i18n";
import { useDataStore } from "@/store/dataStore";
import { aiChat } from "@/lib/supabaseEdge";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const { t } = useI18n();
  const { datasets } = useDataStore();
  const { toast } = useToast();

  const [datasetId, setDatasetId] = useState<string | undefined>(datasets[0]?.id);
  const [msgs, setMsgs] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const content = input.trim();
    if (!content) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await aiChat({ messages: next, datasetId });
      if (!res.ok) throw new Error("AI error");
      setMsgs([...next, { role: "assistant", content: res.content }]);
    } catch (e: any) {
      toast({ title: "AI chat failed", description: String(e?.message || e), variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto py-10">
      <PageMeta title="AI Chat — Insights" description="Ask questions in HE/EN; get insights and summaries." path="/chat" />
      <h1 className="text-2xl font-semibold mb-6">{t("chat")}</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("ask")}</CardTitle>
            <CardDescription>Bilingual HE/EN assistant with data context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {datasets.length > 0 && (
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value || undefined)}
              >
                <option value="">No dataset context</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <Textarea rows={6} value={input} onChange={(e) => setInput(e.target.value)} placeholder="לדוגמה: מהם הטרנדים במכירות ביוני?" />
            <div className="flex gap-3">
              <Button onClick={send} disabled={loading}>{loading ? t("loading") : t("send")}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>AI responses appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {msgs.length === 0 && <div className="text-sm text-muted-foreground">Start by asking a question…</div>}
              {msgs.map((m, idx) => (
                <div key={idx} className="text-sm">
                  <div className="font-medium">{m.role === "user" ? "You" : "Assistant"}</div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Chat;
