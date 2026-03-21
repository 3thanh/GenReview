#!/usr/bin/env python3
"""
Upscale low-res face-swapped images using Gemini, then re-apply InsightFace.
"""

import os
import sys
import io
import cv2
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


def gemini_upscale(input_path, output_path, extra_instructions=""):
    """Use Gemini to generate a high-resolution version of a photo."""
    img = Image.open(input_path)
    prompt = (
        f"Create a high resolution, sharp, detailed version of this exact photo. "
        f"Keep the person's face, expression, outfit, pose, and background exactly the same. "
        f"Just make it higher resolution with sharper details, better lighting, and cleaner quality. "
        f"No changes to the content at all. Professional studio quality. {extra_instructions}"
    )
    
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=[img, prompt],
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            out_img = Image.open(io.BytesIO(part.inline_data.data))
            out_img.save(output_path, quality=95)
            w, h = out_img.size
            print(f"  Gemini upscaled: {output_path} ({w}x{h})")
            return True
    return False


def insightface_swap(ref_img_path, target_img_path, output_path):
    ref_img = cv2.imread(str(ref_img_path))
    target_img = cv2.imread(str(target_img_path))
    
    ref_face = get_best_face(ref_img)
    target_face = get_best_face(target_img)
    
    if ref_face is None or target_face is None:
        print(f"  SKIP face swap: detection failed")
        return False
    
    result = swapper.get(target_img, target_face, ref_face, paste_back=True)
    cv2.imwrite(str(output_path), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    h, w = result.shape[:2]
    print(f"  InsightFace saved: {output_path} ({w}x{h})")
    return True


def do_06():
    print("=== 06: Upscale + face swap ===")
    insightface_swap(
        REFERENCES / "Copy of IMG_9504 (1).JPG",
        MAKE_INTO / "06.jpeg",
        TEMP / "06_swapped_lowres.jpg",
    )
    gemini_upscale(
        TEMP / "06_swapped_lowres.jpg",
        TEMP / "06_hd.jpg",
        "Man in cream/white linen button-up shirt, hands in pockets, olive/sage green background."
    )
    insightface_swap(
        REFERENCES / "Copy of IMG_9504 (1).JPG",
        TEMP / "06_hd.jpg",
        OUTPUT / "06_hd.jpg",
    )


def do_07():
    print("=== 07: Upscale + face swap ===")
    insightface_swap(
        REFERENCES / "IMG_9579.JPG",
        MAKE_INTO / "07.jpeg",
        TEMP / "07_swapped_lowres.jpg",
    )
    gemini_upscale(
        TEMP / "07_swapped_lowres.jpg",
        TEMP / "07_hd.jpg",
        "Close-up headshot, dark teal/green sweater, warm cafe bokeh background."
    )
    insightface_swap(
        REFERENCES / "IMG_9579.JPG",
        TEMP / "07_hd.jpg",
        OUTPUT / "07_hd.jpg",
    )


def do_08():
    print("=== 08: Upscale + face swap ===")
    insightface_swap(
        REFERENCES / "251211-01_1053.jpg",
        MAKE_INTO / "08.jpeg",
        TEMP / "08_swapped_lowres.jpg",
    )
    gemini_upscale(
        TEMP / "08_swapped_lowres.jpg",
        TEMP / "08_hd.jpg",
        "Man laughing joyfully, beige/cream t-shirt, warm tan/beige background."
    )
    insightface_swap(
        REFERENCES / "251211-01_1053.jpg",
        TEMP / "08_hd.jpg",
        OUTPUT / "08_hd.jpg",
    )


TASKS = {"06": do_06, "07": do_07, "08": do_08}

if __name__ == "__main__":
    tasks = sys.argv[1:] if len(sys.argv) > 1 else list(TASKS.keys())
    for t in tasks:
        if t in TASKS:
            TASKS[t]()
    
    print(f"\nDone! Output in {OUTPUT}/")
    for f in sorted(OUTPUT.iterdir()):
        if f.suffix in ('.jpg', '.png'):
            img = cv2.imread(str(f))
            h, w = img.shape[:2] if img is not None else (0, 0)
            print(f"  {f.name}: {w}x{h} ({f.stat().st_size // 1024}KB)")
