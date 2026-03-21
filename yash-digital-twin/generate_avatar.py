#!/usr/bin/env python3
"""
Generate a digital twin avatar video of Yash using HeyGen API.
Uses headshots extracted from Clay 101 videos + cloned voice.

Usage:
    export HEYGEN_API_KEY="your-api-key"
    python3 generate_avatar.py

Prerequisites:
    - Run clone_voice.py first to get voice_id
    - Headshots in assets/ folder
"""

import os
import sys
import json
import time
import requests

API_KEY = os.environ.get("HEYGEN_API_KEY")
if not API_KEY:
    print("ERROR: Set HEYGEN_API_KEY environment variable")
    print("  export HEYGEN_API_KEY='your-key-here'")
    sys.exit(1)

BASE_URL = "https://api.heygen.com/v2"
HEADERS = {
    "X-Api-Key": API_KEY,
    "Content-Type": "application/json",
}

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")


def upload_photo(photo_path):
    """Upload Yash's headshot to HeyGen as a photo avatar."""
    print(f"Uploading photo: {os.path.basename(photo_path)}")

    with open(photo_path, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/photo_avatar",
            headers={"X-Api-Key": API_KEY},
            files={"file": (os.path.basename(photo_path), f, "image/png")},
        )

    if resp.status_code == 200:
        data = resp.json().get("data", {})
        avatar_id = data.get("photo_avatar_id")
        print(f"  Photo avatar ID: {avatar_id}")
        return avatar_id
    else:
        print(f"ERROR uploading photo: {resp.status_code} - {resp.text}")
        return None


def create_talking_avatar_video(avatar_id, text=None, voice_id=None):
    """Create a video of Yash's digital twin speaking."""
    if text is None:
        text = (
            "Hey everyone, welcome back to Clay University. "
            "I'm Yash, and today I'm going to walk you through "
            "how to build a powerful outbound pipeline using Clay. "
            "We'll cover everything from finding companies to enriching data. "
            "Let's dive right in."
        )

    payload = {
        "video_inputs": [
            {
                "character": {
                    "type": "photo_avatar",
                    "photo_avatar_id": avatar_id,
                },
                "voice": {
                    "type": "text",
                    "input_text": text,
                },
            }
        ],
        "dimension": {"width": 1280, "height": 720},
    }

    if voice_id:
        payload["video_inputs"][0]["voice"]["voice_id"] = voice_id

    print("Creating talking avatar video...")
    resp = requests.post(
        f"{BASE_URL}/video/generate",
        headers=HEADERS,
        json=payload,
    )

    if resp.status_code == 200:
        video_id = resp.json().get("data", {}).get("video_id")
        print(f"  Video generation started. ID: {video_id}")
        return video_id
    else:
        print(f"ERROR: {resp.status_code} - {resp.text}")
        return None


def poll_video(video_id):
    """Poll until video is ready, then download."""
    print("Waiting for video to render...")
    for i in range(60):
        time.sleep(10)
        resp = requests.get(
            f"{BASE_URL}/video_status.get",
            headers=HEADERS,
            params={"video_id": video_id},
        )
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            status = data.get("status")
            print(f"  [{i*10}s] Status: {status}")

            if status == "completed":
                video_url = data.get("video_url")
                output = os.path.join(ASSETS_DIR, "yash_digital_twin.mp4")
                print(f"  Downloading video...")
                vid = requests.get(video_url)
                with open(output, "wb") as f:
                    f.write(vid.content)
                print(f"  Saved: {output}")
                return output
            elif status == "failed":
                print(f"  ERROR: Video generation failed - {data.get('error')}")
                return None

    print("  Timed out waiting for video.")
    return None


def create_instant_avatar(video_path):
    """
    Create an Instant Avatar from a talking head clip.
    This trains a higher-quality avatar from actual video footage.
    """
    print(f"Uploading video for Instant Avatar training: {os.path.basename(video_path)}")

    with open(video_path, "rb") as f:
        resp = requests.post(
            "https://api.heygen.com/v1/avatar.create",
            headers={"X-Api-Key": API_KEY},
            files={"file": (os.path.basename(video_path), f, "video/mp4")},
            data={"name": "Yash - Clay Digital Twin"},
        )

    if resp.status_code == 200:
        data = resp.json().get("data", {})
        print(f"  Instant Avatar created: {json.dumps(data, indent=2)}")
        return data
    else:
        print(f"  Note: Instant Avatar requires HeyGen Enterprise plan")
        print(f"  Status: {resp.status_code} - {resp.text}")
        return None


if __name__ == "__main__":
    headshot = os.path.join(ASSETS_DIR, "yash_headshot_01.png")
    if not os.path.exists(headshot):
        print("ERROR: Headshot not found. Extract frames first.")
        sys.exit(1)

    voice_manifest = os.path.join(ASSETS_DIR, "voice_manifest.json")
    voice_id = None
    if os.path.exists(voice_manifest):
        with open(voice_manifest) as f:
            voice_id = json.load(f).get("voice_id")
        print(f"Using cloned voice: {voice_id}")

    avatar_id = upload_photo(headshot)
    if avatar_id:
        video_id = create_talking_avatar_video(avatar_id, voice_id=voice_id)
        if video_id:
            poll_video(video_id)

    talking_clip = os.path.join(ASSETS_DIR, "yash_talking_head_60s.mp4")
    if os.path.exists(talking_clip):
        print("\nAttempting Instant Avatar training from video clip...")
        create_instant_avatar(talking_clip)

    print("\nDone!")
