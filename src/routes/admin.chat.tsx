import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageCircle, RefreshCw, Send, Loader2, XCircle } from "lucide-react";
import {
  chatListThreads,
  chatPoll,
  chatSend,
  chatClose,
  subscribeChat,
  type ChatThread,
  type ChatMessage,
} from "@/lib/live-chat";
import { isAppScriptConfigured } from "@/lib/appscript";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/chat")({
  head: () => ({ meta: [{ title: "Live Chat — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminChatPage,
});

function AdminChatPage() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  const loadThreads = useCallback(async () => {
    const list = await chatListThreads();
    setThreads(list);
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!activeId) return;
    const batch = await chatPoll(activeId, lastIdRef.current);
    if (batch.length) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const next = [...prev];
        for (const m of batch) {
          if (!ids.has(m.id)) next.push(m);
        }
        return next;
      });
      lastIdRef.current = batch[batch.length - 1]?.id ?? lastIdRef.current;
    }
  }, [activeId]);

  useEffect(() => {
    void loadThreads();
    const id = window.setInterval(() => void loadThreads(), 4000);
    const unsub = subscribeChat(() => void loadThreads());
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      lastIdRef.current = undefined;
      return;
    }
    lastIdRef.current = undefined;
    setMessages([]);
    void loadMessages();
    const id = window.setInterval(() => void loadMessages(), 2000);
    const unsub = subscribeChat(() => void loadMessages());
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  const send = async () => {
    if (!active || !text.trim() || sending) return;
    setSending(true);
    try {
      const result = await chatSend({
        threadId: active.id,
        visitorId: active.visitorId,
        visitorName: active.visitorName,
        visitorEmail: active.visitorEmail,
        role: "admin",
        senderName: "Support Agent",
        text: text.trim(),
      });
      if (result) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === result.message.id)) return prev;
          return [...prev, result.message];
        });
        lastIdRef.current = result.message.id;
        setText("");
        void loadThreads();
      }
    } finally {
      setSending(false);
    }
  };

  const closeThread = async () => {
    if (!active) return;
    await chatClose(active.id);
    toast.success("Conversation closed");
    void loadThreads();
  };

  const openThreads = threads.filter((t) => t.status === "open");
  const closedThreads = threads.filter((t) => t.status === "closed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Live chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reply to customer conversations.
            {!isAppScriptConfigured() && (
              <span className="ml-1 text-amber-700 dark:text-amber-400">
                Demo mode uses this browser's localStorage (or set VITE_APP_SCRIPT_URL for Google Sheets).
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadThreads()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No chats yet. When a visitor opens the widget and messages, threads appear here.
              </div>
            )}
            {[...openThreads, ...closedThreads].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  activeId === t.id && "bg-primary/10",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{t.visitorName || "Guest"}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      t.status === "open"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t.lastMessage || t.visitorEmail || t.id}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden p-0">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-muted-foreground">
              <MessageCircle className="h-10 w-10 opacity-40" />
              <p className="text-sm">Select a conversation to reply</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{active.visitorName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {active.visitorEmail || active.visitorId}
                  </div>
                </div>
                {active.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => void closeThread()}>
                    <XCircle className="mr-1 h-3.5 w-3.5" /> Close
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "admin"
                        ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                        : "mr-auto rounded-bl-md bg-muted",
                    )}
                  >
                    <div className="mb-0.5 text-[10px] font-medium opacity-70">{m.senderName}</div>
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div className="mt-1 text-[10px] opacity-60">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {active.status === "open" && (
                <form
                  className="flex gap-2 border-t border-border p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply as support agent…"
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button type="submit" className="gradient-primary text-primary-foreground" disabled={sending || !text.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
