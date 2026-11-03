"""
Trust Cart - image authenticity analyzer (conceptual pipeline from the design deck)

    upload -> pre-processing (resize / normalise) -> feature extraction / ML model
           -> authenticity score -> decision / review -> badge

IMPORTANT: this is a *forensic-heuristic* prototype. It looks for statistical
traces that are often left behind by editing (inconsistent compression error,
inconsistent sensor noise, cloned regions, editing-software metadata). It
produces an AI *assessment*, never proof. A trained classifier can be plugged in
(see train.py); when models/authenticity.joblib exists it is blended in.
"""
import io
import os
from typing import Dict, List

import cv2
import numpy as np
from PIL import Image, ImageChops

MAX_SIDE = 1024
BLOCK = 32
EDITING_SOFTWARE = (
    "photoshop", "gimp", "lightroom", "snapseed", "picsart", "pixlr", "canva",
    "facetune", "affinity", "paint.net", "photopea", "fotor", "luminar", "capture one",
)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "authenticity.joblib")
MODEL_NAME = "heuristic-forensics-v1"

FEATURE_NAMES = [
    "ela_mean", "ela_cv", "ela_hot_ratio",
    "noise_mean", "noise_cv", "noise_outlier_ratio",
    "copy_move_matches", "meta_editing_software", "meta_has_camera", "meta_has_exif",
]


def _clip01(x: float) -> float:
    return float(min(1.0, max(0.0, x)))


def _ramp(x: float, lo: float, hi: float) -> float:
    """0 at <=lo, 1 at >=hi, linear in between."""
    return _clip01((x - lo) / (hi - lo)) if hi > lo else 0.0


# --------------------------------------------------------------------------- #
# 1. Pre-processing
# --------------------------------------------------------------------------- #
def preprocess(data: bytes):
    img = Image.open(io.BytesIO(data))
    img.load()
    meta = {"format": img.format, "width": img.width, "height": img.height}
    exif = img.getexif()
    software = str(exif.get(305, "") or "")
    make = str(exif.get(271, "") or "")
    model = str(exif.get(272, "") or "")
    meta.update({"software": software, "camera": (make + " " + model).strip(), "has_exif": len(exif) > 0})
    rgb = img.convert("RGB")
    scale = MAX_SIDE / max(rgb.size)
    if scale < 1:
        rgb = rgb.resize((int(rgb.width * scale), int(rgb.height * scale)), Image.LANCZOS)
    return rgb, meta


def _blocks(arr: np.ndarray, fn) -> np.ndarray:
    h, w = arr.shape[:2]
    h, w = h - h % BLOCK, w - w % BLOCK
    arr = arr[:h, :w]
    out = []
    for y in range(0, h, BLOCK):
        for x in range(0, w, BLOCK):
            out.append(fn(arr[y:y + BLOCK, x:x + BLOCK]))
    return np.array(out, dtype=np.float64)


# --------------------------------------------------------------------------- #
# 2. Feature extraction
# --------------------------------------------------------------------------- #
def ela_features(rgb: Image.Image) -> Dict[str, float]:
    """Error Level Analysis: re-save at q=90 and look at how unevenly the error is spread."""
    buf = io.BytesIO()
    rgb.save(buf, "JPEG", quality=90)
    buf.seek(0)
    diff = ImageChops.difference(rgb, Image.open(buf).convert("RGB"))
    ela = np.asarray(diff, dtype=np.float32).mean(axis=2)
    cells = _blocks(ela, np.mean)
    mean = float(ela.mean())
    cv = float(cells.std() / (cells.mean() + 1e-3))
    hot = float((cells > cells.mean() + 2.5 * cells.std()).mean()) if cells.std() > 0 else 0.0
    return {"ela_mean": mean, "ela_cv": cv, "ela_hot_ratio": hot}


def noise_features(rgb: Image.Image) -> Dict[str, float]:
    """Sensor-noise consistency: spliced / retouched areas often carry different noise.

    Per-block noise level is estimated with a MAD (median absolute deviation) of the
    high-pass residual, which is robust to the few edge pixels inside a block.
    """
    gray = cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2GRAY).astype(np.float32)
    residual = gray - cv2.GaussianBlur(gray, (0, 0), 1.5)
    cells = _blocks(residual, lambda b: 1.4826 * np.median(np.abs(b - np.median(b))))
    med = float(np.median(cells))
    mad = float(np.median(np.abs(cells - med))) * 1.4826 + 0.05 * med + 1e-3
    outliers = float((np.abs(cells - med) > 4 * mad).mean())
    cv = float(cells.std() / (cells.mean() + 1e-3))
    return {"noise_mean": float(cells.mean()), "noise_cv": cv, "noise_outlier_ratio": outliers}


def copy_move_features(rgb: Image.Image) -> Dict[str, float]:
    """Cloned regions: many keypoint matches that share the same displacement vector."""
    gray = cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2GRAY)
    orb = cv2.ORB_create(nfeatures=2000, fastThreshold=10)
    kps, des = orb.detectAndCompute(gray, None)
    if des is None or len(kps) < 20:
        return {"copy_move_matches": 0.0}
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    pairs = matcher.knnMatch(des, des, k=3)
    votes: Dict[tuple, int] = {}
    for p in pairs:
        if len(p) < 3:
            continue
        m = p[1]  # p[0] is the keypoint matched with itself
        if m.distance > 0.75 * p[2].distance or m.distance > 40:
            continue
        (x1, y1), (x2, y2) = kps[m.queryIdx].pt, kps[m.trainIdx].pt
        dx, dy = x2 - x1, y2 - y1
        if (dx * dx + dy * dy) ** 0.5 < 40:
            continue
        if dx < 0 or (dx == 0 and dy < 0):  # direction-agnostic
            dx, dy = -dx, -dy
        key = (round(dx / 10), round(dy / 10))
        votes[key] = votes.get(key, 0) + 1
    return {"copy_move_matches": float(max(votes.values()) if votes else 0)}


def metadata_features(meta: Dict) -> Dict[str, float]:
    sw = meta["software"].lower()
    return {
        "meta_editing_software": 1.0 if any(s in sw for s in EDITING_SOFTWARE) else 0.0,
        "meta_has_camera": 1.0 if meta["camera"] else 0.0,
        "meta_has_exif": 1.0 if meta["has_exif"] else 0.0,
    }


def extract_features(data: bytes):
    rgb, meta = preprocess(data)
    feats: Dict[str, float] = {}
    feats.update(ela_features(rgb))
    feats.update(noise_features(rgb))
    feats.update(copy_move_features(rgb))
    feats.update(metadata_features(meta))
    return feats, meta


# --------------------------------------------------------------------------- #
# 3. Authenticity score
# --------------------------------------------------------------------------- #
def _signals(f: Dict[str, float], meta: Dict) -> List[Dict]:
    ela_r = max(_ramp(f["ela_cv"], 0.5, 1.3), _ramp(f["ela_hot_ratio"], 0.05, 0.15))
    noise_r = max(_ramp(f["noise_outlier_ratio"], 0.02, 0.10), _ramp(f["noise_cv"], 0.3, 0.8))
    cm_r = _ramp(f["copy_move_matches"], 10, 30)
    if f["meta_editing_software"]:
        meta_r, meta_txt = 0.9, f"File metadata names editing software ({meta['software']})."
    elif f["meta_has_camera"]:
        meta_r, meta_txt = 0.0, f"Camera metadata present ({meta['camera']})."
    elif f["meta_has_exif"]:
        meta_r, meta_txt = 0.1, "Some metadata present, but no camera information."
    else:
        meta_r, meta_txt = 0.15, "No metadata found (common when images are re-saved or exported)."

    def txt(r, low, high):
        return high if r >= 0.5 else low

    return [
        {"key": "compression", "label": "Compression consistency", "risk": round(ela_r, 3), "weight": 0.5,
         "detail": txt(ela_r, "Compression error is evenly spread across the image.",
                       "Some regions show different compression error than the rest of the image.")},
        {"key": "noise", "label": "Sensor-noise consistency", "risk": round(noise_r, 3), "weight": 0.5,
         "detail": txt(noise_r, "Grain / noise pattern is uniform across the image.",
                       "Some regions have noticeably different noise from their surroundings.")},
        {"key": "clone", "label": "Repeated-region check", "risk": round(cm_r, 3), "weight": 0.7,
         "detail": txt(cm_r, "No duplicated regions detected.",
                       "Parts of the image appear to be duplicated (possible clone-stamping).")},
        {"key": "metadata", "label": "File metadata", "risk": round(meta_r, 3), "weight": 0.5, "detail": meta_txt},
    ]


def _load_model():
    if not os.path.exists(MODEL_PATH):
        return None
    try:
        import joblib
        return joblib.load(MODEL_PATH)
    except Exception:  # pragma: no cover - optional
        return None


_MODEL = _load_model()


def analyze(data: bytes) -> Dict:
    feats, meta = extract_features(data)
    signals = _signals(feats, meta)
    keep = 1.0
    for s in signals:
        keep *= 1.0 - s["weight"] * s["risk"]
    score = keep  # 1.0 = no editing traces found
    model_name = MODEL_NAME
    if _MODEL is not None:
        try:
            p_original = float(_MODEL.predict_proba([[feats[k] for k in FEATURE_NAMES]])[0][1])
            score = 0.5 * score + 0.5 * p_original
            model_name = MODEL_NAME + "+trained-classifier"
        except Exception:  # pragma: no cover
            pass
    return {
        "score": round(_clip01(score), 3),
        "signals": signals,
        "features": {k: round(v, 4) for k, v in feats.items()},
        "meta": meta,
        "model": model_name,
    }
