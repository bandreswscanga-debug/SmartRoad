const express = require('express');
const { requireAuth } = require('../middleware/auth');

// Perfil del usuario logueado.
// PUT solo acepta nombre, teléfono, licencia y empresa.
// Correo, contraseña, rol, cédula y documento se ignoran aunque lleguen.
module.exports = (store) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password_hash, ...safe } = user;
    const conductor = user.rol === 'conductor' ? await store.getConductorByUserId(user.id) : null;
    res.json({ user: safe, conductor });
  });

  router.put('/', async (req, res) => {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { nombre, telefono, licencia, empresa } = req.body || {};
    const userPatch = {};
    if (nombre !== undefined && String(nombre).trim()) userPatch.nombre = String(nombre).trim();
    if (Object.keys(userPatch).length) await store.updateUser(user.id, userPatch);

    let conductor = null;
    if (user.rol === 'conductor') {
      conductor = await store.getConductorByUserId(user.id);
      if (conductor) {
        const patch = {};
        if (nombre !== undefined && String(nombre).trim()) patch.nombre = String(nombre).trim();
        if (telefono !== undefined) patch.telefono = telefono ? String(telefono).trim() : null;
        if (licencia !== undefined) patch.licencia = licencia ? String(licencia).trim() : null;
        if (empresa !== undefined) patch.empresa = empresa ? String(empresa).trim() : null;
        if (Object.keys(patch).length) conductor = await store.updateConductor(conductor.id, patch);
      }
    }
    const updated = await store.getUserById(user.id);
    const { password_hash, ...safe } = updated;
    res.json({ user: safe, conductor });
  });

  return router;
};
