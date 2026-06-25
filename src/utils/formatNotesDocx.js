/**
 * formatNotesDocx.js
 * Generates a professional two-column Word document from parsed notes.
 *
 * Features:
 * - Two-column A4 layout (no wasted space)
 * - 0.3 inch top margin, tight side margins
 * - Jameel Noori Nastaleeq font for Urdu, Times New Roman for English
 * - Proper RTL paragraph direction for Urdu
 * - Answer indented to align under question text (not under number)
 * - Section divider between title block and content
 */

import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, WidthType, BorderStyle,
  convertInchesToTwip, ColumnBreak,
} from 'docx'
import { saveAs } from 'file-saver'

// ── Constants ────────────────────────────────────────────────────────────────
const FONT_EN   = 'Times New Roman'
const FONT_UR   = 'Jameel Noori Nastaleeq'
const SZ_TITLE  = 28    // 14pt
const SZ_HEAD   = 24    // 12pt
const SZ_Q      = 20    // 10pt
const SZ_A      = 20    // 10pt
const SZ_META   = 18    // 9pt

// Margins in twips (1 inch = 1440 twips)
const MARGIN_TOP    = convertInchesToTwip(0.3)
const MARGIN_SIDE   = convertInchesToTwip(0.5)
const MARGIN_BOTTOM = convertInchesToTwip(0.5)

// ── Helpers ──────────────────────────────────────────────────────────────────
function isUrduText(text = '') {
  const u = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length
  return text.replace(/\s/g, '').length > 0 && u / text.replace(/\s/g, '').length > 0.25
}

function pickFont(isUrdu)  { return isUrdu ? FONT_UR : FONT_EN }
function pickAlign(isUrdu) { return isUrdu ? AlignmentType.RIGHT : AlignmentType.LEFT }

function run(text, isUrdu, opts = {}) {
  return new TextRun({
    text: String(text || ''),
    font: pickFont(isUrdu),
    size: SZ_A,
    rightToLeft: isUrdu,
    ...opts,
  })
}

function para(children, isUrdu, opts = {}) {
  return new Paragraph({
    alignment: pickAlign(isUrdu),
    bidirectional: isUrdu,
    spacing: { before: 0, after: 60 },
    ...opts,
    children: Array.isArray(children) ? children : [children],
  })
}

const thinRule = new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' } },
  spacing: { before: 0, after: 120 },
  children: [],
})

const thickRule = new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '0B2545' } },
  spacing: { before: 0, after: 160 },
  children: [],
})

// ── Main generator ───────────────────────────────────────────────────────────
export async function downloadNotesDocx(data, filename) {
  const allChildren = []

  // ── Title ──────────────────────────────────────────────────────────────────
  if (data.topic) {
    const isUrdu = isUrduText(data.topic)
    allChildren.push(para(
      run(data.topic, isUrdu, { bold: true, size: SZ_TITLE }),
      isUrdu,
      { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 100 } }
    ))
  }

  // ── Meta ───────────────────────────────────────────────────────────────────
  const metaParts = [
    data.authorName  && `By: ${data.authorName}`,
    data.institution,
    data.noteDate,
  ].filter(Boolean)

  if (metaParts.length > 0) {
    allChildren.push(para(
      run(metaParts.join('  ·  '), false, { size: SZ_META, color: '3D5273' }),
      false,
      { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 } }
    ))
    allChildren.push(thickRule)
  }

  // ── Content blocks ─────────────────────────────────────────────────────────
  let qNumber = 0

  for (const block of data.blocks) {
    const { type, num, question, answer, dir } = block
    const isUrdu = dir === 'rtl'

    if (type === 'heading') {
      allChildren.push(para(
        run(answer, isUrdu, { bold: true, size: SZ_HEAD, color: '0B2545' }),
        isUrdu,
        { spacing: { before: 200, after: 60 } }
      ))
      allChildren.push(thinRule)
      continue
    }

    if (type === 'qa') {
      qNumber++
      const label = num ? `${num}.` : `${qNumber}.`

      // For LTR: number + tab + question text, answer indented to align under question
      // For RTL: question text + number on the right side
      if (!isUrdu) {
        allChildren.push(para(
          [
            run(label + '  ', false, { bold: true, size: SZ_Q }),
            run(question || '', false, { bold: true, size: SZ_Q }),
          ],
          false,
          { spacing: { before: 160, after: 40 } }
        ))

        if (answer) {
          // Measure number width in twips for indent (~720 twips per cm, roughly)
          const numIndent = Math.min((label.length + 2) * 110, 720)
          allChildren.push(para(
            run(answer, false, { size: SZ_A, color: '2A3F5F' }),
            false,
            {
              indent: { left: numIndent },
              spacing: { before: 0, after: 120 },
            }
          ))
        }
      } else {
        // RTL question
        allChildren.push(para(
          [
            run(question || '', true, { bold: true, size: SZ_Q }),
            run('  ' + label, true, { bold: true, size: SZ_Q }),
          ],
          true,
          { spacing: { before: 160, after: 40 } }
        ))

        if (answer) {
          allChildren.push(para(
            run(answer, true, { size: SZ_A, color: '2A3F5F' }),
            true,
            {
              indent: { right: 360 },
              spacing: { before: 0, after: 120 },
            }
          ))
        }
      }
      continue
    }

    // plain paragraph
    allChildren.push(para(
      run(answer, isUrdu),
      isUrdu,
      { spacing: { before: 60, after: 60 } }
    ))
  }

  // ── Build document with two-column layout ──────────────────────────────────
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size:   { width: 11906, height: 16838 },   // A4
          margin: {
            top:    MARGIN_TOP,
            right:  MARGIN_SIDE,
            bottom: MARGIN_BOTTOM,
            left:   MARGIN_SIDE,
          },
        },
        column: {
          count: 2,
          space: convertInchesToTwip(0.2),
          equalWidth: true,
          separate: true,   // draws a thin separator line between columns
        },
      },
      children: allChildren,
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, filename)
}
