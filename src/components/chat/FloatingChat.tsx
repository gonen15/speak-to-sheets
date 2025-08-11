import React, { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { aiChat } from "@/lib/supabaseEdge";
import { MessageSquare, X } from "lucide-react";

interface Msg { role: "user"|"assistant"; content: string }

export default function FloatingChat(){
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const { toast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);

  const canSend = input.trim().length > 0 && !busy;

  async function send(){
    if(!canSend) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setBusy(true);
    try{
      const res = await aiChat({ messages: [{ role: "user", content: userMsg.content }] });
      const text = (res as any)?.content || "";
      setMsgs(prev => [...prev, { role: "assistant", content: text }]);
    }catch(e:any){
      toast({ title: "שגיאת צ'אט", description: String(e?.message||e), variant:"destructive" });
    }finally{ setBusy(false); setTimeout(()=> listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50); }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open && (
        <Button className="rounded-full h-12 w-12 shadow-lg" onClick={()=>setOpen(true)} aria-label="פתח צ'אט">
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
      {open && (
        <Card className="w-[360px] shadow-2xl">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">צ'אט GPT</CardTitle>
            <Button variant="ghost" size="icon" onClick={()=>setOpen(false)} aria-label="סגור">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div ref={listRef} className="h-64 overflow-auto rounded-md border p-2 bg-muted/30">
              {msgs.length===0 && (
                <div className="text-sm text-muted-foreground">שאלו כל דבר לגבי הדאטה שלכם או קבלו עזרה.</div>
              )}
              {msgs.map((m, idx)=> (
                <div key={idx} className={`mb-2 text-sm ${m.role==="user"?"text-right":"text-left"}`}>
                  <div className={`inline-block px-3 py-2 rounded-md ${m.role==="user"?"bg-primary text-primary-foreground":"bg-accent text-accent-foreground"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="הקלידו הודעה..." 
                value={input} 
                onChange={(e)=>setInput(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } }}
              />
              <Button onClick={send} disabled={!canSend}>{busy?"שולח...":"שלח"}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
