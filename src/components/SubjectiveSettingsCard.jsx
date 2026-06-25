/**
 * SubjectiveSettingsCard.jsx
 * Card for configuring the subjective section: section marks, per-question marks,
 * and how many questions students must attempt.
 */

export default function SubjectiveSettingsCard({
  subTotal, setSubTotal,
  subPer, setSubPer,
  subAttempt, setSubAttempt,
}) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">⚙️</div>
        <h2>Subjective Settings</h2>
      </div>
      <div className="card-body">

        <div className="row2">
          <div className="field">
            <label>Section Marks</label>
            <input
              type="number"
              value={subTotal}
              onChange={e => setSubTotal(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Marks / Q</label>
            <input
              type="number"
              value={subPer}
              onChange={e => setSubPer(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Attempt (word)</label>
          <input
            value={subAttempt}
            onChange={e => setSubAttempt(e.target.value)}
            placeholder="e.g. FOUR"
          />
        </div>

      </div>
    </div>
  )
}
