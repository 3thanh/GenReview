# Project Status — Yash Digital Twin Video

> **Last updated:** 2026-03-21

---

## What's Done

### 1. Source material (from `../yash-digital-twin/`)
- Downloaded all 23 videos from [Clay University: Clay 101](https://www.youtube.com/playlist?list=PLOk1iliTgMrWWrQOFtK69xzHkBhF75Jjm)
- Extracted 3 headshots, 60s + 30s talking head clips, voice training audio (1min, 5min, full 1h51m)

### 2. Video build pipeline — WORKING
- `build_video.py` builds the full 60s video end-to-end
- 8 segments: 4 talking head (Yash on camera) + 4 black screen (product demo placeholder)
- Burned-in stat overlays on segments 3 and 7 ("60%+ Meta match rate", "5x lower cost per qualified lead")
- Text cards on demo segments with captions + subcaptions
- All QC checks passing:
  - **Timing:** every segment within 10ms of target
  - **A/V sync:** 26ms drift (well under 100ms threshold)
  - **Total duration:** 60.10s

### 3. Current outputs
- `output/clay_ads_v1.mp4` — 60s, 1280x720, 4.9 MB (Clay Ads script)
- `output/terracotta_v1.mp4` — 60s, 1280x720, 3.4 MB (Terracotta Overview script)
- Both use macOS TTS (Rishi voice) as placeholder — swap with ElevenLabs clone for final

---

## What's Left To Do

### Priority 1: Swap placeholder voice with ElevenLabs clone
- [ ] Set `ELEVENLABS_API_KEY` env var
- [ ] Run `python3 clone_voice.py` to create "Yash - Clay" voice
- [ ] Update `build_video.py` `step1_audio()` to call ElevenLabs API per segment instead of macOS `say`
- [ ] Re-run `python3 build_video.py`

### Priority 2: Replace black screens with real product demo footage (optional)
- [ ] Record or capture Clay Ads product UI screen recordings
- [ ] Replace black screen segments (2, 4, 6, 8) with actual footage
- [ ] Update `build_video.py` to use video files instead of `render_text_frame()`

### Priority 3: Generate full digital twin avatar (optional)
- [ ] Set `HEYGEN_API_KEY` env var
- [ ] Run `python3 generate_avatar.py` to create a HeyGen photo avatar
- [ ] Replace raw talking head clips with AI-generated avatar video

---

## How to Run

```bash
cd re-work

# Build Clay Ads video
python3 build_video.py         # -> output/clay_ads_v1.mp4

# Build Terracotta Overview video
python3 build_terracotta.py    # -> output/terracotta_v1.mp4
```

### With ElevenLabs voice clone
```bash
export ELEVENLABS_API_KEY="sk-..."
python3 clone_voice.py          # creates the voice clone
# Then update step1_audio() in build_video.py to use ElevenLabs
python3 build_video.py
```

---

## Folder Structure

```
re-work/
├── SCRIPT.md              # Full 60s video script with timestamps
├── STATUS.md              # This file — where we left off
├── build_video.py         # Clay Ads build pipeline
├── build_terracotta.py    # Terracotta Overview build pipeline
├── clone_voice.py         # ElevenLabs voice cloning
├── generate_avatar.py     # HeyGen avatar generation
├── SCRIPT.md              # Clay Ads script
├── SCRIPT_TERRACOTTA.md   # Terracotta Overview script
├── .gitignore
├── source_assets/         # All input assets
│   ├── yash_headshot_0{1,2,3}.png
│   ├── yash_talking_head_{30s,60s}.mp4
│   └── yash_voice_{1min,5min}_sample.wav
├── audio_segments/        # Generated TTS per segment (seg_1.wav … seg_8.wav)
├── video_segments/        # Rendered segment clips (seg_1.mp4 … seg_8.mp4)
└── output/                # Final composed video
    └── clay_ads_v1.mp4
```

---

## QC Results (latest builds)

### Clay Ads (`clay_ads_v1.mp4`)
| Check | Result |
|-------|--------|
| Total duration | 60.10s |
| Segment drift | All < 10ms |
| A/V sync | 26ms drift |
| Talking head segs | 1, 3, 5, 7 — Yash on camera |
| Demo segs | 2, 4, 6, 8 — Black screen w/ text |
| Stat overlays | Seg 3: "60%+ Meta match rate", Seg 7: "5x lower cost per qualified lead" |
| End card | Seg 8: "Clay Ads / always-on audiences" |

### Terracotta Overview (`terracotta_v1.mp4`)
| Check | Result |
|-------|--------|
| Total duration | 60.10s |
| Segment drift | All < 12ms |
| A/V sync | 21ms drift |
| Talking head segs | 1, 5 — Yash on camera |
| Demo segs | 2, 3, 4, 6 — Black screen w/ text |
| Closing accent | Seg 6: "This is Terracotta." (gold) |
| End card | Seg 6: "From Signal to Action to Outcome" |
