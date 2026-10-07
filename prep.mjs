// Reads the Kaggle CSVs and writes src/data.json, so every number in the video comes from the files.
import fs from 'node:fs';

const parse = (text) => {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
};

const yearly = parse(fs.readFileSync('data/layoffs_yearly_summary.csv', 'utf8')).map((r) => ({
  year: Number(r.year),
  employees: Number(r.employees_laid_off),
  events: Number(r.layoff_events),
}));

const events = parse(fs.readFileSync('data/layoffs_events.csv', 'utf8'));
const dates = events.map((r) => r.layoff_date).sort();
const firstDate = dates[0];
const lastDate = dates[dates.length - 1];

// Monthly totals, with empty months kept as zero so the timeline has no gaps.
const byMonth = {};
for (const e of events) byMonth[e.layoff_date.slice(0, 7)] = (byMonth[e.layoff_date.slice(0, 7)] || 0) + Number(e.laid_off_count || 0);
const monthly = [];
let [y, m] = firstDate.split('-').map(Number);
const [ly, lm] = lastDate.split('-').map(Number);
while (y < ly || (y === ly && m <= lm)) {
  const ym = `${y}-${String(m).padStart(2, '0')}`;
  monthly.push({ ym, employees: byMonth[ym] || 0 });
  if (++m > 12) { m = 1; y++; }
}

const top5 = [...events]
  .sort((a, b) => Number(b.laid_off_count) - Number(a.laid_off_count))
  .slice(0, 5)
  .map((e) => ({ company: e.company, count: Number(e.laid_off_count), date: e.layoff_date }));

fs.writeFileSync('src/data.json', JSON.stringify({ yearly, monthly, top5, firstDate, lastDate }, null, 2));
console.log('Wrote src/data.json');
