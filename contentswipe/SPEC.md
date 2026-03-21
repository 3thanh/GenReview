# ContentSwipe — Full Spec & Agent Handoff

**Version:** 0.2 | **Status:** In Development
**Stack:** Supabase (DB + Storage + Realtime), Vercel (deploy), Gemini (script planning + video gen), ElevenLabs (TTS + SFX), FFmpeg (composition)

---

## 1. Product Vision

A TikTok/Tinder-style content review app for AI-generated short-form video. Two main surfaces:

1. **Creation Studio** — ChatGPT-style interface to describe campaigns, upload context, and trigger generation
2. **Swipe Feed** — Full-screen card review with keyboard shortcuts to approve/reject/request variants

Content from all creation sessions consolidates into one unified feed.

---

## 2. Architecture — Two Workstreams

### Workstream A: Swipe Feed UI (Loveable → this repo's frontend)

The **UI is built in Loveable** and reads/writes Supabase directly. It does NOT handle generation — it only displays content and captures user decisions.

### Workstream B: Generation Pipeline (this repo's `src/pipeline/`)

A background worker that:
1. Plans scripts (Gemini)
2. Generates audio (ElevenLabs) and video (Veo) in parallel
3. Composes the final video (FFmpeg)
4. Uploads to Supabase Storage and updates the content queue

---

## 3. Supabase Schema

**Project:** `rnqkjfrwkyupkyvygtpg` (3thanh's Org)
**URL:** `https://rnqkjfrwkyupkyvygtpg.supabase.co`

### Tables

#### `businesses`
Stores session/campaign context. Each "session" in the Creation Studio maps to a business row.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| name | TEXT NOT NULL | Session/campaign name |
| description | TEXT | Accumulated business context |
| website_url | TEXT | Optional link |
| created_at | TIMESTAMPTZ | auto |

#### `content_queue`
The main content items. Every card in the swipe feed is a row here.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| business_id | UUID FK → businesses | Which session created this |
| content_type | ENUM | `video_script`, `linkedin_post`, `support_reply` |
| title | TEXT NOT NULL | Card title |
| description | TEXT | Brief description |
| script | TEXT | Full script with visual + VO directions |
| video_url | TEXT | Public URL in Supabase Storage |
| thumbnail_url | TEXT | Optional thumbnail |
| status | ENUM | `pending`, `approved`, `rejected`, `needs_variant`, `needs_ideas` |
| feedback | TEXT | User's notes when rejecting/requesting changes |
| variant_of | UUID FK → content_queue | Links to the original card this is a variant of |
| parent_id | UUID FK → content_queue | Links to the card that spawned this brainstorm |
| metadata | JSONB | Extensible metadata |
| created_at | TIMESTAMPTZ | auto |
| updated_at | TIMESTAMPTZ | auto, trigger-updated |

#### `generation_jobs`
Tracks the pipeline's work queue.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| content_queue_id | UUID FK → content_queue | The card this job will populate |
| source_card_id | UUID FK → content_queue | Original card (for variants/brainstorms) |
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

### Storage
- **Bucket:** `content-videos` (public)
- Generated videos stored at: `generated/{job_id}.mp4`
- User uploads stored at: `uploads/{timestamp}-{filename}`

### Realtime
- `content_queue` — subscribed for INSERT + UPDATE + DELETE events via `subscribeToFeedChanges()`. Tracks old status on updates so the UI knows when a card transitions to/from pending.
- `generation_jobs` — subscribed for UPDATE events via `subscribeToJobUpdates(jobId)` for progress tracking (queued → processing → completed/failed)

---

## 4. Swipe Feed — Interaction Spec

**This section is the handoff for the UI agent (Loveable or otherwise).**

### Keyboard Map

Labels are dynamic per persona. Read `feed.swipeLabels` for current action names, colors, and `requiresFeedback` flags. Default (Content Creator persona):

| Key | Action | Status Written to DB | Opens Feedback? |
|-----|--------|---------------------|-----------------|
| → Right | Approve (persona label: `swipeLabels.right.action`) | `approved` | No |
| ← Left | Reject (persona label: `swipeLabels.left.action`) | `rejected` + feedback | Yes |
| ↑ Up | Request variant (persona label: `swipeLabels.up.action`) | `needs_variant` + feedback | Yes |
| ↓ Down | More ideas (persona label: `swipeLabels.down.action`) | `needs_ideas` + feedback | Yes |
| Any letter/number | Start typing notes | Opens feedback drawer | Yes |
| Space | Play/pause video | N/A | No |

Each persona defines different labels (e.g., Support Agent: right = "Send Reply", up = "Escalate"). The `requiresFeedback` flag on each label tells the UI whether to open the feedback drawer for that direction.

### Card Lifecycle

```
pending → approved (→ done, saved for export)
pending → rejected (feedback saved, card archived)
pending → needs_variant → feedback loop creates new card → pending (new variant appears)
pending → needs_ideas → feedback loop creates new card → pending (new idea appears)
```

### Data Access for the UI

The UI should use the `FeedManager` class from `src/lib/feed-manager.ts` — it wraps all Supabase logic, handles prefetching, undo, realtime, and persona filtering.

**Recommended approach (FeedManager):**
```typescript
import { FeedManager } from './lib/feed-manager.js';

const feed = new FeedManager({
  persona: 'content-creator',  // or 'support-agent', 'social-manager', 'all'
  businessId: sessionId,       // optional: scope to a campaign
});

await feed.start();            // loads initial cards + sets up realtime

const card = feed.currentCard();     // what to render
const labels = feed.swipeLabels;     // { right: { action: "Approve", color: "#22c55e", ... }, ... }

await feed.swipeRight();             // approve + auto-advance
await feed.swipeLeft('too long');    // reject with feedback
await feed.undo();                   // restore last card

await feed.switchPersona('support-agent'); // switch focus, queue reloads

feed.on((event) => {
  if (event.type === 'queue_empty') showEmptyState(feed.persona.emptyStateMessage);
  if (event.type === 'persona_switched') animateTransition(event.from, event.to);
});

const stats = feed.stop();           // end session, get stats
```

**Direct API approach (for custom UI logic):**

All functions are in `src/lib/content-api.ts`. The UI never needs to call Supabase directly.

```typescript
import { fetchFeed, approveCard, subscribeToFeedChanges } from './lib/content-api.js';

const page = await fetchFeed({ businessId, contentType: 'video_script', limit: 10 });
const card = await approveCard(cardId);  // returns updated card
const unsub = subscribeToFeedChanges((event) => { ... });
```

See Section 8 for the full API reference.

### Visual Spec (Feed View)

- Full-screen dark theme (black bg)
- One card centered at a time, max 480x720px
- Card has: video player (autoplay, loop, muted), gradient overlay, title, description, script preview, content type badge, session tag
- Spring animations on swipe (300ms)
- Action bar at bottom: 4 buttons (←↑↓→) with color-coded hover states
- Feedback drawer slides up from bottom on reject/variant/ideas
- Empty state: inbox icon + "No content to review" + "Create your first video" button

---

## 5. Creation Studio — Interaction Spec

**This section is the handoff for the UI agent building the creation interface.**

### Session Model

Each "session" = a creative campaign. Maps to a `businesses` row in Supabase.

- Sessions listed in a left sidebar (collapsible)
- Each session has a name, colored tag, and accumulated context
- "+ New Session" button at top of sidebar

### Chat Interface

- ChatGPT-style conversation thread
- User can: type text, upload images/videos, paste URLs
- System responds with confirmations and status updates
- Uploads appear as chips/thumbnails above the input (removable)
- Input area: multi-line text + attach button (images, videos, URLs) + send button

### First-Time Flow

1. "What's this campaign about?" → quick-start category cards
2. "Tell me about your business" → text input or URL paste
3. Context stored in `businesses` table

### Generation Trigger

When the user describes a video concept and hits send:
1. UI creates a `content_queue` row with `status: 'pending'` and a placeholder title
2. UI creates a `generation_jobs` row with `job_type: 'initial'` and the user's prompt
3. The background worker (Workstream B) picks up the job and processes it
4. UI shows progress by polling `generation_jobs.status`
5. When complete, the card appears in the feed via realtime

### Supabase Queries for Creation Studio

**Create a session:**
```sql
INSERT INTO businesses (name, description, website_url)
VALUES ($name, $description, $url)
RETURNING *
```

**List sessions:**
```sql
SELECT * FROM businesses ORDER BY created_at DESC
```

**Trigger generation:**
```typescript
import { triggerGeneration, subscribeToJobUpdates } from './lib/content-api.js';

const { card, jobId } = await triggerGeneration({
  businessId: sessionId,
  prompt: userMessage,
  contentType: 'video_script',
});

// Track progress
const unsub = subscribeToJobUpdates(jobId, (job) => {
  // job.status: 'queued' → 'processing' → 'completed' | 'failed'
  updateProgressUI(job.status);
  if (job.status === 'completed' || job.status === 'failed') unsub();
});
```

---

## 6. Generation Pipeline — Technical Spec

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
  → Supabase Storage → content_queue.video_url
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
# Start the video generation worker (processes queued jobs)
npm run worker

# Start the feedback loop (watches for variant/ideas requests)
npm run feedback

# Seed test data
npm run seed
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
  title: string;                    // Video title
  totalDurationSeconds: number;     // 15-30s
  scenes: {
    index: number;
    heading: string;                // e.g. "OPEN: Close-up of product"
    visualDescription: string;      // Pure visual — sent to Veo
    durationSeconds: number;
  }[];
  voiceover: {
    sceneIndex: number;
    lineIndex: number;
    speaker: string;                // "narrator" or character name
    text: string;                   // Words to speak
    emotion: string;                // e.g. "warm excitement"
    stability: number;              // 0-1, controls ElevenLabs voice stability
    style: number;                  // 0-1, controls ElevenLabs expressiveness
  }[];
  sfx: {
    sceneIndex: number;
    prompt: string;                 // Acoustic description for ElevenLabs SFX
    durationSeconds: number;
  }[];
  videoPrompt: string;              // Full visual prompt for Veo — no audio refs
}
```

---

## 7. Feedback Loop

When the user swipes up (variant) or down (more ideas) in the feed:

1. `content_queue` row status changes to `needs_variant` or `needs_ideas`
2. `feedback-loop.ts` picks up the row
3. It creates a new `content_queue` row (linked via `variant_of` or `parent_id`)
4. It creates a new `generation_jobs` row with the user's feedback baked into the prompt
5. `video-worker.ts` picks up the new job and runs the full pipeline
6. New card appears in the feed via Supabase Realtime — no refresh needed

---

## 8. Content API Reference (for UI integration)

Import from `src/lib/content-api.ts`:

### Feed fetching

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `fetchFeed(options?)` | `FeedOptions` (businessId, contentType, limit, cursor, excludeIds) | `FeedPage` | Paginated cursor-based feed of pending cards |
| `fetchPendingCards(businessId?)` | optional business ID | `ContentItem[]` | Simple fetch of all pending cards (no pagination) |
| `fetchCardById(id)` | card ID | `CardWithRelations` | Single card with variants, parent, variantOf, generationJob |
| `fetchCardVariants(id)` | card ID | `ContentItem[]` | All variants of a card |
| `fetchCardAncestors(id, maxDepth?)` | card ID, optional depth limit | `ContentItem[]` | Walk parent chain (brainstorm lineage) |

### Swipe actions (all return the updated card)

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `approveCard(id)` | card ID | `ContentItem` | Mark approved |
| `rejectCard(id, feedback?)` | card ID, optional notes | `ContentItem` | Mark rejected |
| `requestVariant(id, feedback)` | card ID, feedback text | `ContentItem` | Request variant |
| `requestMoreIdeas(id, feedback)` | card ID, feedback text | `ContentItem` | Request new ideas |
| `undoAction(id)` | card ID | `ContentItem` | Revert any actioned card back to pending |

### Batch operations

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `batchApprove(ids)` | card ID array | `number` | Approve multiple pending cards, returns count |
| `batchReject(ids, feedback?)` | card ID array, optional feedback | `number` | Reject multiple pending cards, returns count |

### Content generation

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `triggerGeneration({businessId?, prompt, contentType?, title?})` | generation params | `{ card, jobId }` | Create card + job; worker picks it up |
| `triggerBulkGeneration({businessId?, prompts, contentType?})` | bulk params | `{ card, jobId }[]` | Fire off multiple prompts at once |
| `uploadContent({title, description?, script?, businessId?, contentType?, videoFile?})` | content params | `ContentItem` | Manual upload with optional video file |

### History, search & analytics

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `fetchSwipeHistory({businessId?, status?, limit?, offset?})` | filter options | `{ cards, total }` | Past decisions, offset-paginated |
| `searchCards(query, {businessId?, limit?})` | search text, options | `ContentItem[]` | Search cards by title/description |
| `fetchFeedStats(businessId?)` | optional business ID | `FeedStats` | Aggregate counts, approval rate, avg cards/day |
| `fetchJobStatus(jobId)` | job ID | `GenerationJob \| null` | Check a generation job's current status |
| `fetchActiveJobs(businessId?)` | optional business ID | `GenerationJob[]` | All queued/processing jobs |

### Realtime subscriptions (all return an unsubscribe function)

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `subscribeToFeedChanges(callback, businessId?)` | handler fn, optional business filter | `() => void` | All card changes (INSERT+UPDATE+DELETE) with old status |
| `subscribeToNewCards(callback)` | handler fn | `() => void` | Only new pending cards (lightweight) |
| `subscribeToJobUpdates(jobId, callback)` | job ID, handler fn | `() => void` | Watch a specific job's progress |

### FeedManager (stateful orchestrator)

Import from `src/lib/feed-manager.ts`:

```typescript
const feed = new FeedManager({ persona: "content-creator", businessId: "..." });
await feed.start();

feed.currentCard();       // Current card to display
feed.peekCards(3);        // Next 3 cards (for stack preview)
feed.swipeLabels;         // { right: { action: "Approve", ... }, left: { action: "Reject", ... }, ... }
feed.persona;             // Current active persona object
feed.availablePersonas;   // All registered personas

await feed.swipeRight();              // Approve + advance
await feed.swipeLeft("too long");     // Reject with feedback + advance
await feed.swipeUp("make it shorter");// Request variant + advance
await feed.swipeDown("more casual");  // More ideas + advance
await feed.undo();                    // Restore last swiped card

await feed.switchPersona("support-agent"); // Flush queue, reload with new content types

feed.on((event) => { ... });          // Listen for swiped, undo, queue_empty, persona_switched, etc.
const stats = feed.stop();            // End session, get stats
```

### Personas

Import from `src/lib/personas.ts`:

| Persona ID | Name | Content Types | Right | Left | Up | Down |
|------------|------|--------------|-------|------|-----|------|
| `content-creator` | Content Creator | `video_script`, `linkedin_post` | Approve | Reject | Request Variant | More Ideas |
| `support-agent` | Support Agent | `support_reply` | Send Reply | Discard | Escalate | Use Template |
| `social-manager` | Social Manager | `linkedin_post` | Schedule | Skip | Edit & Rewrite | Generate Alternatives |
| `all` | Everything | all types | Approve | Reject | Request Variant | More Ideas |

Custom personas can be registered at runtime via `registerPersona()` or `createPersona()`.

---

## 9. Deployment

- **Supabase:** Already provisioned (`rnqkjfrwkyupkyvygtpg`)
- **Vercel:** Will deploy when ready (git-only for now)
- **Worker:** Runs locally via `npm run worker` during dev; later deploy to any Node host
- **Feedback loop:** Runs locally via `npm run feedback`; later could be a Supabase Edge Function

---

## 10. Open Items

- [ ] Connect Loveable UI to Supabase (env vars)
- [x] Wire Creation Studio → generation_jobs INSERT — done via `triggerGeneration()`
- [x] Add session filtering to the feed (filter by business_id) — done via `fetchFeed({ businessId })`
- [ ] Handle video upload in Creation Studio — `uploadContent()` is ready, UI needs to call it
- [x] Add progress indicator in UI — `subscribeToJobUpdates()` and `fetchJobStatus()` are ready
- [ ] Production deployment strategy for the worker process
- [ ] Build persona switcher UI (read `feed.availablePersonas`, call `feed.switchPersona()`)
- [ ] Build analytics dashboard using `feed-analytics.ts` functions
- [ ] Paste `GEMINI_API_KEY` into `.env.local` to enable generation pipeline
