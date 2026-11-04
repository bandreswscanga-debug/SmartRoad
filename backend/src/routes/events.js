const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { conductorVehicleIds } = require('../services/scope');

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    let events = await store.listEvents(req.query);
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      events = events.filter((e) => ids.includes(Number(e.vehiculo_id)));
    }
    res.json({ events, total: events.length });
  });

  router.get('/:id', async (req, res) => {
    const event = await store.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      if (!ids.includes(Number(event.vehiculo_id))) {
        return res.status(403).json({ error: 'No puede ver datos de otro conductor' });
      }
    }
    res.json({ event });
  });

  router.post('/:id/ack', async (req, res) => {
    const event = await store.updateEvent(req.params.id, {
      atendido: true,
      atendido_por: req.body.atendido_por || req.user.nombre
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    if (req.user.rol === 'conductor') {
      const ids = await conductorVehicleIds(store, req.user);
      if (!ids.includes(Number(event.vehiculo_id))) {
        return res.status(403).json({ error: 'No puede ver datos de otro conductor' });
      }
    }
    res.json({ event });
  });

  return router;
};
