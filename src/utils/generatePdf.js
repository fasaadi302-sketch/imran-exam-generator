/**
 * generatePdf.js
 * English papers: jsPDF (fast, sharp)
 * Urdu papers: html2canvas → jsPDF (browser handles Nastaleeq perfectly)
 */

import { jsPDF }   from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs }  from 'file-saver'
import { isUrduText } from './parsers'

// ── English jsPDF path ────────────────────────────────────────────────────────
const MARGIN  = 45
const FONT    = 'times'
const SZ_BODY = 11
const SZ_TITLE = 14
const SZ_SEC  = 13
const LINE    = 14
const BULLET  = '\u2022'

export function generatePdfDoc(data) {
  const doc     = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW   = doc.internal.pageSize.getWidth()
  const pageH   = doc.internal.pageSize.getHeight()
  const contentW = pageW - MARGIN * 2
  const bottom   = pageH - MARGIN
  let y = MARGIN

  const ensure  = (n) => { if (y + n > bottom) { doc.addPage(); y = MARGIN } }
  const setBody = () => { doc.setFont(FONT, 'normal'); doc.setFontSize(SZ_BODY) }
  const setBold = () => { doc.setFont(FONT, 'bold');   doc.setFontSize(SZ_BODY) }
  const hr = (thick) => { doc.setLineWidth(thick ? 1.3 : 0.6); doc.line(MARGIN, y, pageW - MARGIN, y) }
  const wrapped = (text, x, maxW) => {
    const lines = doc.splitTextToSize(String(text), maxW)
    for (const ln of lines) { ensure(LINE); doc.text(ln, x, y + 9); y += LINE }
    return lines.length
  }

  // Title
  doc.setFont(FONT, 'bold'); doc.setFontSize(SZ_TITLE)
  doc.splitTextToSize(data.institution, contentW).forEach(ln => { ensure(18); doc.text(ln, pageW / 2, y + 12, { align: 'center' }); y += 18 })
  y += 6; hr(true); y += 12

  // Header
  const leftLines  = [`Student Name: ${'_'.repeat(22)}`, `Session: ${data.session}`, ...(data.examDate ? [`Date: ${data.examDate}`] : [])]
  const rightLines = [`Total Marks: ${data.totalMarks}`, `Paper: ${data.paper}`, `Time Allowed: ${data.time}`]
  setBold()
  const hRows = Math.max(leftLines.length, rightLines.length)
  for (let i = 0; i < hRows; i++) {
    ensure(LINE + 2)
    if (leftLines[i])  doc.text(leftLines[i],  MARGIN,           y + 9, { align: 'left' })
    if (rightLines[i]) doc.text(rightLines[i], pageW - MARGIN,   y + 9, { align: 'right' })
    y += LINE + 2
  }
  y += 4; hr(true); y += 14

  // Instructions line
  ensure(LINE); setBold()
  const introLabel = 'INSTRUCTIONS: '
  doc.text(introLabel, MARGIN, y + 9)
  const note = String(data.mcqMarksNote || '')
  const labelW = doc.getTextWidth(introLabel)
  const firstChunk = doc.splitTextToSize(note, contentW - labelW)[0] || note
  doc.text(firstChunk, MARGIN + labelW, y + 9); y += LINE
  const rest = note.slice(firstChunk.length).trim()
  if (rest) wrapped(rest, MARGIN, contentW)
  y += 6

  // Instructions box
  if (data.instrs?.length > 0) {
    const padX = 12, padY = 10; setBold()
    const boxLineSets = data.instrs.map(t => doc.splitTextToSize(`${BULLET}  ${t}`, contentW - padX * 2))
    const totalLines  = boxLineSets.reduce((n, s) => n + s.length, 0)
    const boxH = padY * 2 + totalLines * LINE
    ensure(boxH + 6)
    const boxTop = y
    doc.setLineWidth(0.6); doc.rect(MARGIN, boxTop, contentW, boxH)
    let ty = boxTop + padY + 9
    for (const set of boxLineSets) { for (const ln of set) { doc.text(ln, MARGIN + padX, ty); ty += LINE } }
    y = boxTop + boxH + 14
  }

  // MCQ questions (English only in this path)
  const letters   = ['a', 'b', 'c', 'd', 'e', 'f']
  const Q_INDENT  = 18
  const OPT_INDENT = 24
  const optColW   = (contentW - OPT_INDENT) / 2

  for (let i = 0; i < (data.mcqs?.length || 0); i++) {
    const { q, opts } = data.mcqs[i]
    if (i > 0) y += 8
    const numStr = `${i + 1}.  `
    setBold(); ensure(LINE); doc.text(numStr, MARGIN, y + 9)
    const numW = doc.getTextWidth(numStr)
    setBody()
    const qLines = doc.splitTextToSize(String(q), contentW - numW)
    qLines.forEach((ln, idx) => { ensure(LINE); doc.text(ln, idx === 0 ? MARGIN + numW : MARGIN + Q_INDENT, y + 9); y += LINE })
    y += 2
    if (opts?.length > 0) {
      const half = Math.ceil(opts.length / 2)
      setBody()
      for (let row = 0; row < half; row++) {
        const lTxt = row < opts.length          ? `${letters[row]})  ${opts[row]}`           : ''
        const rTxt = row + half < opts.length   ? `${letters[row + half]})  ${opts[row + half]}` : ''
        const lSet = lTxt ? doc.splitTextToSize(lTxt, optColW - 8) : ['']
        const rSet = rTxt ? doc.splitTextToSize(rTxt, optColW - 8) : ['']
        const rowLines = Math.max(lSet.length, rSet.length)
        ensure(rowLines * LINE)
        const rowTop = y
        lSet.forEach((ln, k) => doc.text(ln, MARGIN + OPT_INDENT,          rowTop + 9 + k * LINE))
        rSet.forEach((ln, k) => doc.text(ln, MARGIN + OPT_INDENT + optColW, rowTop + 9 + k * LINE))
        y = rowTop + rowLines * LINE
      }
    }
  }

  // Subjective
  if (data.subs?.length > 0) {
    doc.addPage(); y = MARGIN
    doc.setFont(FONT, 'bold'); doc.setFontSize(SZ_SEC)
    doc.text('Subjective Questions', pageW / 2, y + 11, { align: 'center' }); y += 20
    setBold(); doc.text(`(${data.subTotal} Marks)`, pageW / 2, y + 9, { align: 'center' }); y += 16
    hr(false); y += 14
    doc.setFont(FONT, 'italic')
    wrapped(`Instructions: Answer any ${data.subAttempt} of the following ${data.subs.length} questions. Each question carries (${data.subPer} marks.)`, MARGIN, contentW)
    y += 8
    for (let i = 0; i < data.subs.length; i++) {
      if (i > 0) y += 8
      const numStr = `${i + 1}.  `; setBold(); ensure(LINE); doc.text(numStr, MARGIN, y + 9)
      const numW = doc.getTextWidth(numStr); setBody()
      doc.splitTextToSize(String(data.subs[i]), contentW - numW).forEach((ln, idx) => { ensure(LINE); doc.text(ln, idx === 0 ? MARGIN + numW : MARGIN + Q_INDENT, y + 9); y += LINE })
    }
  }
  return doc
}

// ── Urdu html2canvas path ─────────────────────────────────────────────────────
async function downloadUrduPaperPdf(data, filename) {
  const letters = ['a', 'b', 'c', 'd', 'e', 'f']
  const UR = `font-family:"Jameel Noori Nastaleeq","Noto Nastaliq Urdu",serif;font-size:15px;line-height:2.2;`
  const EN = `font-family:"Times New Roman",serif;`

  const styleEl = document.createElement('style')
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
    @font-face { font-family:'Jameel Noori Nastaleeq'; src:local('Jameel Noori Nastaleeq'),local('JameelNooriNastaleeq'); }
    .pp-title  { font-family:"Times New Roman",serif; font-size:16px; font-weight:700; text-align:center; margin-bottom:6px; }
    .pp-rule   { border:none; border-top:2px solid #000; margin:6px 0; }
    .pp-meta   { display:flex; justify-content:space-between; font-family:"Times New Roman",serif; font-size:11px; font-weight:700; margin:8px 0; }
    .pp-ihead  { font-family:"Times New Roman",serif; font-size:11px; font-weight:700; margin:8px 0 4px; }
    .pp-box    { border:1px solid #000; padding:8px 12px; margin-bottom:10px; font-family:"Times New Roman",serif; font-size:11px; font-weight:700; }
    .pp-q-block{ margin-bottom:12px; }
    .pp-q-en   { font-family:"Times New Roman",serif; font-size:11px; display:flex; gap:5px; font-weight:700; }
    .pp-q-ur   { ${UR} font-weight:700; direction:rtl; display:flex; gap:6px; }
    .pp-opts-en{ display:grid; grid-template-columns:1fr 1fr; gap:2px 0; padding-left:24px; font-family:"Times New Roman",serif; font-size:11px; }
    .pp-opts-ur{ display:grid; grid-template-columns:1fr 1fr; gap:2px 0; padding-right:24px; direction:rtl; text-align:right; ${UR} }
  `
  document.head.appendChild(styleEl)

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:794px;background:white;padding:36px 40px;box-sizing:border-box;`

  // Title
  const title = document.createElement('div')
  title.className = 'pp-title'
  title.textContent = data.institution
  container.appendChild(title)

  const rule1 = document.createElement('hr'); rule1.className = 'pp-rule'; container.appendChild(rule1)

  // Meta
  const meta = document.createElement('div'); meta.className = 'pp-meta'
  const ml = document.createElement('div')
  ml.innerHTML = `<div>Student Name: ${'_'.repeat(22)}</div><div>Session: ${data.session}</div>${data.examDate ? `<div>Date: ${data.examDate}</div>` : ''}`
  const mr = document.createElement('div'); mr.style.textAlign = 'right'
  mr.innerHTML = `<div>Total Marks: ${data.totalMarks}</div><div>Paper: ${data.paper}</div><div>Time Allowed: ${data.time}</div>`
  meta.appendChild(ml); meta.appendChild(mr); container.appendChild(meta)

  const rule2 = document.createElement('hr'); rule2.className = 'pp-rule'; container.appendChild(rule2)

  // Instructions heading
  const ihead = document.createElement('div'); ihead.className = 'pp-ihead'
  ihead.textContent = `INSTRUCTIONS: ${data.mcqMarksNote}`
  container.appendChild(ihead)

  // Instructions box
  if (data.instrs?.length > 0) {
    const box = document.createElement('div'); box.className = 'pp-box'
    data.instrs.forEach(t => { const d = document.createElement('div'); d.textContent = `✓  ${t}`; box.appendChild(d) })
    container.appendChild(box)
  }

  // MCQs
  for (let i = 0; i < (data.mcqs?.length || 0); i++) {
    const { q, opts } = data.mcqs[i]
    const urdu = isUrduText(q)
    const block = document.createElement('div'); block.className = 'pp-q-block'

    // Question row
    const qRow = document.createElement('div'); qRow.className = urdu ? 'pp-q-ur' : 'pp-q-en'
    if (urdu) qRow.dir = 'rtl'
    const numSpan = document.createElement('span'); numSpan.style.flexShrink = '0'; numSpan.textContent = `${i + 1}.`
    const qSpan = document.createElement('span'); qSpan.textContent = q
    qRow.appendChild(numSpan); qRow.appendChild(qSpan); block.appendChild(qRow)

    // Options
    if (opts?.length > 0) {
      const half = Math.ceil(opts.length / 2)
      const grid = document.createElement('div'); grid.className = urdu ? 'pp-opts-ur' : 'pp-opts-en'
      if (urdu) grid.dir = 'rtl'
      for (let row = 0; row < half; row++) {
        const li = row, ri = row + half
        // Use <bdi> for the label so a) never flips to (a in RTL context
        const lSpan = document.createElement('span')
        if (urdu && li < opts.length) {
          lSpan.textContent = `${letters[li]})  ${opts[li]}`
        } else {
          lSpan.textContent = li < opts.length ? `${letters[li]})  ${opts[li]}` : ''
        }
        const rSpan = document.createElement('span')
        if (urdu && ri < opts.length) {
          rSpan.textContent = `${letters[ri]})  ${opts[ri]}`
        } else {
          rSpan.textContent = ri < opts.length ? `${letters[ri]})  ${opts[ri]}` : ''
        }
        grid.appendChild(lSpan); grid.appendChild(rSpan)
      }
      block.appendChild(grid)
    }
    container.appendChild(block)
  }

  // Subjective
  if (data.subs?.length > 0) {
    const subTitle = document.createElement('div')
    subTitle.style.cssText = `font-family:"Times New Roman",serif;font-size:14px;font-weight:700;text-align:center;margin-top:20px;`
    subTitle.textContent = 'Subjective Questions'
    container.appendChild(subTitle)
    const subMarks = document.createElement('div')
    subMarks.style.cssText = `font-family:"Times New Roman",serif;font-size:11px;font-weight:700;text-align:center;`
    subMarks.textContent = `(${data.subTotal} Marks)`
    container.appendChild(subMarks)
    const subRule = document.createElement('hr'); subRule.className = 'pp-rule'; container.appendChild(subRule)
    const subInstr = document.createElement('div')
    subInstr.style.cssText = `font-family:"Times New Roman",serif;font-size:11px;font-style:italic;margin-bottom:10px;`
    subInstr.textContent = `Instructions: Answer any ${data.subAttempt} of the following ${data.subs.length} questions. Each question carries (${data.subPer} marks.)`
    container.appendChild(subInstr)
    data.subs.forEach((q, i) => {
      const d = document.createElement('div')
      d.style.cssText = `font-family:"Times New Roman",serif;font-size:11px;display:flex;gap:5px;margin-bottom:8px;`
      d.innerHTML = `<span style="font-weight:700;flex-shrink:0">${i + 1}.</span><span>${q}</span>`
      container.appendChild(d)
    })
  }

  document.body.appendChild(container)
  await document.fonts.ready
  await new Promise(r => setTimeout(r, 800))

  const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
  document.body.removeChild(container)
  document.head.removeChild(styleEl)

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const PDF_W = 210, PDF_H = 297
  const imgH  = (canvas.height / canvas.width) * PDF_W
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let yOff = 0
  while (yOff < imgH) {
    if (yOff > 0) doc.addPage()
    doc.addImage(imgData, 'JPEG', 0, -yOff, PDF_W, imgH)
    yOff += PDF_H
  }
  saveAs(doc.output('blob'), filename)
}

// ── Public export ─────────────────────────────────────────────────────────────
export async function downloadExamPaperPdf(data, filename) {
  // If any MCQ is Urdu, use html2canvas path
  const hasUrdu = (data.mcqs || []).some(({ q }) => isUrduText(q))
  if (hasUrdu) {
    await downloadUrduPaperPdf(data, filename)
  } else {
    generatePdfDoc(data).save(filename)
  }
}
