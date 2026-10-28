"""
Publishes Dak Ghar's artwork: the PNGs in "dak ghar/" (git-ignored) to
WebP in public/templates/dak-ghar/.

Each picture is cut to its own art (the transparent margin dropped), sized
to about twice what a 430px phone shows of it, and saved as WebP. The
pigeon is cleaned first with "sheesh mahal/clean-fringe.py" (islands
removed, the edge eroded, a red fringe neutralised).

The newer cutouts (22 onwards) are cleaned here instead, by clean_rim: a
red or yellow fringe left by the cut is pulled toward the colour just inside
it, so the art's own reds (a wax seal, a bride's lehenga) stay red, and the
softest pixel of the edge is trimmed.

Run from the repo root:  python scripts/dak-ghar-art.py [name ...]
With names (published names, e.g. "groom"), only those are published.
"""

import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "dak ghar")
OUT = os.path.join(ROOT, "public", "templates", "dak-ghar")
FRINGE = os.path.join(ROOT, "sheesh mahal", "clean-fringe.py")

# source file, published name, width in px (or "h480" for a height), WebP quality,
# cleaned: True with clean-fringe.py, "rim" with clean_rim, False not at all
JOBS = [
    ("01-cover-scene.png", "cover-scene", 820, 60, False),
    ("02-post-box.png", "post-box", 400, 80, False),
    ("03-bougainvillea.png", "bougainvillea", 560, 66, False),
    ("07-letter-paper.png", "letter-paper", 760, 74, False),
    ("09-pigeon-flying.png", "pigeon", 240, 80, True),
    ("11-writing-desk.png", "writing-desk", 380, 78, False),
    ("12-background-paper.png", "paper", 640, 62, False),
    ("13-telegram-slip.png", "telegram-slip", 760, 76, False),
    ("13-telegram-slip.png", "telegram-slip-small", 440, 76, False),
    ("14-stamp-haldi.png", "stamp-haldi", 480, 74, False),
    ("15-stamp-mehendi.png", "stamp-mehendi", 480, 74, False),
    ("16-stamp-sangeet.png", "stamp-sangeet", 480, 74, False),
    ("17-stamp-wedding.png", "stamp-wedding", 480, 74, False),
    ("18-stamp-palace-lake.png", "stamp-palace-lake", 480, 74, False),
    ("19-venue-postcard.png", "venue-postcard", 780, 74, False),
    ("20-clock.png", "clock", 460, 78, False),
    ("21-garland-corner.png", "garland-corner", 320, 76, False),
    ("22-date-slip.png", "date-slip", 420, 78, "rim"),
    ("23-groom.png", "groom", "h520", 80, "rim"),
    ("24-bride.png", "bride", "h520", 78, "rim"),
    ("25-desk-calendar.png", "desk-calendar", 560, 76, "rim"),
    ("26-wax-seal.png", "wax-seal", 260, 80, "rim"),
    ("27-airmail-envelope.png", "airmail-envelope", 240, 76, "rim"),
    ("28-paper-plane.png", "paper-plane", 280, 78, "rim"),
    ("29-thank-you-note.png", "thank-you-note", 560, 78, "rim"),
    ("30-letters-bundle.png", "letters-bundle", 340, 76, "rim"),
    ("31-stamp-reception.png", "stamp-reception", 480, 74, "rim"),
]


def clean_rim(image):
    """
    The cut's fringe: the outer 3px of the art, where it is more saturated
    than the paper or cloth 4 to 9px inside it, takes that inside colour
    (its own lightness kept, half way), and the edge's alpha is eased in by
    one pixel. Only where the rim is redder or yellower than what it edges.
    """
    data = np.array(image.convert("RGBA")).astype(np.float32)
    rgb, alpha = data[..., :3], data[..., 3]
    clear = alpha <= 8
    depth = ndimage.distance_transform_edt(~clear)

    def saturation(c):
        top, low = c.max(-1), c.min(-1)
        return (top - low) / np.maximum(top, 1)

    # The colour just inside, spread outward over the rim (normalised blur).
    inside = ((depth > 4) & (depth <= 9)).astype(np.float32)
    weight = ndimage.gaussian_filter(inside, 4)
    spread = np.stack([ndimage.gaussian_filter(rgb[..., i] * inside, 4) for i in range(3)], -1)
    spread = spread / np.maximum(weight, 1e-4)[..., None]

    rim = (depth > 0) & (depth <= 3) & (weight > 1e-3)
    warm = (rgb[..., 0] >= rgb[..., 2]) & (rgb[..., 0] > 90)
    excess = np.clip((saturation(rgb) - saturation(spread)) / 0.12, 0, 1)
    fade = np.clip((3.5 - depth) / 2, 0, 1)
    t = np.where(rim & warm, excess * fade, 0)[..., None]

    def lum(c):
        return 0.3 * c[..., 0] + 0.59 * c[..., 1] + 0.11 * c[..., 2]

    mid = (lum(rgb) + lum(spread)) / 2
    target = spread * (mid / np.maximum(lum(spread), 1))[..., None]
    rgb = rgb * (1 - t) + target.clip(0, 255) * t

    # The softest pixel of the edge eased in.
    alpha = np.where(depth <= 1, alpha * 0.55, alpha)
    out = np.concatenate([rgb, alpha[..., None]], -1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), int((t[..., 0] > 0.25).sum())


def publish(name, out, width, quality, clean):
    path = os.path.join(SRC, name)

    if not os.path.exists(path):
        print(f"skip  {name} (not in the folder yet)")
        return

    if clean is True:
        handle, cleaned = tempfile.mkstemp(suffix=".png")
        os.close(handle)
        subprocess.run([sys.executable, FRINGE, path, cleaned], check=True)
        path = cleaned

    image = Image.open(path)
    image.load()
    note = ""

    if clean == "rim":
        image, changed = clean_rim(image)
        note = f"  rim px eased {changed}"

    if image.mode == "RGBA":
        box = image.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if box is not None:
            image = image.crop(box)
    else:
        image = image.convert("RGB")

    if isinstance(width, str):
        height = int(width[1:])
        width = round(image.width * height / image.height)
    else:
        height = round(image.height * width / image.width)
    image = image.resize((width, height), Image.LANCZOS)
    target = os.path.join(OUT, f"{out}.webp")
    image.save(target, "WEBP", quality=quality, method=6, alpha_quality=90)
    print(f"{out}.webp  {width}x{height}  {os.path.getsize(target) // 1024} KB{note}")


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    for job in JOBS:
        if not only or job[1] in only:
            publish(*job)


if __name__ == "__main__":
    main()
