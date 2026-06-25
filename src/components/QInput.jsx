/**
 * QInput.jsx
 * Dual-mode input (paste text / upload .txt) for entering MCQ or subjective questions.
 *
 * Props:
 *   section  — 'mcq' | 'sub'  (controls placeholder text and textarea height)
 *   text     — current string value
 *   setText  — state setter
 */

import { useState } from 'react'

const MCQ_PLACEHOLDER = `Paste MCQs here. Each question on its own line, options on the next lines:

1. Which of the following is NOT an objective of MCH services?
a) Reducing maternal and child mortality.
b) Promoting best possible health conditions for infants.
c) Increasing the family size without spacing.
d) Advising parents to limit family size with adequate spacing.

2. Maternal health refers to:
a) Curative care only.
b) Preventive care only.
c) Promotive, preventive, curative, and rehabilitative health care.
d) Rehabilitative health care only.`

const SUB_PLACEHOLDER = `Paste subjective questions here:

1. Explain the meaning, philosophy, and importance of Family Planning.

2. Describe the role of CHN/LHV in Family Planning at community level.`

export default function QInput({ section, text, setText }) {
  const [tab, setTab] = useState('paste')

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setText(ev.target.result)
      setTab('paste')
    }
    reader.readAsText(file)
    e.target.value = ''  // reset so same file can be re-uploaded
  }

  const placeholder = section === 'mcq' ? MCQ_PLACEHOLDER : SUB_PLACEHOLDER

  return (
    <div>
      <div className="tabs">
        <button
          className={`tab ${tab === 'paste' ? 'active' : ''}`}
          onClick={() => setTab('paste')}
        >
          Paste Text
        </button>
        <button
          className={`tab ${tab === 'upload' ? 'active' : ''}`}
          onClick={() => setTab('upload')}
        >
          Upload .txt
        </button>
      </div>

      {tab === 'paste' ? (
        <div className="field">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight: section === 'mcq' ? 300 : 180 }}
          />
        </div>
      ) : (
        <label className="upload-zone">
          <span className="uz-icon">📄</span>
          <span>Click to upload a <strong>.txt</strong> file</span>
          <input
            type="file"
            accept=".txt"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </label>
      )}
    </div>
  )
}
