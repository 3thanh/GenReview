import "dotenv/config";

const INTERCOM_API_BASE = "https://api.intercom.io";
const API_VERSION = "2.11";

function getConfig() {
  const token = process.env.INTERCOM_ACCESS_TOKEN?.trim();
  const adminId = process.env.INTERCOM_ADMIN_ID?.trim();
  if (!token) throw new Error("Missing INTERCOM_ACCESS_TOKEN in environment");
  if (!adminId) throw new Error("Missing INTERCOM_ADMIN_ID in environment");
  return { token, adminId };
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Intercom-Version": API_VERSION,
  };
}

// ── Types ────────────────────────────────────────────────────────

export interface IntercomContact {
  id: string;
  name: string | null;
  email: string | null;
  type: string;
}

export interface IntercomAdmin {
  id: string;
  name: string | null;
  email: string | null;
  type: string;
}

export interface IntercomConversationPart {
  id: string;
  part_type: string;
  body: string | null;
  author: {
    id: string;
    type: string; // "admin" | "user" | "bot"
    name: string | null;
    email: string | null;
  };
  created_at: number;
}

export interface IntercomConversation {
  id: string;
  title: string | null;
  state: string; // "open" | "closed" | "snoozed"
  open: boolean;
  created_at: number;
  updated_at: number;
  waiting_since: number | null;
  assignee: { id: string | null; type: string } | null;
  source: {
    type: string;
    body: string | null;
    author: {
      id: string;
      type: string;
      name: string | null;
      email: string | null;
    };
    delivered_as: string;
  };
  contacts: { contacts: IntercomContact[] };
  conversation_parts: {
    conversation_parts: IntercomConversationPart[];
    total_count: number;
  };
  statistics?: {
    time_to_assignment: number | null;
    time_to_admin_reply: number | null;
    time_to_first_close: number | null;
    time_to_last_close: number | null;
    median_time_to_reply: number | null;
    first_contact_reply_at: number | null;
    first_assignment_at: number | null;
    first_admin_reply_at: number | null;
    first_close_at: number | null;
    last_assignment_at: number | null;
    last_assignment_admin_reply_at: number | null;
    last_contact_reply_at: number | null;
    last_admin_reply_at: number | null;
    last_close_at: number | null;
    last_closed_by_id: string | null;
    count_reopens: number;
    count_assignments: number;
    count_conversation_parts: number;
  };
}

export interface IntercomConversationListPage {
  type: string;
  conversations: IntercomConversation[];
  total_count: number;
  pages: {
    type: string;
    next?: { page: number; starting_after: string };
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// ── API Methods ──────────────────────────────────────────────────

export async function listUnassignedConversations(
  perPage = 20,
  startingAfter?: string
): Promise<IntercomConversationListPage> {
  const { token } = getConfig();

  const body: Record<string, unknown> = {
    query: {
      operator: "AND",
      value: [
        { field: "open", operator: "=", value: true },
        { field: "admin_assignee_id", operator: "=", value: "0" }, // unassigned
      ],
    },
    pagination: { per_page: perPage },
  };

  if (startingAfter) {
    (body.pagination as Record<string, unknown>).starting_after = startingAfter;
  }

  const res = await fetch(`${INTERCOM_API_BASE}/conversations/search`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intercom search failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<IntercomConversationListPage>;
}

export async function getConversation(
  conversationId: string
): Promise<IntercomConversation> {
  const { token } = getConfig();

  const res = await fetch(
    `${INTERCOM_API_BASE}/conversations/${conversationId}?display_as=plaintext`,
    { headers: headers(token) }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Intercom get conversation failed (${res.status}): ${text}`
    );
  }

  return res.json() as Promise<IntercomConversation>;
}

export async function replyToConversation(
  conversationId: string,
  messageBody: string,
  messageType: "comment" | "note" = "comment"
): Promise<IntercomConversation> {
  const { token, adminId } = getConfig();

  const res = await fetch(
    `${INTERCOM_API_BASE}/conversations/${conversationId}/reply`,
    {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        message_type: messageType,
        type: "admin",
        admin_id: adminId,
        body: messageBody,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intercom reply failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<IntercomConversation>;
}

export async function getMe(): Promise<IntercomAdmin> {
  const { token } = getConfig();

  const res = await fetch(`${INTERCOM_API_BASE}/me`, {
    headers: headers(token),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Intercom /me failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<IntercomAdmin>;
}

export function conversationPartCount(convo: IntercomConversation): number {
  return convo.conversation_parts?.conversation_parts?.length ?? 0;
}

export function hasAdminReplyAfter(
  convo: IntercomConversation,
  afterTimestamp: number
): boolean {
  const parts = convo.conversation_parts?.conversation_parts ?? [];
  return parts.some(
    (p) =>
      p.author.type === "admin" &&
      p.created_at > afterTimestamp &&
      p.part_type === "comment"
  );
}

export function formatConversationAsText(
  convo: IntercomConversation
): string {
  const lines: string[] = [];
  const contact =
    convo.contacts?.contacts?.[0] ??
    convo.source?.author;

  if (contact) {
    lines.push(
      `Customer: ${contact.name ?? "Unknown"} (${contact.email ?? "no email"})`
    );
  }

  if (convo.source?.body) {
    lines.push(`\n[Initial message]`);
    lines.push(stripHtml(convo.source.body));
  }

  const parts = convo.conversation_parts?.conversation_parts ?? [];
  for (const part of parts) {
    if (!part.body) continue;
    const role =
      part.author.type === "admin" || part.author.type === "bot"
        ? "Agent"
        : "Customer";
    const name = part.author.name ?? role;
    lines.push(`\n[${name} — ${role}]`);
    lines.push(stripHtml(part.body));
  }

  return lines.join("\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
