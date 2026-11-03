export default function ScoreMeter({ analysis, thresholds = { passed: 0.75, review: 0.45 } }) {
  if (analysis.score == null) return null;
  const pct = Math.round(analysis.score * 100);
  return (
    <div className="meter" aria-label={`Authenticity score ${pct} out of 100`}>
      <div className="meter-head">
        <span>Authenticity score</span>
        <strong>{pct}<small>/100</small></strong>
      </div>
      <div className="meter-track">
        <span className="seg bad" style={{ width: thresholds.review * 100 + '%' }} />
        <span className="seg warn" style={{ width: (thresholds.passed - thresholds.review) * 100 + '%' }} />
        <span className="seg ok" style={{ width: (1 - thresholds.passed) * 100 + '%' }} />
        <span className="marker" style={{ left: pct + '%' }} />
      </div>
      <div className="meter-scale"><span>Potentially edited</span><span>Needs review</span><span>Likely original</span></div>
      <p className="muted small-text">
        Confidence: <strong>{analysis.confidence === 'high' ? 'High' : 'Low - borderline result'}</strong>
        {analysis.model && <> · model <code>{analysis.model}</code></>}
      </p>
    </div>
  );
}
