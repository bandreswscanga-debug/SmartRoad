const express = require('express');

// Info pública de la app (sin secretos): link de descarga del APK.
module.exports = () => {
  const router = express.Router();

  router.get('/app-info', (_req, res) => {
    res.json({
      apkUrl: process.env.APK_DOWNLOAD_URL || null,
      app: 'SmartRoad S.O.S conductor',
      version: '1.0.0'
    });
  });

  return router;
};
