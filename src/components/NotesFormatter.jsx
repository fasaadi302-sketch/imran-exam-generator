/**
 * NotesFormatter.jsx
 * Notes Formatter — paste any format, preview, download Word/PDF, save to library.
 * AI removed. Voice input kept.
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
  const activeRef   = useRef(false)   // true while user wants mic ON
  const finalAccRef = useRef('')      // accumulates final text across restarts
  const [listening, setListening] = useState(false)

  const startRecog = useCallback((onResultCb) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const r          = new SR()
    r.continuous     = true
    r.interimResults = true
    r.lang           = 'ur'
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
      // Auto-restart as long as user hasn't clicked Stop
      if (activeRef.current) {
        try { r.start() } catch (_) {
          // If same instance can't restart, create a new one
          setTimeout(() => { if (activeRef.current) startRecog(onResultCb) }, 200)
        }
      } else {
        setListening(false)
      }
    }

    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'network') {
        // ur-PK blocked — restart with en-US silently
        r.lang = 'en-US'
        return
      }
      activeRef.current = false
      setListening(false)
    }

    r.start()
  }, [])

  const toggle = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input needs Chrome or Edge browser.'); return }

    if (activeRef.current) {
      // Stop
      activeRef.current = false
      recogRef.current?.stop()
      setListening(false)
    } else {
      // Start fresh
      activeRef.current   = true
      finalAccRef.current = ''
      setListening(true)
      startRecog(onResult)
    }
  }, [onResult, startRecog])

  return { listening, toggle }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NotesFormatter({ adminPassword }) {
  const [topic,       setTopic]       = useState('')
  const [authorName,  setAuthorName]  = useState('')
  const [institution, setInstitution] = useState('HBS College of Nursing Islamabad')
  const [noteDate,    setNoteDate]    = useState('')
  const [rawText,     setRawText]     = useState('')
  const [interimText, setInterimText] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [status,      setStatus]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showSaveGate,setShowSaveGate]= useState(false)
  const [savePassword,setSavePassword]= useState('')
  const [savePassErr, setSavePassErr] = useState(false)

  const blocks = useMemo(() => parseNotes(rawText), [rawText])

  const buildData = () => ({ topic, authorName, institution, noteDate, rawText, blocks })

  const handleVoiceResult = useCallback((final, interim) => {
    setRawText(final.trimEnd())
    setInterimText(interim)
  }, [])
  const { listening, toggle: toggleVoice } = useSpeechInput(handleVoiceResult)

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
                <p className="hint" style={{marginBottom:8}}>
                  <strong>Any format accepted.</strong> Paste your notes in any style — numbered, Q&amp;A, plain paragraphs, Urdu, English, or mixed.
                </p>
                <p className="hint">
                  Use the <strong>🎤 Voice</strong> button to dictate notes directly (works in Chrome/Edge).
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <div className="card">
              <div className="card-head">
                <div className="card-head-icon">📝</div>
                <h2>Your Notes</h2>
                <button onClick={toggleVoice}
                  style={{ marginLeft:'auto', background: listening ? '#B91C1C' : 'var(--navy)',
                    color:'#fff', border:'none', borderRadius:6, padding:'5px 12px',
                    fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  {listening ? '⏹ Stop' : '🎤 Voice'}
                </button>
                {rawText && (
                  <button onClick={() => { setRawText(''); setStatus(null) }}
                    style={{ marginLeft:8, background:'none', border:'1px solid #FFCDD2',
                      color:'#B91C1C', borderRadius:6, padding:'5px 10px',
                      fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    ✕ Clear
                  </button>
                )}
              </div>
              <div className="card-body">
                {listening && (
                  <div className="status-box info" style={{marginBottom:10}}>
                    🎤 Listening… speak in Urdu or English
                    {interimText && <span style={{color:'#888'}}> — {interimText}</span>}
                  </div>
                )}
                <div className="field">
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={`Paste your notes in any format — numbered, Q&A, plain text, Urdu, English, or mixed.\n\nExamples:\n1. What is PPH?\nBlood loss more than 500ml...\n\nQ: What are the 4 T's?\nA: Tone, Trauma, Tissue, Thrombin`}
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
