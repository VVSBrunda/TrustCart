// "Transparent UI": always explain that AI results are indicators, not absolute proof.
export default function Disclaimer({ compact = false }) {
  return (
    <aside className={`disclaimer ${compact ? 'compact' : ''}`} role="note">
      <strong>About this badge.</strong> Trust Cart's image check is an AI assessment that looks for statistical signs of editing.
      It is an indicator, <em>not absolute proof</em> - genuine photos can be flagged and edited ones can be missed.
      {!compact && ' Sellers can appeal results they believe are wrong.'}
    </aside>
  );
}
