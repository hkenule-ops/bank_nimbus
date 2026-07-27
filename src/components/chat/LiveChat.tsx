import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/mock-auth";
import {
  chatSend,
  chatPoll,
  getOrCreateVisitorId,
  subscribeChat,
  type ChatMessage,
} from "@/lib/live-chat";
import { isAppScriptConfigured } from "@/lib/appscript";
import { cn } from "@/lib/utils";

/**
 * Floating live-chat widget mounted on every page.
 * Backend: Google Apps Script + Sheet when VITE_APP_SCRIPT_URL is set;
 * otherwise localStorage (same-browser demo).
 */
export function LiveChat() {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  // Prefill identity from auth
  useEffect(() => {
    if (user) {
      setName(`${user.firstName} ${user.lastName}`.trim() || user.username);
      setEmail(user.email);
      setStarted(true);
    }
  }, [user]);

  const visitorId = typeof window !== "undefined" ? getOrCreateVisitorId() : "ssr";

  const loadMessages = useCallback(async () => {
    if (!threadId) return;
    const batch = await chatPoll(threadId, lastIdRef.current);
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
  }, [threadId]);

  useEffect(() => {
    if (!open || !threadId) return;
    void loadMessages();
    const id = window.setInterval(() => void loadMessages(), 2500);
    const unsub = subscribeChat(() => void loadMessages());
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [open, threadId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Don't show the customer widget on admin console routes (admins use /admin/chat)
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    if (!started) {
      if (!name.trim()) return;
      setStarted(true);
    }
    setSending(true);
    try {
      const result = await chatSend({
        threadId: threadId ?? undefined,
        visitorId,
        visitorName: name.trim() || "Guest",
        visitorEmail: email.trim(),
        role: isAdmin ? "admin" : "customer",
        senderName: name.trim() || "Guest",
        text: body,
      });
      if (result) {
        setThreadId(result.thread.id);
        setMessages((prev) => {
          if (prev.some((m) => m.id === result.message.id)) return prev;
          return [...prev, result.message];
        });
        lastIdRef.current = result.message.id;
        setText("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full shadow-elevated transition-transform hover:scale-105 active:scale-95",
          "gradient-primary text-primary-foreground",
        )}
        aria-label={open ? "Close live chat" : "Open live chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:bottom-24">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-[#0b1e3e] to-[#1a2f4a] px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#c9aa54]/20 text-[#c9aa54]">
              <Headphones className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">Bangue Herutage Support</div>
              <div className="text-[11px] text-white/70">
                {isAppScriptConfigured() ? "Live · connected" : "Demo mode · local session"}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/10" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!started ? (
            <div className="flex flex-1 flex-col justify-center gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                Start a conversation with our support team. We'll respond as soon as an agent is available.
              </p>
              <div>
                <label className="text-xs font-medium">Your name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Email (optional)</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" className="mt-1" />
              </div>
              <Button
                className="gradient-primary text-primary-foreground"
                disabled={!name.trim()}
                onClick={() => setStarted(true)}
              >
                Start chat
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="rounded-xl bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                    Send a message to begin. An agent will reply here.
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "customer"
                        ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                        : m.role === "admin"
                          ? "mr-auto rounded-bl-md bg-muted"
                          : "mx-auto bg-muted/60 text-center text-xs text-muted-foreground",
                    )}
                  >
                    {m.role !== "customer" && (
                      <div className="mb-0.5 text-[10px] font-medium opacity-70">{m.senderName}</div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div className={cn("mt-1 text-[10px] opacity-60", m.role === "customer" ? "text-right" : "")}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border p-3">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button type="submit" size="icon" className="gradient-primary text-primary-foreground shrink-0" disabled={sending || !text.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
