/**
 * ParsedPreview.jsx
 * Shows a green badge with the count of parsed questions, plus a scrollable
 * preview of the first 4 items.
 *
 * Props:
 *   items  — parsed MCQ objects ({ q, opts }) or subjective strings
 *   type   — 'MCQs' | 'questions'
 */

export default function ParsedPreview({ items, type }) {
  if (!items.length) return null

  return (
    <div style={{ marginTop: 8 }}>
      <div className="parsed-count">
        ✓ {items.length} {type} parsed
      </div>
      <div className="preview-box">
        {items.slice(0, 4).map((item, i) => (
          <div key={i} className="preview-q">
            <strong>{i + 1}.</strong>{' '}
            {type === 'MCQs' ? item.q : item}
            {type === 'MCQs' && item.opts.length > 0 && (
              <span style={{ color: '#6B82A0' }}>
                {' '}→ {item.opts.length} options:{' '}
                {item.opts.map((o, j) => `${['a', 'b', 'c', 'd'][j]}) ${o}`).join('  ')}
              </span>
            )}
          </div>
        ))}
        {items.length > 4 && (
          <div className="preview-q" style={{ color: '#6B82A0' }}>
            ...and {items.length - 4} more
          </div>
        )}
      </div>
    </div>
  )
}
