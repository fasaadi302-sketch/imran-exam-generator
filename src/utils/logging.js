/**
 * logging.js — writes records to Supabase.
 *
 * Every function here is safe to call even when Supabase isn't configured:
 * it simply does nothing and never throws, so the app keeps working.
 */

import { supabase, supabaseConfigured } from '../lib/supabase'

// Guard so React StrictMode (which mounts twice in dev) only logs one visit.
let visitLogged = false

/** Log a single page visit with basic, non-personal browser info. */
export async function logPageVisit() {
  if (!supabaseConfigured || visitLogged) return
  visitLogged = true
  try {
    await supabase.from('page_visits').insert({
      user_agent: navigator.userAgent,
      language:   navigator.language,
      platform:   navigator.platform,
      screen:     `${window.screen.width}x${window.screen.height}`,
      referrer:   document.referrer || null,
      timezone:   Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  } catch (e) {
    console.warn('[logging] page visit not saved:', e?.message || e)
  }
}

/**
 * Log a generated paper (metadata + the actual questions).
 *
 * @param {object} data   the same object passed to the generators
 * @param {'docx'|'pdf'} format
 */
export async function logGeneratedPaper(data, format) {
  if (!supabaseConfigured) return
  try {
    await supabase.from('generated_papers').insert({
      institution:      data.institution,
      session:          data.session,
      paper:            data.paper,
      total_marks:      String(data.totalMarks ?? ''),
      time_allowed:     data.time,
      exam_date:        data.examDate || null,
      mcq_count:        data.mcqs?.length || 0,
      subjective_count: data.subs?.length || 0,
      format,
      mcqs:             data.mcqs || [],
      subjectives:      data.subs || [],
      user_agent:       navigator.userAgent,
    })
  } catch (e) {
    console.warn('[logging] paper not saved:', e?.message || e)
  }
}
