/* ============================================================
   Sri Siri Home Foods — client-side CSV export
   ============================================================ */

function escapeCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// columns: [{ key, label, get? }]
export function toCSV(rows, columns) {
  const header = columns.map(c => escapeCell(c.label ?? c.key)).join(',');
  const body = (rows || []).map(r =>
    columns.map(c => escapeCell(c.get ? c.get(r) : r[c.key])).join(',')
  ).join('\n');
  return header + '\n' + body;
}

export function downloadCSV(filename, csv) {
  // Prepend BOM so Excel reads UTF-8 (₹ etc.) correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
