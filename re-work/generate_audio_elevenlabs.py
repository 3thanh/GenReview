#!/usr/bin/env python3
"""
Generate voiceover audio segments using ElevenLabs cloned voice.
Produces WAV files for each segment of both Clay Ads and Terracotta scripts.
"""

import os
import sys
import subprocess
import requests
import time

API_KEY = "259f6398060a96b007b14353f067710999fef2dadb9609e071bd008a7adecdda"
VOICE_ID = "G2pIdqup6MlQFH2bibG4"
BASE = os.path.dirname(os.path.abspath(__file__))

HEADERS = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json",
}

CLAY_ADS_SEGMENTS = [
    {"id": 1, "dur": 5, "line": "Most teams are still uploading CSVs to run ads... and their targeting is outdated the second they hit upload."},
    {"id": 2, "dur": 7, "line": "Clay Ads turns your table into a live audience that syncs directly to LinkedIn, Meta — and now Google."},
    {"id": 3, "dur": 6, "line": "We're seeing 60%+ match rates on Meta... where most teams are stuck at 20 to 30%."},
    {"id": 4, "dur": 10, "line": "With Enhanced Matching, we automatically find and verify the best emails — no more manual enrichment waterfalls."},
    {"id": 5, "dur": 7, "line": "And because it's synced to your CRM... your audiences update as your pipeline changes."},
    {"id": 6, "dur": 10, "line": "New leads enter campaigns. Closed deals get excluded. Everything stays clean — automatically."},
    {"id": 7, "dur": 7, "line": "Teams like Slack and Anthropic are already using this to cut cost per qualified lead by up to 5x."},
    {"id": 8, "dur": 8, "line": "If you're spending on ads, your audience should be as dynamic as your pipeline."},
]

TERRACOTTA_SEGMENTS = [
    {"id": 1, "dur": 6, "line": "Today, I want to show you something we've been building behind the scenes at Clay — Terracotta."},
    {"id": 2, "dur": 12, "line": "Terracotta is our new workflow engine that lets you orchestrate multi-step data processes in a clean, visual way — think Zapier, but built for how Clay actually works."},
    {"id": 3, "dur": 10, "line": "Instead of forcing everything through tables and workbooks, Terracotta separates processing from storage — so your logic lives in workflows, not scattered across tables."},
    {"id": 4, "dur": 12, "line": "You can mix AI agents and Python code, run steps in parallel, and see exactly what's happening at every step — inputs, outputs, logs, everything."},
    {"id": 5, "dur": 10, "line": "What's exciting is this becomes the foundation for everything — functions, agents, campaigns — all running on the same workflow system."},
    {"id": 6, "dur": 10, "line": "It means faster builds, more reliable automation, and way more flexibility — whether you're non-technical or writing full Python. This is Terracotta."},
]


def generate_speech(text, output_path):
    """Generate speech using ElevenLabs TTS with cloned voice."""
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
        headers=HEADERS,
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
    if resp.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(resp.content)
        return True
    else:
        print(f"    ERROR: {resp.status_code} — {resp.text[:200]}")
        return False


def pad_to_duration(input_mp3, output_wav, target_dur):
    """Convert MP3 to WAV and pad/trim to exact duration."""
    subprocess.run([
        "ffmpeg", "-y", "-i", input_mp3,
        "-af", f"apad=whole_dur={target_dur}",
        "-t", str(target_dur),
        "-ar", "44100", "-ac", "1",
        output_wav,
    ], capture_output=True)


def build_segments(segments, audio_dir, label):
    print(f"\n=== Generating {label} audio ({len(segments)} segments) ===")
    os.makedirs(audio_dir, exist_ok=True)

    for seg in segments:
        i = seg["id"]
        dur = seg["dur"]
        mp3_path = os.path.join(audio_dir, f"seg_{i}_raw.mp3")
        wav_path = os.path.join(audio_dir, f"seg_{i}.wav")

        print(f"  Seg {i}: \"{seg['line'][:50]}...\"")
        ok = generate_speech(seg["line"], mp3_path)
        if not ok:
            print(f"    FAILED — skipping")
            continue

        pad_to_duration(mp3_path, wav_path, dur)

        actual = float(subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", wav_path],
            capture_output=True, text=True,
        ).stdout.strip())
        print(f"    OK — {actual:.2f}s (target {dur}s)")

        time.sleep(0.3)

    concat_path = os.path.join(audio_dir, "concat.txt")
    with open(concat_path, "w") as f:
        for seg in segments:
            f.write(f"file 'seg_{seg['id']}.wav'\n")

    full_path = os.path.join(audio_dir, "full_voiceover.wav")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_path,
        "-ar", "44100", "-ac", "1", full_path,
    ], capture_output=True)

    total = float(subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", full_path],
        capture_output=True, text=True,
    ).stdout.strip())
    print(f"  Full voiceover: {total:.2f}s")


if __name__ == "__main__":
    build_segments(
        CLAY_ADS_SEGMENTS,
        os.path.join(BASE, "audio_segments"),
        "Clay Ads",
    )
    build_segments(
        TERRACOTTA_SEGMENTS,
        os.path.join(BASE, "audio_segments_terracotta"),
        "Terracotta",
    )
    print("\n=== All audio generated with Yash's cloned voice ===")
