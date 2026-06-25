/**
 * notesParser.js
 * Parses notes text into structured blocks.
 *
 * For truly "any format" input, the NotesFormatter component first sends
 * the raw text through the AI normalizer (normalizeNotesWithAI) which
 * converts ANY format into a clean numbered Q&A format. Then this parser
 * processes that clean output.
 *
 * This parser also handles clean input directly (numbered, Q:/A:, headings,
 * plain paragraphs) as a fast path when AI is not needed or available.
 */

// ── Language detection ───────────────────────────────────────────────────────
export function isUrdu(text = '') {
  const u = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length
  const t = text.replace(/\s/g, '').length
  return t > 0 && u / t > 0.2
}

export function detectDir(text = '') {
  return isUrdu(text) ? 'rtl' : 'ltr'
}

// ── Main parser ──────────────────────────────────────────────────────────────
export function parseNotes(raw) {
  if (!raw || !raw.trim()) return []

  const lines = raw.split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }

    // ── Numbered: 15.1  Q text / 1. Q text / 1) Q text ─────────────────────
    const numMatch = line.match(/^(?:Q\s*)?(\d{1,2}(?:\.\d{1,2})?)[.)]\s+(.+)/)
    if (numMatch) {
      const num         = numMatch[1]
      const questionRaw = numMatch[2].trim()

      // Collect continuation lines for question (indented) and answer
      const questionLines = [questionRaw]
      const answerLines   = []
      i++

      // First collect any continuation of the question (indented lines
      // before the first A: or answer marker)
      let inAnswer = false
      while (i < lines.length) {
        const next = lines[i]
        const nextT = next.trim()

        if (!nextT) { i++; if (inAnswer) break; continue }

        // Stop at next numbered item or Q: label
        if (/^(?:Q\s*)?\d{1,2}(?:\.\d{1,2})?[.)]\s+/.test(nextT)) break
        if (/^Q\s*:/i.test(nextT)) break
        if (/^#{1,3}\s/.test(nextT)) break

        // "A:" marks start of answer
        if (/^A\s*:/i.test(nextT)) {
          inAnswer = true
          const aText = nextT.replace(/^A\s*:\s*/i, '').trim()
          if (aText) answerLines.push(aText)
          i++
          continue
        }

        if (inAnswer) {
          answerLines.push(nextT)
        } else {
          answerLines.push(nextT)   // treat everything after first line as answer
        }
        i++
      }

      const question = questionLines.join(' ').trim()
      const answer   = answerLines.join(' ').trim()
      const dir      = detectDir(question + ' ' + answer)
      blocks.push({ type: 'qa', num, question, answer, dir })
      continue
    }

    // ── Q: / A: labels ───────────────────────────────────────────────────────
    if (/^Q\s*:/i.test(line)) {
      const question    = line.replace(/^Q\s*:\s*/i, '').trim()
      const answerLines = []
      i++

      while (i < lines.length) {
        const next  = lines[i].trim()
        if (/^A\s*:/i.test(next)) {
          answerLines.push(next.replace(/^A\s*:\s*/i, '').trim())
          i++
          while (i < lines.length) {
            const al = lines[i].trim()
            if (!al) { i++; break }
            if (/^Q\s*:/i.test(al) || /^#{1,3}\s/.test(al) ||
                /^(?:Q\s*)?\d{1,2}(?:\.\d{1,2})?[.)]\s+/.test(al)) break
            answerLines.push(al)
            i++
          }
          break
        }
        if (!next) { i++; break }
        if (/^Q\s*:/i.test(next)) break
        answerLines.push(next)
        i++
      }

      const answer = answerLines.join(' ').trim()
      const dir    = detectDir(question + ' ' + answer)
      blocks.push({ type: 'qa', question, answer, dir })
      continue
    }

    // ── Heading: ## / ### ────────────────────────────────────────────────────
    const headingMatch = line.match(/^#{1,3}\s+(.+)/)
    if (headingMatch) {
      const text = headingMatch[1].trim()
      blocks.push({ type: 'heading', answer: text, dir: detectDir(text) })
      i++
      continue
    }

    // ── Bold heading (markdown **text**) ─────────────────────────────────────
    const boldMatch = line.match(/^\*\*(.+)\*\*$/)
    if (boldMatch) {
      const text = boldMatch[1].trim()
      blocks.push({ type: 'heading', answer: text, dir: detectDir(text) })
      i++
      continue
    }

    // ── Plain paragraph ───────────────────────────────────────────────────────
    const paraLines = [line]
    i++
    while (i < lines.length) {
      const next = lines[i].trim()
      if (!next) { i++; break }
      if (/^(?:Q\s*)?\d{1,2}(?:\.\d{1,2})?[.)]\s+/.test(next)) break
      if (/^Q\s*:/i.test(next)) break
      if (/^#{1,3}\s/.test(next)) break
      paraLines.push(next)
      i++
    }

    const paraText = paraLines.join(' ').trim()
    if (paraText) {
      blocks.push({ type: 'para', answer: paraText, dir: detectDir(paraText) })
    }
  }

  return blocks
}

/**
 * Normalize ANY format text into clean numbered Q&A using AI.
 * This is the "any format" fix — sends raw user input to z.ai via the
 * normalize-notes Edge Function and returns a clean parseable string.
 *
 * @param {string} rawText
 * @param {Function} supabaseFunctionsInvoke  — supabase.functions.invoke
 * @returns {Promise<string>} normalized text
 */
export async function normalizeNotesWithAI(rawText, supabaseFunctionsInvoke) {
  const { data, error } = await supabaseFunctionsInvoke('normalize-notes', {
    body: { rawText },
  })
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Normalization failed')
  }
  return data.text || rawText
}
