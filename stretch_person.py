#!/usr/bin/env python3
"""
Make the left person taller in image A by stretching the torso.
Uses elliptical head mask, bilateral filter edge smoothing, multi-pass
feathering, and a Gemini AI cleanup pass (same pipeline as fiverr-photo-edit).
"""

import os
import io
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

INPUT = "/Users/ethanhuang1/Code/Hackathon/new_references_extracted/new references/A.jpeg"
OUTPUT = "/Users/ethanhuang1/Code/Hackathon/new_references_extracted/new references/A_taller.jpeg"

img = Image.open(INPUT)
W, H = img.size  # 4284 x 5712
arr_orig = np.array(img).astype(np.float32)

person_top = 1350
person_bottom = 5100
person_height = person_bottom - person_top
extra = int(person_height * 0.15)

stretch_y1 = 3100
stretch_y2 = 4300
stretch_orig_h = stretch_y2 - stretch_y1
stretch_new_h = stretch_orig_h + extra

col_right = 1900

# --- Step 1: Build the vertically-stretched left strip ---
left_strip = img.crop((0, 0, col_right, H))
p1 = left_strip.crop((0, extra, col_right, stretch_y1))
p2 = left_strip.crop((0, stretch_y1, col_right, stretch_y2))
p2_stretched = p2.resize((col_right, stretch_new_h), Image.LANCZOS)
p3 = left_strip.crop((0, stretch_y2, col_right, H))

modified_left = Image.new('RGB', (col_right, H))
y = 0
modified_left.paste(p1, (0, y)); y += p1.height
modified_left.paste(p2_stretched, (0, y)); y += p2_stretched.height
modified_left.paste(p3, (0, y))

arr_mod = np.array(modified_left).astype(np.float32)

new_head_top = person_top - extra  # ~788

# --- Step 2: Precise body mask with elliptical head ---
mask = np.zeros((H, col_right), dtype=np.float32)

head_cx, head_cy = 1100, new_head_top + 200
head_ax, head_ay = 220, 280
cv2.ellipse(mask, (head_cx, head_cy), (head_ax, head_ay), 0, 0, 360, 1.0, -1)

hair_cx, hair_cy = 1100, new_head_top + 50
hair_ax, hair_ay = 200, 180
cv2.ellipse(mask, (hair_cx, hair_cy), (hair_ax, hair_ay), 0, 0, 360, 1.0, -1)

neck_cx, neck_cy = 1080, new_head_top + 480
neck_ax, neck_ay = 140, 80
cv2.ellipse(mask, (neck_cx, neck_cy), (neck_ax, neck_ay), 0, 0, 360, 1.0, -1)

body_regions = [
    (new_head_top + 500, new_head_top + 650, 820, 1330),
    (new_head_top + 650, new_head_top + 850, 670, 1480),
    (new_head_top + 850, 2530, 620, 1480),
    (2530, 3600, 660, 1530),
    (3600, 4600, 710, 1430),
    (4600, 5150, 760, 1350),
]

for y_s, y_e, x_l, x_r in body_regions:
    y_s = max(0, min(H, y_s))
    y_e = max(0, min(H, y_e))
    x_l = max(0, min(col_right, x_l))
    x_r = max(0, min(col_right, x_r))
    mask[y_s:y_e, x_l:x_r] = 1.0

# --- Step 3: Mask feathering with protected boundaries ---
# Hard cutoff above hair BEFORE blurring prevents ghost from spreading
hair_top = new_head_top - 30
mask[:hair_top, :] = 0.0

mask_u8 = (mask * 255).astype(np.uint8)

# Blur only the body-area rows (below hair_top) to avoid painting ghost
body_section = mask_u8[hair_top:, :]
body_section = cv2.GaussianBlur(body_section, (0, 0), sigmaX=45, sigmaY=45)
body_section = cv2.bilateralFilter(body_section, d=15, sigmaColor=75, sigmaSpace=75)
body_section = cv2.GaussianBlur(body_section, (0, 0), sigmaX=20, sigmaY=20)
mask_u8[hair_top:, :] = body_section

mask = mask_u8.astype(np.float32) / 255.0

# Very tight top-of-hair fade (12px) to eliminate painting ghost
tight_fade = 12
for yy in range(hair_top, hair_top + tight_fade):
    t = (yy - hair_top) / tight_fade
    t = t * t * (3 - 2 * t)
    mask[yy, :] *= t

right_fade = 180
for xx in range(col_right - right_fade, col_right):
    t = 1.0 - ((xx - (col_right - right_fade)) / right_fade)
    t = t * t * (3 - 2 * t)
    mask[:, xx] *= t

left_fade = 60
for xx in range(left_fade):
    if mask[new_head_top:new_head_top + 500, xx].max() > 0:
        t = xx / left_fade
        t = t * t * (3 - 2 * t)
        mask[:, xx] *= t

mask_3d = mask[:, :, np.newaxis]

# --- Step 4: Composite ---
result_arr = arr_orig.copy()
result_arr[:, :col_right, :] = (
    mask_3d * arr_mod + (1.0 - mask_3d) * arr_orig[:, :col_right, :]
)

# --- Step 5: Bilateral edge smoothing to kill halo artifacts ---
result_u8 = result_arr.astype(np.uint8)
result_bgr = cv2.cvtColor(result_u8, cv2.COLOR_RGB2BGR)

edge_zone = ((mask > 0.05) & (mask < 0.95)).astype(np.uint8) * 255
edge_zone = cv2.dilate(edge_zone, np.ones((15, 15), np.uint8))
edge_zone = cv2.GaussianBlur(edge_zone, (0, 0), sigmaX=15)
edge_alpha = edge_zone.astype(np.float32) / 255.0

smoothed = cv2.bilateralFilter(result_bgr[:, :col_right], d=9, sigmaColor=45, sigmaSpace=45)

ea3 = edge_alpha[:, :, np.newaxis]
blend_strength = 0.4
blended = (
    result_bgr[:, :col_right].astype(np.float32) * (1 - ea3 * blend_strength) +
    smoothed.astype(np.float32) * (ea3 * blend_strength)
).astype(np.uint8)
result_bgr[:, :col_right] = blended

result_arr = cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

# --- Step 6: Pillow enhancements ---
result = Image.fromarray(result_arr.astype(np.uint8))

enhancer = ImageEnhance.Sharpness(result)
result = enhancer.enhance(1.10)
enhancer = ImageEnhance.Contrast(result)
result = enhancer.enhance(1.02)
enhancer = ImageEnhance.Color(result)
result = enhancer.enhance(1.01)

result.save(OUTPUT, quality=95)
print(f"Saved to {OUTPUT}")
print(f"Extra height added: {extra}px ({extra / person_height * 100:.1f}% of person height)")

# --- Step 7: Gemini AI cleanup pass ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

if not GEMINI_API_KEY:
    print("No GEMINI_API_KEY set — skipping AI cleanup. Set the env var to enable.")
else:
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)

        touchup_img = Image.open(OUTPUT)
        original_size = touchup_img.size
        max_dim = 2048
        if max(touchup_img.size) > max_dim:
            ratio = max_dim / max(touchup_img.size)
            new_size = (int(touchup_img.size[0] * ratio), int(touchup_img.size[1] * ratio))
            touchup_img = touchup_img.resize(new_size, Image.LANCZOS)

        prompt = (
            "This photo was slightly edited. Fix any visible artifacts, halos, ghosting, "
            "or unnatural blending around the people — especially around the hair, head "
            "outline, and body edges. The background is a Monet painting in a museum. "
            "Make the blending completely seamless so the edit is invisible. Keep the exact "
            "same composition, poses, expressions, outfits, and background. Only fix "
            "quality artifacts. Output a clean, professional-quality photo."
        )

        print("Running Gemini AI cleanup pass...")
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[touchup_img, prompt],
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )

        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                cleaned = Image.open(io.BytesIO(part.inline_data.data))
                if cleaned.size != original_size:
                    cleaned = cleaned.resize(original_size, Image.LANCZOS)
                enhancer = ImageEnhance.Sharpness(cleaned)
                cleaned = enhancer.enhance(1.10)
                cleaned.save(OUTPUT, quality=95)
                print(f"Gemini cleanup saved to {OUTPUT}")
                break
            if hasattr(part, 'text') and part.text:
                print(f"  Gemini note: {part.text[:200]}")

    except ImportError:
        print("google-genai not installed — skipping Gemini cleanup pass")
    except Exception as e:
        print(f"Gemini cleanup failed (keeping pixel-level result): {e}")
