# ContentSwipe

A TikTok/Tinder-style content review app for AI-generated short-form video.

## Quick Context

- **UI** is built in Loveable (separate) — it reads/writes Supabase directly
- **This repo** is the backend: generation pipeline, content API, feed manager, persona system
- **Supabase project:** `rnqkjfrwkyupkyvygtpg` at `https://rnqkjfrwkyupkyvygtpg.supabase.co`

## What's Built

- Supabase schema: `content_queue`, `businesses`, `generation_jobs`, `prompt_templates`
- **Content API** (`src/lib/content-api.ts`): paginated feed, swipe actions (returns updated card), undo, batch ops, generation trigger, history, search, analytics, realtime (INSERT+UPDATE+DELETE)
- **Feed Manager** (`src/lib/feed-manager.ts`): stateful swipe orchestrator with card queue, prefetching, undo stack, session stats, persona-aware filtering
- **Persona System** (`src/lib/personas.ts`): switchable focus modes (Content Creator, Support Agent, Social Manager, Everything) — each persona defines which content types appear and custom swipe labels per direction
- **Feed Analytics** (`src/lib/feed-analytics.ts`): performance metrics, business leaderboard, daily activity time-series, variant iteration analysis, content type breakdown
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

## What Needs Work

See `SPEC.md` sections 4-5 for the full UI interaction spec (swipe feed + creation studio).
The UI agent should focus on:
1. Swipe feed: use `FeedManager` class — handles queue, prefetch, undo, persona switching
2. Creation studio: chat interface, file uploads, session management
3. Import functions from `content-api.ts` — all Supabase logic is wrapped, UI never calls supabase directly
4. Realtime: `subscribeToFeedChanges()` for live card updates, `subscribeToJobUpdates()` for generation progress
5. Persona switcher: read `feed.availablePersonas`, call `feed.switchPersona(id)`, render `feed.swipeLabels`

## Architecture

```
User → Creation Studio (Loveable UI)
         │
         ├→ triggerGeneration() → content_queue + generation_jobs
         │
         ▼
  Video Worker (this repo)
    Phase 1: Gemini plans script
    Phase 2: ElevenLabs audio ∥ Veo video
    Phase 3: FFmpeg compose
    Phase 4: Upload → Supabase Storage
         │
         ▼
  content_queue updated with video_url
         │
         ▼
  Swipe Feed (Loveable UI) ← subscribeToFeedChanges()
    FeedManager orchestrates the queue
    Persona system controls content type filter + swipe labels
    →  approve/send   │  ← reject/discard+feedback
    ↑  variant/escalate │  ↓ more ideas/template+feedback
         │
         ▼
  Feedback Loop (this repo)
    Creates new generation jobs from feedback
```

## File Structure

```
src/
  lib/
    supabase.ts         — Supabase client init
    content-api.ts      — Full feed API (25+ functions)
    feed-manager.ts     — Stateful FeedManager class with persona support
    personas.ts         — Persona definitions + registry
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
