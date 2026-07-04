/**
 * generateLorenzoPages.js
 * Reads LORENZO-Element Repository.csv and creates one JS page file per unique page.
 * Run with:  node tools/generateLorenzoPages.js
 */

const fs   = require('fs');
const path = require('path');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CSV_PATH   = path.join(
  'C:\\Users\\bkrishnan6\\OneDrive\\OneDrive - Dedalus S.p.A\\Desktop',
  'LORENZO-Element Repository.csv'
);
const PAGES_DIR  = path.join(__dirname, '..', 'pages');
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a raw page-column value → a safe camelCase identifier */
function toSafePageName(raw) {
  return raw
    .trim()
    // capitalise first letter after a space / dash / underscore
    .replace(/[\s\-_]+(.)/g, (_, c) => c.toUpperCase())
    // strip remaining special chars
    .replace(/[^a-zA-Z0-9]/g, '');
}

/** Convert a raw element-column value → a safe JS variable identifier */
function toSafeElementName(raw) {
  return raw
    .trim()
    .replace(/[\s\-]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+/, '');
}

/** Parse one CSV line respecting double-quoted fields */
function parseLine(line) {
  const fields = [];
  let cur = '';
  let inQ  = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }   // escaped ""
      else                              { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ── SKIP PATTERNS ─────────────────────────────────────────────────────────────
// Raw page values that are clearly not real pages
const SKIP_RAW = new Set(['page..', 'page', 'page ', 'btn_Ok_Manageoperation']);

// ── READ & PARSE CSV ──────────────────────────────────────────────────────────
const raw   = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());

// Map:  safeName → { rawName, elements: Map<varName, xpath> }
const pages = new Map();

for (let i = 0; i < lines.length; i++) {
  const parts = parseLine(lines[i]);
  if (parts.length < 3) continue;

  const rawPage = parts[0].trim();
  const rawElem = parts[1].trim();
  const xpath   = parts[2].trim();

  if (!rawPage || !rawElem) continue;
  if (SKIP_RAW.has(rawPage))  continue;
  // Skip the CSV header row
  if (rawPage.toLowerCase() === 'page' && rawElem.toLowerCase() === 'element') continue;

  const safePage = toSafePageName(rawPage);
  if (!safePage) continue;

  if (!pages.has(safePage)) {
    pages.set(safePage, { rawName: rawPage, elements: new Map() });
  }

  const pageData = pages.get(safePage);
  let varName    = toSafeElementName(rawElem);

  // Handle duplicate element names on the same page by appending _2, _3 …
  if (pageData.elements.has(varName)) {
    let n = 2;
    while (pageData.elements.has(`${varName}_${n}`)) n++;
    varName = `${varName}_${n}`;
  }

  pageData.elements.set(varName, xpath);
}

// ── GENERATE FILES ────────────────────────────────────────────────────────────
if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });

let created = 0;
for (const [safeName, data] of pages) {
  const fileName = `${safeName}.js`;
  const filePath = path.join(PAGES_DIR, fileName);

  const lines = [`// ${data.rawName}`];
  for (const [varName, xpath] of data.elements) {
    // Use single quotes unless the xpath itself contains single quotes
    const quote = xpath.includes("'") ? '"' : "'";
    lines.push(`export const ${varName} = ${quote}${xpath}${quote};`);
  }

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
  created++;
  console.log(`  created  pages/${fileName}`);
}

console.log(`\nDone – ${created} Lorenzo page files written to pages/`);
