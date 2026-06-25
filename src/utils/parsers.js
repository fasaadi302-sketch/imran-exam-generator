/**
 * parsers.js — Universal MCQ & Subjective parser v6
 * Added: Urdu صحیح جواب strip, inline A) B) C) D) on one line support
 */

const NOISE = [
  /correct\s*ans(?:wer)?[:\s]\s*[a-eA-E][^\n]*/gi,
  /ans(?:wer)?s?\s*[:\-]\s*[a-eA-E][^\n]*/gi,
  /\bkey\s*[:\-][^\n]*/gi,
  /\bexplanation[:\-][^\n]*/gi,
  /\brationale[:\-][^\n]*/gi,
  /\bnote\s*[:\-][^\n]*/gi,
  // Urdu correct answer line — صحیح جواب: anything
  /صحیح\s*جواب\s*:[^\n]*/g,
  // Also handle without colon
  /صحیح\s*جواب[^\n]*/g,
];

function normaliseWS(s) {
  return s
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function stripQNum(s) {
  return s
    .replace(/^(?:Q(?:uestion)?\.?\s*)?\d{1,3}[.):\-]\s*/i, '')
    .replace(/^\(\d{1,3}\)\s*/, '')
    .replace(/^(?:No\.?\s*)\d{1,3}[.):\-]?\s*/i, '')
    .replace(/^(?:Q(?:uestion)?\.?\s*)\d{1,3}\s*/i, '')
    .trim();
}

function stripOptPrefix(s) {
  return s.replace(/^\s*\(?[a-eA-E][.):\]]\s*/i, '').trim();
}

function parseChunk(chunk) {
  const withoutNum = stripQNum(chunk);
  const optRe = /(?<!\w)\(?([a-eA-E])[.):\]]\s+(?=\S)/gi;
  const positions = [];
  let m;
  while ((m = optRe.exec(withoutNum)) !== null) {
    positions.push(m.index);
  }
  if (positions.length === 0) {
    const pipes = withoutNum.split(/\s*[|]\s*/);
    if (pipes.length >= 3) {
      return { q: pipes[0].trim(), opts: pipes.slice(1).map(s => s.trim()).filter(Boolean) };
    }
    return { q: withoutNum, opts: [] };
  }
  const q = withoutNum.slice(0, positions[0]).trim();
  const opts = positions.map((start, i) => {
    const end = i + 1 < positions.length ? positions[i + 1] : withoutNum.length;
    return stripOptPrefix(withoutNum.slice(start, end));
  });
  return { q, opts };
}

function parseTabular(raw) {
  return raw.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !/^correct/i.test(line))
    .map(line => {
      const sep = line.includes('\t') ? '\t' : '|';
      const cols = line.split(sep).map(c => c.trim()).filter(Boolean);
      if (cols.length < 2) return null;
      const q = stripQNum(cols[0]) || cols[0];
      const opts = cols.slice(1).map(c => stripOptPrefix(c));
      return { q, opts };
    })
    .filter(Boolean);
}

export function parseMCQs(raw) {
  if (!raw.trim()) return [];

  // Detect tabular
  const lines = raw.split('\n').filter(l => l.trim());
  const tabular = lines.slice(0, 6).filter(
    l => (l.match(/\t/g) || []).length >= 3 || (l.match(/\|/g) || []).length >= 3
  ).length >= 2;
  if (tabular) return parseTabular(raw);

  // Normalise
  let text = normaliseWS(raw);
  for (const re of NOISE) text = text.replace(re, '');

  // Flatten
  text = text.replace(/\n[ \t]*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();

  // Split on question boundaries
  const qBoundaryRe = /(?:^|(?<=\s))(?:Q(?:uestion)?\.?\s*)?(\d{1,3})[.):\-]\s+(?=\S)/gi;
  const positions = [];
  let m;
  while ((m = qBoundaryRe.exec(text)) !== null) positions.push(m.index);

  if (positions.length === 0) return [parseChunk(text)].filter(x => x && x.q);

  return positions
    .map((start, i) => {
      const end = i + 1 < positions.length ? positions[i + 1] : text.length;
      return parseChunk(text.slice(start, end).trim());
    })
    .filter(x => x && x.q && x.q.length > 2);
}

export function parseSubjective(raw) {
  if (!raw.trim()) return [];
  let text = normaliseWS(raw);
  for (const re of NOISE) text = text.replace(re, '');
  text = text.replace(/\n[ \t]*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();

  const qBoundaryRe = /(?:^|(?<=\s))(?:Q(?:uestion)?\.?\s*)?(\d{1,3})[.):\-]\s+(?=\S)/gi;
  const positions = [];
  let m;
  while ((m = qBoundaryRe.exec(text)) !== null) positions.push(m.index);

  if (positions.length === 0) return [stripQNum(text)].filter(Boolean);

  return positions.map((start, i) => {
    const end = i + 1 < positions.length ? positions[i + 1] : text.length;
    return stripQNum(text.slice(start, end).trim());
  }).filter(Boolean);
}

// Helper used by preview + docx + pdf
export function isUrduText(text = '') {
  const u = (text.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length
  return text.replace(/\s/g, '').length > 0 && u / text.replace(/\s/g, '').length > 0.2
}
