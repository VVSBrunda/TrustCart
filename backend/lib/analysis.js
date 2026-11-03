// Client for the Python ML service + conversion of an authenticity score into a trust badge.
const ML_URL = process.env.ML_URL || 'http://127.0.0.1:5001';

const THRESHOLDS = { passed: 0.75, review: 0.45 };

function toBadge(score) {
  if (score >= THRESHOLDS.passed) return 'likely_original';
  if (score >= THRESHOLDS.review) return 'needs_review';
  return 'potentially_edited';
}

// "High confidence / Low confidence / Needs review" (deck slide 9)
function toConfidence(score) {
  if (score >= 0.88 || score <= 0.3) return 'high';
  return 'low';
}

async function analyzeImage(buffer) {
  try {
    const res = await fetch(`${ML_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: buffer,
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `ML service returned ${res.status}`);
    return buildAnalysis(body);
  } catch (err) {
    // Fail safe: never claim an image is authentic when we could not check it.
    return {
      status: 'unavailable',
      score: null,
      badge: 'needs_review',
      confidence: 'low',
      signals: [],
      model: null,
      analyzedAt: new Date().toISOString(),
      note: `Automatic image check unavailable (${err.message}). Marked for review.`,
    };
  }
}

function buildAnalysis(ml) {
  return {
    status: 'ok',
    score: ml.score,
    badge: toBadge(ml.score),
    confidence: toConfidence(ml.score),
    signals: ml.signals,
    model: ml.model,
    meta: ml.meta,
    analyzedAt: new Date().toISOString(),
  };
}

module.exports = { analyzeImage, buildAnalysis, toBadge, toConfidence, THRESHOLDS, ML_URL };
