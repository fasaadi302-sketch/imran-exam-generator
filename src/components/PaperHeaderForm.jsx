/**
 * PaperHeaderForm.jsx
 * Card for filling in the paper header: institution, session, subject, marks, time, date.
 */

export default function PaperHeaderForm({
  institution, setInstitution,
  session, setSession,
  paper, setPaper,
  totalMarks, setTotalMarks,
  time, setTime,
  examDate, setExamDate,
}) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">📋</div>
        <h2>Paper Header</h2>
      </div>
      <div className="card-body">

        <div className="field">
          <label>Institution Name</label>
          <input
            value={institution}
            onChange={e => setInstitution(e.target.value)}
          />
        </div>

        <div className="row2">
          <div className="field">
            <label>Session</label>
            <input value={session} onChange={e => setSession(e.target.value)} />
          </div>
          <div className="field">
            <label>Paper / Subject</label>
            <input value={paper} onChange={e => setPaper(e.target.value)} />
          </div>
        </div>

        <div className="row3">
          <div className="field">
            <label>Total Marks</label>
            <input value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
          </div>
          <div className="field">
            <label>Time</label>
            <input value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="field">
            <label>Date (opt)</label>
            <input
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              placeholder="e.g. June 2025"
            />
          </div>
        </div>

      </div>
    </div>
  )
}
