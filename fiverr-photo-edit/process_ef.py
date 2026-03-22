#!/usr/bin/env python3
"""
Combine E and F: remove the girl while keeping FULL original background.
Uses LaMa deep-learning inpainting for high-quality large-area removal.
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
    return cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))


def create_girl_mask(img, man_face, girl_face):
    """Create a precise mask around the girl using GrabCut + face detection."""
    h, w = img.shape[:2]

    mx, my, mw, mh = man_face
    gx, gy, gw, gh = girl_face

    # Define the rectangle around the girl for GrabCut
    man_right = mx + mw
    gap = gx - man_right
    rect_x1 = man_right + int(gap * 0.4)
    rect_y1 = max(0, gy - int(gh * 0.6))
    rect_x2 = w
    rect_y2 = h

    rect = (rect_x1, rect_y1, rect_x2 - rect_x1, rect_y2 - rect_y1)

    # GrabCut initialization
    gc_mask = np.zeros((h, w), np.uint8)
    gc_mask[:] = cv2.GC_BGD  # Start as background

    # Mark the girl's area as probable foreground
    gc_mask[rect_y1:rect_y2, rect_x1:rect_x2] = cv2.GC_PR_FGD

    # Mark the girl's face as definite foreground
    face_pad = int(gh * 0.1)
    fy1, fy2 = max(0, gy - face_pad), min(h, gy + gh + face_pad)
    fx1, fx2 = max(0, gx - face_pad), min(w, gx + gw + face_pad)
    gc_mask[fy1:fy2, fx1:fx2] = cv2.GC_FGD

    # Mark the man's area as definite background (protect him)
    protect_pad = int(mw * 0.15)
    gc_mask[:, :man_right + protect_pad] = cv2.GC_BGD

    # Mark top sky area as definite background
    gc_mask[:max(rect_y1, 50), :] = cv2.GC_BGD

    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(img, gc_mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    except cv2.error:
        # Fallback if GrabCut fails
        gc_mask[rect_y1:rect_y2, rect_x1:rect_x2] = cv2.GC_FGD

    # Convert GrabCut result to binary mask
    mask = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # Ensure the girl's head area is definitely masked
    cv2.circle(mask, (gx + gw // 2, gy + gh // 2), int(gw * 0.7), 255, -1)

    # Ensure the girl's upper body is masked
    body_x1 = max(rect_x1, gx - int(gw * 0.3))
    body_x2 = min(w, gx + gw + int(gw * 0.3))
    body_y1 = gy + int(gh * 0.5)
    body_y2 = min(h, gy + gh + int(gh * 3))
    mask[body_y1:body_y2, body_x1:body_x2] = 255

    # Protect the man — zero out everything left of the gap
    protect_x = man_right + int(gap * 0.2)
    mask[:, :protect_x] = 0

    # Dilate slightly to ensure full coverage
    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.dilate(mask, kernel, iterations=2)

    # Feather edges for smooth blending
    mask = cv2.GaussianBlur(mask, (21, 21), 8)
    _, mask = cv2.threshold(mask, 100, 255, cv2.THRESH_BINARY)
    mask = cv2.GaussianBlur(mask, (15, 15), 5)

    return mask


def lama_inpaint(img_rgb, mask):
    """Use LaMa model for high-quality inpainting on CPU."""
    import torch
    model_path = "/Users/ethanhuang1/.cache/torch/hub/checkpoints/big-lama.pt"
    device = torch.device("cpu")

    model = torch.jit.load(model_path, map_location=device)
    model.eval()

    img_pil = Image.fromarray(img_rgb)
    mask_pil = Image.fromarray(mask).convert("L")

    orig_size = img_pil.size
    # Run at full resolution — round to nearest multiple of 8
    new_w = (orig_size[0] // 8) * 8
    new_h = (orig_size[1] // 8) * 8
    img_resized = img_pil.resize((new_w, new_h), Image.LANCZOS)
    mask_resized = mask_pil.resize((new_w, new_h), Image.NEAREST)

    # Convert to tensors
    img_tensor = torch.from_numpy(np.array(img_resized)).permute(2, 0, 1).unsqueeze(0).float() / 255.0
    mask_tensor = torch.from_numpy(np.array(mask_resized)).unsqueeze(0).unsqueeze(0).float() / 255.0
    mask_tensor = (mask_tensor > 0.5).float()

    with torch.no_grad():
        result = model(img_tensor, mask_tensor)

    result = result[0].permute(1, 2, 0).numpy()
    result = np.clip(result * 255, 0, 255).astype(np.uint8)

    # Resize back to original
    result_pil = Image.fromarray(result).resize(orig_size, Image.LANCZOS)
    return np.array(result_pil)


def smooth_skin(img, face_rect):
    result = img.copy()
    x, y, w, h = face_rect
    pad = int(h * 0.5)
    y1, y2 = max(0, y - pad), min(img.shape[0], y + h + pad)
    x1, x2 = max(0, x - pad), min(img.shape[1], x + w + pad)
    roi_h, roi_w = y2 - y1, x2 - x1
    face_roi = result[y1:y2, x1:x2].copy()
    smoothed = cv2.bilateralFilter(face_roi, 9, 55, 55)
    smoothed = cv2.bilateralFilter(smoothed, 7, 40, 40)
    mask = np.zeros((roi_h, roi_w), dtype=np.float32)
    cv2.ellipse(mask, (roi_w // 2, roi_h // 2), (roi_w // 2, roi_h // 2), 0, 0, 360, 1.0, -1)
    mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=roi_w * 0.2, sigmaY=roi_h * 0.2)
    mask = np.clip(mask * 0.4, 0, 0.4)
    m3 = np.stack([mask] * 3, axis=-1)
    result[y1:y2, x1:x2] = (face_roi.astype(np.float32) * (1 - m3) +
                              smoothed.astype(np.float32) * m3).astype(np.uint8)
    return result


def whiten_teeth(img, face_rect):
    result = img.copy()
    x, y, w, h = face_rect
    my1, my2 = max(0, y + int(h * 0.58)), min(result.shape[0], y + int(h * 0.95))
    mx1, mx2 = max(0, x + int(w * 0.15)), min(result.shape[1], x + int(w * 0.85))
    if my2 - my1 <= 0 or mx2 - mx1 <= 0:
        return result
    hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV)
    roi = hsv[my1:my2, mx1:mx2].copy()
    tm = cv2.GaussianBlur(cv2.inRange(roi, np.array([8, 20, 100]), np.array([35, 200, 255])), (5, 5), 2)
    a = tm.astype(np.float32) / 255.0
    roi[:, :, 1] = np.clip(roi[:, :, 1].astype(float) - 20 * a, 0, 255).astype(np.uint8)
    roi[:, :, 2] = np.clip(roi[:, :, 2].astype(float) + 10 * a, 0, 255).astype(np.uint8)
    hsv[my1:my2, mx1:mx2] = roi
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)


def apply_retro(img_pil):
    r, g, b = img_pil.split()
    r = r.point(lambda x: min(255, int(x * 1.03)))
    b = b.point(lambda x: int(x * 0.97))
    img_pil = Image.merge("RGB", (r, g, b))
    img_pil = ImageEnhance.Contrast(img_pil).enhance(1.03)
    w, h = img_pil.size
    arr = np.array(img_pil).astype(np.int16)
    arr = np.clip(arr + np.random.normal(0, 4, (h, w, 3)).astype(np.int16), 0, 255)
    return Image.fromarray(arr.astype(np.uint8))


def add_light_leak(img_pil, intensity=0.08):
    w, h = img_pil.size
    leak = np.zeros((h, w, 3), dtype=np.float32)
    lw = int(w * 0.10)
    for x in range(min(lw, w)):
        a = (1.0 - x / lw) * intensity
        leak[:, x] = [255 * a, 180 * a, 70 * a]
    rs = max(int(w * 0.88), 0)
    for x in range(rs, w):
        a = ((x - rs) / max(w - rs, 1)) * intensity * 0.5
        leak[:, x] = np.maximum(leak[:, x], [220 * a, 180 * a, 140 * a])
    arr = np.array(img_pil).astype(np.float32)
    return Image.fromarray(np.clip(arr + leak, 0, 255).astype(np.uint8))


def main():
    print("Loading images E and F...")
    img_e = cv2.imread(E_PATH)
    img_f = cv2.imread(F_PATH)
    if img_e is None or img_f is None:
        print("ERROR: Could not load images")
        return

    h = min(img_e.shape[0], img_f.shape[0])
    w = min(img_e.shape[1], img_f.shape[1])
    blended = cv2.addWeighted(img_e[:h, :w], 0.5, img_f[:h, :w], 0.5, 0)
    print(f"  Full size: {blended.shape}")

    # Face detection
    faces = detect_faces(blended)
    large = sorted([(x, y, fw, fh) for (x, y, fw, fh) in faces if fw > 150], key=lambda f: f[0])
    if len(large) < 2:
        large = sorted(faces, key=lambda f: f[2], reverse=True)[:2]
        large = sorted(large, key=lambda f: f[0])
    man_face, girl_face = large[0], large[1]
    print(f"  Man: x={man_face[0]}, Girl: x={girl_face[0]}")

    # Create mask
    print("Creating removal mask...")
    mask = create_girl_mask(blended, man_face, girl_face)

    # Convert to RGB for LaMa
    img_rgb = cv2.cvtColor(blended, cv2.COLOR_BGR2RGB)

    # LaMa inpainting
    print("Running LaMa deep-learning inpainting...")
    result_rgb = lama_inpaint(img_rgb, mask)
    result_bgr = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2BGR)

    # Skin + teeth cleanup
    final_faces = detect_faces(result_bgr)
    man_f = sorted(final_faces, key=lambda f: f[0])[0] if len(final_faces) > 0 else man_face
    print("Skin + teeth cleanup...")
    result_bgr = smooth_skin(result_bgr, man_f)
    result_bgr = whiten_teeth(result_bgr, man_f)

    # Retro effects
    img_pil = Image.fromarray(cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB))
    img_pil = apply_retro(img_pil)
    img_pil = add_light_leak(img_pil, intensity=0.08)

    out_path = str(OUTPUT / "ef_combined_retro_solo.jpg")
    img_pil.save(out_path, quality=95)
    print(f"\nSaved: {out_path}")
    print(f"  Dimensions: {img_pil.size}")

    cv2.imwrite(str(OUTPUT / "ef_mask_debug.jpg"), mask)


if __name__ == "__main__":
    main()
