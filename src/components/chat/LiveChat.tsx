import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { MessageCircle, X, Send, Loader2, Headphones, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/mock-auth";
import {
  chatSend,
  chatPoll,
  chatListThreads,
  chatClose,
  getOrCreateVisitorId,
  subscribeChat,
  isChatConfigured,
  type ChatMessage,
  type ChatThread,
} from "@/lib/live-chat";
import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";

/**
 * Floating live-chat widget mounted on every page.
 *
 * - Visitors / customers: open a support thread and chat.
 * - Logged-in admins: open the same icon to list open threads and reply
 *   as the support agent (works on admin routes and the public site).
 *
 * Backend: Supabase when configured; otherwise UI still renders in demo mode.
 */
export function LiveChat() {
  const { user, isAdmin } = useAuth();
  const loc = useLocation();
  const onAdminRoute = loc.pathname.startsWith("/admin");

  // Only hide the widget on admin login (no session yet)
  if (onAdminRoute && !isAdmin && loc.pathname.includes("/login")) {
    return null;
  }

  // Admin reply console when signed in as admin
  if (isAdmin) {
    return <AdminChatWidget />;
  }

  // Public / customer support widget
  return <CustomerChatWidget user={user} />;
}

/* -------------------------------------------------------------------------- */
/* Customer / visitor widget                                                  */
/* -------------------------------------------------------------------------- */

function CustomerChatWidget({
  user,
}: {
  user: ReturnType<typeof useAuth>["user"];
}) {
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
    const id = window.setInterval(() => void loadMessages(), 8000);
    const unsub = subscribeChat(() => void loadMessages());
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [open, threadId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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
        role: "customer",
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
    <ChatShell
      open={open}
      setOpen={setOpen}
      title="Bangue Herutage Support"
      subtitle={isChatConfigured() ? "Live · connected" : "Demo mode · local session"}
      launcherClassName="md:bottom-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
      panelClassName="md:bottom-24 bottom-[calc(9.5rem+env(safe-area-inset-bottom))]"
    >
      {!started ? (
        <div className="flex flex-1 flex-col justify-center gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            Chat with a support agent. Enter your name to begin.
          </p>
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
          <Input
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            type="email"
          />
          <Button
            className="h-11 gradient-primary text-primary-foreground"
            disabled={!name.trim()}
            onClick={() => setStarted(true)}
          >
            Start chat
          </Button>
        </div>
      ) : (
        <>
          <MessageList messages={messages} perspective="customer" bottomRef={bottomRef} emptyHint="Send a message to begin. An agent will reply here." />
          <Composer text={text} setText={setText} sending={sending} onSend={send} placeholder="Type a message…" />
        </>
      )}
    </ChatShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Admin widget — reply from the floating icon                                */
/* -------------------------------------------------------------------------- */

function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const openCount = threads.filter((t) => t.status === "open").length;

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const list = await chatListThreads();
      setThreads(list);
    } finally {
      setLoading(false);
    }
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

  // When opening, refresh threads
  useEffect(() => {
    if (!open) return;
    void loadThreads();
    const id = window.setInterval(() => void loadThreads(), 10000);
    const unsub = subscribeChat(() => {
      void loadThreads();
      void loadMessages();
    });
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [open, loadThreads, loadMessages]);

  // Load messages for active thread
  useEffect(() => {
    if (!open || !activeId) return;
    setMessages([]);
    lastIdRef.current = undefined;
    void loadMessages();
    const id = window.setInterval(() => void loadMessages(), 5000);
    return () => window.clearInterval(id);
  }, [open, activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

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
    setActiveId(null);
    void loadThreads();
  };

  return (
    <ChatShell
      open={open}
      setOpen={setOpen}
      title={active ? active.visitorName : "Live support desk"}
      subtitle={
        active
          ? active.visitorEmail || active.visitorId
          : isChatConfigured()
            ? `${openCount} open · Live`
            : `${openCount} open · Demo mode`
      }
      badge={openCount > 0 ? openCount : undefined}
      agent
      launcherClassName="md:bottom-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
      panelClassName="md:bottom-24 bottom-[calc(9.5rem+env(safe-area-inset-bottom))]"
      headerLeft={
        active ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => setActiveId(null)}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => void loadThreads()}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        )
      }
      headerRight={
        active && active.status === "open" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs text-white/90 hover:bg-white/10 hover:text-white"
            onClick={() => void closeThread()}
          >
            Close
          </Button>
        ) : null
      }
    >
      {!active ? (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {threads.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </span>
              ) : (
                "No conversations yet. When a visitor messages, threads appear here."
              )}
            </div>
          )}
          {[...threads.filter((t) => t.status === "open"), ...threads.filter((t) => t.status !== "open")].map(
            (t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className="flex w-full flex-col gap-0.5 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted touch-manipulation"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{t.visitorName}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      t.status === "open" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{t.lastMessage || "—"}</div>
                <div className="text-[10px] text-muted-foreground">
                  {t.updatedAt ? new Date(t.updatedAt).toLocaleString() : ""}
                </div>
              </button>
            ),
          )}
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            perspective="admin"
            bottomRef={bottomRef}
            emptyHint="No messages in this conversation yet."
          />
          {active.status === "open" ? (
            <Composer
              text={text}
              setText={setText}
              sending={sending}
              onSend={send}
              placeholder="Reply as support agent…"
            />
          ) : (
            <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
              This conversation is closed.
            </div>
          )}
        </>
      )}
    </ChatShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */

function ChatShell({
  open,
  setOpen,
  title,
  subtitle,
  children,
  badge,
  agent,
  launcherClassName,
  panelClassName,
  headerLeft,
  headerRight,
}: {
  open: boolean;
  setOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  title: string;
  subtitle: string;
  children: ReactNode;
  badge?: number;
  agent?: boolean;
  launcherClassName?: string;
  panelClassName?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed right-4 z-[60] grid h-14 w-14 place-items-center rounded-full shadow-elevated transition-transform hover:scale-105 active:scale-95 touch-manipulation",
          "gradient-primary text-primary-foreground",
          launcherClassName ?? "bottom-5",
        )}
        aria-label={open ? "Close live chat" : agent ? "Open support desk" : "Open live chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && badge != null && badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "fixed right-4 z-[60] flex h-[min(520px,70dvh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated",
            panelClassName ?? "bottom-24",
          )}
        >
          <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-[#0b1e3e] to-[#1a2f4a] px-3 py-3 text-white">
            {headerLeft}
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c9aa54]/20 text-[#c9aa54]">
              <Headphones className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{title}</div>
              <div className="truncate text-[11px] text-white/70">{subtitle}</div>
            </div>
            {headerRight}
            <button
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </>
  );
}

function MessageList({
  messages,
  perspective,
  bottomRef,
  emptyHint,
}: {
  messages: ChatMessage[];
  perspective: "customer" | "admin";
  bottomRef: RefObject<HTMLDivElement | null>;
  emptyHint: string;
}) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
      {messages.length === 0 && (
        <div className="rounded-xl bg-muted/50 p-3 text-center text-xs text-muted-foreground">{emptyHint}</div>
      )}
      {messages.map((m) => {
        const mine =
          perspective === "customer" ? m.role === "customer" : m.role === "admin";
        return (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              mine
                ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                : m.role === "system"
                  ? "mx-auto bg-muted/60 text-center text-xs text-muted-foreground"
                  : "mr-auto rounded-bl-md bg-muted",
            )}
          >
            {!mine && m.role !== "system" && (
              <div className="mb-0.5 text-[10px] font-medium opacity-70">{m.senderName}</div>
            )}
            <div className="whitespace-pre-wrap break-words">{m.text}</div>
            <div className={cn("mt-1 text-[10px] opacity-60", mine && "text-right")}>
              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function Composer({
  text,
  setText,
  sending,
  onSend,
  placeholder,
}: {
  text: string;
  setText: (v: string) => void;
  sending: boolean;
  onSend: () => void | Promise<void>;
  placeholder: string;
}) {
  return (
    <div className="border-t border-border p-2 sm:p-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void onSend();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="h-11 flex-1"
          disabled={sending}
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0 gradient-primary text-primary-foreground"
          disabled={sending || !text.trim()}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
