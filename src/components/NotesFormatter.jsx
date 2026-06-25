/**
 * NotesFormatter.jsx
 * Voice: language selector (English/Urdu) + Question/Answer buttons for structured dictation
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { parseNotes }          from '../utils/notesParser'
import { downloadNotesDocx }   from '../utils/formatNotesDocx'
import { downloadNotesPdf }    from '../utils/formatNotesPdf'
import { saveNote }            from '../utils/notesLogging'
import NotesPreviewModal       from './NotesPreviewModal'
import { supabaseConfigured }  from '../lib/supabase'

// ── Voice hook ────────────────────────────────────────────────────────────────
function useSpeechInput(onResult) {
  const recogRef    = useRef(null)
  const activeRef   = useRef(false)
  const finalAccRef = useRef('')
  const langRef     = useRef('ur-PK')
  const [listening, setListening] = useState(false)

  const startRecog = useCallback((onResultCb, lang) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const r          = new SR()
    r.continuous     = true
    r.interimResults = true
    r.lang           = lang
    recogRef.current = r

    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalAccRef.current += t + ' '
        } else {
          interim += t
        }
      }
      onResultCb(finalAccRef.current, interim)
    }

    r.onend = () => {
      if (activeRef.current) {
        try { r.start() } catch (_) {
          setTimeout(() => { if (activeRef.current) startRecog(onResultCb, langRef.current) }, 200)
        }
      } else {
        setListening(false)
      }
    }

    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'network') {
        // fallback to en-US silently
        setTimeout(() => { if (activeRef.current) startRecog(onResultCb, 'en-US') }, 200)
        return
      }
      activeRef.current = false
      setListening(false)
    }

    r.start()
  }, [])

  const start = useCallback((onResultCb, lang) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input needs Chrome or Edge browser.'); return }
    if (activeRef.current) {
      activeRef.current = false
      recogRef.current?.stop()
      setListening(false)
    }
    langRef.current     = lang
    activeRef.current   = true
    finalAccRef.current = ''
    setListening(true)
    startRecog(onResultCb, lang)
  }, [startRecog])

  const stop = useCallback(() => {
    activeRef.current = false
    recogRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, start, stop }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NotesFormatter({ adminPassword }) {
  const [topic,       setTopic]       = useState('')
  const [authorName,  setAuthorName]  = useState('')
  const [institution, setInstitution] = useState('HBS College of Nursing Islamabad')
  const [noteDate,    setNoteDate]    = useState('')
  const [rawText,     setRawText]     = useState('')
  const [interimText, setInterimText] = useState('')
  const [activeLang,  setActiveLang]  = useState(null)  // 'ur' | 'en' | null
  const [qCount,      setQCount]      = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [status,      setStatus]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showSaveGate,setShowSaveGate]= useState(false)
  const [savePassword,setSavePassword]= useState('')
  const [savePassErr, setSavePassErr] = useState(false)
  const textareaRef = useRef(null)

  const blocks = useMemo(() => parseNotes(rawText), [rawText])
  const buildData = () => ({ topic, authorName, institution, noteDate, rawText, blocks })

  const baseTextRef = useRef('')  // text in box at moment voice started/question inserted

  const handleVoiceResult = useCallback((final, interim) => {
    setRawText(baseTextRef.current + final.trimEnd())
    setInterimText(interim)
  }, [])

  const { listening, start, stop } = useSpeechInput(handleVoiceResult)

  const startLang = (lang) => {
    setActiveLang(lang)
    // snapshot current text as base before starting voice
    baseTextRef.current = rawText ? rawText.trimEnd() + ' ' : ''
    start(handleVoiceResult, lang === 'ur' ? 'ur-PK' : 'en-US')
  }

  const stopVoice = () => {
    stop()
    setActiveLang(null)
    setInterimText('')
  }

  // Insert question number — also resets base so next voice appends after it
  const insertQuestion = () => {
    const newQ = qCount + 1
    setQCount(newQ)
    const newBase = rawText.trimEnd() + '\n' + newQ + '. '
    setRawText(newBase)
    baseTextRef.current = newBase  // voice will append after the number
    textareaRef.current?.focus()
  }

  // Insert answer label — also resets base
  const insertAnswer = () => {
    const label = activeLang === 'ur' ? '\nجواب: ' : '\nAnswer: '
    const newBase = rawText.trimEnd() + label
    setRawText(newBase)
    baseTextRef.current = newBase  // voice will append after the label
    textareaRef.current?.focus()
  }

  const handleDownload = async (format) => {
    if (!rawText.trim()) { setStatus({ type: 'err', msg: 'Add some content first.' }); return }
    setDownloading(true)
    setStatus({ type: 'info', msg: `Building ${format.toUpperCase()}…` })
    try {
      const data     = buildData()
      const safeName = (topic || 'Notes').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')
      if (format === 'docx') await downloadNotesDocx(data, `${safeName}_Notes.docx`)
      else                   await downloadNotesPdf(data,  `${safeName}_Notes.pdf`)
      setStatus({ type: 'ok', msg: `✓ ${format.toUpperCase()} downloaded.` })
    } catch (e) {
      setStatus({ type: 'err', msg: 'Download failed: ' + e.message })
    }
    setDownloading(false)
  }

  const handleSaveRequest = () => {
    if (!rawText.trim()) { setStatus({ type: 'err', msg: 'Nothing to save.' }); return }
    setShowSaveGate(true); setSavePassword(''); setSavePassErr(false)
  }

  const handleSaveConfirm = async () => {
    if (savePassword !== adminPassword) { setSavePassErr(true); return }
    setShowSaveGate(false); setSaving(true)
    setStatus({ type: 'info', msg: 'Saving…' })
    const result = await saveNote(buildData())
    setSaving(false)
    setStatus(result
      ? { type: 'ok',  msg: '✓ Saved to Notes Library.' }
      : { type: 'err', msg: 'Save failed — check Supabase config.' }
    )
  }

  const btnStyle = (active) => ({
    background: active ? 'var(--navy)' : 'none',
    color: active ? '#fff' : 'var(--navy)',
    border: '1.5px solid var(--navy)',
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  })

  return (
    <div>
      <div className="app-body">
        <div className="two-col">

          {/* LEFT */}
          <div className="left-panel">
            <div className="card">
              <div className="card-head"><div className="card-head-icon">📋</div><h2>Document Header</h2></div>
              <div className="card-body">
                <div className="field"><label>Topic / Subject</label>
                  <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Postpartum Care" /></div>
                <div className="field"><label>Your Name</label>
                  <input value={authorName} onChange={e=>setAuthorName(e.target.value)} placeholder="e.g. Muhammad Imran" /></div>
                <div className="field"><label>Institution</label>
                  <input value={institution} onChange={e=>setInstitution(e.target.value)} /></div>
                <div className="field"><label>Date (optional)</label>
                  <input value={noteDate} onChange={e=>setNoteDate(e.target.value)} placeholder="e.g. June 2025" /></div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><div className="card-head-icon">💡</div><h2>How to Use</h2></div>
              <div className="card-body">
                <p className="hint" style={{marginBottom:6}}>1. Click <strong>🇬🇧 English</strong> or <strong>🇵🇰 اردو</strong> to start speaking.</p>
                <p className="hint" style={{marginBottom:6}}>2. Speak your question, then click <strong>+ Question</strong> to number it.</p>
                <p className="hint" style={{marginBottom:6}}>3. Speak your answer, then click <strong>+ Answer</strong> to label it.</p>
                <p className="hint">4. Click <strong>⏹ Stop</strong> when done.</p>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <div className="card">
              <div className="card-head">
                <div className="card-head-icon">📝</div>
                <h2>Your Notes</h2>
              </div>
              <div className="card-body">

                {/* Voice controls */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                  {/* Language buttons */}
                  <button
                    style={btnStyle(activeLang === 'en')}
                    onClick={() => activeLang === 'en' ? stopVoice() : startLang('en')}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    style={btnStyle(activeLang === 'ur')}
                    onClick={() => activeLang === 'ur' ? stopVoice() : startLang('ur')}
                  >
                    🇵🇰 اردو
                  </button>

                  {/* Question / Answer buttons — only when listening */}
                  {listening && (
                    <>
                      <button
                        style={{ background:'#0B2545', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}
                        onClick={insertQuestion}
                      >
                        + Question
                      </button>
                      <button
                        style={{ background:'#1A6B3C', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}
                        onClick={insertAnswer}
                      >
                        + Answer
                      </button>
                    </>
                  )}

                  {/* Stop */}
                  {listening && (
                    <button
                      style={{ background:'#B91C1C', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}
                      onClick={stopVoice}
                    >
                      ⏹ Stop
                    </button>
                  )}

                  {/* Clear */}
                  {rawText && !listening && (
                    <button
                      onClick={() => { setRawText(''); setQCount(0); setStatus(null) }}
                      style={{ background:'none', border:'1px solid #FFCDD2', color:'#B91C1C', borderRadius:6, padding:'5px 10px', fontSize:12, fontWeight:700, cursor:'pointer' }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>

                {/* Listening status */}
                {listening && (
                  <div className="status-box info" style={{marginBottom:10}}>
                    🎤 Listening in {activeLang === 'ur' ? 'Urdu 🇵🇰' : 'English 🇬🇧'}…
                    {interimText && <span style={{color:'#888'}}> — {interimText}</span>}
                  </div>
                )}

                <div className="field">
                  <textarea
                    ref={textareaRef}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={`Click 🇬🇧 English or 🇵🇰 اردو to start voice input.\nOr paste notes manually in any format.`}
                    style={{ minHeight: 340, direction: 'auto' }}
                  />
                </div>

                {blocks.length > 0 && (
                  <div className="parsed-count">
                    ✓ {blocks.filter(b=>b.type==='qa').length} Q&amp;A blocks
                    {blocks.filter(b=>b.type==='heading').length > 0 &&
                      ` + ${blocks.filter(b=>b.type==='heading').length} headings`}
                  </div>
                )}
              </div>
            </div>

            <div className="action-row" style={{flexWrap:'wrap', gap:10}}>
              <button className="preview-btn" onClick={() => {
                if (!rawText.trim() && !topic) { setStatus({type:'err',msg:'Add content first.'}); return }
                setStatus(null); setShowPreview(true)
              }}>👁 Preview</button>
              <button className="gen-btn" onClick={()=>handleDownload('docx')} disabled={downloading}>
                {downloading?'⏳…':'⬇ Word (.docx)'}
              </button>
              <button className="gen-btn pdf-btn" onClick={()=>handleDownload('pdf')} disabled={downloading}>
                {downloading?'⏳…':'⬇ PDF (.pdf)'}
              </button>
              <button className="gen-btn"
                style={{background:'linear-gradient(135deg,#5B3FBF,#7C5CD9)',flex:'0 0 auto'}}
                onClick={handleSaveRequest}
                disabled={saving || !supabaseConfigured}>
                {saving?'⏳ Saving…':'📚 Save to Library'}
              </button>
            </div>

            {status && <div className={`status-box ${status.type}`} style={{marginTop:10}}>{status.msg}</div>}
          </div>
        </div>
      </div>

      {showPreview && (
        <NotesPreviewModal
          data={{topic,authorName,institution,noteDate}}
          blocks={blocks}
          onClose={()=>setShowPreview(false)}
        />
      )}

      {showSaveGate && (
        <div className="modal-backdrop" onClick={()=>setShowSaveGate(false)}>
          <div className="modal-box" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal-head">
              <h3>🔒 Save to Library</h3>
              <button className="modal-close" onClick={()=>setShowSaveGate(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:13,color:'#3D5273',marginBottom:12}}>Enter admin password to save.</p>
              <input type="password" className="admin-input" placeholder="Admin password"
                value={savePassword}
                onChange={e=>{setSavePassword(e.target.value);setSavePassErr(false)}}
                onKeyDown={e=>e.key==='Enter'&&handleSaveConfirm()} autoFocus />
              {savePassErr && <div className="admin-err" style={{marginTop:8}}>Incorrect password.</div>}
              <button className="admin-btn" style={{marginTop:14}} onClick={handleSaveConfirm}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
