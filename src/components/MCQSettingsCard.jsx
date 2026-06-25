/**
 * MCQSettingsCard.jsx
 * Card for configuring the MCQ section header (marks note).
 */

export default function MCQSettingsCard({ mcqMarksNote, setMcqMarksNote }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">⚙️</div>
        <h2>MCQ Settings</h2>
      </div>
      <div className="card-body">
        <div className="field">
          <label>Marks Note</label>
          <input
            value={mcqMarksNote}
            onChange={e => setMcqMarksNote(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
