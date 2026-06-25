/**
 * NotesPreviewModal.jsx
 * Professional layout: compact header, narrow margins, justified text.
 */

export default function NotesPreviewModal({ data, blocks, onClose }) {
  const urduFont = {
    fontFamily: '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif',
    fontSize: 15,
    lineHeight: 2.2,
  }
  const urduJustified = { ...urduFont, textAlign: 'justify' }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 780 }}>
        <div className="modal-head">
          <h3>📄 Notes Preview</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body notes-preview-body">

          {/* ── Compact professional header ── */}
          {(data.topic || data.institution || data.authorName || data.noteDate) && (
            <div className="notes-preview-header">
              {data.institution && (
                <div className="notes-preview-institution">{data.institution}</div>
              )}
              <hr className="notes-preview-rule thick" />
              <div className="notes-preview-header-meta">
                {data.topic && (
                  <div className="notes-preview-subject">
                    <span className="notes-preview-label">Subject: </span>{data.topic}
                  </div>
                )}
                <div className="notes-preview-header-right">
                  {data.authorName && (
                    <span><span className="notes-preview-label">By: </span>{data.authorName}</span>
                  )}
                  {data.noteDate && (
                    <span><span className="notes-preview-label">Date: </span>{data.noteDate}</span>
                  )}
                </div>
              </div>
              <hr className="notes-preview-rule thin" />
            </div>
          )}

          {blocks.length === 0 && (
            <p style={{ color: '#6B82A0', fontSize: 13 }}>No content yet.</p>
          )}

          {/* ── Two-column content ── */}
          <div className="notes-preview-cols">
            {blocks.map((block, i) => {
              const isRtl = block.dir === 'rtl'

              if (block.type === 'heading') return (
                <div
                  key={i}
                  className="notes-preview-heading notes-preview-full"
                  dir={block.dir}
                  style={isRtl ? urduFont : {}}
                >
                  {block.answer}
                </div>
              )

              if (block.type === 'qa') {
                const label = block.num ? `${block.num}.` : `${i + 1}.`

                if (isRtl) {
                  return (
                    <div key={i} className="notes-preview-qa" dir="rtl">
                      <div style={{ ...urduFont, fontWeight: 700, marginBottom: 3, textAlign: 'right' }}>
                        <span style={{ color: '#0B2545', marginLeft: 6 }}>{label}</span>
                        <span>{block.question || ''}</span>
                      </div>
                      {block.answer && (
                        <div style={{ ...urduJustified, paddingRight: 28, color: '#2A3F5F', fontWeight: 'normal' }}>
                          {block.answer}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div key={i} className="notes-preview-qa">
                    <div className="notes-preview-q">
                      <span className="notes-preview-num">{label}</span>
                      <span>{block.question || ''}</span>
                    </div>
                    {block.answer && (
                      <div className="notes-preview-a notes-preview-justify" style={{ paddingLeft: 22 }}>
                        {block.answer}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <p
                  key={i}
                  className="notes-preview-para notes-preview-justify"
                  dir={block.dir}
                  style={isRtl ? urduJustified : {}}
                >
                  {block.answer}
                </p>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
