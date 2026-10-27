"""
Publishes Dak Ghar's artwork: the PNGs in "dak ghar/" (git-ignored) to
WebP in public/templates/dak-ghar/.

Each picture is cut to its own art (the transparent margin dropped), sized
to about twice what a 430px phone shows of it, and saved as WebP. The two
pigeons are cleaned first with "sheesh mahal/clean-fringe.py" (islands
removed, the edge eroded, a red fringe neutralised).

Run from the repo root:  python scripts/dak-ghar-art.py
22-date-slip.png is published too once it is in the folder.
"""

import os
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "dak ghar")
OUT = os.path.join(ROOT, "public", "templates", "dak-ghar")
FRINGE = os.path.join(ROOT, "sheesh mahal", "clean-fringe.py")

# source file, published name, width in px, WebP quality, cleaned with clean-fringe.py
JOBS = [
    ("01-cover-scene.png", "cover-scene", 820, 60, False),
    ("02-post-box.png", "post-box", 400, 80, False),
    ("03-bougainvillea.png", "bougainvillea", 560, 66, False),
    ("07-letter-paper.png", "letter-paper", 760, 74, False),
    ("09-pigeon-flying.png", "pigeon", 240, 80, True),
    ("10-pigeon-reply-card.png", "pigeon-reply", 360, 80, True),
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
    ("22-date-slip.png", "date-slip", 440, 78, False),
]


def publish(name, out, width, quality, clean):
    path = os.path.join(SRC, name)

    if not os.path.exists(path):
        print(f"skip  {name} (not in the folder yet)")
        return

    if clean:
        handle, cleaned = tempfile.mkstemp(suffix=".png")
        os.close(handle)
        subprocess.run([sys.executable, FRINGE, path, cleaned], check=True)
        path = cleaned

    image = Image.open(path)
    image.load()

    if image.mode == "RGBA":
        box = image.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if box is not None:
            image = image.crop(box)
    else:
        image = image.convert("RGB")

    height = round(image.height * width / image.width)
    image = image.resize((width, height), Image.LANCZOS)
    target = os.path.join(OUT, f"{out}.webp")
    image.save(target, "WEBP", quality=quality, method=6, alpha_quality=90)
    print(f"{out}.webp  {width}x{height}  {os.path.getsize(target) // 1024} KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    for job in JOBS:
        publish(*job)


if __name__ == "__main__":
    main()
