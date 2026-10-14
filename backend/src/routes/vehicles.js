const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { conductorVehicleIds } = require('../services/scope');

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    let vehicles = await store.listVehicles();
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      vehicles = vehicles.filter((v) => ids.includes(v.id));
    }
    res.json({ vehicles });
  });

  router.get('/:id', async (req, res) => {
    const vehicle = await store.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehículo no encontrado' });
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      if (!ids.includes(vehicle.id)) return res.status(403).json({ error: 'No puede ver datos de otro conductor' });
    }
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
