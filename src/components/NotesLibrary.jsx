/**
 * NotesLibrary.jsx
 * Password-protected notes library tab.
 * Lists saved notes from Supabase, allows preview, re-download,
 * delete, and "Generate MCQ Paper from this note."
 *
 * Props:
 *   adminPassword       — string, checked on unlock
 *   onSendToMCQ(text)   — callback to send note content to MCQ generator
 */

import { useState, useEffect } from 'react'
import { fetchNotes, deleteNote } from '../utils/notesLogging'
import { downloadNotesDocx }     from '../utils/formatNotesDocx'
import { downloadNotesPdf }      from '../utils/formatNotesPdf'
import { supabaseConfigured }    from '../lib/supabase'
import NotesPreviewModal         from './NotesPreviewModal'

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function NotesLibrary({ adminPassword, onSendToMCQ }) {
  const [unlocked,  setUnlocked]  = useState(false)
  const [pwInput,   setPwInput]   = useState('')
  const [pwError,   setPwError]   = useState(false)
  const [notes,     setNotes]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [loadErr,   setLoadErr]   = useState(null)
  const [search,    setSearch]    = useState('')
  const [openNote,  setOpenNote]  = useState(null)   // note object for preview modal
  const [deleting,  setDeleting]  = useState(null)   // id being deleted

  const tryUnlock = () => {
    if (pwInput === adminPassword) { setUnlocked(true); setPwError(false) }
    else { setPwError(true) }
  }

  useEffect(() => {
    if (!unlocked || !supabaseConfigured) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setLoadErr(null)
      const data = await fetchNotes()
      if (!cancelled) { setNotes(data); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [unlocked])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note from the library? This cannot be undone.')) return
    setDeleting(id)
    const ok = await deleteNote(id)
    if (ok) setNotes(prev => prev.filter(n => n.id !== id))
    setDeleting(null)
  }

  const handleDownload = async (note, format) => {
    const data = {
      topic:       note.topic,
      authorName:  note.author_name,
      institution: note.institution,
      noteDate:    note.note_date,
      rawText:     note.raw_text,
      blocks:      note.blocks || [],
    }
    const safeName = (note.topic || 'Notes').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')
    if (format === 'docx') await downloadNotesDocx(data, `${safeName}_Notes.docx`)
    else downloadNotesPdf(data, `${safeName}_Notes.pdf`)
  }

  const filtered = notes.filter(n => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [n.topic, n.author_name, n.institution]
      .filter(Boolean).join(' ').toLowerCase().includes(q)
  })

  // ── Not configured ────────────────────────────────────────────────────────
  if (!supabaseConfigured) {
    return (
      <div className="admin-wrap">
        <div className="admin-card admin-gate">
          <h2>Notes Library</h2>
          <p className="admin-note">Supabase isn't configured yet.</p>
        </div>
      </div>
    )
  }

  // ── Locked ────────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="admin-wrap">
        <div className="admin-card admin-gate">
          <h2>🔒 Notes Library</h2>
          <p className="admin-note">This is your private notes library. Enter your admin password to access it.</p>
          <input
            type="password"
            className="admin-input"
            placeholder="Admin password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false) }}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            autoFocus
          />
          {pwError && <div className="admin-err" style={{ marginTop: 8 }}>Incorrect password.</div>}
          <button className="admin-btn" onClick={tryUnlock}>Unlock</button>
        </div>
      </div>
    )
  }

  // ── Unlocked ──────────────────────────────────────────────────────────────
  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>📚 Notes Library</h1>
        <span style={{ color: 'var(--text3)', fontSize: 13 }}>{notes.length} saved notes</span>
      </div>

      {loadErr && <div className="admin-err admin-block">Failed to load: {loadErr}</div>}
      {loading && <div className="admin-note admin-block">Loading…</div>}

      <div className="admin-controls">
        <input
          className="admin-input admin-search"
          placeholder="Search by topic, author, institution…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginTop: 0 }}
        />
      </div>

      {filtered.length === 0 && !loading && (
        <div className="admin-card">
          <p className="admin-note">
            {notes.length === 0
              ? 'No notes saved yet. Go to the Notes Formatter tab, write your notes, and click "Save to Library."'
              : 'No notes match your search.'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(note => (
          <div key={note.id} className="admin-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)', marginBottom: 4 }}>
                  {note.topic || 'Untitled'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {[note.author_name, note.institution, note.note_date].filter(Boolean).join('  ·  ')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                  Saved: {fmtDate(note.created_at)}
                  {note.blocks && ` · ${(note.blocks || []).filter(b => b.type === 'qa').length} Q&A blocks`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="admin-link-btn"
                  onClick={() => setOpenNote(note)}
                >
                  👁 Preview
                </button>
                <button
                  className="admin-link-btn"
                  onClick={() => handleDownload(note, 'docx')}
                >
                  ⬇ Word
                </button>
                <button
                  className="admin-link-btn"
                  onClick={() => handleDownload(note, 'pdf')}
                >
                  ⬇ PDF
                </button>
                {onSendToMCQ && (
                  <button
                    className="admin-link-btn"
                    style={{ color: 'var(--green)' }}
                    onClick={() => onSendToMCQ(note.raw_text || '')}
                  >
                    🤖 Make MCQ Paper
                  </button>
                )}
                <button
                  className="admin-link-btn"
                  style={{ color: 'var(--red)' }}
                  onClick={() => handleDelete(note.id)}
                  disabled={deleting === note.id}
                >
                  {deleting === note.id ? '⏳' : '🗑 Delete'}
                </button>
              </div>
            </div>

            {/* Note snippet */}
            {note.raw_text && (
              <div style={{
                marginTop: 10,
                fontSize: 12,
                color: 'var(--text3)',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                maxHeight: 60,
                overflow: 'hidden',
                direction: /[\u0600-\u06FF]/.test(note.raw_text) ? 'rtl' : 'ltr',
              }}>
                {note.raw_text.slice(0, 200)}{note.raw_text.length > 200 ? '…' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {openNote && (
        <NotesPreviewModal
          data={{
            topic:       openNote.topic,
            authorName:  openNote.author_name,
            institution: openNote.institution,
            noteDate:    openNote.note_date,
          }}
          blocks={openNote.blocks || []}
          onClose={() => setOpenNote(null)}
        />
      )}
    </div>
  )
}
