/**
 * PaperPreviewModal.jsx
 * Full paper preview — English MCQs: LTR layout
 *                      Urdu MCQs: RTL layout, Jameel Noori Nastaleeq font
 */

import { isUrduText } from '../utils/parsers'

const URDU_FONT = { fontFamily: '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", serif', fontSize: 15, lineHeight: 2 }

export default function PaperPreviewModal({ data, parsedMCQs, parsedSubs, onClose }) {
  const L = ['a', 'b', 'c', 'd', 'e', 'f']

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>📄 Paper Preview</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="paper">

            <div className="paper-title">{data.institution || 'Institution Name'}</div>
            <hr className="paper-rule thick" />

            <div className="paper-meta">
              <div>
                <div>Student Name: {'_'.repeat(22)}</div>
                <div>Session: {data.session}</div>
                {data.examDate && <div>Date: {data.examDate}</div>}
              </div>
              <div className="paper-meta-right">
                <div>Total Marks: {data.totalMarks}</div>
                <div>Paper: {data.paper}</div>
                <div>Time Allowed: {data.time}</div>
              </div>
            </div>
            <hr className="paper-rule thick" />

            <div className="paper-ihead">
              INSTRUCTIONS: <span style={{ fontWeight: 'normal' }}>{data.mcqMarksNote}</span>
            </div>

            {data.instrs.length > 0 && (
              <div className="paper-box">
                {data.instrs.map((t, i) => (
                  <div key={i} className="paper-box-item">✓&nbsp;&nbsp;{t}</div>
                ))}
              </div>
            )}

            {/* MCQ Questions */}
            {parsedMCQs.map(({ q, opts }, i) => {
              const urdu = isUrduText(q)

              if (urdu) {
                // ── Urdu MCQ ──────────────────────────────────────────────
                const half = Math.ceil(opts.length / 2)
                return (
                  <div key={i} className="paper-q-block" dir="rtl">
                    {/* Question: number on right, text flows left */}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                      <span style={{ ...URDU_FONT, fontWeight: 700, color: '#0B2545', flexShrink: 0 }}>
                        {i + 1}.
                      </span>
                      <span style={{ ...URDU_FONT, fontWeight: 700 }}>{q}</span>
                    </div>
                    {/* Options: 2-column grid RTL — a) text format */}
                    {opts.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', paddingRight: 24, direction: 'rtl' }}>
                        {Array.from({ length: half }).map((_, row) => {
                          const li = row
                          const ri = row + half
                          return (
                            <>
                              <span key={`l${row}`} style={{ ...URDU_FONT, textAlign: 'right', display: 'block' }}>
                                {li < opts.length ? `${L[li]})  ${opts[li]}` : ''}
                              </span>
                              <span key={`r${row}`} style={{ ...URDU_FONT, textAlign: 'right', display: 'block' }}>
                                {ri < opts.length ? `${L[ri]})  ${opts[ri]}` : ''}
                              </span>
                            </>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              // ── English MCQ ──────────────────────────────────────────────
              const half = Math.ceil(opts.length / 2)
              const rows = []
              for (let r = 0; r < half; r++) {
                const li = r
                const ri = r + half
                rows.push(
                  <span key={`l${r}`}>{li < opts.length ? `${L[li]})  ${opts[li]}` : ''}</span>,
                  <span key={`r${r}`}>{ri < opts.length ? `${L[ri]})  ${opts[ri]}` : ''}</span>
                )
              }
              return (
                <div key={i} className="paper-q-block">
                  <div className="paper-q">
                    <span className="paper-q-num">{i + 1}.</span>
                    <span className="paper-q-text">{q}</span>
                  </div>
                  {opts.length > 0 && <div className="paper-opts">{rows}</div>}
                </div>
              )
            })}

            {/* Subjective section */}
            {parsedSubs.length > 0 && (
              <>
                <div className="paper-page-break">
                  <span className="paper-break-lbl">— Page Break (new page in .docx) —</span>
                </div>
                <div className="paper-sub-title">Subjective Questions</div>
                <div className="paper-sub-marks">({data.subTotal} Marks)</div>
                <hr className="paper-rule thin" style={{ marginBottom: 8 }} />
                <div className="paper-sub-instr">
                  Instructions: Answer any {data.subAttempt} of the following{' '}
                  {parsedSubs.length} questions. Each question carries ({data.subPer} marks.)
                </div>
                {parsedSubs.map((q, i) => (
                  <div key={i} className="paper-q">
                    <span className="paper-q-num">{i + 1}.</span>
                    <span className="paper-q-text">{q}</span>
                  </div>
                ))}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
