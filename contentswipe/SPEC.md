# ContentSwipe — Full Spec & Agent Handoff

**Version:** 0.3 | **Status:** In Development
**Stack:** Supabase (DB + Storage + Realtime), Vercel (deploy), Gemini (script planning + video gen), ElevenLabs (TTS + SFX), FFmpeg (composition)

---

## 0. Product Framing

ContentSwipe is an **AI content QA + generation system**, not just a generator.

**Flow:**

```
Studio/Setup → Generation → Feed (review + decision layer)
```

- **Studio/Setup** defines what to generate (prompts, assets, context)
- **Generation** produces content items (cards) via the pipeline
- **Feed** is the review + decision layer where users approve, reject, edit, and regenerate

Each content item is: **source-aware**, **channel-aware**, **reviewable**, **editable**, **regeneratable**.

---

## 1. V1 Core Scope

### 1.1 Feed

- **One feed only** — mixed feed of all content across all sessions
- Default = effectively "All Content"
- Cache results for demo purposes
- Support ~20 items for now
- Simple loading page is fine

**Explicitly NOT in v1:**

- Multi-view feed
- Tabs / lanes
- Routing between views
- Filtering by persona/view

### 1.2 Content Types (V1 = video only)

Only video content is in V1 scope. Support (Intercom tickets) is V2. Social is V3.

| Type | Primary Asset | Version | Notes |
|------|--------------|---------|-------|
| **Video** | Script / concept / render | V1 | May not always have final video yet. Script → render state progression. |
| **Support** | Screenshot / thread | V2 | Intercom ticket storage and review. |
| **Social** | Text | V3 | User-defined channel (LinkedIn, etc.). Text-first but flexible. |

### 1.3 Generation Behavior

- One prompt can generate **multiple content items**
- Each output = a `content_item`
- Respect existing generation pipeline already implemented
- Do not re-architect generation unless required

**Incomplete assets:**

- Only allow incomplete assets into the system according to existing generation-step logic
- Do not introduce new partial states beyond what already exists

### 1.4 Editing Behavior

- Users can edit all fields
- Editing triggers regeneration/update
- Treat edits as **live generation inputs**, not static edits

### 1.5 Starred / Special Designation

A persistent starred/drafted state:

- `starred` = special designation (same conceptual class as "down arrow" bucket/store group)
- Backend stores this explicitly (not frontend-only)
- Future: may become a dedicated grouping/store

### 1.6 Sessions

- Sessions exist and generation happens within sessions
- Feed shows content **across all sessions**
- Do not scope feed to one session

---

## 2. Architecture — Two Workstreams

### Workstream A: Swipe Feed UI (Loveable → this repo's frontend)

The **UI is built in Loveable** and reads/writes Supabase directly. It does NOT handle generation — it only displays content and captures user decisions.

### Workstream B: Generation Pipeline (this repo's `src/pipeline/`)

A background worker that:
1. Plans scripts (Gemini)
2. Generates audio (ElevenLabs) and video (Veo) in parallel
3. Composes the final video (FFmpeg)
4. Uploads to Supabase Storage and updates content items

---

## 3. Core Data Model

### 3.1 Hierarchy

```
business → session → content_item
```

### 3.2 Tables

#### `businesses`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| name | TEXT NOT NULL | Business name |
| created_at | TIMESTAMPTZ | auto |

#### `sessions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| business_id | UUID FK → businesses | Which business this session belongs to |
| name | TEXT NOT NULL | Session/campaign name |
| created_at | TIMESTAMPTZ | auto |

#### `content_items` (core object)

The primary content table. Every card in the feed is a row here.

**Identity:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| business_id | UUID FK → businesses | Which business owns this |
| session_id | UUID FK → sessions | Which session created this |

**Classification (critical for future views):**

| Column | Type | Notes |
|--------|------|-------|
| content_type | ENUM | `support`, `social`, `video` |
| channel | TEXT | `intercom`, `linkedin`, `tiktok`, etc. |
| review_mode | TEXT | `support`, `social`, `video` — drives future review UI |
| source_type | TEXT | `screenshot`, `url`, `upload`, `generated`, etc. |

**Content payload:**

| Column | Type | Notes |
|--------|------|-------|
| title | TEXT | Card title |
| body_text | TEXT | Body copy / post text |
| script | TEXT | Full script with visual + VO directions (video type) |
| image_url | TEXT | Primary image / screenshot URL |
| video_url | TEXT | Public URL in Supabase Storage |
| thumbnail_url | TEXT | Optional thumbnail |

**Source / provenance:**

| Column | Type | Notes |
|--------|------|-------|
| source_ref | TEXT | Reference identifier (URL, file path, etc.) |
| source_bundle | JSONB | Full source context (screenshots, URLs, metadata) |
| prompt_input_summary | TEXT | Human-readable summary of what prompted this |

**Review state:**

| Column | Type | Notes |
|--------|------|-------|
| review_status | ENUM | `pending`, `approved`, `rejected`, `needs_edit` |
| review_note | TEXT | Reviewer's notes/feedback |
| reviewed_by | TEXT | Who reviewed |
| reviewed_at | TIMESTAMPTZ | When reviewed |

**Special state:**

| Column | Type | Notes |
|--------|------|-------|
| starred | BOOLEAN | Starred/special designation — persisted in backend |
| down_arrow_designation | TEXT | Optional separate designation bucket |

**Generation state:**

| Column | Type | Notes |
|--------|------|-------|
| generation_job_id | UUID FK → generation_jobs | Link to the generation job |
| generation_status | TEXT | Current generation step |
| model_name | TEXT | Which model was used |
| prompt_template_id | UUID FK → prompt_templates | Which template was used |

**Lineage:**

| Column | Type | Notes |
|--------|------|-------|
| parent_id | UUID FK → content_items | Links to the card that spawned this brainstorm |
| variant_of | UUID FK → content_items | Links to the original card this is a variant of |

**Timestamps:**

| Column | Type | Notes |
|--------|------|-------|
| metadata | JSONB | Extensible metadata |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto, trigger-updated |

#### `generation_jobs`

Tracks the pipeline's work queue.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| content_item_id | UUID FK → content_items | The item this job will populate |
| source_card_id | UUID FK → content_items | Original card (for variants/brainstorms) |
| job_type | TEXT | `initial`, `variant`, `brainstorm` |
| prompt | TEXT NOT NULL | The user prompt / generation instructions |
| status | TEXT | `queued`, `processing`, `completed`, `failed` |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMPTZ | auto |
| completed_at | TIMESTAMPTZ | When job finished |

#### `prompt_templates`

Editable prompt templates (overrides defaults in `src/templates/`).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| name | TEXT NOT NULL | Template name |
| content_type | ENUM | Which content type this is for |
| template | TEXT NOT NULL | Template with `{{variable}}` placeholders |
| is_default | BOOLEAN | Whether this is the default for its type |
| created_at | TIMESTAMPTZ | auto |

### 3.3 Optional but Recommended

#### `review_events`

For auditability and future undo:

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| content_item_id | UUID FK → content_items | Which item was reviewed |
| action | TEXT | `approve`, `reject`, `star`, `edit`, etc. |
| note | TEXT | Optional note from reviewer |
| actor_id | TEXT | Who performed the action |
| created_at | TIMESTAMPTZ | auto |

---

## 4. Feed Contract

Backend must return enough data for frontend to:

- Render mixed feed
- Distinguish content types
- Render different card styles (screenshot-first for support, text-first for social, video player for video)
- Support editing + regeneration
- Support starred state

Backend should **NOT**:

- Hardcode UI assumptions
- Assume one layout for all cards

---

## 5. Setup / Generation Contract

The "content generation tab" drives what appears in feed.

### Inputs

| Input | Description |
|-------|-------------|
| prompt / brief | User's generation instructions |
| uploaded assets | Images, videos, documents |
| screenshots | Support context screenshots |
| URLs | Reference URLs |
| references | Additional context |
| personas | Config only (does not drive routing in v1) |
| style/brand context | If provided |

### Output

- Multiple `content_items` per request
- Each item retains source provenance

---

## 6. Source-Aware System

Each content item retains:
- **What** it was based on
- **Where** it came from
- **What type** of source it used

Stored via:

| Field | Purpose |
|-------|---------|
| `source_type` | Category: `screenshot`, `url`, `upload`, `generated` |
| `source_ref` | Specific reference (URL, file path, etc.) |
| `source_bundle` | Full JSON context (multiple screenshots, URLs, metadata) |

Critical for: support screenshot review, social reference-based generation, future explainability.

---

## 7. Channel / Destination Context

Even in v1, backend supports:

- `channel` field on every content item
- Ability to differentiate: `intercom`, `linkedin`, `tiktok`, etc.
- Frontend will use this to approximate native UI later

---

## 8. Variants / Iteration

When content is regenerated or iterated:
- New `content_item` should be created OR existing one updated (depending on current system)

If creating new:

| Field | Purpose |
|-------|---------|
| `parent_id` | Links to the card that spawned this |
| `variant_of` | Links to the original card this is a variant of |

Even if unused in UI now, store this for future lineage.

---

## 9. Generation Pipeline — Technical Spec

### Pipeline Flow

```
User prompt
  │
  ▼
[Phase 1: Script Planning — Gemini]
  │ Generates: scenes, voiceover lines, SFX cues, video prompt
  │
  ├──────────────────────┐
  ▼                      ▼
[Phase 2a: Audio]    [Phase 2b: Video]
  ElevenLabs TTS       Veo 3.1
  ElevenLabs SFX       (visuals only)
  (runs in parallel)   (runs in parallel)
  │                      │
  └──────────┬───────────┘
             ▼
[Phase 3: Composition — FFmpeg]
  Merge VO + SFX + video
  VO at full volume, SFX at -12dB
             │
             ▼
[Phase 4: Upload]
  → Supabase Storage → content_items.video_url
```

### File Structure

```
src/
  lib/
    supabase.ts           — Supabase client init
    content-api.ts        — Full feed API: paginated fetch, swipe actions, undo, batch ops,
                            generation trigger, history, search, stats, realtime subscriptions
    feed-manager.ts       — Stateful FeedManager class: card queue, prefetch, undo stack,
                            session stats, persona-aware content type filtering
    personas.ts           — Persona definitions (Content Creator, Support Agent, Social Manager,
                            Everything) + registry for custom personas
    feed-analytics.ts     — Deep analytics: performance overview, business leaderboard,
                            daily activity time-series, variant iteration analysis
  pipeline/
    script-planner.ts     — Phase 1: Gemini generates structured VideoScript
    audio-generator.ts    — Phase 2a: ElevenLabs TTS + SFX generation
    video-generator.ts    — Phase 2b: Veo 3.1 video generation
    compositor.ts         — Phase 3: FFmpeg merges audio + video
    video-worker.ts       — Main orchestrator: claims jobs, runs phases 1-4
    feedback-loop.ts      — Watches for needs_variant / needs_ideas, creates new jobs
    prompt-engine.ts      — Template resolution (Supabase overrides + local defaults)
  templates/
    default-video-script.json   — Default prompt template for initial generation
    variant-modifier.json       — Template for variant requests
    brainstorm.json             — Template for brainstorm/more ideas requests
  scripts/
    seed-test-content.ts  — Seeds test business + sample cards
  types/
    database.ts           — Supabase types + feed/session/persona types
```

### Running the Worker

```bash
npm run worker    # Start the video generation worker (processes queued jobs)
npm run feedback  # Start the feedback loop (watches for variant/ideas requests)
npm run seed      # Seed test data
npm run typecheck # TypeScript check
```

### Environment Variables

```
SUPABASE_URL=https://rnqkjfrwkyupkyvygtpg.supabase.co
SUPABASE_ANON_KEY=<anon key>
GEMINI_API_KEY=<gemini api key — also used for Veo video generation>
ELEVENLABS_API_KEY=<elevenlabs api key>
```

### Script Planner Output Shape

```typescript
interface VideoScript {
  title: string;
  totalDurationSeconds: number;
  scenes: {
    index: number;
    heading: string;
    visualDescription: string;
    durationSeconds: number;
  }[];
  voiceover: {
    sceneIndex: number;
    lineIndex: number;
    speaker: string;
    text: string;
    emotion: string;
    stability: number;
    style: number;
  }[];
  sfx: {
    sceneIndex: number;
    prompt: string;
    durationSeconds: number;
  }[];
  videoPrompt: string;
}
```

---

## 10. Feedback Loop

When the user swipes up (variant) or down (more ideas) in the feed:

1. `content_items` row `review_status` changes to `needs_edit`
2. `feedback-loop.ts` picks up the row
3. It creates a new `content_items` row (linked via `variant_of` or `parent_id`)
4. It creates a new `generation_jobs` row with the user's feedback baked into the prompt
5. `video-worker.ts` picks up the new job and runs the full pipeline
6. New card appears in the feed via Supabase Realtime

---

## 11. Supabase Infrastructure

**Project:** `rnqkjfrwkyupkyvygtpg` (3thanh's Org)
**URL:** `https://rnqkjfrwkyupkyvygtpg.supabase.co`

### Storage
- **Bucket:** `content-videos` (public)
- Generated videos stored at: `generated/{job_id}.mp4`
- User uploads stored at: `uploads/{timestamp}-{filename}`

### Realtime
- `content_items` — subscribed for INSERT + UPDATE + DELETE events
- `generation_jobs` — subscribed for UPDATE events for progress tracking

---

## 12. Swipe Feed — Interaction Spec

**This section is the handoff for the UI agent (Loveable or otherwise).**

### Keyboard Map

Labels are dynamic per persona. Default (Content Creator persona):

| Key | Action | Status Written to DB | Opens Feedback? |
|-----|--------|---------------------|-----------------|
| → Right | Approve | `approved` | No |
| ← Left | Reject | `rejected` + review_note | Yes |
| ↑ Up | Request variant | triggers new generation | Yes |
| ↓ Down | Star / special designation | `starred = true` | No |
| Any letter/number | Start typing notes | Opens feedback drawer | Yes |
| Space | Play/pause video | N/A | No |

### Card Lifecycle

```
pending → approved (saved for export)
pending → rejected (review_note saved, card archived)
pending → needs_edit → feedback loop creates new card → pending (new variant appears)
pending → starred (special designation, remains reviewable)
```

### Visual Spec (Feed View)

- Full-screen dark theme (black bg)
- One card centered at a time
- Card renders differently per content_type:
  - **Support**: screenshot-first, response draft below
  - **Social**: text-first, channel badge
  - **Video**: video player (autoplay, loop, muted), script preview
- Spring animations on swipe (300ms)
- Action bar at bottom with color-coded actions
- Feedback drawer slides up from bottom on reject/variant
- Star toggle visible on all cards
- Empty state: inbox icon + "No content to review"

---

## 13. Creation Studio — Interaction Spec

### Session Model

Each "session" = a creative campaign. Maps to a `sessions` row in Supabase (linked to a business).

- Sessions listed in a left sidebar (collapsible)
- Each session has a name and accumulated context
- "+ New Session" button at top of sidebar

### Chat Interface

- ChatGPT-style conversation thread
- User can: type text, upload images/videos, paste URLs, upload screenshots
- System responds with confirmations and status updates
- Uploads appear as chips/thumbnails above the input (removable)

### Generation Trigger

When the user describes content and hits send:
1. UI creates one or more `content_items` rows
2. UI creates `generation_jobs` rows
3. Worker picks up jobs and processes them
4. UI shows progress by polling `generation_jobs.status`
5. When complete, cards appear in the feed via realtime

---

## 14. V2 — Intercom Ticket Storage

Store and surface Intercom support tickets as a content source for video generation.

### 14.1 What V2 Includes

- Intercom API integration for ingesting tickets
- Support ticket data model (`content_type: "support"`, `channel: "intercom"`)
- Support card UI with conversation threads and AI draft review
- Support Agent persona
- Ticket-to-video pipeline: use ticket context to generate explainer/response videos

### 14.2 What V2 Does NOT Include

- Social content type (deferred to V3)
- Multi-view feed or routing

---

## 15. V3 — Explicitly Out of Scope

These should NOT be built now, but system should remain compatible.

### 15.1 Social Content Type

Social posts (LinkedIn, Twitter, etc.) with text-first cards and channel-specific formatting.

### 15.2 Multi-View Feed

Future model:
- Center = all content
- Left/right = filtered views (support, social, etc.)
- Horizontal swipe between views

### 15.3 View System

Views defined by filters, possibly user-configurable, possibly stored in backend.

### 15.4 Persona-Driven Routing

Personas define generation behavior, view grouping, review modes.

### 15.5 Advanced Review Modes

- Support QA mode (conversation + draft response)
- Social review mode (hook, CTA, formatting)
- Video staged review (script → render)

### 15.6 Batch Actions

Approve multiple, filter + bulk review.

### 15.7 Undo System

Undo toast or stack (but `review_events` helps later).

### 15.8 Advanced Generation Controls

Strict vs creative, prompt adherence, seed consistency, variant controls.

### 15.9 Brand / Style Kit System

Reusable brand context, tone rules, banned phrases.

### 15.10 Configurable Views / Tabs in UI

Tabs created in setup page, each tab = view, mutually exclusive card assignment.

---

## 15. Important Guardrails

1. **Metadata is clean and structured** — Do not rely on string parsing or implicit assumptions.
2. **Content items are flexible** — Not all items are text-first. Support items are screenshot-first. Video items may lack a final render.
3. **No hardcoded view assumptions** — Do not assume one type per feed or all items belong everywhere.
4. **Future compatibility without overbuilding** — Only prepare for filtering, classification, and routing. Do NOT build those systems now.

---

## 16. Expected Outcome (V1)

After this update, backend should support:

- [x] Creating sessions
- [ ] Generating multiple content items per prompt
- [ ] Storing support/social/video content
- [ ] Storing screenshot-first items (image_url, source_bundle)
- [ ] Editing + regenerating content
- [ ] Mixed feed across all sessions
- [ ] Starred/special designation state
- [ ] Clean metadata for future views (content_type, channel, review_mode, source_type)
- [ ] Optional event tracking (review_events)
- [ ] Source provenance (source_ref, source_bundle, prompt_input_summary)
- [ ] Channel context (intercom, linkedin, tiktok)
- [ ] Variant lineage (parent_id, variant_of)

**Without:**

- Building view system
- Building routing system
- Building multi-lane feed

---

## 17. Deployment

- **Supabase:** Already provisioned (`rnqkjfrwkyupkyvygtpg`)
- **Vercel:** Will deploy when ready (git-only for now)
- **Worker:** Runs locally via `npm run worker` during dev; later deploy to any Node host
- **Feedback loop:** Runs locally via `npm run feedback`; later could be a Supabase Edge Function
