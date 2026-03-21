import "dotenv/config";

const DUST_API_BASE = "https://dust.tt/api/v1";
const REQUEST_TIMEOUT_MS = 120_000;

function getConfig() {
  const apiKey = process.env.DUST_API_KEY?.trim();
  const workspaceId = process.env.DUST_WORKSPACE_ID?.trim();
  const agentId = process.env.DUST_AGENT_ID?.trim();

  if (!apiKey || !workspaceId || !agentId) {
    throw new Error(
      "Missing Dust config: set DUST_API_KEY, DUST_WORKSPACE_ID, DUST_AGENT_ID in environment"
    );
  }
  return { apiKey, workspaceId, agentId };
}

export interface DustReplyResult {
  reply: string;
  dustConversationId: string | null;
}

export async function generateDustReply(
  ticketText: string
): Promise<DustReplyResult> {
  const { apiKey, workspaceId, agentId } = getConfig();

  const prompt = `${ticketText}\n\nRespond in a short, simple human support response.`;

  const body = {
    message: {
      content: prompt,
      mentions: [{ configurationId: agentId }],
    },
    blocking: true,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(
      `${DUST_API_BASE}/w/${workspaceId}/assistant/conversations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Dust request timed out");
    }
    throw new Error(`Dust network error: ${err}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Dust rate limit (429)");
    if (res.status === 401) throw new Error("Dust auth failed (401)");
    if (res.status === 404)
      throw new Error("Dust not found (404) — check workspace/agent ID");
    throw new Error(`Dust API error (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();

  const conversationId: string | null =
    data?.conversation?.sId ?? data?.conversation?.id ?? null;

  const contentArray: unknown[] =
    data?.conversation?.content ?? [];

  const flatMessages = contentArray.flat() as Array<{
    type?: string;
    content?: string;
  }>;

  const agentMessage = flatMessages.find((m) => m.type !== "human");
  const reply = agentMessage?.content?.trim();

  if (!reply) {
    throw new Error(
      "Dust returned no agent reply — check DUST_AGENT_ID is the agent configuration ID"
    );
  }

  return { reply, dustConversationId: conversationId };
}
