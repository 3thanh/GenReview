import type { ContentItem } from "../types/database";
import type { Persona } from "./personas";

function cloneJson<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneCard(card: ContentItem): ContentItem {
  return {
    ...card,
    metadata: cloneJson(card.metadata),
    source_bundle: cloneJson(card.source_bundle),
  };
}

const DEMO_CARDS: ContentItem[] = [
  {
    id: "demo-support-bulk-import",
    business_id: "demo-acme",
    session_id: "demo-support",
    content_type: "support",
    channel: "intercom",
    review_mode: "support",
    source_type: "thread",
    title: "Bulk import welcome email escalation",
    body_text:
      "Hi Peter,\n\nGood news, the bulk import trigger does support per-contact personalization. When the `bulk_import.completed` event fires, it includes the contact IDs so your workflow can iterate through each person individually.\n\nHere’s the cleanest setup:\n1. Change the trigger from `contact.created` to `bulk_import.completed`\n2. Add a `For Each Contact` step after the trigger\n3. Reuse your existing welcome template inside the loop so merge tags resolve per contact\n\nI can send over a sample workflow JSON if that helps.",
    script: null,
    image_url: null,
    video_url: null,
    thumbnail_url: null,
    source_ref: "TKT-2048",
    source_bundle: null,
    prompt_input_summary: "Customer asked whether bulk imports can still send personalized welcome emails",
    review_status: "pending",
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    starred: false,
    down_arrow_designation: null,
    generation_job_id: null,
    generation_status: "completed",
    model_name: "gpt-5.4",
    prompt_template_id: null,
    parent_id: null,
    variant_of: null,
    metadata: {
      conversation: {
        customer: { name: "Peter Klutte", email: "peter@acme.io" },
        channel: "intercom",
        ai_confidence: 0.94,
        messages: [
          {
            role: "customer",
            text:
              "Ok that makes sense, but we also need to send personalized welcome emails per contact, not a single batch notification. Can the bulk trigger still do that?",
            timestamp: "2026-03-21T07:52:00.000Z",
            sender_name: "Peter Klutte",
          },
          {
            role: "bot",
            text:
              "I'm not able to confirm whether the bulk import trigger supports per-contact personalization in workflows. Let me escalate this to someone who can help.",
            timestamp: "2026-03-21T07:52:30.000Z",
            sender_name: "Fin AI",
            status: "failed",
          },
          {
            role: "customer",
            text:
              "Please do, this is blocking our onboarding flow for new users. We have 200+ contacts queued up waiting for welcome emails.",
            timestamp: "2026-03-21T07:55:00.000Z",
            sender_name: "Peter Klutte",
          },
        ],
      },
    },
    created_at: "2026-03-21T07:56:00.000Z",
    updated_at: "2026-03-21T07:56:00.000Z",
  },
  {
    id: "demo-social-launch-post",
    business_id: "demo-acme",
    session_id: "demo-social",
    content_type: "social",
    channel: "linkedin",
    review_mode: "social",
    source_type: "campaign",
    title: "Launch post for AI inbox triage",
    body_text:
      "Most support teams are still stitching together macros, tags, and hope.\n\nWe built a triage layer that reads the thread, drafts the next best reply, and flags risk before it hits your queue.\n\nThe result:\n- Faster first response times\n- Cleaner escalation paths\n- More confidence for every frontline rep\n\nWe’re opening up a small pilot group next month. Comment `triage` if you want early access.",
    script: null,
    image_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    video_url: null,
    thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    source_ref: "CMP-101",
    source_bundle: null,
    prompt_input_summary: "LinkedIn launch announcement for support AI workflow product",
    review_status: "pending",
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    starred: true,
    down_arrow_designation: null,
    generation_job_id: null,
    generation_status: "completed",
    model_name: "gpt-5.4",
    prompt_template_id: null,
    parent_id: null,
    variant_of: null,
    metadata: null,
    created_at: "2026-03-21T08:05:00.000Z",
    updated_at: "2026-03-21T08:05:00.000Z",
  },
  {
    id: "demo-video-founder-reel",
    business_id: "demo-acme",
    session_id: "demo-video",
    content_type: "video",
    channel: "tiktok",
    review_mode: "video",
    source_type: "brief",
    title: "Founder reel: what support agents actually need from AI",
    body_text:
      "Fast-cut founder monologue with product UI inserts. Tone is sharp, direct, and optimistic.",
    script:
      "Hook: Most AI support tools are built for dashboards, not for the person answering the ticket.\n\nBeat 1: Show the moment an agent opens a chaotic thread.\nBeat 2: Overlay a draft reply, risk flags, and next-step suggestions.\nBeat 3: Founder to camera: 'The goal is not to replace the rep. It’s to make every rep feel like your best one.'\n\nClose on the product and a waitlist CTA.",
    image_url: null,
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
    source_ref: "BRF-77",
    source_bundle: null,
    prompt_input_summary: "Short founder-led product teaser for TikTok and Reels",
    review_status: "pending",
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    starred: false,
    down_arrow_designation: null,
    generation_job_id: null,
    generation_status: "completed",
    model_name: "veo-3.1",
    prompt_template_id: null,
    parent_id: null,
    variant_of: null,
    metadata: null,
    created_at: "2026-03-21T08:12:00.000Z",
    updated_at: "2026-03-21T08:12:00.000Z",
  },
  {
    id: "demo-support-saml",
    business_id: "demo-acme",
    session_id: "demo-support",
    content_type: "support",
    channel: "intercom",
    review_mode: "support",
    source_type: "thread",
    title: "SAML certificate rollover diagnosis",
    body_text:
      "Hi James,\n\nI found the issue. Our validator still had your previous certificate stored as the primary signer, so it was rejecting the new response before trying the rotated one.\n\nI’ve cleared the stale certificate path and reset the cached SAML session on our side. Please try signing in again now. If it still fails, send me the timestamp of the next attempt and I’ll pull the trace immediately.",
    script: null,
    image_url: null,
    video_url: null,
    thumbnail_url: null,
    source_ref: "TKT-1981",
    source_bundle: null,
    prompt_input_summary: "Enterprise SAML login issue after cert rollover",
    review_status: "pending",
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    starred: false,
    down_arrow_designation: null,
    generation_job_id: null,
    generation_status: "completed",
    model_name: "gpt-5.4",
    prompt_template_id: null,
    parent_id: null,
    variant_of: null,
    metadata: {
      conversation: {
        customer: { name: "James Okafor", email: "james@driftwood.io" },
        channel: "intercom",
        ai_confidence: 0.88,
        messages: [
          {
            role: "customer",
            text:
              "ACS URL is correct. We only rotated the signing certificate. We do not use encryption, and Okta is NTP-synced.",
            timestamp: "2026-03-21T08:08:00.000Z",
            sender_name: "James Okafor",
          },
          {
            role: "agent",
            text:
              "I’m on it. I can already see a likely mismatch in the certificate validation order. Give me a couple minutes to confirm.",
            timestamp: "2026-03-21T08:12:00.000Z",
            sender_name: "Ethan Huang",
          },
        ],
      },
    },
    created_at: "2026-03-21T08:16:00.000Z",
    updated_at: "2026-03-21T08:16:00.000Z",
  },
  {
    id: "demo-social-customer-story",
    business_id: "demo-acme",
    session_id: "demo-social",
    content_type: "social",
    channel: "twitter",
    review_mode: "social",
    source_type: "customer-story",
    title: "Customer story thread for onboarding wins",
    body_text:
      "A customer imported 200+ contacts and expected onboarding to stall.\n\nInstead, every welcome email still went out personalized, in sequence, and with zero manual cleanup.\n\nThat’s the difference between 'bulk action' and 'bulk action with the right workflow model.'\n\nProduct details matter.",
    script: null,
    image_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    video_url: null,
    thumbnail_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    source_ref: "SOC-318",
    source_bundle: null,
    prompt_input_summary: "Short customer-proof social thread",
    review_status: "pending",
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    starred: false,
    down_arrow_designation: null,
    generation_job_id: null,
    generation_status: "completed",
    model_name: "gpt-5.4-mini",
    prompt_template_id: null,
    parent_id: null,
    variant_of: null,
    metadata: null,
    created_at: "2026-03-21T08:22:00.000Z",
    updated_at: "2026-03-21T08:22:00.000Z",
  },
  {
    id: "demo-video-product-tour",
    business_id: "demo-acme",
    session_id: "demo-video",
    content_type: "video",
    channel: "instagram",
    review_mode: "video",
    source_type: "brief",
    title: "Product tour: from messy thread to clean draft",
    body_text:
      "Screen-recording style walkthrough with annotations on confidence scoring and escalation moments.",
    script:
      "Open on a noisy inbox. Zoom into the exact customer ask. Show the draft reply being assembled line by line, then pause on the risk badge and escalation suggestion. End with the line: 'Less queue triage. More real customer work.'",
    image_url: null,
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
    thumbnail_url: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=1200&q=80",
    source_ref: "VID-21",
    source_bundle: null,
    prompt_input_summary: "Annotated product tour for Instagram reels",
    review_status: "pending",
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    starred: true,
    down_arrow_designation: null,
    generation_job_id: null,
    generation_status: "completed",
    model_name: "veo-3.1",
    prompt_template_id: null,
    parent_id: null,
    variant_of: null,
    metadata: null,
    created_at: "2026-03-21T08:28:00.000Z",
    updated_at: "2026-03-21T08:28:00.000Z",
  },
];

export function getSeededDemoCards(persona: Persona): ContentItem[] {
  return DEMO_CARDS
    .filter((card) => persona.contentTypes.includes(card.content_type))
    .map(cloneCard)
    .sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime()
    );
}

