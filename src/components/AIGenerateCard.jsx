/**
 * AIGenerateCard.jsx
 * AI-powered MCQ generation from topic text or uploaded PDF/image.
 *
 * Changes from v4:
 * - REMOVED the "review/verify" draft box — generated text goes DIRECTLY
 *   into the MCQ paste box via onAccept() immediately after generation.
 * - Fixed MCQ-from-notes prompt to produce proper MCQ format not Q&A notes.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { generateMCQsWithAI }  from '../utils/aiGenerate'
import { extractTextFromFile } from '../utils/extractText'
import { supabaseConfigured }  from '../lib/supabase'

export default function AIGenerateCard({ onAccept, notesSourceText, onNotesConsumed }) {
  const [mode,       setMode]       = useState('topic')   // 'topic' | 'file'
  const [topic,      setTopic]      = useState('')
  const [count,      setCount]      = useState(5)
  const [file,       setFile]       = useState(null)
  const [phase,      setPhase]      = useState('idle')    // idle | working | done | error
  const [phaseLabel, setPhaseLabel] = useState('')
  const [errorMsg,   setErrorMsg]   = useState('')
  const fileInputRef = useRef(null)

  const isLoading = phase === 'working'

  // Auto-trigger when notes are sent from Notes tab
  useEffect(() => {
    if (!notesSourceText || !supabaseConfigured) return
    setPhase('working')
    setPhaseLabel('Generating MCQs from your notes…')
    setErrorMsg('')
    generateMCQsWithAI({ topic: 'nursing notes', count, sourceText: notesSourceText })
      .then(result => {
        onAccept(result)
        setPhase('done')
        onNotesConsumed?.()
      })
      .catch(err => {
        setErrorMsg(err.message || 'Something went wrong. Please try again.')
        setPhase('error')
        onNotesConsumed?.()
      })
  }, [notesSourceText])

  const handleFileSelect = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  const handleGenerate = async () => {
    setErrorMsg('')
    setPhase('working')

    if (mode === 'topic' && !topic.trim()) {
      setErrorMsg('Please type a topic first.')
      setPhase('idle')
      return
    }
    if (mode === 'file' && !file) {
      setErrorMsg('Please choose a PDF or image file first.')
      setPhase('idle')
      return
    }

    try {
      let sourceText
      let effectiveTopic = topic

      if (mode === 'file') {
        setPhaseLabel('Reading file…')
        sourceText     = await extractTextFromFile(file, setPhaseLabel)
        effectiveTopic = file.name.replace(/\.[^.]+$/, '')
      }

      setPhaseLabel('Generating questions with AI…')
      const result = await generateMCQsWithAI({
        topic:      effectiveTopic,
        count:      Number(count) || 5,
        sourceText,
      })

      // Paste DIRECTLY to the MCQ box — no review/verify step
      onAccept(result)
      setPhase('done')
      setTopic('')
      setFile(null)
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setPhase('error')
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">✨</div>
        <h2>Generate from Topic (AI)</h2>
      </div>
      <div className="card-body">

        {!supabaseConfigured && (
          <div className="status-box info" style={{ marginBottom: 12 }}>
            AI generation needs Supabase configured — see src/lib/supabase.js.
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${mode === 'topic' ? 'active' : ''}`}
            onClick={() => { setMode('topic'); setErrorMsg('') }}
          >
            Type a Topic
          </button>
          <button
            className={`tab ${mode === 'file' ? 'active' : ''}`}
            onClick={() => { setMode('file'); setErrorMsg('') }}
          >
            Upload PDF / Image
          </button>
        </div>

        {mode === 'topic' ? (
          <div className="row2">
            <div className="field" style={{ gridColumn: 'span 1' }}>
              <label>Topic</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Postpartum Hemorrhage"
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            <div className="field">
              <label># Questions</label>
              <input
                type="number" min="1" max="10"
                value={count}
                onChange={e => setCount(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div>
            <label
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              style={file ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
            >
              <span className="uz-icon">{file ? '✅' : '📄'}</span>
              <span>{file ? file.name : 'Click to choose a PDF or image file'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            <div className="field" style={{ marginTop: 10, maxWidth: 120 }}>
              <label># Questions</label>
              <input
                type="number" min="1" max="10"
                value={count}
                onChange={e => setCount(e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          className="gen-btn"
          style={{ marginTop: 10, background: 'linear-gradient(135deg, #5B3FBF 0%, #7C5CD9 100%)' }}
          onClick={handleGenerate}
          disabled={isLoading || !supabaseConfigured}
        >
          {isLoading ? `⏳  ${phaseLabel || 'Working…'}` : '✨  Generate MCQs — paste directly to box below'}
        </button>

        {phase === 'done' && (
          <div className="status-box ok" style={{ marginTop: 10 }}>
            ✓ MCQs generated and added to the box below — review and edit before generating the paper.
          </div>
        )}

        {phase === 'error' && (
          <div className="status-box err" style={{ marginTop: 10 }}>⚠ {errorMsg}</div>
        )}

        <p className="hint" style={{ marginTop: 8 }}>
          AI drafts MCQs directly into your paste box below. Always review before using on a real exam.
        </p>
      </div>
    </div>
  )
}
