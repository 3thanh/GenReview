#!/usr/bin/env python3
"""
Real face swap using InsightFace + inswapper_128.
Swaps the reference person's face onto target photos.
"""

import sys
import cv2
import numpy as np
from pathlib import Path
import insightface
from insightface.app import FaceAnalysis
from PIL import Image

BASE_DIR = Path(__file__).parent
MAKE_INTO = BASE_DIR / "Make into"
REFERENCES = BASE_DIR / "References"
OUTPUT = BASE_DIR / "output"
OUTPUT.mkdir(exist_ok=True)

MODEL_PATH = Path.home() / ".insightface/models/inswapper_128.onnx"

print("Loading InsightFace models...")
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

swapper = insightface.model_zoo.get_model(str(MODEL_PATH), providers=['CPUExecutionProvider'])
print("Models loaded.\n")


def get_best_face(img):
    """Get the highest-scoring face from an image."""
    faces = app.get(img)
    if not faces:
        return None
    return max(faces, key=lambda f: f.det_score)


def get_all_faces(img):
    """Get all faces sorted by x position (left to right)."""
    faces = app.get(img)
    if not faces:
        return []
    return sorted(faces, key=lambda f: f.bbox[0])


def swap_face(source_img, target_img, source_face, target_face):
    """Swap source face onto target image at target face location."""
    return swapper.get(target_img, target_face, source_face, paste_back=True)


def change_background_color(img, target_face, color_bgr):
    """Simple background replacement using face position heuristics."""
    h, w = img.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        cv2.drawContours(mask, [largest], -1, 255, -1)
    
    bg = np.full_like(img, color_bgr, dtype=np.uint8)
    mask_3ch = cv2.merge([mask, mask, mask])
    result = np.where(mask_3ch == 255, img, bg)
    return result


def remove_person_right(img, keep_left_ratio=0.55):
    """Remove person on the right side of an image by inpainting."""
    h, w = img.shape[:2]
    cut_x = int(w * keep_left_ratio)
    
    left_part = img[:, :cut_x].copy()
    bg_sample = img[10:50, cut_x-50:cut_x].mean(axis=(0, 1)).astype(np.uint8)
    
    result = np.full_like(img, bg_sample, dtype=np.uint8)
    result[:, :cut_x] = left_part
    
    blend_width = 40
    for i in range(blend_width):
        alpha = 1.0 - (i / blend_width)
        x = cut_x - blend_width + i
        if 0 <= x < w:
            result[:, x] = (alpha * left_part[:, min(x, cut_x-1)] + 
                           (1 - alpha) * bg_sample).astype(np.uint8)
    
    return result


def process_02():
    """02: Replace person with reference, blue sweater, light blue bg."""
    print("=== 02: Face swap + blue sweater headshot ===")
    ref_img = cv2.imread(str(REFERENCES / "251211-01_1053.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "02.jpeg"))
    
    ref_face = get_best_face(ref_img)
    src_face = get_best_face(src_img)
    
    if ref_face is None or src_face is None:
        print("  SKIP: Could not detect faces")
        return
    
    result = swap_face(ref_img, src_img, ref_face, src_face)
    cv2.imwrite(str(OUTPUT / "02_blue_sweater.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 02_blue_sweater.jpg")


def process_03():
    """03: Swap face, pastel white background."""
    print("=== 03: Face swap + pastel white bg ===")
    ref_img = cv2.imread(str(REFERENCES / "251211-01_1053.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "03.jpg"))
    
    ref_face = get_best_face(ref_img)
    src_face = get_best_face(src_img)
    
    if ref_face is None or src_face is None:
        print("  SKIP: Could not detect faces")
        return
    
    result = swap_face(ref_img, src_img, ref_face, src_face)
    cv2.imwrite(str(OUTPUT / "03_pastel_white.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 03_pastel_white.jpg")


def process_04():
    """04: Remove girl, swap face with reference."""
    print("=== 04: Face swap male + remove female ===")
    ref_img = cv2.imread(str(REFERENCES / "251211-01_1053.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "04.jpg"))
    
    ref_face = get_best_face(ref_img)
    faces = get_all_faces(src_img)
    
    if ref_face is None or len(faces) == 0:
        print("  SKIP: Could not detect faces")
        return
    
    male_face = faces[0]
    result = swap_face(ref_img, src_img, ref_face, male_face)
    
    if len(faces) > 1:
        result = remove_person_right(result)
    
    cv2.imwrite(str(OUTPUT / "04_solo.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 04_solo.jpg")


def process_05():
    """05: Remove girl, swap face with reference."""
    print("=== 05: Face swap male + remove female ===")
    ref_img = cv2.imread(str(REFERENCES / "251211-01_1053.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "05.jpg"))
    
    ref_face = get_best_face(ref_img)
    faces = get_all_faces(src_img)
    
    if ref_face is None or len(faces) == 0:
        print("  SKIP: Could not detect faces")
        return
    
    male_face = faces[0]
    result = swap_face(ref_img, src_img, ref_face, male_face)
    
    if len(faces) > 1:
        result = remove_person_right(result)
    
    cv2.imwrite(str(OUTPUT / "05_solo.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 05_solo.jpg")


def process_06():
    """06: Swap face, higher definition."""
    print("=== 06: Face swap + HD ===")
    ref_img = cv2.imread(str(REFERENCES / "Copy of IMG_9504 (1).JPG"))
    src_img = cv2.imread(str(MAKE_INTO / "06.jpeg"))
    
    ref_face = get_best_face(ref_img)
    src_face = get_best_face(src_img)
    
    if ref_face is None or src_face is None:
        print("  SKIP: Could not detect faces")
        return
    
    result = swap_face(ref_img, src_img, ref_face, src_face)
    
    h, w = result.shape[:2]
    if h < 1000:
        scale = 2
        result = cv2.resize(result, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    
    cv2.imwrite(str(OUTPUT / "06_hd.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 06_hd.jpg")


def process_07():
    """07: Swap face, higher definition."""
    print("=== 07: Face swap + HD ===")
    ref_img = cv2.imread(str(REFERENCES / "IMG_9579.JPG"))
    src_img = cv2.imread(str(MAKE_INTO / "07.jpeg"))
    
    ref_face = get_best_face(ref_img)
    src_face = get_best_face(src_img)
    
    if ref_face is None or src_face is None:
        print("  SKIP: Could not detect faces")
        return
    
    result = swap_face(ref_img, src_img, ref_face, src_face)
    
    h, w = result.shape[:2]
    if h < 1000:
        scale = 2
        result = cv2.resize(result, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    
    cv2.imwrite(str(OUTPUT / "07_hd.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 07_hd.jpg")


def process_08():
    """08: Swap face, higher definition."""
    print("=== 08: Face swap + HD ===")
    ref_img = cv2.imread(str(REFERENCES / "251211-01_1053.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "08.jpeg"))
    
    ref_face = get_best_face(ref_img)
    src_face = get_best_face(src_img)
    
    if ref_face is None or src_face is None:
        print("  SKIP: Could not detect faces")
        return
    
    result = swap_face(ref_img, src_img, ref_face, src_face)
    
    h, w = result.shape[:2]
    if h < 1000:
        scale = 2
        result = cv2.resize(result, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    
    cv2.imwrite(str(OUTPUT / "08_hd.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 08_hd.jpg")


def process_09():
    """09: Update face with longer hair / current look."""
    print("=== 09: Face update with current look ===")
    ref_img = cv2.imread(str(REFERENCES / "IMG_0077.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "09_upright.jpg"))
    
    if ref_img is None:
        ref_img = cv2.imread(str(REFERENCES / "IMG_0077.PNG"))
    
    ref_face = get_best_face(ref_img)
    src_face = get_best_face(src_img)
    
    if ref_face is None or src_face is None:
        print(f"  SKIP: Could not detect faces (ref={ref_face is not None}, src={src_face is not None})")
        return
    
    result = swap_face(ref_img, src_img, ref_face, src_face)
    cv2.imwrite(str(OUTPUT / "09_updated.jpg"), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print("  Saved: 09_updated.jpg")


TASKS = {
    "02": process_02,
    "03": process_03,
    "04": process_04,
    "05": process_05,
    "06": process_06,
    "07": process_07,
    "08": process_08,
    "09": process_09,
}

if __name__ == "__main__":
    tasks = sys.argv[1:] if len(sys.argv) > 1 else list(TASKS.keys())
    
    for task_id in tasks:
        if task_id in TASKS:
            TASKS[task_id]()
        else:
            print(f"Unknown task: {task_id}")
    
    print(f"\nDone! Output in {OUTPUT}/")
    for f in sorted(OUTPUT.iterdir()):
        if f.suffix in ('.jpg', '.png'):
            print(f"  {f.name} ({f.stat().st_size // 1024}KB)")
