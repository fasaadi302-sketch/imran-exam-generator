/**
 * formatNotesPdf.js
 * Renders notes as HTML in a hidden div, captures via html2canvas, saves as PDF.
 * This approach uses the browser's own text engine so Urdu/Nastaleeq renders perfectly.
 */

import { jsPDF }   from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs }  from 'file-saver'

export async function downloadNotesPdf(data, filename) {
  // ── Build hidden render container ─────────────────────────────────────────
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: white;
    padding: 22px 24px;
    box-sizing: border-box;
    font-size: 13px;
    line-height: 1.7;
    color: #111;
  `

  // Inject fonts
  const styleEl = document.createElement('style')
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
    @font-face {
      font-family: 'Jameel Noori Nastaleeq';
      src: local('Jameel Noori Nastaleeq'), local('JameelNooriNastaleeq');
    }
    .pn-ur { font-family: "Jameel Noori Nastaleeq","Noto Nastaliq Urdu",serif; font-size:12px; line-height:2.2; }
    .pn-en { font-family: "Times New Roman",Times,serif; }
    .pn-institution { font-size:16px; font-weight:700; text-align:center; color:#0B2545; margin-bottom:3px; font-family:"Times New Roman",serif; }
    .pn-rule-thick  { border:none; border-top:2px solid #0B2545; margin:3px 0; }
    .pn-rule-thin   { border:none; border-top:1px solid #0B2545; margin:3px 0 10px; }
    .pn-header-meta { display:flex; justify-content:space-between; align-items:center; font-size:11px; font-family:"Times New Roman",serif; padding:3px 0; }
    .pn-header-right { display:flex; gap:16px; }
    .pn-label { font-weight:700; color:#0B2545; }
    .pn-cols  { columns:2; column-gap:18px; column-rule:1px solid #D8E4EE; }
    .pn-full  { column-span:all; }
    .pn-heading { font-weight:700; font-size:13px; color:#0B2545; margin:12px 0 4px;
                  border-bottom:1px solid #D0D8E8; padding-bottom:2px; break-inside:avoid; }
    .pn-qa    { margin-bottom:10px; break-inside:avoid; }
    .pn-q-ltr { display:flex; gap:5px; font-weight:700; margin-bottom:2px; }
    .pn-q-rtl { font-weight:700; margin-bottom:2px; text-align:right; }
    .pn-num   { flex-shrink:0; min-width:22px; color:#0B2545; font-weight:700; }
    .pn-num-rtl { color:#0B2545; font-weight:700; margin-left:6px; }
    .pn-a-ltr { font-weight:normal; color:#2A3F5F; padding-left:22px; text-align:justify; }
    .pn-a-rtl { font-weight:normal; color:#2A3F5F; padding-right:22px; text-align:justify; }
    .pn-para  { color:#2A3F5F; margin-bottom:6px; break-inside:avoid; text-align:justify; }
  `
  document.head.appendChild(styleEl)

  // ── Compact professional header ───────────────────────────────────────────
  if (data.institution || data.topic || data.authorName || data.noteDate) {
    if (data.institution) {
      const inst = document.createElement('div')
      inst.className = 'pn-institution'
      inst.textContent = data.institution
      container.appendChild(inst)
    }
    const hr1 = document.createElement('hr'); hr1.className = 'pn-rule-thick'; container.appendChild(hr1)

    const metaRow = document.createElement('div'); metaRow.className = 'pn-header-meta'
    const leftMeta = document.createElement('div')
    if (data.topic) {
      leftMeta.innerHTML = `<span class="pn-label">Subject: </span>${data.topic}`
    }
    const rightMeta = document.createElement('div'); rightMeta.className = 'pn-header-right'
    if (data.authorName) {
      const s = document.createElement('span'); s.innerHTML = `<span class="pn-label">By: </span>${data.authorName}`; rightMeta.appendChild(s)
    }
    if (data.noteDate) {
      const s = document.createElement('span'); s.innerHTML = `<span class="pn-label">Date: </span>${data.noteDate}`; rightMeta.appendChild(s)
    }
    metaRow.appendChild(leftMeta); metaRow.appendChild(rightMeta); container.appendChild(metaRow)
    const hr2 = document.createElement('hr'); hr2.className = 'pn-rule-thin'; container.appendChild(hr2)
  }

  // Two-column content
  const cols = document.createElement('div')
  cols.className = 'pn-cols'

  let qNum = 0
  for (const block of (data.blocks || [])) {
    const isUrdu = block.dir === 'rtl'
    const fontCls = isUrdu ? 'pn-ur' : 'pn-en'

    if (block.type === 'heading') {
      const h = document.createElement('div')
      h.className = `pn-heading pn-full ${fontCls}`
      h.dir = block.dir
      h.textContent = block.answer
      cols.appendChild(h)
      continue
    }

    if (block.type === 'qa') {
      qNum++
      const label = block.num ? `${block.num}.` : `${qNum}.`
      const wrap = document.createElement('div')
      wrap.className = 'pn-qa'
      wrap.dir = block.dir

      if (isUrdu) {
        // RTL: number FIRST in DOM = rightmost visually
        const qRow = document.createElement('div')
        qRow.className = `pn-q-rtl ${fontCls}`
        qRow.dir = 'rtl'

        const numSpan = document.createElement('span')
        numSpan.className = 'pn-num-rtl'
        numSpan.textContent = label

        const qSpan = document.createElement('span')
        qSpan.textContent = block.question || ''

        qRow.appendChild(numSpan)
        qRow.appendChild(qSpan)
        wrap.appendChild(qRow)

        if (block.answer) {
          const aDiv = document.createElement('div')
          aDiv.className = `pn-a-rtl ${fontCls}`
          aDiv.dir = 'rtl'
          aDiv.textContent = block.answer
          wrap.appendChild(aDiv)
        }
      } else {
        // LTR
        const qRow = document.createElement('div')
        qRow.className = `pn-q-ltr ${fontCls}`

        const numSpan = document.createElement('span')
        numSpan.className = 'pn-num'
        numSpan.textContent = label

        const qSpan = document.createElement('span')
        qSpan.textContent = block.question || ''

        qRow.appendChild(numSpan)
        qRow.appendChild(qSpan)
        wrap.appendChild(qRow)

        if (block.answer) {
          const aDiv = document.createElement('div')
          aDiv.className = `pn-a-ltr ${fontCls}`
          aDiv.textContent = block.answer
          wrap.appendChild(aDiv)
        }
      }

      cols.appendChild(wrap)
      continue
    }

    // plain paragraph
    const p = document.createElement('div')
    p.className = `pn-para ${fontCls}`
    p.dir = block.dir
    p.textContent = block.answer
    cols.appendChild(p)
  }

  container.appendChild(cols)
  document.body.appendChild(container)

  // Wait for fonts
  await document.fonts.ready
  // Extra wait for Noto Nastaliq to load from Google Fonts
  await new Promise(r => setTimeout(r, 800))

  // Capture
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  document.body.removeChild(container)
  document.head.removeChild(styleEl)

  // Slice canvas into A4 pages
  const PDF_W    = 210   // mm
  const PDF_H    = 297   // mm
  const imgW     = PDF_W
  const imgH     = (canvas.height / canvas.width) * PDF_W

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const imgData = canvas.toDataURL('image/jpeg', 0.92)

  let yOffset = 0
  while (yOffset < imgH) {
    if (yOffset > 0) doc.addPage()
    doc.addImage(imgData, 'JPEG', 0, -yOffset, imgW, imgH)
    yOffset += PDF_H
  }

  saveAs(doc.output('blob'), filename)
}
