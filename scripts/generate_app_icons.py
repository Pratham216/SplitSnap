import os
import shutil
import cv2
import numpy as np
from PIL import Image

BASE_DIR = r"C:\Proj\ZapTab"
MOBILE_DIR = os.path.join(BASE_DIR, "mobile")
ASSETS_DIR = os.path.join(MOBILE_DIR, "assets")
PUBLIC_DIR = os.path.join(MOBILE_DIR, "public")
WEB_DIR = os.path.join(MOBILE_DIR, "web")
RES_DIR = os.path.join(MOBILE_DIR, "android", "app", "src", "main", "res")
FRONTEND_PUB = os.path.join(BASE_DIR, "frontend", "public")

c1_path = r"C:\Users\prath\.gemini\antigravity-ide\brain\6e8317dc-334a-447b-a4c3-02b8c729b34c\zaptab_concept_1_1790705864266.jpg"
c4_path = r"C:\Users\prath\.gemini\antigravity-ide\brain\6e8317dc-334a-447b-a4c3-02b8c729b34c\zaptab_concept_4_1790705971337.jpg"

c1_bgr = cv2.imread(c1_path).astype(np.float32)
c4_bgr = cv2.imread(c4_path)

h, w, _ = c1_bgr.shape
X_grid, Y_grid = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
cx, cy = 506.0, 500.0

# 1. Clean Concept 1 background
c1_hsv = cv2.cvtColor(np.uint8(c1_bgr), cv2.COLOR_BGR2HSV)
center_box = (X_grid >= 280) & (X_grid <= 720) & (Y_grid >= 280) & (Y_grid <= 730)
is_gold = center_box & (c1_hsv[:, :, 1] > 30) & (c1_hsv[:, :, 2] > 40)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
is_gold_dilated = cv2.dilate(is_gold.astype(np.uint8), kernel) > 0

r_map = np.sqrt((X_grid - cx)**2 + (Y_grid - cy)**2)
squircle_plate = (r_map < 290)
valid_pts = squircle_plate & (~is_gold_dilated)
y_pts, x_pts = np.where(valid_pts)

x_dev = (x_pts - cx)
y_dev = (y_pts - cy)
A_sample = np.column_stack([np.ones_like(x_dev), x_dev, y_dev, x_dev**2, y_dev**2, x_dev * y_dev])
x_all = (X_grid - cx).ravel()
y_all = (Y_grid - cy).ravel()
A_all = np.column_stack([np.ones_like(x_all), x_all, y_all, x_all**2, y_all**2, x_all * y_all])
fade = cv2.GaussianBlur(is_gold_dilated.astype(np.float32), (21, 21), 0)

clean_bg = c1_bgr.copy()
for ch in range(3):
    vals = c1_bgr[y_pts, x_pts, ch]
    coeff, _, _, _ = np.linalg.lstsq(A_sample, vals, rcond=None)
    smooth_surface = (A_all @ coeff).reshape(h, w)
    clean_bg[:, :, ch] = c1_bgr[:, :, ch] * (1.0 - fade) + smooth_surface * fade

# 2. Extract Concept 4 glyph
c4_bgr_f = c4_bgr.astype(np.float32)
c4_min = np.minimum(np.minimum(c4_bgr_f[:, :, 0], c4_bgr_f[:, :, 1]), c4_bgr_f[:, :, 2])
glyph_alpha = np.clip((c4_min - 80.0) / (185.0 - 80.0), 0.0, 1.0)
center_mask = ((X_grid - 505)**2 + (Y_grid - 512)**2) < 250**2
glyph_alpha = glyph_alpha * center_mask.astype(np.float32)

coords = np.argwhere(glyph_alpha > 0.5)
gy_min, gx_min = coords.min(axis=0)
gy_max, gx_max = coords.max(axis=0)
glyph_crop_alpha = glyph_alpha[gy_min:gy_max+1, gx_min:gx_max+1]
gh, gw = glyph_crop_alpha.shape

tx0 = int(cx - gw // 2)
ty0 = int(cy - gh // 2) + 2

placed_alpha = np.zeros((h, w), dtype=np.float32)
placed_alpha[ty0:ty0+gh, tx0:tx0+gw] = glyph_crop_alpha

# 3. Gold Amber Gradient:
t = np.clip((Y_grid - ty0) / float(gh), 0.0, 1.0)
gold_b = 0.0 * (1.0 - t) + 0.0 * t
gold_g = 212.0 * (1.0 - t) + 105.0 * t
gold_r = 255.0 * (1.0 - t) + 255.0 * t
gold_bgr = np.stack([gold_b, gold_g, gold_r], axis=2)

# Transparent standalone glyph PNG: zaptab-logo.png
glyph_rgba = np.zeros((gh, gw, 4), dtype=np.uint8)
crop_t = np.linspace(0.0, 1.0, gh)[:, None]
glyph_rgba[:, :, 0] = 255 # R
glyph_rgba[:, :, 1] = np.uint8(212.0 * (1.0 - crop_t) + 105.0 * crop_t) # G
glyph_rgba[:, :, 2] = 0 # B
glyph_rgba[:, :, 3] = np.uint8(glyph_crop_alpha * 255.0) # A

logo_img = Image.fromarray(glyph_rgba, mode="RGBA")
logo_path = os.path.join(ASSETS_DIR, "zaptab-logo.png")
logo_img.save(logo_path, "PNG")

# Composite full 1024x1024 icon
shadow = np.roll(placed_alpha, 8, axis=0)
shadow = cv2.GaussianBlur(shadow, (21, 21), 0) * 0.85

out = clean_bg.copy()
for ch in range(3):
    out[:, :, ch] = out[:, :, ch] * (1.0 - shadow * 0.8)
    out[:, :, ch] = out[:, :, ch] * (1.0 - placed_alpha) + gold_bgr[:, :, ch] * placed_alpha

full_icon = np.clip(out, 0, 255).astype(np.uint8)
full_icon_rgb = cv2.cvtColor(full_icon, cv2.COLOR_BGR2RGB)
icon_1024 = Image.fromarray(full_icon_rgb, mode="RGB")
icon_path = os.path.join(ASSETS_DIR, "icon.png")
icon_1024.save(icon_path, "PNG")

def fit_centered(img, target_size, scale=0.75):
    target_w, target_h = target_size
    logo_w, logo_h = img.size
    ratio = min(target_w / logo_w, target_h / logo_h) * scale
    new_w = max(1, int(logo_w * ratio))
    new_h = max(1, int(logo_h * ratio))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    x = (target_w - new_w) // 2
    y = (target_h - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

def make_solid_bg(size, color=(10, 11, 14, 255)):
    return Image.new("RGBA", size, color)

# 2. android-icon-foreground.png (432x432)
fg_432 = fit_centered(logo_img, (432, 432), scale=0.62)
fg_432.save(os.path.join(ASSETS_DIR, "android-icon-foreground.png"), "PNG")

# 3. android-icon-background.png (432x432)
bg_432 = make_solid_bg((432, 432), (10, 11, 14, 255))
bg_432.save(os.path.join(ASSETS_DIR, "android-icon-background.png"), "PNG")

# 4. android-icon-monochrome.png (432x432)
mono_img = fg_432.copy()
r, g, b, a = mono_img.split()
white_img = Image.new("RGBA", mono_img.size, (255, 255, 255, 255))
mono_result = Image.new("RGBA", mono_img.size, (0, 0, 0, 0))
mono_result.paste(white_img, (0, 0), a)
mono_result.save(os.path.join(ASSETS_DIR, "android-icon-monochrome.png"), "PNG")

# 5. Favicon (64x64) - create crisp version
favicon_64 = fit_centered(logo_img, (64, 64), scale=0.92)
favicon_path = os.path.join(ASSETS_DIR, "favicon.png")
favicon_64.save(favicon_path, "PNG")

# Also copy favicon to ALL web locations:
# 1) mobile/public/favicon.png
# 2) mobile/web/favicon.png
# 3) frontend/public/favicon.png
# 4) frontend/public/zaptab-logo.png
if os.path.exists(PUBLIC_DIR):
    shutil.copy(favicon_path, os.path.join(PUBLIC_DIR, "favicon.png"))
if os.path.exists(WEB_DIR):
    shutil.copy(favicon_path, os.path.join(WEB_DIR, "favicon.png"))
if os.path.exists(FRONTEND_PUB):
    shutil.copy(favicon_path, os.path.join(FRONTEND_PUB, "favicon.png"))
    shutil.copy(logo_path, os.path.join(FRONTEND_PUB, "zaptab-logo.png"))

# 6. splash-icon.png (256x256)
splash_256 = fit_centered(logo_img, (256, 256), scale=0.88)
splash_256.save(os.path.join(ASSETS_DIR, "splash-icon.png"), "PNG")

# 7. Android native mipmaps
densities = {
    "mipmap-mdpi": {"launcher": 48, "fg": 108},
    "mipmap-hdpi": {"launcher": 72, "fg": 162},
    "mipmap-xhdpi": {"launcher": 96, "fg": 216},
    "mipmap-xxhdpi": {"launcher": 144, "fg": 324},
    "mipmap-xxxhdpi": {"launcher": 192, "fg": 432},
}

for folder, sizes in densities.items():
    dir_path = os.path.join(RES_DIR, folder)
    os.makedirs(dir_path, exist_ok=True)
    
    l_size = sizes["launcher"]
    fg_size = sizes["fg"]
    
    # Launcher icon
    launcher = icon_1024.resize((l_size, l_size), Image.Resampling.LANCZOS)
    launcher.save(os.path.join(dir_path, "ic_launcher.webp"), "WEBP")
    launcher.save(os.path.join(dir_path, "ic_launcher_round.webp"), "WEBP")
    
    # Adaptive foreground
    fg = fit_centered(logo_img, (fg_size, fg_size), scale=0.62)
    fg.save(os.path.join(dir_path, "ic_launcher_foreground.webp"), "WEBP")
    
    # Adaptive background
    bg = make_solid_bg((fg_size, fg_size), (10, 11, 14, 255))
    bg.save(os.path.join(dir_path, "ic_launcher_background.webp"), "WEBP")
    
    # Monochrome
    r, g, b, a = fg.split()
    white_img = Image.new("RGBA", (fg_size, fg_size), (255, 255, 255, 255))
    m_res = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    m_res.paste(white_img, (0, 0), a)
    m_res.save(os.path.join(dir_path, "ic_launcher_monochrome.webp"), "WEBP")

print("All favicon, mobile web, public, and mipmap assets synchronized successfully!")
