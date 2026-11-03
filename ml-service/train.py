"""
Optional: train a classifier on top of the forensic features.

    python train.py path/to/dataset            # expects dataset/original/*.jpg and dataset/edited/*.jpg
    python train.py --synthetic 60             # quick demo using generated images

Reports held-out accuracy and the FALSE-POSITIVE rate (genuine images flagged as edited),
as called for in the 'Test' slide of the design deck. Saves models/authenticity.joblib,
which analyzer.py blends with the heuristic score automatically.
"""
import argparse
import glob
import os
import sys

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split

from analyzer import FEATURE_NAMES, extract_features


def vec(data: bytes):
    feats, _ = extract_features(data)
    return [feats[k] for k in FEATURE_NAMES]


def load_folder(root):
    X, y = [], []
    for label, name in ((1, "original"), (0, "edited")):
        for path in glob.glob(os.path.join(root, name, "*")):
            try:
                with open(path, "rb") as fh:
                    X.append(vec(fh.read()))
                y.append(label)
            except Exception as exc:
                print("skip", path, exc)
    return np.array(X), np.array(y)


def load_synthetic(n):
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "tools"))
    from synth import make_original, make_edited
    kinds = ["phone", "earbuds", "watch", "backpack", "sneaker", "kettle", "lamp", "speaker", "wallet", "bottle"]
    X, y = [], []
    for i in range(n):
        k = kinds[i % len(kinds)]
        col = tuple(int(v) for v in np.random.default_rng(i).integers(40, 220, 3))
        X.append(vec(make_original(k, col, 1000 + i))); y.append(1)
        X.append(vec(make_edited(k, col, 1000 + i, "strong" if i % 2 else "mild"))); y.append(0)
    return np.array(X), np.array(y)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dataset", nargs="?")
    ap.add_argument("--synthetic", type=int, default=0)
    args = ap.parse_args()
    X, y = load_synthetic(args.synthetic) if args.synthetic else load_folder(args.dataset)
    if len(set(y)) < 2:
        sys.exit("need both 'original' and 'edited' images")
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=7)
    clf = GradientBoostingClassifier(random_state=7).fit(Xtr, ytr)
    pred = clf.predict(Xte)
    tn, fp, fn, tp = confusion_matrix(yte, pred, labels=[0, 1]).ravel()
    print(f"held-out accuracy      : {(tp + tn) / len(yte):.3f}")
    print(f"false-positive rate    : {fn / max(1, fn + tp):.3f}  (genuine images flagged as edited)")
    print(f"missed-edit rate       : {fp / max(1, fp + tn):.3f}  (edited images passed as original)")
    os.makedirs("models", exist_ok=True)
    clf.fit(X, y)
    joblib.dump(clf, os.path.join("models", "authenticity.joblib"))
    print("saved models/authenticity.joblib")


if __name__ == "__main__":
    main()
