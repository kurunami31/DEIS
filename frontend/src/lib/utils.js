export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

export function formatGrade(grade) {
  if (grade == null || grade === '') return '—';
  return Number(grade).toFixed(2);
}

export function downloadCsv(filename, headers, rows) {
  const esc = (cell) => {
    const value = String(cell ?? '');
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const csv = [headers, ...rows].map((row) => row.map(esc).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPdf(title, subtitle, headers, rows) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const headRow = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
  h1 { color: #14437B; margin-bottom: 4px; }
  p { color: #64748b; margin-top: 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 13px; }
  th { background: #14437B; color: white; }
  tr:nth-child(even) td { background: #f8fafc; }
  @media print { body { margin: 12mm; } }
</style></head>
<body>
  <h1>${title}</h1>
  <p>${subtitle}</p>
  <table><thead><tr>${headRow}</tr></thead><tbody>${bodyRows}</tbody></table>
  <script>window.onload = () => setTimeout(() => window.print(), 300);<\\/script>
</body></html>`);
  printWindow.document.close();
}