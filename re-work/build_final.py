#!/usr/bin/env python3
"""
Final video build pipeline.
1. Generate natural-length audio via ElevenLabs (no forced trimming)
2. Build video segments with duration matching audio
3. Concatenate and QC

Audio drives timing — no cutoffs.
Talking head segments use headshot still (avoids lip-sync mismatch).
"""

import subprocess
import os
import json
import sys
import requests
import time
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE, "output")
HEADSHOT = os.path.join(BASE, "source_assets", "yash_headshot_01.png")

API_KEY = "259f6398060a96b007b14353f067710999fef2dadb9609e071bd008a7adecdda"
VOICE_ID = "G2pIdqup6MlQFH2bibG4"
W, H = 1280, 720

SCRIPTS = {
    "clay_ads": {
        "output": "clay_ads_v2.mp4",
        "segments": [
            {"id": 1, "type": "head",
             "line": "Most teams are still uploading CSVs to run ads... and their targeting is outdated the second they hit upload."},
            {"id": 2, "type": "demo",
             "line": "Clay Ads turns your table into a live audience that syncs directly to LinkedIn, Meta — and now Google.",
             "caption": "Clay Ads - Live Audience Sync", "subcaption": "LinkedIn  |  Meta  |  Google"},
            {"id": 3, "type": "head",
             "line": "We're seeing 60%+ match rates on Meta... where most teams are stuck at 20 to 30%.",
             "stat": "60%+ Meta match rate"},
            {"id": 4, "type": "demo",
             "line": "With Enhanced Matching, we automatically find and verify the best emails — no more manual enrichment waterfalls.",
             "caption": "Enhanced Matching", "subcaption": "Auto-verify the best emails - no manual waterfalls"},
            {"id": 5, "type": "head",
             "line": "And because it's synced to your CRM... your audiences update as your pipeline changes."},
            {"id": 6, "type": "demo",
             "line": "New leads enter campaigns. Closed deals get excluded. Everything stays clean — automatically.",
             "caption": "Always-On Pipeline Sync", "subcaption": "Leads In  >  Closed Deals Out  >  Auto Sync"},
            {"id": 7, "type": "head",
             "line": "Teams like Slack and Anthropic are already using this to cut cost per qualified lead by up to 5x.",
             "stat": "5x lower cost per qualified lead"},
            {"id": 8, "type": "demo",
             "line": "If you're spending on ads, your audience should be as dynamic as your pipeline.",
             "caption": "Clay Ads", "subcaption": "always-on audiences"},
        ],
    },
    "terracotta": {
        "output": "terracotta_v2.mp4",
        "segments": [
            {"id": 1, "type": "head",
             "line": "Today, I want to show you something we've been building behind the scenes at Clay — Terracotta."},
            {"id": 2, "type": "demo",
             "line": "Terracotta is our new workflow engine that lets you orchestrate multi-step data processes in a clean, visual way — think Zapier, but built for how Clay actually works.",
             "caption": "Terracotta", "subcaption": "Visual workflows for data + actions"},
            {"id": 3, "type": "demo",
             "line": "Instead of forcing everything through tables and workbooks, Terracotta separates processing from storage — so your logic lives in workflows, not scattered across tables.",
             "caption": "From Tables to Workflows", "subcaption": "Processing separated from storage"},
            {"id": 4, "type": "demo",
             "line": "You can mix AI agents and Python code, run steps in parallel, and see exactly what's happening at every step — inputs, outputs, logs, everything.",
             "caption": "Agents + Code + Observability", "subcaption": "AI agents  |  Python code  |  Parallel branches  |  Full logs"},
            {"id": 5, "type": "head",
             "line": "What's exciting is this becomes the foundation for everything — functions, agents, campaigns — all running on the same workflow system."},
            {"id": 6, "type": "demo",
             "line": "It means faster builds, more reliable automation, and way more flexibility — whether you're non-technical or writing full Python. This is Terracotta.",
             "caption": "From Signal to Action to Outcome", "subcaption": "Faster builds  |  Reliable automation  |  Full flexibility"},
        ],
    },
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  FAIL: {' '.join(cmd[:5])}...")
        print(f"  {r.stderr[-400:]}")
        raise SystemExit(1)
    return r


def probe_dur(path):
    r = run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    return float(r.stdout.strip())


def find_font(size=48):
    for p in ["/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/SFNS.ttf",
              "/Library/Fonts/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def render_frame(path, caption=None, subcaption=None, stat=None, bg="black"):
    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)
    if caption:
        f = find_font(48)
        bb = draw.textbbox((0, 0), caption, font=f)
        draw.text(((W - bb[2] + bb[0]) // 2, H // 2 - 50), caption, fill="white", font=f)
    if subcaption:
        f = find_font(24)
        bb = draw.textbbox((0, 0), subcaption, font=f)
        draw.text(((W - bb[2] + bb[0]) // 2, H // 2 + 20), subcaption, fill=(170, 170, 170), font=f)
    if stat:
        f = find_font(28)
        bb = draw.textbbox((0, 0), stat, font=f)
        draw.text(((W - bb[2] + bb[0]) // 2, H - 70), stat, fill=(255, 200, 100), font=f)
    img.save(path)


def render_headshot_frame(path, stat=None):
    """Create a 1280x720 frame with Yash's headshot centered on dark bg."""
    bg = Image.new("RGB", (W, H), (15, 15, 15))
    head = Image.open(HEADSHOT)
    head = head.resize((500, 500), Image.LANCZOS)
    x = (W - 500) // 2
    y = (H - 500) // 2 - 20
    bg.paste(head, (x, y))

    if stat:
        draw = ImageDraw.Draw(bg)
        f = find_font(28)
        bb = draw.textbbox((0, 0), stat, font=f)
        tw = bb[2] - bb[0]
        draw.rectangle([(0, H - 60), (W, H)], fill=(0, 0, 0, 180))
        draw.text(((W - tw) // 2, H - 50), stat, fill="white", font=f)
    bg.save(path)


def tts(text, out_path):
    """Generate speech via ElevenLabs — natural pace, no trimming."""
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers={"xi-api-key": API_KEY, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.85,
                "style": 0.4,
                "use_speaker_boost": True,
            },
        },
    )
    if resp.status_code != 200:
        print(f"    TTS ERROR: {resp.status_code} — {resp.text[:200]}")
        return False
    mp3 = out_path + ".mp3"
    with open(mp3, "wb") as f:
        f.write(resp.content)
    run(["ffmpeg", "-y", "-i", mp3, "-ar", "44100", "-ac", "1", out_path])
    os.remove(mp3)
    return True


def build_script(name, config):
    segments = config["segments"]
    out_name = config["output"]
    work = os.path.join(BASE, f"final_{name}")
    os.makedirs(work, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  BUILDING: {name} -> {out_name}")
    print(f"{'='*60}")

    # Step 1: Generate audio at natural pace
    print("\n  --- Audio (ElevenLabs, natural pace) ---")
    for seg in segments:
        wav = os.path.join(work, f"audio_{seg['id']}.wav")
        if os.path.exists(wav) and os.path.getsize(wav) > 5000:
            dur = probe_dur(wav)
            print(f"    Seg {seg['id']}: cached ({dur:.2f}s)")
            seg["actual_dur"] = dur
            continue
        print(f"    Seg {seg['id']}: generating...")
        ok = tts(seg["line"], wav)
        if not ok:
            raise SystemExit(1)
        dur = probe_dur(wav)
        seg["actual_dur"] = dur
        print(f"    Seg {seg['id']}: {dur:.2f}s")
        time.sleep(0.3)

    total_audio = sum(s["actual_dur"] for s in segments)
    print(f"    Total audio: {total_audio:.2f}s")

    # Step 2: Build video segments — duration matches audio exactly
    print("\n  --- Video segments ---")
    for seg in segments:
        i = seg["id"]
        dur = seg["actual_dur"]
        wav = os.path.join(work, f"audio_{i}.wav")
        vid = os.path.join(work, f"video_{i}.mp4")

        if seg["type"] == "head":
            print(f"    Seg {i}: headshot ({dur:.2f}s)")
            frame = os.path.join(work, f"head_{i}.png")
            render_headshot_frame(frame, stat=seg.get("stat"))
            run([
                "ffmpeg", "-y",
                "-loop", "1", "-framerate", "24000/1001",
                "-t", str(dur), "-i", frame,
                "-i", wav,
                "-map", "0:v", "-map", "1:a",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k",
                "-shortest",
                vid,
            ])
        else:
            print(f"    Seg {i}: demo ({dur:.2f}s)")
            frame = os.path.join(work, f"demo_{i}.png")
            render_frame(frame,
                         caption=seg.get("caption"),
                         subcaption=seg.get("subcaption"),
                         stat=seg.get("stat"))
            run([
                "ffmpeg", "-y",
                "-loop", "1", "-framerate", "24000/1001",
                "-t", str(dur), "-i", frame,
                "-i", wav,
                "-map", "0:v", "-map", "1:a",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k",
                "-shortest",
                vid,
            ])

    # Step 3: Concat
    print("\n  --- Concatenating ---")
    concat = os.path.join(work, "concat.txt")
    with open(concat, "w") as f:
        for seg in segments:
            f.write(f"file 'video_{seg['id']}.mp4'\n")

    final = os.path.join(OUTPUT_DIR, out_name)
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "128k",
        final,
    ])

    # Step 4: QC
    print(f"\n  --- QC ---")
    final_dur = probe_dur(final)
    size_mb = os.path.getsize(final) / (1024 * 1024)
    print(f"    Duration: {final_dur:.2f}s")
    print(f"    Size:     {size_mb:.1f} MB")

    for seg in segments:
        vid = os.path.join(work, f"video_{i}.mp4")
        label = "HEAD" if seg["type"] == "head" else "DEMO"
        print(f"    Seg {seg['id']} [{label}] {seg['actual_dur']:.2f}s")

    r = run(["ffprobe", "-v", "quiet", "-show_entries", "stream=codec_type,duration", "-of", "json", final])
    streams = json.loads(r.stdout)["streams"]
    v_dur = a_dur = 0
    for s in streams:
        d = float(s.get("duration", 0))
        if s["codec_type"] == "video":
            v_dur = d
        elif s["codec_type"] == "audio":
            a_dur = d
    print(f"    A/V sync drift: {abs(v_dur - a_dur):.3f}s [{'OK' if abs(v_dur - a_dur) < 0.15 else 'WARNING'}]")
    print(f"    OUTPUT: {final}")


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for name, config in SCRIPTS.items():
        build_script(name, config)
    print(f"\n{'='*60}")
    print("  DONE — both videos in output/")
    print(f"{'='*60}")
