/**
 * extractText.js
 * Client-side text extraction from PDF and image files.
 *
 *  • PDFs:   uses pdf.js — reads embedded text directly (fast, accurate).
 *            Scanned PDFs (no embedded text layer) will return little/nothing;
 *            in that case, treat them like an image (see below).
 *  • Images: uses tesseract.js — real OCR, runs entirely in the browser.
 *            Works best on clear, printed/typed text; handwriting and low
 *            quality photos will be less reliable.
 *
 * Both libraries are loaded lazily (only when actually needed) to keep the
 * app's initial load fast, since they're sizeable.
 */

/**
 * Extract text from a File object (PDF or image).
 *
 * @param {File} file
 * @param {(status: string) => void} [onProgress] optional progress callback
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file, onProgress) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isImage = file.type.startsWith('image/')

  if (isPdf) {
    return extractTextFromPdf(file, onProgress)
  }
  if (isImage) {
    return extractTextFromImage(file, onProgress)
  }
  throw new Error('Unsupported file type. Please upload a PDF or an image (JPG/PNG).')
}

// ── PDF extraction (pdf.js) ────────────────────────────────────────────────
async function extractTextFromPdf(file, onProgress) {
  onProgress?.('Loading PDF reader…')
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  const maxPages = Math.min(pdf.numPages, 20) // safety cap for very long PDFs

  for (let i = 1; i <= maxPages; i++) {
    onProgress?.(`Reading page ${i} of ${maxPages}…`)
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => item.str).join(' ')
    fullText += pageText + '\n\n'
  }

  const trimmed = fullText.trim()

  if (!trimmed) {
    throw new Error(
      'No text found in this PDF. It may be a scanned document — try saving a page as an image (screenshot) and uploading that instead, so OCR can read it.'
    )
  }

  return trimmed
}

// ── Image extraction (tesseract.js OCR) ────────────────────────────────────
async function extractTextFromImage(file, onProgress) {
  onProgress?.('Loading OCR engine…')
  const Tesseract = await import('tesseract.js')

  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.(`Reading image… ${Math.round(m.progress * 100)}%`)
      } else if (m.status) {
        onProgress?.(m.status.charAt(0).toUpperCase() + m.status.slice(1) + '…')
      }
    },
  })

  const trimmed = (data.text || '').trim()

  if (!trimmed) {
    throw new Error(
      'No readable text found in this image. Try a clearer photo with good lighting, or typed/printed text rather than handwriting.'
    )
  }

  return trimmed
}
