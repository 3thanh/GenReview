# ContentSwipe

An AI video generation + QA system. Studio defines what to generate → Pipeline produces video content → Feed is the review + decision layer.

## Quick Context

- **UI** is built in Loveable (separate) — it reads/writes Supabase directly
- **This repo** is the backend: generation pipeline, content API, feed manager
- **Supabase project:** `rnqkjfrwkyupkyvygtpg` at `https://rnqkjfrwkyupkyvygtpg.supabase.co`
- **Content types:** video only (script/render states) — support and social are out of V1 scope
- **V1 = video-only feed** across all sessions, ~20 items, no multi-view/tabs/lanes

## Data Model (V1)

```
business → session → content_item
```

### Tables

| Table | Purpose |
|-------|---------|
| **businesses** | Business entities |
| **sessions** | Creative sessions/campaigns within a business |
| **content_items** | Core object — every card in the feed. Replaces old `content_queue`. |
| **generation_jobs** | Pipeline work queue |
| **prompt_templates** | Editable prompt templates |
| **review_events** | (optional) Audit log for review actions |

### content_items key fields

- **Classification:** `content_type` (video), `channel` (tiktok/instagram/youtube/etc.), `review_mode`, `source_type`
- **Payload:** `title`, `body_text`, `script`, `image_url`, `video_url`, `thumbnail_url`
- **Source provenance:** `source_ref`, `source_bundle` (JSON), `prompt_input_summary`
- **Review:** `review_status` (pending/approved/rejected/needs_edit), `review_note`, `reviewed_by`, `reviewed_at`
- **Special state:** `starred` (boolean), `down_arrow_designation`
- **Generation:** `generation_job_id`, `generation_status`, `model_name`, `prompt_template_id`
- **Lineage:** `parent_id`, `variant_of`

## V1 Scope — What To Build

- Video-only feed across all sessions (~20 items, cached for demo)
- Video content type only — support and social removed from V1
- One prompt → multiple content_items (video)
- Editing triggers regeneration (live generation inputs, not static edits)
- Starred/special designation persisted in backend
- Source-aware: every item retains source_type, source_ref, source_bundle
- Channel-aware: channel field on every item
- Variant lineage via parent_id / variant_of
- Clean classification metadata for future views

## V2 — Intercom Ticket Storage

Store and surface Intercom support tickets as a content source. Tickets feed into the system but generation remains video-focused. Support ticket data model, Intercom API integration, and support QA review mode live here.

## V3 — Explicitly Out of Scope

Do NOT build: multi-view feed, view system, persona-driven routing, advanced review modes, batch actions, undo system, advanced generation controls, brand/style kit, configurable tabs, social content type. System should remain compatible with these futures.

## What's Built

- **Content API** (`src/lib/content-api.ts`): paginated feed, swipe actions, undo, batch ops, generation trigger, history, search, analytics, realtime
- **Feed Manager** (`src/lib/feed-manager.ts`): stateful swipe orchestrator with card queue, prefetching, undo stack, session stats
- **Persona System** (`src/lib/personas.ts`): video-focused review mode — config only in v1, does not drive feed routing
- **Feed Analytics** (`src/lib/feed-analytics.ts`): performance metrics, leaderboard, time-series, variant analysis
- **Generation Pipeline**: Gemini script → ElevenLabs audio + Veo video (parallel) → FFmpeg compose
- **Feedback Loop**: watches for variant/ideas requests, creates new generation jobs
- Prompt templates with Supabase overrides + local JSON defaults

## Key Commands

```bash
npm run worker    # Start video generation worker
npm run feedback  # Start feedback loop processor
npm run seed      # Seed test business + sample cards
npm run typecheck # TypeScript check
```

## Architecture

```
User → Studio (Loveable UI)
         │
         ├→ triggerGeneration() → content_items + generation_jobs
         │   (one prompt → multiple content_items)
         │
         ▼
  Generation Worker (this repo)
    Phase 1: Gemini plans script
    Phase 2: ElevenLabs audio ∥ Veo video
    Phase 3: FFmpeg compose
    Phase 4: Upload → Supabase Storage
         │
         ▼
  content_items updated (video_url, generation_status)
         │
         ▼
  Feed (Loveable UI) ← subscribeToFeedChanges()
    Mixed feed — all content types, all sessions
    Cards render by type: screenshot-first / text-first / video
    →  approve       │  ← reject + review_note
    ↑  variant       │  ↓ star/special designation
         │
         ▼
  Feedback Loop (this repo)
    Creates new generation jobs from feedback
```

## Feed Contract

Backend returns enough data for frontend to:
- Render mixed feed with different card styles per content_type
- Support editing + regeneration
- Support starred state
- Distinguish source types (screenshot vs text vs video)

Backend does NOT hardcode UI assumptions or assume one layout for all cards.

## Generation Contract

**Inputs:** prompt/brief, uploaded assets, screenshots, URLs, references, personas (config only), style/brand context

**Output:** multiple content_items per request, each with source provenance

## Important Guardrails

1. Metadata is clean and structured — no string parsing or implicit assumptions
2. Content items are flexible — not all are text-first
3. No hardcoded view assumptions — future views will filter by classification fields
4. Future compatibility without overbuilding — classification fields exist, routing does not

## File Structure

```
src/
  lib/
    supabase.ts         — Supabase client init
    content-api.ts      — Full feed API (25+ functions)
    feed-manager.ts     — Stateful FeedManager class
    personas.ts         — Persona definitions + registry (config only in v1)
    feed-analytics.ts   — Performance metrics + reporting
  pipeline/
    script-planner.ts   — Phase 1: Gemini → structured VideoScript
    audio-generator.ts  — Phase 2a: ElevenLabs TTS + SFX
    video-generator.ts  — Phase 2b: Veo 3.1 video gen
    compositor.ts       — Phase 3: FFmpeg audio + video merge
    video-worker.ts     — Orchestrator: claims jobs, runs phases 1-4
    feedback-loop.ts    — Watches for variant/ideas, creates new jobs
    prompt-engine.ts    — Template resolution (Supabase overrides + local)
  templates/
    default-video-script.json
    variant-modifier.json
    brainstorm.json
  scripts/
    seed-test-content.ts
  types/
    database.ts         — Supabase types + feed/session/persona types
```

## Env Vars

```
SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, ELEVENLABS_API_KEY
```
