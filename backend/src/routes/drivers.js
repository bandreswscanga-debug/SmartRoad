const express = require('express');
const { requireAuth } = require('../middleware/auth');

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    const drivers = await store.listDrivers();
    res.json({ drivers });
  });

  router.get('/:id', async (req, res) => {
    const driver = await store.getDriver(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Conductor no encontrado' });
    const vehicle = (await store.listDrivers()).find((d) => d.id === driver.id);
    const levels = await store.listEvents({ vehiculo_id: (vehicle && vehicle.vehiculo_id) || undefined });
    res.json({ driver, vehicle, fatiga: levels.slice(0, 40) });
  });

  return router;
};