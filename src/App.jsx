/**
 * App.jsx
 */

import { useState, useMemo, useEffect } from 'react'

import AppHeader              from './components/AppHeader'
import PaperHeaderForm        from './components/PaperHeaderForm'
import InstructionsCard       from './components/InstructionsCard'
import MCQSettingsCard        from './components/MCQSettingsCard'
import SubjectiveSettingsCard from './components/SubjectiveSettingsCard'
import QInput                 from './components/QInput'
import ParsedPreview          from './components/ParsedPreview'
import AdminDashboard         from './components/AdminDashboard'
import PaperPreviewModal      from './components/PaperPreviewModal'
import NotesFormatter         from './components/NotesFormatter'
import NotesLibrary           from './components/NotesLibrary'

import { parseMCQs, parseSubjective }      from './utils/parsers'
import { downloadExamPaper }               from './utils/generateDocx'
import { downloadExamPaperPdf }            from './utils/generatePdf'
import { logPageVisit, logGeneratedPaper } from './utils/logging'

export const ADMIN_PASSWORD = 'fasaadi420'

function useIsAdminRoute() {
  const read = () =>
    window.location.hash.replace(/^#\/?/, '') === 'admin' ||
    window.location.pathname.replace(/\/+$/, '').endsWith('/admin')
  const [isAdmin, setIsAdmin] = useState(read())
  useEffect(() => {
    const on = () => setIsAdmin(read())
    window.addEventListener('hashchange', on)
    window.addEventListener('popstate', on)
    return () => {
      window.removeEventListener('hashchange', on)
      window.removeEventListener('popstate', on)
    }
  }, [])
  return isAdmin
}

const DEFAULT_INSTRS = [
  'Read each question carefully before selecting your answer.',
  'Do not overwrite. Do not use correction fluid or erasers on the answer sheet.',
  'Do not write rough or irrelevant material on this sheet.',
  'This sheet will be returned to the invigilator within the specified time.',
]

export default function App() {
  const isAdmin = useIsAdminRoute()
  useEffect(() => { if (!isAdmin) logPageVisit() }, [isAdmin])
  return isAdmin ? <AdminDashboard /> : <MainApp />
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('paper')

  return (
    <div>
      <AppHeader />
      <div className="app-tabs">
        <div className="app-tabs-inner">
          <button className={`app-tab-btn ${activeTab === 'paper' ? 'active' : ''}`} onClick={() => setActiveTab('paper')}>
            📄 Exam Paper Generator
          </button>
          <button className={`app-tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
            📝 Notes Formatter
          </button>
          <button className={`app-tab-btn ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>
            📚 Notes Library
          </button>
        </div>
      </div>

      {activeTab === 'paper'   && <GeneratorApp />}
      {activeTab === 'notes'   && <NotesFormatter adminPassword={ADMIN_PASSWORD} />}
      {activeTab === 'library' && <NotesLibrary   adminPassword={ADMIN_PASSWORD} />}
    </div>
  )
}

function GeneratorApp() {
  const [institution, setInstitution] = useState('HBS College of Nursing Islamabad')
  const [session,     setSession]     = useState('2024-2026')
  const [paper,       setPaper]       = useState('LHV (Group B)')
  const [totalMarks,  setTotalMarks]  = useState('100')
  const [time,        setTime]        = useState('3 hrs')
  const [examDate,    setExamDate]    = useState('')
  const [instrs,      setInstrs]      = useState(DEFAULT_INSTRS)
  const [mcqMarksNote, setMcqMarksNote] = useState('ALL QUESTIONS CARRY EQUAL (01) MARKS.')
  const [mcqText,      setMcqText]      = useState('')
  const [subTotal,   setSubTotal]   = useState('40')
  const [subPer,     setSubPer]     = useState('10')
  const [subAttempt, setSubAttempt] = useState('FOUR')
  const [subText,    setSubText]    = useState('')
  const [status,      setStatus]    = useState(null)
  const [generating,  setGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const parsedMCQs = useMemo(() => parseMCQs(mcqText),      [mcqText])
  const parsedSubs = useMemo(() => parseSubjective(subText), [subText])

  const buildData = () => ({
    institution, session, paper, totalMarks, time, examDate,
    instrs: instrs.filter(Boolean),
    mcqMarksNote,
    mcqs: parsedMCQs,
    subTotal, subPer, subAttempt,
    subs: parsedSubs,
  })

  const generate = async (format) => {
    if (parsedMCQs.length === 0 && parsedSubs.length === 0) {
      setStatus({ type: 'err', msg: 'Please add MCQ or subjective questions before generating.' })
      return
    }
    setGenerating(true)
    setStatus({ type: 'info', msg: 'Building your paper...' })
    try {
      const safeName = paper.replace(/[^a-zA-Z0-9]/g, '_') || 'Paper'
      const data = buildData()
      if (format === 'pdf') {
        await downloadExamPaperPdf(data, `${safeName}_ExamPaper.pdf`)
      } else {
        await downloadExamPaper(data, `${safeName}_ExamPaper.docx`)
      }
      logGeneratedPaper(data, format)
      setStatus({
        type: 'ok',
        msg: `✓ Paper generated (${format.toUpperCase()}) — ${parsedMCQs.length} MCQs + ${parsedSubs.length} subjective questions. Check your Downloads folder.`,
      })
    } catch (e) {
      setStatus({ type: 'err', msg: 'Error: ' + e.message })
    }
    setGenerating(false)
  }

  return (
    <div>
      <div className="app-body">
        <div className="two-col">

          <div className="left-panel">
            <PaperHeaderForm
              institution={institution} setInstitution={setInstitution}
              session={session}         setSession={setSession}
              paper={paper}             setPaper={setPaper}
              totalMarks={totalMarks}   setTotalMarks={setTotalMarks}
              time={time}               setTime={setTime}
              examDate={examDate}       setExamDate={setExamDate}
            />
            <InstructionsCard instrs={instrs} setInstrs={setInstrs} />
            <MCQSettingsCard mcqMarksNote={mcqMarksNote} setMcqMarksNote={setMcqMarksNote} />
            <SubjectiveSettingsCard
              subTotal={subTotal}     setSubTotal={setSubTotal}
              subPer={subPer}         setSubPer={setSubPer}
              subAttempt={subAttempt} setSubAttempt={setSubAttempt}
            />
          </div>

          <div className="right-panel">

            <div className="card">
              <div className="card-head">
                <div className="card-head-icon">🔢</div>
                <h2>MCQ Questions</h2>
              </div>
              <div className="card-body">
                <QInput section="mcq" text={mcqText} setText={setMcqText} />
                <ParsedPreview items={parsedMCQs} type="MCQs" />
                <p className="hint">
                  Format: question on line 1, then{' '}
                  <code>a)</code> <code>b)</code> <code>c)</code> <code>d)</code>{' '}
                  each on its own line. Blank line between questions.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-head-icon">✍️</div>
                <h2>Subjective Questions</h2>
              </div>
              <div className="card-body">
                <QInput section="sub" text={subText} setText={setSubText} />
                <ParsedPreview items={parsedSubs} type="questions" />
              </div>
            </div>

            <div className="action-row">
              <button
                className="preview-btn"
                onClick={() => {
                  if (!parsedMCQs.length && !parsedSubs.length) {
                    setStatus({ type: 'err', msg: 'Add some questions first to preview.' })
                  } else {
                    setStatus(null)
                    setShowPreview(true)
                  }
                }}
              >
                👁 Preview Paper
              </button>
              <button className="gen-btn" onClick={() => generate('docx')} disabled={generating}>
                {generating ? '⏳  Generating...' : '⬇  Word (.docx)'}
              </button>
              <button className="gen-btn pdf-btn" onClick={() => generate('pdf')} disabled={generating}>
                {generating ? '⏳  Generating...' : '⬇  PDF (.pdf)'}
              </button>
            </div>

            {status && <div className={`status-box ${status.type}`}>{status.msg}</div>}
          </div>

        </div>
      </div>

      {showPreview && (
        <PaperPreviewModal
          data={{ institution, session, paper, totalMarks, time, examDate, instrs: instrs.filter(Boolean), mcqMarksNote, subTotal, subPer, subAttempt }}
          parsedMCQs={parsedMCQs}
          parsedSubs={parsedSubs}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
