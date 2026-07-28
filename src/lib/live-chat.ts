import { supabase, isSupabaseConfigured } from "./supabase";

export interface ChatMessage {
  id: string;
  threadId: string;
  role: "customer" | "admin" | "system";
  senderName: string;
  text: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  visitorId: string;
  visitorName: string;
  visitorEmail: string;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

const VISITOR_KEY = "bangue_chat_visitor_id";

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = genId("vis");
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function rowToThread(r: Record<string, unknown>): ChatThread {
  return {
    id: r.id as string,
    visitorId: r.visitor_id as string,
    visitorName: r.visitor_name as string,
    visitorEmail: r.visitor_email as string,
    status: r.status as "open" | "closed",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    lastMessage: r.last_message as string,
  };
}

function rowToMessage(r: Record<string, unknown>): ChatMessage {
  return {
    id: r.id as string,
    threadId: r.thread_id as string,
    role: r.role as "customer" | "admin" | "system",
    senderName: r.sender_name as string,
    text: r.text as string,
    createdAt: r.created_at as string,
  };
}

export async function chatSend(input: {
  threadId?: string;
  visitorId: string;
  visitorName: string;
  visitorEmail: string;
  role: "customer" | "admin";
  senderName: string;
  text: string;
}): Promise<{ thread: ChatThread; message: ChatMessage } | null> {
  const text = input.text.trim();
  if (!text || !supabase) return null;

  let threadId = input.threadId;

  if (!threadId) {
    const { data: existing } = await supabase
      .from("chat_threads")
      .select("*")
      .eq("visitor_id", input.visitorId)
      .eq("status", "open")
      .maybeSingle();
    threadId = existing?.id;
  }

  let threadRow: Record<string, unknown> | null = null;

  if (threadId) {
    const { data } = await supabase
      .from("chat_threads")
      .update({
        visitor_name: input.visitorName || "Guest",
        visitor_email: input.visitorEmail || "",
        updated_at: new Date().toISOString(),
        last_message: text,
        status: "open",
      })
      .eq("id", threadId)
      .select()
      .single();
    threadRow = data;
  } else {
    const { data } = await supabase
      .from("chat_threads")
      .insert({
        id: genId("th"),
        visitor_id: input.visitorId,
        visitor_name: input.visitorName || "Guest",
        visitor_email: input.visitorEmail || "",
        status: "open",
        last_message: text,
      })
      .select()
      .single();
    threadRow = data;
  }

  if (!threadRow) return null;

  const { data: msgData } = await supabase
    .from("chat_messages")
    .insert({
      id: genId("msg"),
      thread_id: threadRow.id,
      role: input.role,
      sender_name: input.senderName,
      text,
    })
    .select()
    .single();

  if (!msgData) return null;

  return { thread: rowToThread(threadRow), message: rowToMessage(msgData) };
}

export async function chatPoll(threadId: string, afterId?: string): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const all = (data ?? []).map(rowToMessage);
  if (!afterId) return all;
  const idx = all.findIndex((m) => m.id === afterId);
  return idx >= 0 ? all.slice(idx + 1) : all;
}

export async function chatListThreads(): Promise<ChatThread[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("chat_threads")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []).map(rowToThread);
}

export async function chatClose(threadId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("chat_threads")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", threadId);
}

/**
 * Real Postgres realtime subscription — pushes updates instantly instead of
 * polling. Replaces the old localStorage/BroadcastChannel approach.
 */
export function subscribeChat(cb: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channelName = `chat-updates-${Math.random().toString(36).slice(2)}`;
  const channel = client
    .channel(channelName)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => cb())
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => cb())
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export function isChatConfigured() {
  return isSupabaseConfigured();
}