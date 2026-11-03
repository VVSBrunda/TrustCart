"""Synthetic product photos (original + edited variants) for demo data and testing."""
import io
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 800, 600


def _background(rng, tint):
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    base = np.array(tint, dtype=np.float32)[None, None, :]
    img = 245 - 45 * y + base * 0.05
    return np.broadcast_to(img, (H, W, 3)).copy()


def _object(kind, color):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = tuple(color)
    dark = tuple(int(v * 0.55) for v in color)
    light = tuple(min(255, int(v * 1.35) + 20) for v in color)
    if kind == "phone":
        d.rounded_rectangle((300, 90, 500, 510), 34, fill=dark)
        d.rounded_rectangle((312, 108, 488, 492), 22, fill=c)
        d.ellipse((385, 118, 415, 134), fill=dark)
    elif kind == "earbuds":
        d.rounded_rectangle((250, 300, 550, 480), 60, fill=dark)
        d.rounded_rectangle((262, 312, 538, 468), 50, fill=c)
        d.ellipse((292, 170, 368, 246), fill=light)
        d.rounded_rectangle((300, 230, 322, 330), 10, fill=light)
        d.ellipse((436, 185, 498, 247), fill=c)
        d.polygon([(470, 235), (495, 235), (485, 335), (465, 330)], fill=light)
    elif kind == "watch":
        d.rectangle((350, 60, 450, 540), fill=dark)
        d.ellipse((260, 170, 540, 450), fill=c)
        d.ellipse((285, 195, 515, 425), fill=light)
        d.line((400, 310, 400, 235), fill=dark, width=8)
        d.line((400, 310, 450, 330), fill=dark, width=8)
    elif kind == "backpack":
        d.rounded_rectangle((250, 90, 550, 520), 90, fill=dark)
        d.rounded_rectangle((266, 106, 534, 504), 80, fill=c)
        d.rounded_rectangle((310, 340, 490, 470), 26, fill=light)
        d.arc((330, 40, 470, 140), 180, 360, fill=dark, width=14)
    elif kind == "sneaker":
        d.polygon([(150, 380), (250, 200), (350, 230), (470, 330), (640, 350), (660, 440), (150, 440)], fill=c)
        d.rectangle((140, 430, 670, 480), fill=light)
        for x in (300, 350, 400):
            d.line((x, 250 + (x - 300) // 2, x + 30, 275 + (x - 300) // 2), fill=dark, width=7)
    elif kind == "kettle":
        d.polygon([(260, 480), (300, 200), (500, 200), (540, 480)], fill=c)
        d.rectangle((250, 470, 550, 505), fill=dark)
        d.polygon([(500, 230), (620, 180), (630, 205), (505, 280)], fill=c)
        d.arc((190, 200, 330, 400), 90, 270, fill=dark, width=18)
        d.ellipse((370, 160, 430, 205), fill=dark)
    elif kind == "lamp":
        d.rectangle((300, 480, 500, 510), fill=dark)
        d.line((400, 480, 340, 280), fill=dark, width=14)
        d.line((340, 280, 470, 160), fill=dark, width=14)
        d.polygon([(420, 130), (560, 190), (500, 260), (390, 200)], fill=c)
        d.ellipse((470, 240, 520, 275), fill=(255, 240, 170))
    elif kind == "speaker":
        d.rounded_rectangle((290, 140, 510, 490), 40, fill=dark)
        d.ellipse((330, 180, 470, 320), fill=c)
        d.ellipse((365, 215, 435, 285), fill=light)
        d.ellipse((350, 370, 450, 450), fill=c)
    elif kind == "wallet":
        d.rounded_rectangle((220, 190, 580, 440), 28, fill=dark)
        d.rounded_rectangle((232, 202, 568, 428), 22, fill=c)
        d.rectangle((232, 270, 568, 285), fill=dark)
        d.ellipse((520, 335, 556, 371), fill=light)
    else:  # bottle
        d.rounded_rectangle((330, 150, 470, 520), 40, fill=c)
        d.rounded_rectangle((355, 90, 445, 160), 14, fill=dark)
        d.rectangle((330, 300, 470, 340), fill=light)
    return layer


def make_original(kind, color, seed, tint=(200, 205, 215)):
    """A 'camera-like' original: smooth scene + uniform sensor noise, JPEG, camera EXIF."""
    rng = np.random.default_rng(seed)
    bg = Image.fromarray(np.clip(_background(rng, tint), 0, 255).astype("uint8"))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((200, 480, 600, 545), fill=(0, 0, 0, 90))
    bg.paste(shadow.filter(ImageFilter.GaussianBlur(18)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(18)))
    obj = _object(kind, color)
    bg.paste(obj, (0, 0), obj)
    arr = np.asarray(bg, dtype=np.float32)
    arr = np.asarray(Image.fromarray(arr.astype("uint8")).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32)
    # signal-dependent sensor noise, uniform over the frame
    arr += rng.normal(0, 3.2, arr.shape) * (0.8 + 0.4 * arr / 255)
    img = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))
    return _save(img, camera=True)


def make_edited(kind, color, seed, strength="strong", tint=(200, 205, 215)):
    """Take an original and retouch it: clone a region, smooth-out a patch, drop in a foreign patch."""
    rng = random.Random(seed)
    img = Image.open(io.BytesIO(make_original(kind, color, seed, tint))).convert("RGB")
    arr = np.asarray(img, dtype=np.float32).copy()
    if strength == "strong":
        # 1) clone-stamp: copy a textured area elsewhere
        sx, sy, w, h = 300, 100, 130, 150
        dx, dy = 250 + rng.randint(-20, 20), 20
        arr[sy + dy:sy + dy + h, sx + dx:sx + dx + w] = arr[sy:sy + h, sx:sx + w]
        # 2) 'airbrush' smoothing of another area
        patch = Image.fromarray(arr.astype("uint8")).crop((120, 380, 330, 530)).filter(ImageFilter.GaussianBlur(5))
        arr[380:530, 120:330] = np.asarray(patch, dtype=np.float32)
        # 3) pasted patch with different grain (different source photo)
        arr[60:170, 560:720] = np.clip(arr[60:170, 560:720] * 0.9 + np.random.default_rng(seed).normal(0, 9, (110, 160, 3)), 0, 255)
    else:
        patch = Image.fromarray(arr.astype("uint8")).crop((300, 380, 520, 500)).filter(ImageFilter.GaussianBlur(2.5))
        arr[380:500, 300:520] = np.asarray(patch, dtype=np.float32)
    out = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))
    return _save(out, camera=False, software="Adobe Photoshop 25.1")


def _save(img, camera, software=None, quality=92):
    exif = Image.Exif()
    if camera:
        exif[271], exif[272] = "Canon", "EOS 90D"
    if software:
        exif[305] = software
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, exif=exif)
    return buf.getvalue()
