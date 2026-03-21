#!/usr/bin/env python3
"""
Combine E and F reference photos: remove the girl via tight crop,
keep the retro film vibe, slightly clean up teeth and skin.
"""

import os
import numpy as np
import cv2
from pathlib import Path
from PIL import Image, ImageEnhance

BASE = Path(__file__).parent.parent
E_PATH = str(BASE / "new_references_extracted" / "new references" / "E.jpeg")
F_PATH = str(BASE / "new_references_extracted" / "new references" / "F.JPEG")
OUTPUT = BASE / "fiverr-photo-edit" / "output"
OUTPUT.mkdir(exist_ok=True)


def detect_faces(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    return faces


def smooth_skin(img, face_rect):
    """Subtle skin smoothing using bilateral filter with elliptical gradient mask."""
    result = img.copy()
    x, y, w, h = face_rect
    pad = int(h * 0.5)
    y1, y2 = max(0, y - pad), min(img.shape[0], y + h + pad)
    x1, x2 = max(0, x - pad), min(img.shape[1], x + w + pad)

    roi_h, roi_w = y2 - y1, x2 - x1
    face_roi = result[y1:y2, x1:x2].copy()

    smoothed = cv2.bilateralFilter(face_roi, 9, 55, 55)
    smoothed = cv2.bilateralFilter(smoothed, 7, 40, 40)

    # Elliptical gradient mask for natural blending
    mask = np.zeros((roi_h, roi_w), dtype=np.float32)
    center = (roi_w // 2, roi_h // 2)
    cv2.ellipse(mask, center, (roi_w // 2, roi_h // 2), 0, 0, 360, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=roi_w * 0.2, sigmaY=roi_h * 0.2)
    mask = np.clip(mask * 0.45, 0, 0.45)  # Max 45% smoothing at center

    mask_3ch = np.stack([mask] * 3, axis=-1)
    blended = (face_roi.astype(np.float32) * (1 - mask_3ch) +
               smoothed.astype(np.float32) * mask_3ch).astype(np.uint8)
    result[y1:y2, x1:x2] = blended
    return result


def whiten_teeth(img, face_rect):
    """Subtle teeth whitening with smooth blending."""
    result = img.copy()
    x, y, w, h = face_rect

    mouth_y1 = max(0, y + int(h * 0.58))
    mouth_y2 = min(result.shape[0], y + int(h * 0.95))
    mouth_x1 = max(0, x + int(w * 0.15))
    mouth_x2 = min(result.shape[1], x + int(w * 0.85))

    roi_h, roi_w = mouth_y2 - mouth_y1, mouth_x2 - mouth_x1
    if roi_h <= 0 or roi_w <= 0:
        return result

    hsv_full = cv2.cvtColor(result, cv2.COLOR_BGR2HSV)
    mouth_roi = hsv_full[mouth_y1:mouth_y2, mouth_x1:mouth_x2].copy()

    lower = np.array([8, 20, 100])
    upper = np.array([35, 200, 255])
    teeth_mask = cv2.inRange(mouth_roi, lower, upper)
    # Soften the mask edges
    teeth_mask = cv2.GaussianBlur(teeth_mask, (5, 5), 2)

    alpha = teeth_mask.astype(np.float32) / 255.0

    whitened = mouth_roi.copy()
    whitened[:, :, 1] = np.clip(whitened[:, :, 1].astype(float) - 20 * alpha, 0, 255).astype(np.uint8)
    whitened[:, :, 2] = np.clip(whitened[:, :, 2].astype(float) + 10 * alpha, 0, 255).astype(np.uint8)

    hsv_full[mouth_y1:mouth_y2, mouth_x1:mouth_x2] = whitened
    result = cv2.cvtColor(hsv_full, cv2.COLOR_HSV2BGR)
    return result


def apply_retro_film(img_pil):
    """Preserve and enhance the retro film look."""
    r, g, b = img_pil.split()
    r = r.point(lambda x: min(255, int(x * 1.04)))
    b = b.point(lambda x: int(x * 0.96))
    img_pil = Image.merge("RGB", (r, g, b))

    enhancer = ImageEnhance.Contrast(img_pil)
    img_pil = enhancer.enhance(1.04)

    # Subtle film grain
    w, h = img_pil.size
    grain = np.random.normal(0, 5, (h, w, 3)).astype(np.int16)
    img_arr = np.array(img_pil).astype(np.int16)
    img_arr = np.clip(img_arr + grain, 0, 255).astype(np.uint8)
    return Image.fromarray(img_arr)


def add_light_leak(img_pil, intensity=0.10):
    """Subtle warm light leak on edges."""
    w, h = img_pil.size
    leak_arr = np.zeros((h, w, 3), dtype=np.float32)

    leak_width = int(w * 0.12)
    for x in range(min(leak_width, w)):
        alpha = (1.0 - x / leak_width) * intensity
        leak_arr[:, x, 0] = 255 * alpha
        leak_arr[:, x, 1] = 180 * alpha
        leak_arr[:, x, 2] = 70 * alpha

    img_arr = np.array(img_pil).astype(np.float32)
    result = np.clip(img_arr + leak_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(result)


def main():
    print("Loading images E and F...")
    img_e = cv2.imread(E_PATH)
    img_f = cv2.imread(F_PATH)

    if img_e is None or img_f is None:
        print("ERROR: Could not load images")
        return

    # Blend both images for noise reduction
    h = min(img_e.shape[0], img_f.shape[0])
    w = min(img_e.shape[1], img_f.shape[1])
    blended = cv2.addWeighted(img_e[:h, :w], 0.5, img_f[:h, :w], 0.5, 0)
    print(f"  Blended: {blended.shape}")

    # Detect faces
    faces = detect_faces(blended)
    print(f"  Found {len(faces)} faces")
    for i, (x, y, fw, fh) in enumerate(faces):
        print(f"    Face {i}: x={x}, y={y}, w={fw}, h={fh}")

    # Identify the man's face (leftmost large face)
    large_faces = [(x, y, fw, fh) for (x, y, fw, fh) in faces if fw > 150]
    if not large_faces:
        large_faces = list(faces)

    man_face = sorted(large_faces, key=lambda f: f[0])[0]
    mx, my, mw, mh = man_face
    print(f"  Man's face: x={mx}, y={my}, w={mw}, h={mh}")

    # Clean crop: cut just before the girl starts
    girl_faces = [f for f in large_faces if f[0] > mx + mw]
    if girl_faces:
        girl_x = girl_faces[0][0]
        cut_x = mx + mw + int((girl_x - mx - mw) * 0.5)
    else:
        cut_x = int(w * 0.52)

    print(f"  Crop right edge at x={cut_x}")

    # Crop: left edge to cut_x, full height
    left_margin = max(0, mx - int(mw * 1.0))
    cropped = blended[:, left_margin:cut_x]
    print(f"  Cropped: {cropped.shape}")

    # Adjust man_face coordinates for the crop
    adj_face = (mx - left_margin, my, mw, mh)

    # Skin smoothing
    print("Smoothing skin...")
    cropped = smooth_skin(cropped, adj_face)

    # Teeth whitening
    print("Whitening teeth...")
    cropped = whiten_teeth(cropped, adj_face)

    # Convert to PIL
    img_pil = Image.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))

    # Apply retro film effects
    print("Applying retro film effects...")
    img_pil = apply_retro_film(img_pil)
    img_pil = add_light_leak(img_pil, intensity=0.10)

    # Save
    out_path = str(OUTPUT / "ef_combined_retro_solo.jpg")
    img_pil.save(out_path, quality=95)
    print(f"\nSaved: {out_path}")
    print(f"  Size: {os.path.getsize(out_path) // 1024}KB")
    print(f"  Dimensions: {img_pil.size}")


if __name__ == "__main__":
    main()
