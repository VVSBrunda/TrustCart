"""Regenerates backend/seed/ (demo images, analysed with the real analyzer, + mock market prices)."""
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
from synth import make_original, make_edited  # noqa: E402
from analyzer import analyze  # noqa: E402

OUT = os.path.join(HERE, "..", "..", "backend", "seed")
IMG = os.path.join(OUT, "images")
os.makedirs(IMG, exist_ok=True)

# (slug, title, brand, category, price, shape, colour, edit, seller, attributes, description)
P = [
    ("nova-x5-128", "Nova X5 Smartphone 128GB", "Nova", "Electronics", 14999, "phone", (40, 60, 110), None, "A",
     ["128GB", "6.5 inch display", "5000mAh battery", "midnight blue"], "Dual-camera smartphone with a 6.5-inch display and all-day battery."),
    ("aerobuds-pro", "AeroBuds Pro Wireless Earbuds", "Aero", "Electronics", 2499, "earbuds", (200, 60, 60), None, "A",
     ["bluetooth 5.3", "noise cancelling", "24h playback"], "Active noise-cancelling earbuds with a 24-hour charging-case battery."),
    ("pulsefit-s2", "PulseFit Smartwatch S2", "PulseFit", "Electronics", 3299, "watch", (60, 140, 90), "strong", "A",
     ["amoled display", "heart-rate sensor", "7 day battery"], "Fitness smartwatch with heart-rate tracking and a 7-day battery."),
    ("trailmate-30", "TrailMate Backpack 30L", "TrailMate", "Fashion", 1899, "backpack", (180, 120, 40), None, "B",
     ["30 litre", "water resistant", "laptop sleeve"], "Water-resistant 30L daypack with padded laptop sleeve."),
    ("urban-runner", "UrbanStep Runner Sneakers", "UrbanStep", "Fashion", 2799, "sneaker", (90, 90, 160), None, "B",
     ["mesh upper", "cushioned sole", "unisex"], "Lightweight mesh running shoes with a cushioned sole."),
    ("brewmaster-18", "BrewMaster Electric Kettle 1.8L", "BrewMaster", "Home", 1299, "kettle", (160, 160, 170), None, "B",
     ["1.8 litre", "stainless steel", "auto shut-off"], "Stainless-steel 1.8L kettle with auto shut-off and boil-dry protection."),
    ("lumen-lamp", "Lumen LED Desk Lamp", "Lumen", "Home", 999, "lamp", (230, 200, 60), "strong", "B",
     ["led", "3 brightness levels", "usb powered"], "Adjustable LED desk lamp with three brightness levels."),
    ("zensound-speaker", "ZenSound Bluetooth Speaker", "ZenSound", "Electronics", 1799, "speaker", (50, 50, 60), "mild", "A",
     ["bluetooth 5.0", "12h playback", "waterproof"], "Portable waterproof Bluetooth speaker with 12-hour playback."),
    ("hidecraft-wallet", "Hidecraft Classic Leather Wallet", "Hidecraft", "Fashion", 799, "wallet", (120, 70, 40), None, "B",
     ["genuine leather", "6 card slots", "bifold"], "Bifold genuine-leather wallet with six card slots."),
    ("aerobuds-lite", "AeroBuds Lite Wireless Earbuds", "Aero", "Electronics", 1499, "earbuds", (60, 90, 190), None, "A",
     ["bluetooth 5.1", "18h playback"], "Entry-level wireless earbuds with 18-hour battery life."),
    ("nova-x5-256", "Nova X5 Smartphone 256GB", "Nova", "Electronics", 17999, "phone", (110, 40, 60), None, "A",
     ["256GB", "6.5 inch display", "5000mAh battery", "wine red"], "Higher-storage variant of the Nova X5 with 256GB of storage."),
    ("aqua-bottle", "AquaSteel Insulated Water Bottle 1L", "AquaSteel", "Home", 649, "bottle", (60, 170, 190), None, "B",
     ["1 litre", "double wall", "24h cold"], "Double-wall insulated steel bottle that keeps drinks cold for 24 hours."),
]

products = []
for i, (slug, title, brand, cat, price, shape, col, edit, seller, attrs, desc) in enumerate(P):
    seed = 11 + i * 7
    data = make_edited(shape, col, seed, edit) if edit else make_original(shape, col, seed)
    fname = f"{slug}.jpg"
    with open(os.path.join(IMG, fname), "wb") as fh:
        fh.write(data)
    a = analyze(data)
    products.append({"slug": slug, "title": title, "brand": brand, "category": cat, "price": price,
                     "attributes": attrs, "description": desc, "image": fname, "sellerKey": seller,
                     "analysis": {"score": a["score"], "signals": a["signals"], "model": a["model"], "meta": a["meta"]}})
    print(f"{slug:18s} score={a['score']:.2f}")

with open(os.path.join(OUT, "products.json"), "w") as fh:
    json.dump(products, fh, indent=2)

# ---- mock market-price feed (stands in for authorised APIs / partner feeds) ---------------------
rng = random.Random(42)
STORES = ["ShopMart", "BazaarHub", "QuickKart", "MegaMall"]
market = []
for slug, title, brand, cat, price, shape, col, edit, seller, attrs, desc in P:
    for store in rng.sample(STORES, 3):
        market.append({"title": title if rng.random() < .5 else title + " (Official Store)",
                       "brand": brand, "category": cat, "attributes": attrs, "store": store,
                       "price": round(price * rng.uniform(0.9, 1.15) / 10) * 10 - 1, "updatedAt": "2026-11-02T09:00:00Z"})
# look-alikes that should rank lower (different model / spec) - shows why matching matters
market += [
    {"title": "Nova X3 Smartphone 64GB", "brand": "Nova", "category": "Electronics", "attributes": ["64GB", "6.1 inch display"], "store": "ShopMart", "price": 9499, "updatedAt": "2026-11-02T09:00:00Z"},
    {"title": "Generic True Wireless Earbuds", "brand": "NoName", "category": "Electronics", "attributes": ["bluetooth 5.0"], "store": "QuickKart", "price": 699, "updatedAt": "2026-11-02T09:00:00Z"},
    {"title": "Steel Kettle 1.5L", "brand": "KettleCo", "category": "Home", "attributes": ["1.5 litre", "stainless steel"], "store": "MegaMall", "price": 899, "updatedAt": "2026-11-02T09:00:00Z"},
]
with open(os.path.join(OUT, "market_prices.json"), "w") as fh:
    json.dump(market, fh, indent=2)
print("market entries:", len(market))
