const level = (r) => (r < 0.25 ? ['clear', 'Clear'] : r < 0.6 ? ['slight', 'Slight'] : ['flag', 'Flagged']);

export default function SignalList({ analysis }) {
  if (analysis.note) return <p className="muted">{analysis.note}</p>;
  if (!analysis.signals?.length) return null;
  return (
    <ul className="signals">
      {analysis.signals.map((s) => {
        const [cls, text] = level(s.risk);
        return (
          <li key={s.key}>
            <span className={`pill ${cls}`}>{text}</span>
            <div><strong>{s.label}</strong><p>{s.detail}</p></div>
          </li>
        );
      })}
    </ul>
  );
}
