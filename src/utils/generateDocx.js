/**
 * generateDocx.js
 * Builds the exam paper .docx
 * Urdu MCQs: Jameel Noori Nastaleeq font, RTL paragraphs, number on right
 */

import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import { isUrduText } from './parsers'

const FONT_EN  = 'Times New Roman'
const FONT_UR  = 'Jameel Noori Nastaleeq'
const SZ       = 22
const SZ_UR    = 26   // Nastaleeq needs slightly bigger to read well
const SZ_TITLE = 28
const SZ_SEC   = 26

const PAGE_W  = 11906
const MARGIN  = 900
const CONTENT = PAGE_W - MARGIN * 2
const HALF    = Math.floor(CONTENT / 2)
const OPT_INDENT = 400
const OPT_W      = CONTENT - OPT_INDENT
const OPT_COL    = Math.floor(OPT_W / 2)

const nb          = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders   = { top: nb, bottom: nb, left: nb, right: nb, insideH: nb, insideV: nb }
const solidBorder = { style: BorderStyle.SINGLE, size: 6, color: '000000' }
const thickBorder = { style: BorderStyle.SINGLE, size: 8, color: '000000' }

const run = (text, opts = {}) =>
  new TextRun({ text: String(text), font: FONT_EN, size: SZ, ...opts })

const urduRun = (text, opts = {}) =>
  new TextRun({ text: String(text), font: FONT_UR, size: SZ_UR, rightToLeft: true, ...opts })

const para = (children, opts = {}) => {
  const kids = Array.isArray(children) ? children : [children]
  return new Paragraph({ spacing: { before: 0, after: 60 }, ...opts, children: kids })
}

const divider = (thick = true, spacingAfter = 0) =>
  new Paragraph({
    border: { bottom: thick ? thickBorder : solidBorder },
    spacing: { before: 0, after: spacingAfter },
    children: [],
  })

const spacer = (pts = 120) =>
  new Paragraph({ spacing: { before: 0, after: pts }, children: [] })

export async function generateDocx(data) {
  const all = []

  // 1. Title
  all.push(para(run(data.institution, { bold: true, size: SZ_TITLE }), {
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
  }))

  // 2. Top divider
  all.push(divider(true, 0))

  // 3. Header table
  const leftLines  = [`Student Name: ${'_'.repeat(25)}`, `Session: ${data.session}`, ...(data.examDate ? [`Date: ${data.examDate}`] : [])]
  const rightLines = [`Total Marks: ${data.totalMarks}`, `Paper: ${data.paper}`, `Time Allowed: ${data.time}`]

  all.push(new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [HALF, CONTENT - HALF],
    borders: noBorders,
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders,
          width: { size: HALF, type: WidthType.DXA },
          children: leftLines.map(line => new Paragraph({ spacing: { before: 50, after: 50 }, children: [run(line, { bold: true })] })),
        }),
        new TableCell({
          borders: noBorders,
          width: { size: CONTENT - HALF, type: WidthType.DXA },
          children: rightLines.map(line => new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 50, after: 50 }, children: [run(line, { bold: true })] })),
        }),
      ],
    })],
  }))

  // 4. Bottom divider
  all.push(divider(true, 0))
  all.push(spacer(120))

  // 5. Instructions line
  all.push(para([run('INSTRUCTIONS: ', { bold: true }), run(data.mcqMarksNote, { bold: true })], { spacing: { before: 0, after: 100 } }))

  // 6. Instructions box
  if (data.instrs.length > 0) {
    const boxBorder = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder }
    all.push(new Table({
      width: { size: CONTENT, type: WidthType.DXA },
      columnWidths: [CONTENT],
      borders: noBorders,
      rows: [new TableRow({
        children: [new TableCell({
          borders: boxBorder,
          margins: { top: 100, bottom: 100, left: 200, right: 200 },
          children: data.instrs.map(txt => new Paragraph({ spacing: { before: 50, after: 50 }, children: [run(`✓  ${txt}`, { bold: true })] })),
        })],
      })],
    }))
    all.push(spacer(200))
  }

  // 7. MCQ Questions
  const letters = ['a', 'b', 'c', 'd', 'e', 'f']

  for (let i = 0; i < data.mcqs.length; i++) {
    const { q, opts } = data.mcqs[i]
    const urdu = isUrduText(q)

    if (urdu) {
      // ── Urdu question: number + text RTL ──────────────────────────────────
      all.push(new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { before: i === 0 ? 0 : 200, after: 80 },
        children: [
          urduRun(`${i + 1}.  `, { bold: true }),
          urduRun(q, { bold: true }),
        ],
      }))

      // Urdu options: same 2-column table, RTL text
      if (opts.length > 0) {
        const half = Math.ceil(opts.length / 2)
        const rows = []
        for (let row = 0; row < half; row++) {
          const li = row
          const ri = row + half
          const lTxt = li < opts.length ? `${letters[li]})  ${opts[li]}` : ''
          const rTxt = ri < opts.length ? `${letters[ri]})  ${opts[ri]}` : ''

          rows.push(new TableRow({
            children: [
              new TableCell({
                borders: noBorders,
                width: { size: OPT_COL, type: WidthType.DXA },
                margins: { top: 20, bottom: 20, left: 0, right: 60 },
                children: [new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 0, after: 0 },
                  children: [urduRun(lTxt)],
                })],
              }),
              new TableCell({
                borders: noBorders,
                width: { size: OPT_W - OPT_COL, type: WidthType.DXA },
                margins: { top: 20, bottom: 20, left: 60, right: 0 },
                children: [new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 0, after: 0 },
                  children: [urduRun(rTxt)],
                })],
              }),
            ],
          }))
        }

        all.push(new Table({
          width: { size: OPT_W, type: WidthType.DXA },
          columnWidths: [OPT_COL, OPT_W - OPT_COL],
          borders: noBorders,
          indent: { size: OPT_INDENT, type: WidthType.DXA },
          rows,
        }))
      }

    } else {
      // ── English question ──────────────────────────────────────────────────
      all.push(para(
        [run(`${i + 1}.  `, { bold: true }), run(q)],
        { spacing: { before: i === 0 ? 0 : 200, after: 80 }, indent: { left: 380, hanging: 380 } }
      ))

      if (opts.length > 0) {
        const half = Math.ceil(opts.length / 2)
        const rows = []
        for (let row = 0; row < half; row++) {
          const lTxt = row < opts.length             ? `${letters[row]})  ${opts[row]}`      : ''
          const rTxt = row + half < opts.length      ? `${letters[row + half]})  ${opts[row + half]}` : ''
          rows.push(new TableRow({
            children: [
              new TableCell({
                borders: noBorders, width: { size: OPT_COL, type: WidthType.DXA },
                margins: { top: 20, bottom: 20, left: 0, right: 60 },
                children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(lTxt)] })],
              }),
              new TableCell({
                borders: noBorders, width: { size: OPT_W - OPT_COL, type: WidthType.DXA },
                margins: { top: 20, bottom: 20, left: 60, right: 0 },
                children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(rTxt)] })],
              }),
            ],
          }))
        }
        all.push(new Table({
          width: { size: OPT_W, type: WidthType.DXA },
          columnWidths: [OPT_COL, OPT_W - OPT_COL],
          borders: noBorders,
          indent: { size: OPT_INDENT, type: WidthType.DXA },
          rows,
        }))
      }
    }
  }

  // 8. Subjective section
  if (data.subs.length > 0) {
    all.push(new Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0 }, children: [] }))
    all.push(para(run('Subjective Questions', { bold: true, size: SZ_SEC }), { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 } }))
    all.push(para(run(`(${data.subTotal} Marks)`, { bold: true }), { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 } }))
    all.push(divider(false, 120))
    all.push(para(run(`Instructions: Answer any ${data.subAttempt} of the following ${data.subs.length} questions. Each question carries (${data.subPer} marks.)`, { italics: true }), { spacing: { before: 0, after: 160 } }))
    for (let i = 0; i < data.subs.length; i++) {
      all.push(para([run(`${i + 1}.  `, { bold: true }), run(data.subs[i])], { spacing: { before: i === 0 ? 0 : 160, after: 80 }, indent: { left: 380, hanging: 380 } }))
    }
  }

  // 9. Build document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: 16838 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: all,
    }],
  })
  return Packer.toBlob(doc)
}

export async function downloadExamPaper(data, filename) {
  const blob = await generateDocx(data)
  saveAs(blob, filename)
}
