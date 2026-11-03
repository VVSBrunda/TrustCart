// The "easy-to-understand badge" from the deck. Labels follow the deck wording.
export const BADGES = {
  likely_original: { cls: 'ok', icon: '✓', title: 'Image Check: Passed', sub: 'Likely Original' },
  needs_review: { cls: 'warn', icon: '!', title: 'Review Needed', sub: 'Image check inconclusive' },
  potentially_edited: { cls: 'bad', icon: '⚑', title: 'Potentially Edited', sub: 'Signs of editing found' },
};

export default function TrustBadge({ analysis, size = 'md', showSub = false }) {
  const b = BADGES[analysis.badge] || BADGES.needs_review;
  const label = analysis.status === 'unavailable' ? 'Not checked' : b.title;
  return (
    <span className={`badge ${b.cls} ${size}`} title={`AI assessment: ${b.sub}`}>
      <span className="badge-icon" aria-hidden="true">{b.icon}</span>
      <span>
        {label}
        {showSub && <small>{analysis.status === 'unavailable' ? 'Automatic check unavailable' : b.sub}</small>}
      </span>
    </span>
  );
}
