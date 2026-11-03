# Trust Cart

A trust-centered e-commerce prototype built from the *Trust Cart - Design Thinking* deck:
**E-commerce + AI image verification + price transparency.**

* **Dual login** - separate Customer and Seller portals
* **AI image check** - uploaded product photos are analysed for signs of editing and turned into a **trust badge**
  (*Image Check: Passed* / *Review Needed* / *Potentially Edited*)
* **Price compare** - similar products are matched on title, brand, category and attributes, with source + date
* **Transparent UI** - every badge is explained and labelled as an *indicator, not absolute proof*; sellers can **appeal** and **re-run** checks

```
Customer / Seller ──> React frontend ──> Node backend API ──> Python ML service (image authenticity)
                                              │
                                              ├── Product DB (JSON file, swappable)
                                              └── Price data (mock market feed)
```

## Quick start

Requirements: **Node 18+** (22 recommended) and **Python 3.9+**.

```bash
# 1. Install the ML service dependencies (once)
python3 -m pip install -r ml-service/requirements.txt

# 2. Start everything (ML service + backend + the prebuilt web app)
node run.js

# 3. Open http://localhost:4000
```

The backend has **no npm dependencies** and the repo ships with a prebuilt `frontend/dist`, so nothing else needs installing.
Demo data loads automatically on first start.

| Role | Email | Password |
|---|---|---|
| Customer | `customer@trustcart.demo` | `Customer@123` |
| Seller | `seller@trustcart.demo` | `Seller@123` |
| Seller 2 | `seller2@trustcart.demo` | `Seller@123` |

No Python? `node run.js --no-ml` still works - uploads are then marked **"Not checked"** (the app never claims an unchecked image is original).

### Try it
1. Sign in as **Seller** -> *Upload product*. Use any JPEG/PNG/WebP. Photos with camera EXIF and uniform grain pass; photos with editing-software metadata, pasted/blurred patches or cloned regions get flagged.
2. Sign in as **Customer** -> *Products*. Open *PulseFit Smartwatch S2* (flagged), *ZenSound Speaker* (review needed) and *Nova X5* (passed), and look at the price comparison.
3. Back as Seller, open a flagged product and **Appeal** or **Re-run image check**.

> The demo products' photos are synthetic illustrations made by `ml-service/tools/synth.py`; a few were deliberately "retouched" so all three badges appear.

## Frontend development (optional)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api and /uploads to :4000
npm run build      # Vite build -> frontend/dist (replaces the prebuilt bundle)
```

## Project layout

```
trust-cart/
├── run.js                    one-command launcher
├── backend/                  Node API (zero dependencies)
│   ├── server.js             routes, static serving, security headers
│   ├── seed.js               demo users + products
│   ├── lib/                  auth (scrypt + HS256 token), db, router, validation, analysis client, price comparison
│   ├── seed/                 demo images, analysed products, mock market prices
│   └── test/api.test.js      API tests  (npm test)
├── ml-service/               Python Flask service
│   ├── analyzer.py           pre-process -> features -> score
│   ├── app.py                POST /analyze, GET /health
│   ├── train.py              optional classifier + held-out / false-positive evaluation
│   └── tools/                synthetic image generator + seed builder
├── frontend/                 React (Vite) app, hash-routed, + prebuilt dist/
└── docs/requirements-traceability.md   slide-by-slide mapping to the code
```

## API (all JSON; everything except auth/health needs `Authorization: Bearer <token>`)

| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/auth/register` · `/login` · `GET /api/auth/me` | all | Dual login (`role`: customer \| seller) |
| `GET /api/products?q=&category=&badge=&sort=` | any user | Browse catalogue |
| `GET /api/products/:id` · `/:id/compare` | any user | Product + badge · similar products and prices |
| `POST /api/products` | seller | Upload `{title, brand, category, price, attributes, description, image: dataURL}` -> AI check -> badge |
| `GET /api/seller/products` | seller | Own products |
| `POST /api/products/:id/recheck` · `/appeal` · `DELETE /api/products/:id` | owner seller | Re-run check · appeal · delete |
| `GET /api/health` | public | API + ML service status |

## How the image check works (and its limits)

`analyzer.py` follows the deck's pipeline: **resize/normalise -> feature extraction -> authenticity score -> badge**.
Four forensic signals are combined: compression-error consistency (ELA), sensor-noise consistency (robust per-block MAD),
cloned-region detection (ORB keypoints sharing one displacement) and editing-software metadata.
Scores: **>= 75** passed · **45-74** review needed · **< 45** potentially edited.

Be aware of what this is:

* It is a **heuristic prototype, not a trained deep-learning detector**. Thresholds were tuned on the synthetic images in `tools/synth.py`, so real-world accuracy is **unknown until you evaluate it on real data**.
* Legitimate studio retouching (background removal, colour grading) can raise flags; stripped metadata and screenshots reduce what can be checked; visually symmetric products can resemble "cloned" regions.
* Hence the UI always says "indicator, not proof", never labels a failed/unavailable check as original, and offers appeals.
* To improve it: put real labelled images in `dataset/original/` and `dataset/edited/`, run `python ml-service/train.py dataset` (prints held-out accuracy and the **false-positive rate**, per the deck's Test slide). The saved model is blended in automatically. `python train.py --synthetic 40` is a quick demo.

## Design choices worth knowing

* **Backend uses Node built-ins instead of Express/MongoDB.** The deck's stack is a "possible stack"; zero dependencies means `node server.js` just runs. Data access is isolated in `lib/db.js` and the tiny router mirrors Express's style, so swapping in Express + MongoDB is a contained change.
* **Price data is mocked** (`backend/seed/market_prices.json`), as the deck allows. Each result carries a source and timestamp so a live feed can replace it.
* **Security basics included:** scrypt password hashing, signed expiring tokens, role checks on every seller route and ownership checks on edits, login rate-limiting, image magic-byte validation and a 5 MB cap, path-traversal protection, CSP and other security headers.
  For production add HTTPS, a persistent database, a real secret (`TRUSTCART_SECRET`), CSRF/session hardening as needed and request logging.

## Tests

```bash
npm test          # backend API tests (auth, roles, catalogue, price matching, appeal flow, fail-safe when ML is down)
```

## Next steps (from the deck's future scope)

Human review workflow for appeals (they are stored as `pending`), multimodal fraud signals (image + text + seller behaviour),
authorised price APIs/partner feeds, and a trained detector evaluated on a real held-out set.
