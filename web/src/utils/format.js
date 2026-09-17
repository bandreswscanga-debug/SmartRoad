export const RISK_COLOR = {
  BAJO: '#2bd67b',
  MEDIO: '#f5b92e',
  CRITICO: '#ef2d3c'
};

export const RISK_LABEL = { BAJO: 'Riesgo bajo', MEDIO: 'Riesgo medio', CRITICO: 'Riesgo crítico' };

export const RISK_ORDER = ['BAJO', 'MEDIO', 'CRITICO'];

export const EVENT_LABEL = {
  MICRO_SUENO: 'Micro sueño',
  SOMNOLENCIA_ALTA: 'Somnolencia alta',
  FATIGA_PROLONGADA: 'Fatiga prolongada',
  DISTRACCION: 'Distracción',
  SOS: 'Señal SOS',
  ACCIDENTE: 'Accidente'
};

export const EVENT_ICON = {
  MICRO_SUENO: 'eye',
  SOMNOLENCIA_ALTA: 'alert',
  FATIGA_PROLONGADA: 'hourglass',
  DISTRACCION: 'eye-off',
  SOS: 'sos',
  ACCIDENTE: 'car'
};

export function timeAgo(iso) {
  if (!iso) return 'hace un momento';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'hace un momento';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'hace ' + Math.floor(s) + ' s';
  if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min';
  if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
  return 'hace ' + Math.floor(s / 86400) + ' días';
}

export function fmtClock(iso) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtUptime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function toCsv(rows, headers) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = headers.map((h) => h.label).join(',');
  const body = rows.map((r) => headers.map((h) => esc(h.key ? r[h.key] : h.get(r))).join(','));
  return [head, ...body].join('\n');
}

export function download(filename, content, mime = 'text/csv') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}