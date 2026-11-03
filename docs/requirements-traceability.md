# Requirements traceability

Maps each slide of *Trust Cart - Design Thinking* to what is implemented.

| Slide | Requirement | Where it lives |
|---|---|---|
| 2 Problem | Customers can't judge image authenticity; price comparison is slow; sellers need to show originality; trust signals are fragmented | Badge + score + reasons + price table on one product page (`ProductDetail.jsx`) |
| 3 Empathize | **Customers**: confidence, quick price comparison, clear indicators. **Sellers**: easy upload, recognition for authentic images, fewer disputes. **Platform**: safe analysis workflow, understandable badges | Customer portal, Seller portal, 3-level badge, appeal path, size/type/magic-byte checks on uploads (`validate.js`) |
| 4 Define | Help shoppers identify possibly edited images and compare prices; help sellers prove authenticity | Whole product |
| 5 Ideate | Dual login | `Login.jsx`, role-checked API (`server.js`), route guards (`App.jsx`) |
| 5 Ideate | AI image check | `ml-service/analyzer.py` |
| 5 Ideate | Trust badge | `TrustBadge.jsx`, `analysis.js#toBadge` |
| 5 Ideate | Price compare | `compare.js`, `PriceCompare.jsx`, `ComparePage.jsx` |
| 5 Ideate | Product catalogue (seller-uploaded, with images) | `POST /api/products`, `Products.jsx` |
| 5 Ideate | Transparent UI - "indicators, not absolute proof" | `Disclaimer.jsx` on every badge surface, `About.jsx`, footer |
| 6 Entry flow | Sign in as Customer / Seller -> Home/Products, About/Price Compare / Upload Product, AI Check + Badge | `Entry.jsx`, `Navbar.jsx` |
| 7 Customer portal | Login -> Home -> Browse -> View product -> Trust badge -> Price compare. Product page shows seller, image, AI status, price comparison. Badges only when supported by the model | `Products.jsx`, `ProductDetail.jsx`. Unchecked images show **"Not checked"**, never "Passed" |
| 8 Seller portal | Login -> Upload -> Image -> AI analysis -> Result -> Badge; "Likely Original" / "Potentially Edited"; review/appeal path for uncertain cases | `UploadProduct.jsx`, `POST /api/products/:id/appeal`, `/recheck` |
| 9 AI flow | Upload -> pre-processing (resize/normalise) -> feature extraction/ML model -> authenticity score -> decision/review -> badge; High / Low confidence / Needs review | `analyzer.py` (`preprocess`, `*_features`, `analyze`), `analysis.js` (`toBadge`, `toConfidence`) |
| 10 Price comparison | Match on title, brand, key attributes; mock dataset where no live pricing; show source/time | `compare.js` (+ spec-token penalty so X3 != X5), `seed/market_prices.json`, table shows source + date |
| 11 Test | Held-out AI evaluation, false-positive test | `ml-service/train.py` prints held-out accuracy and false-positive rate; `backend/test/api.test.js` covers auth, roles, compare, fail-safe, appeal |
| 12 Architecture | React + Node + DB + Python ML service | `frontend/` (React/Vite), `backend/` (Node), JSON datastore behind `lib/db.js`, `ml-service/` (Flask) |
| 13 Future scope | Multimodal fraud detection, human review workflow, richer price intelligence | **Not built** (see README "Next steps"); appeals are stored as `pending` ready for a reviewer tool |
