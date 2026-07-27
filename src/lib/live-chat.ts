import { appScriptRequest, isAppScriptConfigured } from "./appscript";

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

const THREAD_KEY = "bangue_chat_threads_v1";
const MSG_KEY = "bangue_chat_messages_v1";
const VISITOR_KEY = "bangue_chat_visitor_id";
const CHANNEL = "bangue_chat_sync";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  try {
    localStorage.setItem(CHANNEL, String(Date.now()));
  } catch {
    /* ignore */
  }
}

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
  if (!text) return null;

  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<{ thread: ChatThread; message: ChatMessage }>("chatSend", input);
    if (res.ok && res.data) return res.data;
  }

  const threads = readJson<ChatThread[]>(THREAD_KEY, []);
  let thread = input.threadId ? threads.find((t) => t.id === input.threadId) : undefined;

  if (!thread) {
    // Prefer an open thread for this visitor
    thread = threads.find((t) => t.visitorId === input.visitorId && t.status === "open");
  }

  if (!thread) {
    thread = {
      id: genId("th"),
      visitorId: input.visitorId,
      visitorName: input.visitorName || "Guest",
      visitorEmail: input.visitorEmail || "",
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: text,
    };
    threads.unshift(thread);
  } else {
    thread = {
      ...thread,
      visitorName: input.visitorName || thread.visitorName,
      visitorEmail: input.visitorEmail || thread.visitorEmail,
      updatedAt: new Date().toISOString(),
      lastMessage: text,
      status: "open",
    };
    const idx = threads.findIndex((t) => t.id === thread!.id);
    if (idx >= 0) threads[idx] = thread;
  }

  const message: ChatMessage = {
    id: genId("msg"),
    threadId: thread.id,
    role: input.role,
    senderName: input.senderName,
    text,
    createdAt: new Date().toISOString(),
  };

  const messages = readJson<ChatMessage[]>(MSG_KEY, []);
  messages.push(message);
  writeJson(THREAD_KEY, threads.slice(0, 200));
  writeJson(MSG_KEY, messages.slice(-2000));

  return { thread, message };
}

export async function chatPoll(threadId: string, afterId?: string): Promise<ChatMessage[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<ChatMessage[]>("chatPoll", { threadId, afterId });
    if (res.ok && res.data) return Array.isArray(res.data) ? res.data : [];
  }

  const messages = readJson<ChatMessage[]>(MSG_KEY, []).filter((m) => m.threadId === threadId);
  if (!afterId) return messages;
  const idx = messages.findIndex((m) => m.id === afterId);
  return idx >= 0 ? messages.slice(idx + 1) : messages;
}

export async function chatListThreads(): Promise<ChatThread[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<ChatThread[]>("chatListThreads", {});
    if (res.ok && res.data) return Array.isArray(res.data) ? res.data : [];
  }
  return readJson<ChatThread[]>(THREAD_KEY, []);
}

export async function chatClose(threadId: string): Promise<void> {
  if (isAppScriptConfigured()) {
    await appScriptRequest("chatClose", { threadId });
  }
  const threads = readJson<ChatThread[]>(THREAD_KEY, []);
  const idx = threads.findIndex((t) => t.id === threadId);
  if (idx >= 0) {
    threads[idx] = { ...threads[idx], status: "closed", updatedAt: new Date().toISOString() };
    writeJson(THREAD_KEY, threads);
  }
}

export function subscribeChat(cb: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === THREAD_KEY || e.key === MSG_KEY || e.key === CHANNEL) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
