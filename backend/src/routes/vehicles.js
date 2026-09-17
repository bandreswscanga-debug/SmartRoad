const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    const vehicles = await store.listVehicles();
    res.json({ vehicles });
  });

  router.get('/:id', async (req, res) => {
    const vehicle = await store.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado' });
    const telemetry = await store.getTelemetry(vehicle.id);
    res.json({ vehicle, telemetry });
  });

  router.patch('/:id', requireAdmin, async (req, res) => {
    const vehicle = await store.updateVehicle(req.params.id, req.body || {});
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado' });
    res.json({ vehicle });
  });

  return router;
};