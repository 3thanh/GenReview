#!/usr/bin/env python3
"""
Face-swap and photo editing pipeline using Gemini 2.0 Flash image generation.
Processes photos according to Fiverr order instructions.
"""

import os
import sys
import base64
import json
import time
from pathlib import Path
from PIL import Image
import io

from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyAXV94zKDA4e-yGZxDkeX7a-tU_31ppCro")

client = genai.Client(api_key=GEMINI_API_KEY)

BASE_DIR = Path(__file__).parent
MAKE_INTO = BASE_DIR / "Make into"
REFERENCES = BASE_DIR / "References"
OUTPUT = BASE_DIR / "output"
OUTPUT.mkdir(exist_ok=True)


def load_image_as_pil(path: str) -> Image.Image:
    return Image.open(path)


def save_generated_image(response, output_path: str):
    """Extract and save generated image from Gemini response."""
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            img_data = part.inline_data.data
            img = Image.open(io.BytesIO(img_data))
            img.save(output_path, quality=95)
            print(f"  Saved: {output_path}")
            return True
    print(f"  WARNING: No image in response for {output_path}")
    return False


def process_photo(
    task_id,
    prompt,
    reference_paths,
    source_path=None,
    output_name=None,
):
    """Process a single photo edit using Gemini."""
    print(f"\n{'='*60}")
    print(f"Processing: {task_id}")
    print(f"Prompt: {prompt[:100]}...")
    
    contents = []
    
    # Add reference images
    for ref_path in reference_paths:
        img = load_image_as_pil(ref_path)
        contents.append(img)
        contents.append(f"This is a reference photo of the person whose face should be used.")
    
    # Add source image if provided
    if source_path:
        img = load_image_as_pil(source_path)
        contents.append(img)
        contents.append(f"This is the source photo to edit.")
    
    contents.append(prompt)
    
    out_path = str(OUTPUT / (output_name or f"{task_id}.jpg"))
    
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
            if save_generated_image(response, out_path):
                # Print any text response
                for part in response.candidates[0].content.parts:
                    if part.text:
                        print(f"  Note: {part.text[:200]}")
                return True
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
    
    return False


# Best reference photos (clear face, good lighting)
REF_SOLO = [
    str(REFERENCES / "251211-01_1053.jpg"),  # Solo, smiling, brown jacket
    str(REFERENCES / "IMG_9579.JPG"),         # Solo, smiling, navy cardigan outdoors
    str(REFERENCES / "Copy of IMG_9504 (1).JPG"),  # Close-up headshot
]

REF_WITH_CURRENT_HAIR = [
    str(REFERENCES / "IMG_0077.jpg"),         # Longer hair, polo on bridge
    str(REFERENCES / "IMG_4656.jpg"),         # Recent, North Face jacket
]

REF_FORMAL = [
    str(REFERENCES / "smiling_pro_photo.jpg"),  # Suit photo
    str(REFERENCES / "Copy of IMG_9504 (1).JPG"),
]


def main():
    tasks = sys.argv[1:] if len(sys.argv) > 1 else ["all"]
    
    if "01" in tasks or "all" in tasks:
        # 01: Remove other person + hand, make hair not flattened, 
        # also second photo where taller than female
        process_photo(
            "01a",
            (
                "Edit this couple photo. Keep the man on the left exactly as he is "
                "(same face, same outfit - brown jacket, white shirt). Remove the woman "
                "on the right side completely. Also remove her hand from the man's head. "
                "Fix the man's hair so it looks natural and not flattened. "
                "Fill the background naturally where the woman was removed. "
                "Keep the same gray backdrop. High quality professional photo."
            ),
            [str(REFERENCES / "251211-01_1053.jpg")],
            str(MAKE_INTO / "01.jpg"),
            "01a_solo.jpg",
        )
        
        process_photo(
            "01b",
            (
                "Edit this couple photo. Keep both people but make the man on the left "
                "appear relatively taller than the woman on the right. Remove the woman's "
                "hand from the man's head. Fix the man's hair to look natural, not flattened. "
                "Keep same outfits, same expressions, same background. "
                "The man should appear noticeably taller. High quality professional photo."
            ),
            [str(REFERENCES / "251211-01_1053.jpg")],
            str(MAKE_INTO / "01.jpg"),
            "01b_taller.jpg",
        )
    
    if "02" in tasks or "all" in tasks:
        # 02: replace person with me, change sweater to blue, background light blue, match hairstyle
        process_photo(
            "02",
            (
                "Create a professional headshot portrait photo. The person should look "
                "exactly like the person in the reference photos (same face, same features). "
                "The person should be wearing a blue colored crewneck sweater. "
                "The background should be a clean, light blue color. "
                "The person should have the same hairstyle as shown in the reference photos "
                "(short-medium black hair, slightly swept). Warm, friendly smile. "
                "High quality studio portrait photo with professional lighting. "
                "Same composition as the source photo - head and shoulders, centered."
            ),
            REF_SOLO,
            str(MAKE_INTO / "02.jpeg"),
            "02_blue_sweater.jpg",
        )
    
    if "03" in tasks or "all" in tasks:
        # 03: swap me with the person, make background pastel white
        process_photo(
            "03",
            (
                "Generate a new professional portrait photo of the person shown in the "
                "reference images. Use their EXACT face, facial features, skin tone, and "
                "facial structure from the reference photos. Do NOT use the face from the "
                "source photo - only use the source for pose/composition reference. "
                "The person should wear a black button-up shirt, laughing naturally "
                "with a big genuine smile. Background: clean pastel white / off-white. "
                "Head and upper body portrait. No watermarks or text. "
                "High quality professional studio photo."
            ),
            REF_SOLO,
            str(MAKE_INTO / "03.jpg"),
            "03_pastel_white.jpg",
        )
    
    if "04" in tasks or "all" in tasks:
        # 04: remove the girl, swap me with the person
        process_photo(
            "04",
            (
                "Create a brand new solo portrait photo showing ONLY ONE person - the man "
                "from the reference photos. There should be NO woman, NO second person. "
                "Just a single man standing alone. He wears a black satin short-sleeve "
                "button-up shirt. He is smiling confidently with one hand behind his back. "
                "The background is a simple gray/white fabric backdrop. "
                "The man's face MUST match the reference photos exactly. "
                "Full body or 3/4 length solo portrait. High quality professional photo."
            ),
            REF_SOLO,
            str(MAKE_INTO / "04.jpg"),
            "04_solo.jpg",
        )
    
    if "05" in tasks or "all" in tasks:
        # 05: remove the girl, swap me with the person  
        process_photo(
            "05",
            (
                "Generate a new solo portrait photo. The person must have the EXACT face "
                "and facial features from the reference photos - same eyes, nose, mouth, "
                "jawline, skin tone. Do NOT keep the face from the source photo. "
                "Use the source photo only for the outfit (black satin button-up shirt "
                "and matching pants with belt) and pose (standing, composed, hand in pocket). "
                "Remove the woman entirely - solo portrait only. "
                "Gray/white fabric backdrop background. "
                "High quality professional photo."
            ),
            REF_SOLO,
            str(MAKE_INTO / "05.jpg"),
            "05_solo.jpg",
        )
    
    if "06" in tasks or "all" in tasks:
        # 06: swap me with the person, higher definition
        process_photo(
            "06",
            (
                "Create a high definition professional portrait photo. The person should "
                "look exactly like the person in the reference photos (same face, features). "
                "The person should be wearing a white/cream linen button-up shirt, "
                "hands in pockets, confident natural smile. "
                "The background should be a muted sage/olive green. "
                "Same composition as the source - upper body portrait. "
                "Very high definition, sharp details, professional studio quality lighting."
            ),
            REF_SOLO,
            str(MAKE_INTO / "06.jpeg"),
            "06_hd.jpg",
        )
    
    if "07" in tasks or "all" in tasks:
        # 07: swap me with the person, higher definition
        process_photo(
            "07",
            (
                "Create a high definition close-up portrait photo. The person should "
                "look exactly like the person in the reference photos (same face, features). "
                "Close-up headshot, wearing a dark teal/green crewneck sweater. "
                "Warm natural expression with a slight knowing smile. "
                "Blurred cafe/indoor background with warm bokeh. "
                "Very high definition, sharp facial details, professional quality. "
                "Same intimate composition as the source photo."
            ),
            REF_SOLO,
            str(MAKE_INTO / "07.jpeg"),
            "07_hd.jpg",
        )
    
    if "08" in tasks or "all" in tasks:
        # 08: swap me with the person, higher definition
        process_photo(
            "08",
            (
                "Generate a new high definition portrait photo of the person from the "
                "reference images. The person has STRAIGHT BLACK HAIR (not curly), "
                "East Asian features matching the reference photos exactly. "
                "He is laughing genuinely with a big open mouth smile, looking slightly "
                "to the side. Wearing a beige/cream t-shirt. Background is warm tan/beige. "
                "Do NOT use the source person's curly hair - use the reference person's "
                "straight black hair instead. Joyful candid energy. "
                "Very high definition. Professional studio lighting."
            ),
            REF_SOLO,
            str(MAKE_INTO / "08.jpeg"),
            "08_hd.jpg",
        )
    
    if "09" in tasks or "all" in tasks:
        # 09: update with longer hair / current face
        process_photo(
            "09",
            (
                "Edit ONLY this formal portrait photo. Do NOT combine multiple images. "
                "This is a single formal headshot of a young East Asian man in a dark "
                "charcoal suit with white dress shirt and pocket square, against a warm "
                "beige textured background. Keep everything the same but update the hair: "
                "make it slightly longer, medium length, swept naturally to the side, "
                "matching the hairstyle in the reference photo. Output should be a single "
                "clean upright portrait photo. Do NOT show any other images or create "
                "a collage. High quality professional headshot."
            ),
            [str(REFERENCES / "IMG_0077.jpg")],
            str(MAKE_INTO / "09_upright.jpg"),
            "09_updated.jpg",
        )
    
    print(f"\n{'='*60}")
    print("All tasks complete!")
    print(f"Output directory: {OUTPUT}")
    for f in sorted(OUTPUT.iterdir()):
        if f.suffix in ('.jpg', '.png'):
            print(f"  {f.name} ({f.stat().st_size // 1024}KB)")


if __name__ == "__main__":
    main()
