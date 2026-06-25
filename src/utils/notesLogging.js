/**
 * notesLogging.js
 * Save and retrieve formatted notes from the `saved_notes` Supabase table.
 * All functions are safe to call even if Supabase isn't configured — they
 * silently return null/[] without throwing.
 */

import { supabase, supabaseConfigured } from '../lib/supabase'

/**
 * Save a formatted note to the private library.
 *
 * @param {{
 *   topic: string,
 *   authorName: string,
 *   institution: string,
 *   noteDate: string,
 *   rawText: string,
 *   blocks: object[],
 * }} data
 * @returns {Promise<{ id: string }|null>}
 */
export async function saveNote(data) {
  if (!supabaseConfigured) return null
  try {
    const { data: row, error } = await supabase
      .from('saved_notes')
      .insert({
        topic:       data.topic       || 'Untitled',
        author_name: data.authorName  || '',
        institution: data.institution || '',
        note_date:   data.noteDate    || null,
        raw_text:    data.rawText     || '',
        blocks:      data.blocks      || [],
      })
      .select('id')
      .single()

    if (error) throw error
    return row
  } catch (e) {
    console.warn('[notesLogging] save failed:', e?.message || e)
    return null
  }
}

/**
 * Fetch all saved notes (most recent first).
 * @returns {Promise<object[]>}
 */
export async function fetchNotes() {
  if (!supabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('saved_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    return data || []
  } catch (e) {
    console.warn('[notesLogging] fetch failed:', e?.message || e)
    return []
  }
}

/**
 * Delete a saved note by id.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteNote(id) {
  if (!supabaseConfigured) return false
  try {
    const { error } = await supabase.from('saved_notes').delete().eq('id', id)
    if (error) throw error
    return true
  } catch (e) {
    console.warn('[notesLogging] delete failed:', e?.message || e)
    return false
  }
}
