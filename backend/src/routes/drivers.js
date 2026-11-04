const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    const drivers = await store.listDrivers();
    res.json({ drivers });
  });

  router.get('/me/profile', async (req, res) => {
    if (req.user.rol !== 'conductor') return res.status(403).json({ error: 'Ruta exclusiva para conductores' });
    const driver = await store.getDriverByUserId(req.user.id);
    if (!driver) return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    res.json({ driver });
  });

  router.get('/me/events', async (req, res) => {
    if (req.user.rol !== 'conductor') return res.status(403).json({ error: 'Ruta exclusiva para conductores' });
    const driver = await store.getDriverByUserId(req.user.id);
    if (!driver) return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    res.json({ events: await store.listDriverEvents(driver.id) });
  });

  router.get('/:id', async (req, res) => {
    const driver = await store.getDriver(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Conductor no encontrado' });
    const vehicle = (await store.listDrivers()).find((d) => d.id === driver.id);
    const levels = await store.listEvents({ vehiculo_id: (vehicle && vehicle.vehiculo_id) || undefined });
    res.json({ driver, vehicle, fatiga: levels.slice(0, 40) });
  });

  router.post('/:id/verify', requireAdmin, async (req, res) => {
    const status = req.body?.verificacion_estado || 'VERIFICADO';
    if (!['VERIFICADO', 'RECHAZADO', 'PENDIENTE'].includes(status)) return res.status(400).json({ error: 'Estado de verificación inválido' });
    const driver = await store.setDriverVerification(req.params.id, status);
    if (!driver) return res.status(404).json({ error: 'Conductor no encontrado' });
    res.json({ driver });
  });

  return router;
};