const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildEmail,
  resolveApk,
  publicApkUrl,
  attachmentLimitMb,
  APK_MIME
} = require('../src/services/mailer');

test('correo de bienvenida incluye credenciales y enlace de descarga', () => {
  const apk = { filename: 'app-release.apk', sizeMb: 76.8 };
  const url = 'https://api.smartroad.test/api/app/apk';
  const { subject, text, html } = buildEmail({
    nombre: 'Ana <Pérez>',
    to: 'ana@example.com',
    cedula: '12345678',
    apk,
    apkUrl: url,
    attached: false
  });

  assert.match(subject, /Bienvenido a SmartRoad/);
  assert.match(text, /ana@example\.com/);
  assert.match(text, /12345678/);
  assert.match(text, /https:\/\/api\.smartroad\.test\/api\/app\/apk/);
  assert.match(html, /href="https:\/\/api\.smartroad\.test\/api\/app\/apk"/);
  // El nombre se escapa para evitar inyección de HTML.
  assert.match(html, /Ana &lt;Pérez&gt;/);
  assert.doesNotMatch(html, /Ana <Pérez>/);
});

test('correo indica el adjunto cuando el APK cabe en el límite', () => {
  const apk = { filename: 'app-release.apk', sizeMb: 12 };
  const { text, html } = buildEmail({
    nombre: 'Luis',
    to: 'luis@example.com',
    cedula: '87654321',
    apk,
    apkUrl: 'https://api.smartroad.test/api/app/apk',
    attached: true
  });

  assert.match(text, /Adjuntamos la app del conductor/);
  assert.match(html, /APK adjunto:/);
  assert.match(html, /app-release\.apk/);
});

test('sin APK ni URL el correo no promete un enlace inexistente', () => {
  const { text, html } = buildEmail({
    nombre: 'Sin Apk',
    to: 'sin@example.com',
    cedula: '111',
    apk: null,
    apkUrl: null,
    attached: false
  });

  assert.match(text, /El administrador te compartirá el instalador/);
  assert.doesNotMatch(html, /Descargar la app/);
});

test('publicApkUrl prioriza APK_DOWNLOAD_URL y usa la base recibida', () => {
  const prev = {
    download: process.env.APK_DOWNLOAD_URL,
    base: process.env.PUBLIC_BASE_URL,
    render: process.env.RENDER_EXTERNAL_URL
  };
  delete process.env.APK_DOWNLOAD_URL;
  delete process.env.PUBLIC_BASE_URL;
  delete process.env.RENDER_EXTERNAL_URL;
  try {
    const apk = { filename: 'app-release.apk', size: 10 };
    assert.equal(publicApkUrl(apk, 'http://localhost:4000/'), 'http://localhost:4000/api/app/apk');
    assert.equal(publicApkUrl(null, 'http://localhost:4000'), null);

    process.env.APK_DOWNLOAD_URL = 'https://cdn.example.com/app.apk';
    assert.equal(publicApkUrl(apk, 'http://localhost:4000'), 'https://cdn.example.com/app.apk');
  } finally {
    if (prev.download === undefined) delete process.env.APK_DOWNLOAD_URL;
    else process.env.APK_DOWNLOAD_URL = prev.download;
    if (prev.base === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = prev.base;
    if (prev.render === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = prev.render;
  }
});

test('el límite de adjunto respeta APK_MAX_ATTACH_MB y el proveedor', () => {
  const prev = process.env.APK_MAX_ATTACH_MB;
  try {
    delete process.env.APK_MAX_ATTACH_MB;
    assert.equal(attachmentLimitMb('smtp'), 15);
    assert.equal(attachmentLimitMb('resend'), 25);

    process.env.APK_MAX_ATTACH_MB = '20';
    assert.equal(attachmentLimitMb('smtp'), 20);
  } finally {
    if (prev === undefined) delete process.env.APK_MAX_ATTACH_MB;
    else process.env.APK_MAX_ATTACH_MB = prev;
  }
});

test('resolveApk devuelve metadatos coherentes si el APK existe', () => {
  const apk = resolveApk();
  if (!apk) return; // El APK no se versiona; el test no debe fallar por eso.
  assert.equal(apk.filename, 'app-release.apk');
  assert.ok(apk.size > 0);
  assert.ok(apk.sizeMb > 0);
  assert.equal(APK_MIME, 'application/vnd.android.package-archive');
});
