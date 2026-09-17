const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { riskRank } = require('../services/storage');

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    const zones = await store.listSafeZones();
    res.json({ zonas: zones });
  });

  router.get('/near/:lat/:lng', async (req, res) => {
    const lat = Number(req.params.lat);
    const lng = Number(req.params.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ error: 'Coordenadas inválidas' });
    const zones = await store.listSafeZones();
    const dist = (z) => {
      const dLng = (z.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
      const dLat = (z.lat - lat) * 111;
      return Math.round(Math.sqrt(dLng * dLng + dLat * dLat) * 10) / 10;
    };
    const ranked = zones
      .map((z) => ({ ...z, distancia_km: Math.max(0.1, dist(z)) }))
      .sort((a, b) => a.distancia_km - b.distancia_km)
      .slice(0, 3);
    res.json({ zonas: ranked });
  });

  return router;
};