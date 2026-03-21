#!/usr/bin/env python3
"""
Subtle photo touch-up script for reference photos using Gemini 2.0 Flash.
Applies small, incremental fixes: skin smoothing, teeth cleanup,
flyaway hair removal, and slight quality crisping.
"""

import os
import sys
import time
import io
import shutil
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyAXV94zKDA4e-yGZxDkeX7a-tU_31ppCro")
client = genai.Client(api_key=GEMINI_API_KEY)

BASE_DIR = Path(__file__).parent
REFERENCES = BASE_DIR / "References"
BACKUP_DIR = REFERENCES / "originals_backup"


def backup_originals():
    """Back up all original reference photos before editing."""
    BACKUP_DIR.mkdir(exist_ok=True)
    count = 0
    for f in REFERENCES.iterdir():
        if f.suffix.lower() in ('.jpg', '.jpeg', '.png') and f.is_file():
            dest = BACKUP_DIR / f.name
            if not dest.exists():
                shutil.copy2(f, dest)
                count += 1
                print(f"  Backed up: {f.name}")
    print(f"  Total backed up: {count} files")


def apply_pillow_enhancements(img: Image.Image) -> Image.Image:
    """Apply subtle Pillow-based quality improvements."""
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.15)

    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.03)

    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(1.02)

    return img


def fix_orientation(img: Image.Image) -> Image.Image:
    """Fix image orientation based on EXIF data."""
    try:
        exif = img._getexif()
        if exif:
            orientation = exif.get(274)  # 274 = Orientation tag
            if orientation == 3:
                img = img.rotate(180, expand=True)
            elif orientation == 6:
                img = img.rotate(270, expand=True)
            elif orientation == 8:
                img = img.rotate(90, expand=True)
    except (AttributeError, KeyError):
        pass
    return img


def touchup_with_gemini(image_path: Path, prompt: str) -> bool:
    """Send a photo to Gemini for subtle AI retouching."""
    print(f"\n{'='*60}")
    print(f"Processing: {image_path.name}")

    img = Image.open(image_path)
    img = fix_orientation(img)
    original_size = img.size

    max_dim = 2048
    if max(img.size) > max_dim:
        ratio = max_dim / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        print(f"  Resized from {original_size} to {img.size} for API")

    contents = [img, prompt]

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data is not None:
                    img_data = part.inline_data.data
                    result_img = Image.open(io.BytesIO(img_data))

                    result_img = apply_pillow_enhancements(result_img)

                    if result_img.size != original_size:
                        result_img = result_img.resize(original_size, Image.LANCZOS)

                    result_img.save(str(image_path), quality=95)
                    print(f"  Saved enhanced: {image_path.name} ({result_img.size})")

                    for p in response.candidates[0].content.parts:
                        if p.text:
                            print(f"  Note: {p.text[:200]}")
                    return True

            print(f"  WARNING: No image returned for {image_path.name}")
            for part in response.candidates[0].content.parts:
                if part.text:
                    print(f"  Response text: {part.text[:300]}")

        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                wait = 5 * (attempt + 1)
                print(f"  Waiting {wait}s before retry...")
                time.sleep(wait)

    return False


BASE_PROMPT = (
    "Make ONLY subtle, minimal touch-ups to this photo. "
    "Do NOT change the composition, pose, outfit, background, or overall look. "
    "The result should look nearly identical to the original — just slightly cleaner. "
    "Specifically:\n"
    "1. Gently smooth any visible skin blemishes, spots, or uneven patches (very subtle)\n"
    "2. If teeth are visible, make them look slightly cleaner/brighter (not unnaturally white)\n"
    "3. Clean up any loose flyaway strands of hair around the head outline\n"
    "4. Slightly crisp/sharpen the overall image quality\n"
    "Keep the person looking EXACTLY like themselves. No changes to facial structure, "
    "expression, skin tone, hair style, or body shape. This is a gentle retouch, not a makeover."
)

PHOTOS_TO_PROCESS = [
    ("251211-01_1053.jpg", BASE_PROMPT),
    ("251211-01_1058.jpg", BASE_PROMPT),
    ("251211-01_1059.jpg", BASE_PROMPT),
    ("251211-01_1067.jpg", BASE_PROMPT),
    ("Copy of IMG_9504 (1).JPG", BASE_PROMPT),
    ("IMG_0077.jpg", BASE_PROMPT),
    ("IMG_4656.jpg", BASE_PROMPT),
    ("IMG_7655.JPG", BASE_PROMPT),
    ("IMG_9579.JPG", BASE_PROMPT),
    ("IMG_9760.JPG", BASE_PROMPT),
    (
        "smiling_pro_photo.jpg",
        BASE_PROMPT + "\nAlso: this photo appears rotated/sideways — "
        "please output it in the correct upright portrait orientation."
    ),
]


def main():
    targets = sys.argv[1:] if len(sys.argv) > 1 else None

    print("=" * 60)
    print("Reference Photo Touch-Up Script")
    print("=" * 60)

    print("\nStep 1: Backing up originals...")
    backup_originals()

    print("\nStep 2: Processing photos with Gemini...")
    results = {"success": [], "failed": []}

    for filename, prompt in PHOTOS_TO_PROCESS:
        if targets and filename not in targets:
            continue

        path = REFERENCES / filename
        if not path.exists():
            print(f"  SKIP: {filename} not found")
            continue

        success = touchup_with_gemini(path, prompt)
        if success:
            results["success"].append(filename)
        else:
            results["failed"].append(filename)

        time.sleep(2)

    print(f"\n{'='*60}")
    print("RESULTS:")
    print(f"  Success: {len(results['success'])}")
    for f in results["success"]:
        print(f"    ✓ {f}")
    if results["failed"]:
        print(f"  Failed: {len(results['failed'])}")
        for f in results["failed"]:
            print(f"    ✗ {f}")
    print(f"\nOriginals backed up to: {BACKUP_DIR}")


if __name__ == "__main__":
    main()
