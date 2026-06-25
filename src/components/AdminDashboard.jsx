/**
 * AdminDashboard.jsx
 * Password-protected dashboard at /#/admin (and /admin where the host allows).
 * Lists page_visits and generated_papers from Supabase with search/filter,
 * full paper viewing, and a visits-over-time chart.
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

// Change this to update the admin password.
const ADMIN_PASSWORD = 'fasaadi420'

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function shortUA(ua = '') {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Other'
}

export default function AdminDashboard() {
  const [unlocked, setUnlocked] = useState(false)
  const [pwInput, setPwInput]   = useState('')
  const [pwError, setPwError]   = useState(false)

  const [tab, setTab]       = useState('papers')   // 'papers' | 'visits' | 'notes'
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState(null)
  const [visits, setVisits]   = useState([])
  const [papers, setPapers]   = useState([])
  const [notes,  setNotes]    = useState([])

  const [search, setSearch]       = useState('')
  const [formatFilter, setFormatFilter] = useState('all')
  const [openPaper, setOpenPaper] = useState(null)

  // ── unlock ──────────────────────────────────────────────────────────────────
  const tryUnlock = () => {
    if (pwInput === ADMIN_PASSWORD) {
      setUnlocked(true); setPwError(false)
    } else {
      setPwError(true)
    }
  }

  // ── load data once unlocked ──────────────────────────────────────────────────
  useEffect(() => {
    if (!unlocked || !supabaseConfigured) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setLoadErr(null)
      try {
        const [v, p, n] = await Promise.all([
          supabase.from('page_visits').select('*').order('visited_at', { ascending: false }).limit(2000),
          supabase.from('generated_papers').select('*').order('created_at', { ascending: false }).limit(2000),
          supabase.from('saved_notes').select('id,topic,author_name,institution,note_date,created_at,raw_text').order('created_at', { ascending: false }).limit(500),
        ])
        if (v.error) throw v.error
        if (p.error) throw p.error
        if (!cancelled) { setVisits(v.data || []); setPapers(p.data || []); setNotes(n.data || []) }
      } catch (e) {
        if (!cancelled) setLoadErr(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [unlocked])

  // ── derived stats ─────────────────────────────────────────────────────────────
  const visitsByDay = useMemo(() => {
    const map = new Map()
    for (const v of visits) {
      const day = (v.visited_at || '').slice(0, 10)
      if (!day) continue
      map.set(day, (map.get(day) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30)
  }, [visits])
  const maxDay = Math.max(1, ...visitsByDay.map(([, n]) => n))

  const todayStr = new Date().toISOString().slice(0, 10)
  const visitsToday = visits.filter(v => (v.visited_at || '').slice(0, 10) === todayStr).length
  const papersToday = papers.filter(p => (p.created_at || '').slice(0, 10) === todayStr).length

  const filteredPapers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return papers.filter(p => {
      if (formatFilter !== 'all' && p.format !== formatFilter) return false
      if (!q) return true
      return [p.paper, p.session, p.institution, p.format]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [papers, search, formatFilter])

  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return visits
    return visits.filter(v =>
      [v.user_agent, v.platform, v.timezone, v.language]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [visits, search])

  // ── not configured ────────────────────────────────────────────────────────────
  if (!supabaseConfigured) {
    return (
      <div className="admin-wrap">
        <div className="admin-card admin-gate">
          <h2>Admin Dashboard</h2>
          <p className="admin-note">
            Supabase isn't configured yet. Add your Project URL and anon key in
            <code> src/lib/supabase.js</code>, run <code>supabase/schema.sql</code>,
            then reload this page.
          </p>
          <a className="admin-back" href="/">← Back to generator</a>
        </div>
      </div>
    )
  }

  // ── locked ──────────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="admin-wrap">
        <div className="admin-card admin-gate">
          <h2>🔒 Admin Access</h2>
          <p className="admin-note">Enter the password to view the dashboard.</p>
          <input
            type="password"
            className="admin-input"
            placeholder="Password"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false) }}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            autoFocus
          />
          {pwError && <div className="admin-err">Incorrect password.</div>}
          <button className="admin-btn" onClick={tryUnlock}>Unlock</button>
          <a className="admin-back" href="/">← Back to generator</a>
        </div>
      </div>
    )
  }

  // ── unlocked dashboard ────────────────────────────────────────────────────────
  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>Dashboard</h1>
        <a className="admin-back" href="/">← Back to generator</a>
      </div>

      {loadErr && <div className="admin-err admin-block">Failed to load data: {loadErr}</div>}
      {loading && <div className="admin-note admin-block">Loading…</div>}

      {/* stat cards */}
      <div className="admin-stats">
        <div className="admin-stat"><span>{visits.length}</span>Total visits</div>
        <div className="admin-stat"><span>{visitsToday}</span>Visits today</div>
        <div className="admin-stat"><span>{papers.length}</span>Papers generated</div>
        <div className="admin-stat"><span>{papersToday}</span>Papers today</div>
        <div className="admin-stat"><span>{notes.length}</span>Saved notes</div>
      </div>

      {/* visits over time */}
      <div className="admin-card">
        <h3 className="admin-h3">Visits over time (last 30 days)</h3>
        {visitsByDay.length === 0 ? (
          <p className="admin-note">No visits recorded yet.</p>
        ) : (
          <div className="admin-chart">
            {visitsByDay.map(([day, n]) => (
              <div className="admin-bar-col" key={day} title={`${day}: ${n} visits`}>
                <div className="admin-bar" style={{ height: `${(n / maxDay) * 100}%` }}>
                  <span className="admin-bar-val">{n}</span>
                </div>
                <span className="admin-bar-day">{day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="admin-controls">
        <div className="admin-tabs">
          <button className={tab === 'papers' ? 'active' : ''} onClick={() => setTab('papers')}>
            Papers ({papers.length})
          </button>
          <button className={tab === 'visits' ? 'active' : ''} onClick={() => setTab('visits')}>
            Visits ({visits.length})
          </button>
          <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>
            Saved Notes ({notes.length})
          </button>
        </div>
        <input
          className="admin-input admin-search"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {tab === 'papers' && (
          <select className="admin-input admin-select" value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
            <option value="all">All formats</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
          </select>
        )}
      </div>

      {/* papers table */}
      {tab === 'papers' && (
        <div className="admin-card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th><th>Paper</th><th>Session</th>
                <th>MCQs</th><th>Subj.</th><th>Format</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.map(p => (
                <tr key={p.id}>
                  <td>{fmtDate(p.created_at)}</td>
                  <td>{p.paper || '—'}</td>
                  <td>{p.session || '—'}</td>
                  <td>{p.mcq_count}</td>
                  <td>{p.subjective_count}</td>
                  <td><span className={`admin-tag ${p.format}`}>{(p.format || '').toUpperCase()}</span></td>
                  <td><button className="admin-link-btn" onClick={() => setOpenPaper(p)}>View</button></td>
                </tr>
              ))}
              {filteredPapers.length === 0 && (
                <tr><td colSpan={7} className="admin-empty">No papers match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* visits table */}
      {tab === 'visits' && (
        <div className="admin-card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Date</th><th>Browser</th><th>Platform</th><th>Screen</th><th>Timezone</th><th>Lang</th></tr>
            </thead>
            <tbody>
              {filteredVisits.map(v => (
                <tr key={v.id}>
                  <td>{fmtDate(v.visited_at)}</td>
                  <td>{shortUA(v.user_agent)}</td>
                  <td>{v.platform || '—'}</td>
                  <td>{v.screen || '—'}</td>
                  <td>{v.timezone || '—'}</td>
                  <td>{v.language || '—'}</td>
                </tr>
              ))}
              {filteredVisits.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">No visits match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* saved notes table */}
      {tab === 'notes' && (
        <div className="admin-card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr><th>Saved</th><th>Topic</th><th>Author</th><th>Institution</th><th>Date</th></tr>
            </thead>
            <tbody>
              {notes
                .filter(n => {
                  const q = search.trim().toLowerCase()
                  if (!q) return true
                  return [n.topic, n.author_name, n.institution].filter(Boolean).join(' ').toLowerCase().includes(q)
                })
                .map(n => (
                  <tr key={n.id}>
                    <td>{fmtDate(n.created_at)}</td>
                    <td>{n.topic || '—'}</td>
                    <td>{n.author_name || '—'}</td>
                    <td>{n.institution || '—'}</td>
                    <td>{n.note_date || '—'}</td>
                  </tr>
                ))}
              {notes.length === 0 && (
                <tr><td colSpan={5} className="admin-empty">No saved notes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* paper detail modal */}
      {openPaper && (
        <div className="admin-modal-overlay" onClick={() => setOpenPaper(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{openPaper.paper || 'Paper'} — {openPaper.session}</h3>
              <button className="admin-close" onClick={() => setOpenPaper(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-meta">
                {openPaper.institution} · {fmtDate(openPaper.created_at)} ·
                {' '}{(openPaper.format || '').toUpperCase()} ·
                {' '}Total marks: {openPaper.total_marks} · Time: {openPaper.time_allowed}
              </p>

              <h4 className="admin-h4">MCQs ({openPaper.mcq_count})</h4>
              {(openPaper.mcqs || []).length === 0 && <p className="admin-note">None.</p>}
              <ol className="admin-qlist">
                {(openPaper.mcqs || []).map((m, i) => (
                  <li key={i}>
                    <div className="admin-q">{m.q}</div>
                    <div className="admin-opts">
                      {(m.opts || []).map((o, k) => (
                        <span key={k} className="admin-opt">{String.fromCharCode(97 + k)}) {o}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>

              <h4 className="admin-h4">Subjective ({openPaper.subjective_count})</h4>
              {(openPaper.subjectives || []).length === 0 && <p className="admin-note">None.</p>}
              <ol className="admin-qlist">
                {(openPaper.subjectives || []).map((s, i) => (
                  <li key={i}><div className="admin-q">{s}</div></li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
