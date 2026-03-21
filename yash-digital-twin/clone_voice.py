#!/usr/bin/env python3
"""
Clone Yash's voice using ElevenLabs API.
Uses audio extracted from Clay 101 YouTube playlist.

Usage:
    export ELEVENLABS_API_KEY="your-api-key"
    python3 clone_voice.py

This will create a cloned voice named "Yash - Clay" in your ElevenLabs account.
"""

import os
import sys
import json
import requests

API_KEY = os.environ.get("ELEVENLABS_API_KEY")
if not API_KEY:
    print("ERROR: Set ELEVENLABS_API_KEY environment variable")
    print("  export ELEVENLABS_API_KEY='your-key-here'")
    sys.exit(1)

BASE_URL = "https://api.elevenlabs.io/v1"
HEADERS = {"xi-api-key": API_KEY}

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "audio")
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")

VOICE_SAMPLES = [
    os.path.join(AUDIO_DIR, "001_Clay_101_Lesson_1_-_The_FETE_Framework.wav"),
    os.path.join(AUDIO_DIR, "002_Clay_101_Lesson_2_-_The_Jigsaw_Framework.wav"),
    os.path.join(AUDIO_DIR, "007_Clay_101_Lesson_7_-_Prompt_Engineering_with_the_S.P.I.C.E._Framework.wav"),
    os.path.join(AUDIO_DIR, "023_Clay_101_Lesson_23_-_Closing_Remarks.wav"),
]

# ElevenLabs instant voice cloning supports up to 25 samples
# We pick diverse lessons to capture Yash's vocal range

def clone_voice():
    print("Creating voice clone 'Yash - Clay'...")

    files = []
    for path in VOICE_SAMPLES:
        if not os.path.exists(path):
            print(f"  WARNING: {path} not found, skipping")
            continue
        files.append(("files", (os.path.basename(path), open(path, "rb"), "audio/wav")))
        print(f"  Adding sample: {os.path.basename(path)}")

    if not files:
        print("ERROR: No audio samples found. Run the download step first.")
        sys.exit(1)

    data = {
        "name": "Yash - Clay",
        "description": "Voice clone of Yash from Clay University Clay 101 series",
    }

    resp = requests.post(
        f"{BASE_URL}/voices/add",
        headers=HEADERS,
        data=data,
        files=files,
    )

    for _, (_, f, _) in files:
        f.close()

    if resp.status_code == 200:
        voice_id = resp.json()["voice_id"]
        print(f"\nVoice cloned successfully!")
        print(f"  Voice ID: {voice_id}")
        print(f"  Name: Yash - Clay")

        manifest = {
            "voice_id": voice_id,
            "name": "Yash - Clay",
            "provider": "elevenlabs",
            "samples_used": [os.path.basename(p) for p in VOICE_SAMPLES],
        }
        manifest_path = os.path.join(ASSETS_DIR, "voice_manifest.json")
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
        print(f"  Manifest saved: {manifest_path}")

        return voice_id
    else:
        print(f"ERROR: {resp.status_code} - {resp.text}")
        sys.exit(1)


def test_voice(voice_id, text=None):
    if text is None:
        text = (
            "Hey everyone, welcome to Clay University. "
            "Today we're going to dive into how to build your outbound pipeline using Clay. "
            "Let's get started."
        )

    print(f"\nGenerating test audio with cloned voice...")
    resp = requests.post(
        f"{BASE_URL}/text-to-speech/{voice_id}",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.5,
                "use_speaker_boost": True,
            },
        },
    )

    if resp.status_code == 200:
        output_path = os.path.join(ASSETS_DIR, "yash_test_speech.mp3")
        with open(output_path, "wb") as f:
            f.write(resp.content)
        print(f"  Test audio saved: {output_path}")
    else:
        print(f"ERROR generating speech: {resp.status_code} - {resp.text}")


if __name__ == "__main__":
    voice_id = clone_voice()
    test_voice(voice_id)
    print("\nDone! Your Yash voice clone is ready to use.")
