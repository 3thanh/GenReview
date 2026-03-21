#!/usr/bin/env python3
"""
Build the 1-min Terracotta Overview video.

Talking head segments use Yash footage from source_assets/.
Demo segments render as black screen with text overlay.
Text rendered via Pillow (no drawtext filter needed).

Usage:
    python3 build_terracotta.py

Output:
    output/terracotta_v1.mp4
"""

import subprocess
import os
import json
import sys
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE, "audio_segments_terracotta")
VIDEO_DIR = os.path.join(BASE, "video_segments_terracotta")
OUTPUT_DIR = os.path.join(BASE, "output")
TALKING_HEAD = os.path.join(BASE, "source_assets", "yash_talking_head_60s.mp4")

W, H = 1280, 720
VOICE = "Rishi"

SEGMENTS = [
    {
        "id": 1, "type": "head", "dur": 6,
        "line": "Today, I want to show you something we've been building behind the scenes at Clay. Terracotta.",
        "caption": None, "subcaption": None, "stat": None,
    },
    {
        "id": 2, "type": "demo", "dur": 12,
        "line": "Terracotta is our new workflow engine that lets you orchestrate multi-step data processes in a clean, visual way. Think Zapier, but built for how Clay actually works.",
        "caption": "Terracotta",
        "subcaption": "Visual workflows for data + actions",
        "stat": None,
    },
    {
        "id": 3, "type": "demo", "dur": 10,
        "line": "Instead of forcing everything through tables and workbooks, Terracotta separates processing from storage, so your logic lives in workflows, not scattered across tables.",
        "caption": "From Tables to Workflows",
        "subcaption": "Processing separated from storage",
        "stat": None,
    },
    {
        "id": 4, "type": "demo", "dur": 12,
        "line": "You can mix AI agents and Python code, run steps in parallel, and see exactly what's happening at every step. Inputs, outputs, logs, everything.",
        "caption": "Agents + Code + Observability",
        "subcaption": "AI agents  |  Python code  |  Parallel branches  |  Full logs",
        "stat": None,
    },
    {
        "id": 5, "type": "head", "dur": 10,
        "line": "What's exciting is this becomes the foundation for everything. Functions, agents, campaigns, all running on the same workflow system.",
        "caption": None, "subcaption": None, "stat": None,
    },
    {
        "id": 6, "type": "demo", "dur": 10,
        "line": "It means faster builds, more reliable automation, and way more flexibility, whether you're non-technical or writing full Python. This is Terracotta.",
        "caption": "From Signal to Action to Outcome",
        "subcaption": "Faster builds  |  Reliable automation  |  Full flexibility",
        "stat": "This is Terracotta.",
    },
]


def run(cmd, check=True):
    if isinstance(cmd, list):
        r = subprocess.run(cmd, capture_output=True, text=True)
    else:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and r.returncode != 0:
        label = cmd if isinstance(cmd, str) else " ".join(cmd[:6]) + "..."
        print(f"  FAIL: {label}")
        print(f"  STDERR: {r.stderr[-600:]}")
        raise SystemExit(1)
    return r


def probe_duration(path):
    r = run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    return float(r.stdout.strip())


def find_font(size=48):
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSText.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def render_text_frame(path, caption=None, subcaption=None, accent=None):
    """Render a 1280x720 PNG with centered text on black background."""
    img = Image.new("RGB", (W, H), "black")
    draw = ImageDraw.Draw(img)

    if caption:
        font_big = find_font(48)
        bbox = draw.textbbox((0, 0), caption, font=font_big)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        y = (H // 2) - 50
        draw.text((x, y), caption, fill="white", font=font_big)

    if subcaption:
        font_sm = find_font(24)
        bbox = draw.textbbox((0, 0), subcaption, font=font_sm)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        y = (H // 2) + 20
        draw.text((x, y), subcaption, fill=(170, 170, 170), font=font_sm)

    if accent:
        font_acc = find_font(30)
        bbox = draw.textbbox((0, 0), accent, font=font_acc)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        y = H - 80
        draw.text((x, y), accent, fill=(255, 200, 100), font=font_acc)

    img.save(path)


def render_stat_overlay(path, stat_text):
    img = Image.new("RGBA", (W, 60), (0, 0, 0, 160))
    draw = ImageDraw.Draw(img)
    font = find_font(28)
    bbox = draw.textbbox((0, 0), stat_text, font=font)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    draw.text((x, 12), stat_text, fill="white", font=font)
    img.save(path)


# ─────────────────────────────────────────────────────────────────────────

def step1_audio():
    print("=== STEP 1: Generating voiceover audio ===")
    for seg in SEGMENTS:
        i, dur = seg["id"], seg["dur"]
        raw = os.path.join(AUDIO_DIR, f"seg_{i}_raw.aiff")
        wav = os.path.join(AUDIO_DIR, f"seg_{i}.wav")
        print(f"  Seg {i}: TTS ({dur}s)")
        run(["say", "-v", VOICE, "-r", "150", "-o", raw, seg["line"]])
        run(["ffmpeg", "-y", "-i", raw,
             "-af", f"apad=whole_dur={dur}",
             "-t", str(dur), "-ar", "44100", "-ac", "1", wav])

    concat = os.path.join(AUDIO_DIR, "concat.txt")
    with open(concat, "w") as f:
        for seg in SEGMENTS:
            f.write(f"file 'seg_{seg['id']}.wav'\n")

    full = os.path.join(AUDIO_DIR, "full_voiceover.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat,
         "-ar", "44100", "-ac", "1", full])
    print(f"  Full voiceover: {probe_duration(full):.2f}s")


def step2_video():
    print("\n=== STEP 2: Building video segments ===")
    head_offset = 2

    for seg in SEGMENTS:
        i, dur = seg["id"], seg["dur"]
        wav = os.path.join(AUDIO_DIR, f"seg_{i}.wav")
        out = os.path.join(VIDEO_DIR, f"seg_{i}.mp4")

        if seg["type"] == "head":
            print(f"  Seg {i}: talking head ({dur}s @ offset {head_offset}s)")

            run([
                "ffmpeg", "-y",
                "-ss", str(head_offset), "-t", str(dur), "-i", TALKING_HEAD,
                "-i", wav,
                "-map", "0:v", "-map", "1:a",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-c:a", "aac", "-b:a", "128k",
                "-r", "24000/1001", "-s", f"{W}x{H}", "-t", str(dur),
                out,
            ])
            head_offset += dur

        else:
            print(f"  Seg {i}: black screen ({dur}s)")

            frame_png = os.path.join(VIDEO_DIR, f"frame_{i}.png")
            render_text_frame(
                frame_png,
                caption=seg["caption"],
                subcaption=seg["subcaption"],
                accent=seg.get("stat"),
            )

            run([
                "ffmpeg", "-y",
                "-loop", "1", "-framerate", "24000/1001", "-t", str(dur), "-i", frame_png,
                "-i", wav,
                "-map", "0:v", "-map", "1:a",
                "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k", "-t", str(dur),
                out,
            ])


def step3_concat():
    print("\n=== STEP 3: Concatenating final video ===")
    concat = os.path.join(VIDEO_DIR, "concat.txt")
    with open(concat, "w") as f:
        for seg in SEGMENTS:
            f.write(f"file 'seg_{seg['id']}.mp4'\n")

    final = os.path.join(OUTPUT_DIR, "terracotta_v1.mp4")
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "128k",
        final,
    ])
    print(f"  Final: {final} ({probe_duration(final):.2f}s)")


def step4_qc():
    print("\n" + "=" * 60)
    print("  QC REPORT — Terracotta Overview")
    print("=" * 60)

    final = os.path.join(OUTPUT_DIR, "terracotta_v1.mp4")

    r = run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration,size,bit_rate", "-of", "json", final])
    fmt = json.loads(r.stdout)["format"]
    total = float(fmt["duration"])
    size_mb = int(fmt["size"]) / (1024 * 1024)
    print(f"\n  Duration:  {total:.2f}s")
    print(f"  Size:      {size_mb:.1f} MB")
    print(f"  Bitrate:   {int(fmt['bit_rate']) // 1000} kbps")

    print("\n  --- Segment Timing ---")
    cum = 0.0
    all_ok = True
    for seg in SEGMENTS:
        path = os.path.join(VIDEO_DIR, f"seg_{seg['id']}.mp4")
        actual = probe_duration(path)
        expected = seg["dur"]
        drift = actual - expected
        label = "TALK" if seg["type"] == "head" else "DEMO"
        ok = abs(drift) < 0.15
        if not ok:
            all_ok = False
        status = "OK" if ok else "DRIFT"
        print(f"    Seg {seg['id']} [{label}]  {expected}s -> {actual:.2f}s  drift={drift:+.3f}s  [{status}]")
        cum += actual
    print(f"\n  Sum: {cum:.2f}s (target 60s)")

    print("\n  --- A/V Sync ---")
    r = run(["ffprobe", "-v", "quiet", "-show_entries", "stream=codec_type,duration", "-of", "json", final])
    streams = json.loads(r.stdout)["streams"]
    v_dur = a_dur = 0
    for s in streams:
        d = float(s.get("duration", 0))
        if s["codec_type"] == "video":
            v_dur = d
        elif s["codec_type"] == "audio":
            a_dur = d
    drift = abs(v_dur - a_dur)
    print(f"    Video: {v_dur:.3f}s")
    print(f"    Audio: {a_dur:.3f}s")
    print(f"    Drift: {drift:.3f}s", end="")
    if drift < 0.1:
        print("  [OK]")
    elif drift < 0.25:
        print("  [ACCEPTABLE]")
    else:
        print("  [WARNING]")
        all_ok = False

    print("\n  --- Visual Layout ---")
    for seg in SEGMENTS:
        label = "TALKING HEAD" if seg["type"] == "head" else "BLACK SCREEN"
        extra = ""
        if seg["caption"]:
            extra = f'  text: "{seg["caption"]}"'
            if seg["subcaption"]:
                extra += f' / "{seg["subcaption"]}"'
        print(f"    Seg {seg['id']}: {label}{extra}")

    print("\n" + "=" * 60)
    if all_ok:
        print("  RESULT: ALL CHECKS PASSED")
    else:
        print("  RESULT: ISSUES FOUND — see above")
    print("=" * 60)
    print(f"\n  OUTPUT: {final}")


if __name__ == "__main__":
    for d in [AUDIO_DIR, VIDEO_DIR, OUTPUT_DIR]:
        os.makedirs(d, exist_ok=True)

    if not os.path.exists(TALKING_HEAD):
        print(f"ERROR: Missing {TALKING_HEAD}")
        print("Copy yash_talking_head_60s.mp4 into source_assets/")
        sys.exit(1)

    seg1_wav = os.path.join(AUDIO_DIR, "seg_1.wav")
    if os.path.exists(seg1_wav) and os.path.getsize(seg1_wav) > 10000:
        print("=== STEP 1: SKIPPED — using existing ElevenLabs audio ===")
    else:
        step1_audio()
    step2_video()
    step3_concat()
    step4_qc()
