// Envío del correo de bienvenida al registrar un conductor.
// Soporta Resend (API HTTP, sin dependencias), SMTP clásico (Nodemailer) y
// Ethereal como demo. Si el APK está disponible en disco se adjunta al correo
// siempre que no supere el límite del proveedor; si no, el correo incluye un
// botón de descarga directa servido por el propio backend.
const fs = require('fs');
const path = require('path');

const APK_CANDIDATES = [
  process.env.APK_FILE_PATH,
  path.resolve(__dirname, '../../../mobile/build/app/outputs/flutter-apk/app-release.apk'),
  path.resolve(__dirname, '../../mobile/build/app/outputs/flutter-apk/app-release.apk'),
  path.resolve(process.cwd(), 'mobile/build/app/outputs/flutter-apk/app-release.apk'),
  path.resolve(process.cwd(), '../mobile/build/app/outputs/flutter-apk/app-release.apk')
].filter(Boolean);

const APK_MIME = 'application/vnd.android.package-archive';

function resolveApk() {
  for (const candidate of APK_CANDIDATES) {
    try {
      const stat = fs.statSync(candidate);
      if (!stat.isFile() || stat.size <= 0) continue;
      return {
        path: candidate,
        filename: path.basename(candidate),
        size: stat.size,
        sizeMb: Math.round((stat.size / 1048576) * 10) / 10
      };
    } catch (_err) {
      /* siguiente candidato */
    }
  }
  return null;
}

function publicBaseUrl(fallback = '') {
  const raw = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || fallback || '';
  return raw ? String(raw).replace(/\/+$/, '') : '';
}

// `baseUrl` permite usar el origen real de la petición cuando no hay
// PUBLIC_BASE_URL configurado (por ejemplo en local o tras un proxy).
function publicApkUrl(apk = resolveApk(), baseUrl = '') {
  if (process.env.APK_DOWNLOAD_URL) return process.env.APK_DOWNLOAD_URL;
  if (!apk) return null;
  const base = publicBaseUrl(baseUrl);
  if (base) return `${base}/api/app/apk`;
  return null;
}

// Límite real del proveedor. Gmail/la mayoría de SMTP: ~25 MB de mensaje
// (el base64 del adjunto pesa ~33 % más). Resend admite mensajes mayores.
function attachmentLimitMb(via) {
  const configured = Number(process.env.APK_MAX_ATTACH_MB);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return via === 'resend' ? 25 : 15;
}

function canAttach(apk, via) {
  return Boolean(apk && apk.size <= attachmentLimitMb(via) * 1048576);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function buildEmail({ nombre, to, cedula, apk, apkUrl, attached }) {
  const safeNombre = escapeHtml(nombre);
  const safeTo = escapeHtml(to);
  const safeCedula = escapeHtml(cedula);
  const safeApkUrl = apkUrl ? escapeHtml(apkUrl) : '';
  const subject = 'Bienvenido a SmartRoad S.O.S — tu acceso y la app del conductor';
  const sizeText = apk ? ` (${apk.sizeMb} MB)` : '';

  const text =
    `Hola ${nombre},\n\n` +
    `Tu cuenta de conductor en SmartRoad S.O.S ya está activa.\n\n` +
    `Usuario: ${to}\n` +
    `Clave inicial: ${cedula}\n` +
    `Cámbiala en tu primer ingreso desde Perfil.\n\n` +
    (attached
      ? `Adjuntamos la app del conductor (${apk.filename}${sizeText}). Instálala en tu celular Android.\n`
      : apkUrl
        ? `Descarga la app del conductor aquí: ${apkUrl}\n`
        : `El administrador te compartirá el instalador de la app (APK).\n`) +
    `\nPasos para empezar:\n` +
    `1. Abre el enlace o el archivo adjunto y permite instalar apps de esta fuente.\n` +
    `2. Instala SmartRoad S.O.S.\n` +
    `3. Ingresa con tu correo y tu cédula como clave inicial.\n\n` +
    `Por seguridad, cambia la clave en el primer ingreso.\n\n` +
    `Centro de control SmartRoad S.O.S`;

  const downloadBlock = attached
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0">
         <tr><td style="border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;padding:14px 16px">
           <p style="margin:0;font-size:13px;line-height:1.5;color:#166534">
             <strong>APK adjunto:</strong> ${escapeHtml(apk.filename)}${escapeHtml(sizeText)}.
             Ábrelo desde este correo en tu celular Android para instalar la app.
           </p>
         </td></tr>
       </table>`
    : apkUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px">
           <tr><td align="center" style="border-radius:10px;background:#ef2d3c">
             <a href="${safeApkUrl}" target="_blank" rel="noreferrer"
                style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">
               Descargar la app · APK${escapeHtml(sizeText)}
             </a>
           </td></tr>
         </table>
         <p style="margin:8px 0 0;font-size:11px;line-height:1.5;color:#64748b">
           Si el botón no abre, copia este enlace en tu navegador:<br>
           <a href="${safeApkUrl}" style="color:#2563eb;word-break:break-all">${safeApkUrl}</a>
         </p>`
      : `<p style="margin:18px 0 0;font-size:13px;color:#475569">
           El administrador te compartirá el instalador de la app (APK) por otro medio.
         </p>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f1727">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 34px rgba(15,23,39,0.12)">
        <tr>
          <td style="background:linear-gradient(135deg,#0f1727 0%,#1d2638 55%,#3a1016 100%);padding:28px 30px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;background:#ef2d3c;color:#fff;font-size:11px;font-weight:800;letter-spacing:1.6px;padding:7px 11px;border-radius:8px">SMARTROAD S.O.S</div>
                  <h1 style="margin:16px 0 4px;font-size:24px;line-height:1.2;color:#ffffff">Tu acceso está listo</h1>
                  <p style="margin:0;font-size:13px;color:#b9c4d4">Centro de control de somnolencia y emergencias</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:30px">
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hola <strong>${safeNombre}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">
              Tu cuenta de conductor fue creada correctamente. Estos son tus datos de acceso:
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
              <tr>
                <td style="width:42%;background:#f8fafc;padding:12px 14px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0">Usuario</td>
                <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#0f1727;border-bottom:1px solid #e2e8f0">${safeTo}</td>
              </tr>
              <tr>
                <td style="width:42%;background:#f8fafc;padding:12px 14px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#64748b">Clave inicial</td>
                <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#0f1727">${safeCedula}</td>
              </tr>
            </table>

            ${downloadBlock}

            <h2 style="margin:28px 0 10px;font-size:15px;color:#0f1727">Cómo empezar</h2>
            <ol style="margin:0;padding-left:20px;font-size:13px;line-height:1.8;color:#475569">
              <li>Instala la app SmartRoad S.O.S en tu celular Android.</li>
              <li>Ingresa con tu correo y tu cédula como clave inicial.</li>
              <li>Cambia la clave desde <strong>Perfil</strong> en tu primer ingreso.</li>
            </ol>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
              <tr><td style="border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;padding:12px 14px">
                <p style="margin:0;font-size:12px;line-height:1.55;color:#9a3412">
                  <strong>Seguridad:</strong> no compartas tu clave. Si no solicitaste esta cuenta, ignora este mensaje.
                </p>
              </td></tr>
            </table>

            <p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#475569">
              Cualquier duda, contacta al administrador de tu flota.
            </p>
            <p style="margin:22px 0 0;font-size:13px;font-weight:700;color:#0f1727">Centro de control SmartRoad S.O.S</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0f1727;padding:18px 30px">
            <p style="margin:0;font-size:11px;line-height:1.6;color:#8b98ab">
              SmartRoad S.O.S · Sistema de detección de somnolencia y emergencias.<br>
              Este es un correo automático, no respondas a este mensaje.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendWelcomeEmail({ to, nombre, cedula, baseUrl = '' }) {
  const apk = resolveApk();
  const apkUrl = publicApkUrl(apk, baseUrl);
  const from = process.env.MAIL_FROM || 'SmartRoad S.O.S <no-reply@smartroad.local>';

  const via = process.env.RESEND_API_KEY ? 'resend' : process.env.SMTP_HOST ? 'smtp' : 'ethereal-demo';
  const attached = canAttach(apk, via === 'resend' ? 'resend' : 'smtp');
  const { subject, text, html } = buildEmail({ nombre, to, cedula, apk, apkUrl, attached });

  const apkMeta = {
    adjunto: attached,
    archivo: apk ? apk.filename : null,
    tamano_mb: apk ? apk.sizeMb : null,
    url: apkUrl,
    limite_adjunto_mb: attachmentLimitMb(via === 'resend' ? 'resend' : 'smtp')
  };

  // 1. Resend (recomendado gratuito): solo necesita RESEND_API_KEY.
  if (process.env.RESEND_API_KEY) {
    try {
      const payload = { from, to, subject, text, html };
      if (attached) {
        payload.attachments = [
          {
            filename: apk.filename,
            content: fs.readFileSync(apk.path).toString('base64'),
            content_type: APK_MIME
          }
        ];
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { enviado: false, via: 'resend', apk: apkMeta, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
      }
      return { enviado: true, via: 'resend', apk: apkMeta };
    } catch (err) {
      return { enviado: false, via: 'resend', apk: apkMeta, error: String(err.message || err).slice(0, 200) };
    }
  }

  // 2. SMTP clásico (Nodemailer).
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: String(process.env.SMTP_SECURE) === '1',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
          : undefined
      });
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
        ...(attached
          ? { attachments: [{ filename: apk.filename, path: apk.path, contentType: APK_MIME }] }
          : {})
      });
      return { enviado: true, via: 'smtp', apk: apkMeta };
    } catch (err) {
      return { enviado: false, via: 'smtp', apk: apkMeta, error: String(err.message || err).slice(0, 200) };
    }
  }

  // 3. Sin configuración: cuenta de prueba Ethereal (demo real sin credenciales).
  try {
    const nodemailer = require('nodemailer');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      ...(attached
        ? { attachments: [{ filename: apk.filename, path: apk.path, contentType: APK_MIME }] }
        : {})
    });
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`[mailer] Bienvenida demo enviada a ${to}. Vista previa: ${preview}`);
    return { enviado: true, via: 'ethereal-demo', preview, apk: apkMeta };
  } catch (err) {
    console.warn(`[mailer] Sin servicio de correo (${String(err.message || err).slice(0, 120)}). Bienvenida para ${to} (clave: cédula). Defina RESEND_API_KEY o SMTP_HOST.`);
    return {
      enviado: false,
      via: 'none',
      apk: apkMeta,
      error: 'Sin servicio de correo. Defina RESEND_API_KEY o SMTP_HOST. Registro conservado.'
    };
  }
}

module.exports = {
  sendWelcomeEmail,
  buildEmail,
  resolveApk,
  publicApkUrl,
  attachmentLimitMb,
  APK_MIME
};
