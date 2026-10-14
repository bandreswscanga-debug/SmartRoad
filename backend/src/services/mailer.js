// Envío del correo de bienvenida al registrar un conductor.
// Soporta Resend (API HTTP, sin dependencias) o SMTP vía Nodemailer.
// Si no hay configuración, no tumba el registro: devuelve enviado:false
// y el admin ve el aviso en el panel.
async function sendWelcomeEmail({ to, nombre, cedula }) {
  const apkUrl = process.env.APK_DOWNLOAD_URL || null;
  const from = process.env.MAIL_FROM || 'SmartRoad S.O.S <no-reply@smartroad.local>';
  const subject = 'Bienvenido a SmartRoad S.O.S — acceso a la app del conductor';
  const text =
    `Hola ${nombre},\n\n` +
    `Tu cuenta de conductor fue creada.\n` +
    `Usuario: ${to}\n` +
    `Clave inicial: ${cedula} (cámbiala en tu primer ingreso desde Perfil).\n\n` +
    (apkUrl ? `Descarga la app (APK): ${apkUrl}\n\n` : `El administrador te compartirá el instalador de la app (APK).\n\n`) +
    `Centro de control SmartRoad S.O.S`;
  const html =
    `<p>Hola <b>${escapeHtml(nombre)}</b>,</p>` +
    `<p>Tu cuenta de conductor fue creada.</p>` +
    `<ul><li>Usuario: <b>${escapeHtml(to)}</b></li>` +
    `<li>Clave inicial: <b>${escapeHtml(cedula)}</b> (cámbiala en tu primer ingreso desde Perfil).</li></ul>` +
    (apkUrl
      ? `<p><a href="${escapeHtml(apkUrl)}">Descargar la app (APK)</a></p>`
      : `<p>El administrador te compartirá el instalador de la app (APK).</p>`) +
    `<p>Centro de control SmartRoad S.O.S</p>`;

  // 1. Resend (recomendado gratuito): solo necesita RESEND_API_KEY.
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to, subject, text, html })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { enviado: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
      }
      return { enviado: true, via: 'resend' };
    } catch (err) {
      return { enviado: false, error: String(err.message || err).slice(0, 200) };
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
      await transporter.sendMail({ from, to, subject, text, html });
      return { enviado: true, via: 'smtp' };
    } catch (err) {
      return { enviado: false, error: String(err.message || err).slice(0, 200) };
    }
  }

  // 3. Sin configuración: se registra en consola y se avisa sin fallar.
  console.warn(`[mailer] Correo no configurado. Bienvenida para ${to} (clave: cédula). Defina RESEND_API_KEY o SMTP_HOST.`);
  return { enviado: false, error: 'Correo no configurado (RESEND_API_KEY o SMTP_HOST). Registro conservado.' };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

module.exports = { sendWelcomeEmail };
