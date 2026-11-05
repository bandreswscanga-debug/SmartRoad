import { download } from './format';

const BRAND = {
  red: '#ef2d3c',
  redSoft: '#fff1f2',
  dark: '#0f1727',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#f8fafc',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626'
};

const RISK_STYLE = {
  CRITICO: { bg: '#fee2e2', fg: '#b91c1c', border: '#fecaca', label: 'Crítico' },
  MEDIO: { bg: '#fef3c7', fg: '#b45309', border: '#fde68a', label: 'Medio' },
  BAJO: { bg: '#dcfce7', fg: '#15803d', border: '#bbf7d0', label: 'Bajo' }
};

export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function fmtNow() {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date());
}

function riskBadge(value) {
  const style = RISK_STYLE[String(value || '').toUpperCase()];
  if (!style) return null;
  return `<span class="badge" style="background:${style.bg};color:${style.fg};border-color:${style.border}">${style.label}</span>`;
}

function renderCell(value) {
  if (value == null || value === '') return '<span class="muted">—</span>';
  if (typeof value === 'boolean') {
    return value
      ? '<span class="badge" style="background:#dcfce7;color:#15803d;border-color:#bbf7d0">Sí</span>'
      : '<span class="badge" style="background:#f1f5f9;color:#64748b;border-color:#e2e8f0">No</span>';
  }
  const badge = riskBadge(value);
  if (badge) return badge;
  return escapeHtml(value);
}

function renderTable(section) {
  const columns = section.columns || [];
  const rows = section.rows || [];
  if (!columns.length) return '';
  if (!rows.length) {
    return `<div class="empty">${escapeHtml(section.empty || 'Sin datos para este periodo.')}</div>`;
  }
  const head = columns.map((c) => `<th style="${c.width ? `width:${c.width};` : ''}${c.align ? `text-align:${c.align};` : ''}">${escapeHtml(c.label)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const raw = c.format ? c.format(row) : row[c.key];
          return `<td style="${c.align ? `text-align:${c.align};` : ''}">${renderCell(raw)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildReportHtml({
  title = 'Reporte SmartRoad S.O.S',
  subtitle = '',
  meta = [],
  kpis = [],
  sections = [],
  notes = [],
  footer = '',
  autoPrint = false
} = {}) {
  const kpiHtml = kpis.length
    ? `<div class="kpis">${kpis
        .map(
          (k) => `<div class="kpi ${k.tone || ''}">
            <p class="kpi-label">${escapeHtml(k.label)}</p>
            <p class="kpi-value">${escapeHtml(k.value)}</p>
            ${k.sub ? `<p class="kpi-sub">${escapeHtml(k.sub)}</p>` : ''}
          </div>`
        )
        .join('')}</div>`
    : '';

  const metaHtml = meta.length
    ? `<div class="meta">${meta
        .map((m) => `<div><span>${escapeHtml(m.label)}</span><strong>${escapeHtml(m.value)}</strong></div>`)
        .join('')}</div>`
    : '';

  const sectionsHtml = sections
    .map(
      (section, index) => `<section class="section ${index > 0 ? 'page-break-soft' : ''}">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(section.title || `Sección ${index + 1}`)}</h2>
            ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ''}
          </div>
          ${section.rows ? `<span class="count">${section.rows.length} registro(s)</span>` : ''}
        </div>
        ${renderTable(section)}
      </section>`
    )
    .join('');

  const notesHtml = notes.length
    ? `<section class="notes"><h2>Notas y recomendaciones</h2><ul>${notes
        .map((n) => `<li>${escapeHtml(n)}</li>`)
        .join('')}</ul></section>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px 18px 42px;
    background: #eef2f7;
    color: ${BRAND.dark};
    font-family: Arial, Helvetica, "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1.5;
  }
  .page {
    max-width: 1080px;
    margin: 0 auto;
    background: #fff;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 18px 50px rgba(15,23,39,.14);
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 18px 26px;
    background: linear-gradient(135deg, #0f1727 0%, #1d2638 58%, #3a1016 100%);
    color: #fff;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .mark {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border-radius: 12px;
    background: ${BRAND.red}; color: #fff; font-size: 12px; font-weight: 800;
    letter-spacing: .6px; box-shadow: 0 8px 20px rgba(239,45,60,.35);
  }
  .brand strong { display: block; font-size: 15px; letter-spacing: .2px; }
  .brand span { display: block; font-size: 10px; color: #b9c4d4; letter-spacing: 1.2px; text-transform: uppercase; }
  .topbar .generated { text-align: right; font-size: 10px; color: #b9c4d4; line-height: 1.6; }
  .hero { padding: 26px 26px 8px; }
  .hero h1 { margin: 0; font-size: 26px; line-height: 1.2; letter-spacing: -.4px; }
  .hero p { margin: 8px 0 0; color: ${BRAND.muted}; font-size: 13px; }
  .meta {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px; margin: 20px 26px 0; padding: 14px 16px;
    background: ${BRAND.surface}; border: 1px solid ${BRAND.border}; border-radius: 12px;
  }
  .meta div { display: flex; flex-direction: column; gap: 2px; }
  .meta span { font-size: 9px; font-weight: 700; letter-spacing: .9px; text-transform: uppercase; color: ${BRAND.muted}; }
  .meta strong { font-size: 12px; color: ${BRAND.dark}; }
  .kpis {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px; margin: 16px 26px 0;
  }
  .kpi {
    border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 13px 14px;
    background: #fff; border-top: 3px solid #cbd5e1;
  }
  .kpi.danger { border-top-color: ${BRAND.danger}; background: #fff7f7; }
  .kpi.warning { border-top-color: ${BRAND.warning}; background: #fffaf0; }
  .kpi.success { border-top-color: ${BRAND.success}; background: #f6fff9; }
  .kpi.info { border-top-color: #2563eb; background: #f5f9ff; }
  .kpi-label { margin: 0; font-size: 9px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: ${BRAND.muted}; }
  .kpi-value { margin: 4px 0 0; font-size: 25px; font-weight: 800; line-height: 1; letter-spacing: -.5px; }
  .kpi-sub { margin: 4px 0 0; font-size: 10px; color: ${BRAND.muted}; }
  .section { padding: 22px 26px 4px; }
  .section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .section h2 { margin: 0; font-size: 14px; letter-spacing: -.1px; }
  .section-head p { margin: 4px 0 0; font-size: 11px; color: ${BRAND.muted}; }
  .count {
    white-space: nowrap; font-size: 9px; font-weight: 700; letter-spacing: .6px;
    text-transform: uppercase; color: ${BRAND.muted}; background: ${BRAND.surface};
    border: 1px solid ${BRAND.border}; border-radius: 999px; padding: 5px 9px;
  }
  table { width: 100%; border-collapse: collapse; border: 1px solid ${BRAND.border}; border-radius: 10px; overflow: hidden; }
  thead { display: table-header-group; }
  th {
    background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 700;
    letter-spacing: .7px; text-transform: uppercase; text-align: left;
    padding: 9px 10px; border-bottom: 1px solid ${BRAND.border};
  }
  td { padding: 8px 10px; border-bottom: 1px solid #eef2f7; vertical-align: top; font-size: 10.5px; }
  tbody tr:nth-child(even) { background: #fbfdff; }
  tbody tr:last-child td { border-bottom: 0; }
  tr { break-inside: avoid; }
  .badge {
    display: inline-block; padding: 2px 7px; border-radius: 999px;
    font-size: 9px; font-weight: 700; border: 1px solid transparent; white-space: nowrap;
  }
  .muted { color: ${BRAND.muted}; }
  .empty { padding: 18px; text-align: center; color: ${BRAND.muted}; background: ${BRAND.surface}; border: 1px dashed ${BRAND.border}; border-radius: 10px; font-size: 11px; }
  .notes { margin: 20px 26px 0; padding: 14px 16px; background: #fffaf0; border: 1px solid #fde68a; border-radius: 12px; }
  .notes h2 { margin: 0 0 6px; font-size: 12px; }
  .notes ul { margin: 0; padding-left: 18px; color: #92400e; font-size: 11px; line-height: 1.7; }
  .footer {
    margin-top: 24px; padding: 16px 26px; border-top: 1px solid ${BRAND.border};
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    color: ${BRAND.muted}; font-size: 9.5px; background: ${BRAND.surface};
  }
  .footer strong { color: ${BRAND.dark}; }
  .no-print {
    position: sticky; top: 12px; z-index: 5; display: flex; justify-content: flex-end;
    max-width: 1080px; margin: 0 auto 12px;
  }
  .no-print button {
    border: 0; border-radius: 10px; background: ${BRAND.red}; color: #fff;
    padding: 11px 18px; font-size: 12px; font-weight: 700; cursor: pointer;
    box-shadow: 0 8px 20px rgba(239,45,60,.3);
  }
  @media print {
    body { background: #fff; padding: 0; font-size: 10px; }
    .page { box-shadow: none; border-radius: 0; max-width: none; }
    .no-print { display: none !important; }
    .page-break-soft { break-before: auto; }
    .topbar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th, .badge, .kpi { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  ${autoPrint ? '<div class="no-print"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>' : ''}
  <div class="page">
    <header class="topbar">
      <div class="brand">
        <span class="mark">SOS</span>
        <div><strong>SmartRoad S.O.S</strong><span>Centro de control</span></div>
      </div>
      <div class="generated">Generado: ${escapeHtml(fmtNow())}<br>Sistema de monitoreo de fatiga</div>
    </header>
    <div class="hero">
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
    </div>
    ${metaHtml}
    ${kpiHtml}
    ${sectionsHtml}
    ${notesHtml}
    <footer class="footer">
      <span><strong>SmartRoad S.O.S</strong> · Detección de somnolencia y emergencias</span>
      <span>${escapeHtml(footer || 'Documento generado automáticamente por el panel de control.')}</span>
    </footer>
  </div>
  <script>
    window.addEventListener('load', function () {
      ${autoPrint ? 'setTimeout(function(){ window.print(); }, 350);' : ''}
    });
  </script>
</body>
</html>`;
}

export function downloadHtmlReport(config = {}) {
  const filename = config.filename || 'smartroad-reporte';
  const html = buildReportHtml({ ...config, autoPrint: false });
  download(`${filename.replace(/\.html?$/i, '')}.html`, html, 'text/html');
}

export function printReport(config = {}) {
  const html = buildReportHtml({ ...config, autoPrint: true });
  const win = window.open('', '_blank', 'width=1120,height=820');
  if (!win) {
    downloadHtmlReport(config);
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

function excelCell(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return escapeHtml(value);
}

export function exportExcel(config = {}) {
  const filename = (config.filename || 'smartroad-reporte').replace(/\.(xls|xlsx)$/i, '');
  const columns = config.columns || [];
  const rows = config.rows || [];
  const meta = config.meta || [];
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${excelCell(c.format ? c.format(row) : row[c.key])}</td>`).join('')}</tr>`)
    .join('');
  const metaHtml = meta
    .map((m) => `<tr><td style="font-weight:bold;background:#f1f5f9">${escapeHtml(m.label)}</td><td colspan="${Math.max(1, columns.length - 1)}">${escapeHtml(m.value)}</td></tr>`)
    .join('');
  const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="utf-8">
<title>${escapeHtml(config.title || 'Reporte SmartRoad S.O.S')}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0f1727; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 12px; color: #64748b; font-size: 11px; }
  table { border-collapse: collapse; }
  th { background: #0f1727; color: #fff; font-size: 10px; text-align: left; padding: 8px; border: 1px solid #cbd5e1; }
  td { font-size: 10px; padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
</style>
</head>
<body>
  <h1>${escapeHtml(config.title || 'Reporte SmartRoad S.O.S')}</h1>
  <p>${escapeHtml(config.subtitle || '')} · Generado ${escapeHtml(fmtNow())}</p>
  <table>
    ${metaHtml}
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
  download(`${filename}.xls`, html, 'application/vnd.ms-excel');
}
