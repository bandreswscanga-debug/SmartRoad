const express = require('express');
const fs = require('fs');
const { resolveApk, publicApkUrl, attachmentLimitMb, APK_MIME } = require('../services/mailer');

// Info pública de la app (sin secretos): link de descarga del APK y estado
// del adjunto en el correo de bienvenida.
module.exports = () => {
  const router = express.Router();

  router.get('/app-info', (req, res) => {
    const apk = resolveApk();
    const limit = attachmentLimitMb(process.env.RESEND_API_KEY ? 'resend' : 'smtp');
    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL
      ? ''
      : `${req.protocol}://${req.get('host')}`;
    res.json({
      apkUrl: publicApkUrl(apk, baseUrl),
      apkDisponible: Boolean(apk),
      apkArchivo: apk ? apk.filename : null,
      apkTamanoMb: apk ? apk.sizeMb : null,
      apkAdjuntoMaxMb: limit,
      apkSeAdjunta: Boolean(apk && apk.size <= limit * 1048576),
      app: 'SmartRoad S.O.S conductor',
      version: '1.0.0'
    });
  });

  // Descarga directa del APK servida por el propio backend.
  // Permite que el correo y el panel funcionen sin depender de Drive.
  router.get('/app/apk', (req, res) => {
    const apk = resolveApk();
    if (!apk) {
      return res.status(404).json({
        error: 'APK no disponible en el servidor. Configure APK_FILE_PATH o APK_DOWNLOAD_URL.'
      });
    }
    res.setHeader('Content-Type', APK_MIME);
    res.setHeader('Content-Length', apk.size);
    res.setHeader('Content-Disposition', `attachment; filename="${apk.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const stream = fs.createReadStream(apk.path);
    stream.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: `No se pudo leer el APK: ${err.message}` });
      else res.destroy(err);
    });
    stream.pipe(res);
  });

  return router;
};
