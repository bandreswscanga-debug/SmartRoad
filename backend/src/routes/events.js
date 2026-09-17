const express = require('express');
const { requireAuth } = require('../middleware/auth');

module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const events = await store.listEvents(req.query);
    res.json({ events, total: events.length });
  });

  router.get('/:id', async (req, res) => {
    const event = await store.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ event });
  });

  router.post('/:id/ack', async (req, res) => {
    const event = await store.updateEvent(req.params.id, {
      atendido: true,
      atendido_por: req.body.atendido_por || req.user.nombre
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json({ event });
  });

  return router;
};