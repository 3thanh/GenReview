from PIL import Image, ImageFilter
import numpy as np

img = Image.open("/Users/ethanhuang1/Code/Hackathon/new_references_extracted/new references/A.jpeg")
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

mask = np.zeros((H, col_right), dtype=np.float32)

new_head_top = person_top - extra  # ~780

body_regions = [
    (new_head_top - 30, new_head_top + 400, 900, 1300),   # head
    (new_head_top + 400, new_head_top + 550, 800, 1350),  # neck
    (new_head_top + 550, new_head_top + 750, 600, 1550),  # shoulders (tighter right)
    (new_head_top + 750, 2530, 550, 1550),                 # upper torso
    (2530, 3600, 600, 1600),                                # stretched torso/belt
    (3600, 4600, 650, 1500),                                # upper legs
    (4600, 5150, 700, 1400),                                # lower legs/feet
]

for y_s, y_e, x_l, x_r in body_regions:
    y_s = max(0, min(H, y_s))
    y_e = max(0, min(H, y_e))
    x_l = max(0, min(col_right, x_l))
    x_r = max(0, min(col_right, x_r))
    mask[y_s:y_e, x_l:x_r] = 1.0

mask_img = Image.fromarray((mask * 255).astype(np.uint8))
mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=50))
mask = np.array(mask_img).astype(np.float32) / 255.0

hard_top = max(0, new_head_top - 30)
fade_zone = 80
for yy in range(hard_top):
    if yy < hard_top - fade_zone:
        mask[yy, :] = 0.0
    else:
        factor = (yy - (hard_top - fade_zone)) / fade_zone
        mask[yy, :] *= factor

mask_3d = mask[:, :, np.newaxis]

result_arr = arr_orig.copy()
result_arr[:, :col_right, :] = mask_3d * arr_mod + (1.0 - mask_3d) * arr_orig[:, :col_right, :]

result = Image.fromarray(result_arr.astype(np.uint8))
output_path = "/Users/ethanhuang1/Code/Hackathon/new_references_extracted/new references/A_taller.jpeg"
result.save(output_path, quality=95)
print(f"Saved to {output_path}")
print(f"Extra height added: {extra}px ({extra/person_height*100:.1f}% of person height)")
