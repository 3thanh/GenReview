#!/usr/bin/env python3
"""
Hybrid pipeline: Gemini for scene/bg edits, then InsightFace for face accuracy.
Step 1: Generate correct scene with Gemini
Step 2: Face-swap onto Gemini output with InsightFace
"""

import os
import sys
import io
import cv2
import numpy as np
from pathlib import Path
from PIL import Image
import insightface
from insightface.app import FaceAnalysis
from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_API_KEY)

BASE_DIR = Path(__file__).parent
MAKE_INTO = BASE_DIR / "Make into"
REFERENCES = BASE_DIR / "References"
OUTPUT = BASE_DIR / "output"
TEMP = BASE_DIR / "temp"
TEMP.mkdir(exist_ok=True)

print("Loading InsightFace...")
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))
swapper = insightface.model_zoo.get_model(
    str(Path.home() / ".insightface/models/inswapper_128.onnx"),
    providers=['CPUExecutionProvider']
)
print("Ready.\n")


def get_best_face(img):
    faces = app.get(img)
    return max(faces, key=lambda f: f.det_score) if faces else None


def gemini_edit(prompt, image_paths, output_path):
    """Use Gemini to generate/edit an image."""
    contents = []
    for p in image_paths:
        contents.append(Image.open(p))
    contents.append(prompt)
    
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=contents,
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            img = Image.open(io.BytesIO(part.inline_data.data))
            img.save(output_path, quality=95)
            print(f"  Gemini saved: {output_path}")
            return True
    return False


def insightface_swap(ref_img_path, target_img_path, output_path):
    """Swap reference face onto target image."""
    ref_img = cv2.imread(str(ref_img_path))
    target_img = cv2.imread(str(target_img_path))
    
    ref_face = get_best_face(ref_img)
    target_face = get_best_face(target_img)
    
    if ref_face is None or target_face is None:
        print(f"  SKIP: face detection failed (ref={ref_face is not None}, target={target_face is not None})")
        return False
    
    result = swapper.get(target_img, target_face, ref_face, paste_back=True)
    cv2.imwrite(str(output_path), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"  InsightFace saved: {output_path}")
    return True


def do_02():
    """02: blue sweater, light blue bg. Gemini for scene -> InsightFace for face."""
    print("=== 02 ===")
    gemini_edit(
        "Edit this photo: change the red sweater/crewneck to a blue colored sweater. "
        "Change the dark red background to a clean light blue background. "
        "Keep everything else the same - same pose, same face, same expression. "
        "Professional headshot quality.",
        [str(MAKE_INTO / "02.jpeg")],
        str(TEMP / "02_scene.jpg"),
    )
    insightface_swap(
        REFERENCES / "251211-01_1053.jpg",
        TEMP / "02_scene.jpg",
        OUTPUT / "02_blue_sweater.jpg",
    )


def do_03():
    """03: pastel white bg. Gemini for bg -> InsightFace for face."""
    print("=== 03 ===")
    gemini_edit(
        "Edit this photo: change the red background to a clean pastel white / off-white background. "
        "Remove ANY watermarks or text overlays completely. "
        "Keep the person, their black shirt, their pose, and expression exactly the same. "
        "No watermarks. No text. Clean professional studio photo.",
        [str(MAKE_INTO / "03.jpg")],
        str(TEMP / "03_scene.jpg"),
    )
    insightface_swap(
        REFERENCES / "251211-01_1053.jpg",
        TEMP / "03_scene.jpg",
        OUTPUT / "03_pastel_white.jpg",
    )


def do_04():
    """04: face swap then Gemini removes girl cleanly."""
    print("=== 04 ===")
    ref_img = cv2.imread(str(REFERENCES / "251211-01_1053.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "04.jpg"))
    
    ref_face = get_best_face(ref_img)
    faces = sorted(app.get(src_img), key=lambda f: f.bbox[0])
    
    if ref_face and len(faces) > 0:
        swapped = swapper.get(src_img, faces[0], ref_face, paste_back=True)
        cv2.imwrite(str(TEMP / "04_swapped.jpg"), swapped, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print("  Face swapped on source")
    
    gemini_edit(
        "Edit this couple photo: completely remove the woman on the right side. "
        "Keep ONLY the man on the left. Fill the area where the woman was with the "
        "same gray/white fabric backdrop background. Remove her hand from his shoulder. "
        "Make it look like a natural solo portrait. Keep his face, outfit, and pose "
        "exactly as they are. Clean professional result.",
        [str(TEMP / "04_swapped.jpg")],
        str(TEMP / "04_cleaned.jpg"),
    )
    insightface_swap(
        REFERENCES / "251211-01_1053.jpg",
        TEMP / "04_cleaned.jpg",
        OUTPUT / "04_solo.jpg",
    )


def do_05():
    """05: face swap then Gemini removes girl cleanly."""
    print("=== 05 ===")
    ref_img = cv2.imread(str(REFERENCES / "251211-01_1053.jpg"))
    src_img = cv2.imread(str(MAKE_INTO / "05.jpg"))
    
    ref_face = get_best_face(ref_img)
    faces = sorted(app.get(src_img), key=lambda f: f.bbox[0])
    
    if ref_face and len(faces) > 0:
        swapped = swapper.get(src_img, faces[0], ref_face, paste_back=True)
        cv2.imwrite(str(TEMP / "05_swapped.jpg"), swapped, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print("  Face swapped on source")
    
    gemini_edit(
        "Edit this couple photo: completely remove the woman on the right side. "
        "Keep ONLY the man on the left. Fill the area where the woman was with the "
        "same gray/white fabric backdrop background. Remove her hand from his shoulder. "
        "Make it look like a natural solo portrait. Keep his face, outfit, and pose "
        "exactly as they are. Clean professional result.",
        [str(TEMP / "05_swapped.jpg")],
        str(TEMP / "05_cleaned.jpg"),
    )
    insightface_swap(
        REFERENCES / "251211-01_1053.jpg",
        TEMP / "05_cleaned.jpg",
        OUTPUT / "05_solo.jpg",
    )


TASKS = {"02": do_02, "03": do_03, "04": do_04, "05": do_05}

if __name__ == "__main__":
    tasks = sys.argv[1:] if len(sys.argv) > 1 else list(TASKS.keys())
    for t in tasks:
        if t in TASKS:
            TASKS[t]()
    
    print(f"\nDone! Output in {OUTPUT}/")
    for f in sorted(OUTPUT.iterdir()):
        if f.suffix in ('.jpg', '.png'):
            print(f"  {f.name} ({f.stat().st_size // 1024}KB)")
