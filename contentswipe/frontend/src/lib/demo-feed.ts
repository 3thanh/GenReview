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
      "Hook: Most AI support tools are built for dashboards, not for the person answering the ticket.\n\nBeat 1: Show the moment an agent opens a chaotic thread.\nBeat 2: Overlay a draft reply, risk flags, and next-step suggestions.\nBeat 3: Founder to camera: 'The goal is not to replace the rep. It's to make every rep feel like your best one.'\n\nClose on the product and a waitlist CTA.",
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
  {
    id: "demo-video-onboarding-explainer",
    business_id: "demo-acme",
    session_id: "demo-video",
    content_type: "video",
    channel: "youtube",
    review_mode: "video",
    source_type: "brief",
    title: "Onboarding explainer: bulk import workflow",
    body_text:
      "Animated walkthrough showing how bulk contact imports trigger personalized welcome sequences without manual work.",
    script:
      "Scene 1: A spreadsheet with 200 contact rows drops into the app.\nScene 2: Each row fans out into individual welcome email cards.\nScene 3: Close-up on merge tags resolving per-contact — name, company, plan.\nScene 4: Dashboard showing 200/200 delivered, zero manual steps.\n\nNarrator: 'Bulk doesn't have to mean generic.'",
    image_url: null,
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    source_ref: "VID-34",
    source_bundle: null,
    prompt_input_summary: "YouTube explainer for bulk import + personalized onboarding",
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
    created_at: "2026-03-21T08:35:00.000Z",
    updated_at: "2026-03-21T08:35:00.000Z",
  },
  {
    id: "demo-video-ai-triage-ad",
    business_id: "demo-acme",
    session_id: "demo-video",
    content_type: "video",
    channel: "tiktok",
    review_mode: "video",
    source_type: "brief",
    title: "AI triage ad: the 15-second pitch",
    body_text:
      "Snappy ad format — problem → product → result in under 15 seconds. High energy, fast cuts.",
    script:
      "Beat 1 (3s): Agent staring at 47 unread tickets. Text: 'This is Monday.'\nBeat 2 (5s): AI scans, drafts, flags — tickets resolve in a cascade. Text: 'This is Monday with us.'\nBeat 3 (4s): Agent sipping coffee, inbox at zero. Logo + CTA.\n\nSFX: Mechanical keyboard → whoosh → ding.",
    image_url: null,
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
    thumbnail_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    source_ref: "VID-42",
    source_bundle: null,
    prompt_input_summary: "15-second TikTok ad for AI ticket triage product",
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
    created_at: "2026-03-21T08:42:00.000Z",
    updated_at: "2026-03-21T08:42:00.000Z",
  },
  {
    id: "demo-video-customer-story",
    business_id: "demo-acme",
    session_id: "demo-video",
    content_type: "video",
    channel: "instagram",
    review_mode: "video",
    source_type: "customer-story",
    title: "Customer story: how Driftwood cut response time by 60%",
    body_text:
      "Testimonial-style video mixing talking-head footage with product UI overlays and metric call-outs.",
    script:
      "Open on James (customer) talking about the old workflow: 'We were copy-pasting the same answers into 30 tickets a day.'\n\nCut to product UI: AI drafting replies, confidence badges, one-click send.\n\nJames: 'Now the reps focus on the hard stuff. The easy ones just... handle themselves.'\n\nEnd card: '60% faster response time. Zero extra hires.' + logo.",
    image_url: null,
    video_url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    source_ref: "VID-55",
    source_bundle: null,
    prompt_input_summary: "Customer testimonial video for Instagram featuring Driftwood case study",
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
    created_at: "2026-03-21T08:50:00.000Z",
    updated_at: "2026-03-21T08:50:00.000Z",
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
