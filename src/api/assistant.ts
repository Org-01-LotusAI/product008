export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type IssueDraft = {
  owner: string;
  repo: string;
  title: string;
  body: string;
};

export type AssistantReply = IssueDraft & {
  reply: string;
  readyForApproval: boolean;
};

export type CreatedIssue = {
  number: number;
  url: string;
  title: string;
  repo: string;
};

export type AssistantHealth = {
  ok: boolean;
  defaultOwner: string;
  defaultRepo: string;
  error?: string | null;
};

const PRODUCTION_API = "https://product008-ai-backend.vercel.app";

export function assistantHealth() {
  return request<AssistantHealth>("/api/health");
}

export function sendChat(messages: ChatTurn[]) {
  return request<AssistantReply>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}

export function createIssue(draft: IssueDraft) {
  return request<CreatedIssue>("/api/issues", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

function apiUrl(path: string) {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ?? "";
  const base = configured || (import.meta.env.PROD ? PRODUCTION_API : "");
  return `${base}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || "The assistant could not complete that.");
  }
  if (!payload) throw new Error("The assistant returned an empty response.");
  return payload;
}
