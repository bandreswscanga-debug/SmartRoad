const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, sign } = require('../middleware/auth');
const { clientIp } = require('../services/tracer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 200;
const MAX_PASSWORD = 128;

function validateLogin(email, password) {
  if (!email || !password) return 'Correo y contraseña son obligatorios';
  if (String(email).length > MAX_EMAIL || !EMAIL_RE.test(String(email))) return 'Correo electrónico inválido';
  if (String(password).length < 4 || String(password).length > MAX_PASSWORD) {
    return 'La contraseña debe tener entre 4 y 128 caracteres';
  }
  return null;
}

module.exports = (store, ctx = {}) => {
  const router = express.Router();
  const tracer = ctx.tracer;

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    const erro = validateLogin(email, password);
    if (erro) return res.status(400).json({ error: erro });
    const ip = tracer ? clientIp(req) : null;
    const user = await store.findUserByEmail(String(email).toLowerCase());
    if (!user) {
      tracer?.trace('ERROR', `[AUTH] Intento de login fallido para "${email}" (usuario no existe).`, ip);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      tracer?.trace('ERROR', `[AUTH] Intento de login fallido para "${email}" (contraseña incorrecta).`, ip);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    if (!user.activo) return res.status(403).json({ error: 'Usuario inactivo' });
    tracer?.trace('INFO', `[AUTH] Login exitoso de "${email}" (${user.rol}).`, ip);
    const token = sign(user);
    const conductor = user.rol === 'conductor' ? await store.getConductorByUserId(user.id) : null;
    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      must_change_password: Boolean(user.must_change_password),
      conductor_id: conductor ? conductor.id : null
    });
  });

  // Cambio de contraseña (autenticado). Cumple la recomendación de seguridad:
  // la cédula como clave inicial debe cambiarse en el primer ingreso.
  router.post('/change-password', requireAuth, async (req, res) => {
    const { actual, nueva } = req.body || {};
    if (!actual || !nueva) return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
    if (String(nueva).length < 8 || String(nueva).length > 128) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener entre 8 y 128 caracteres' });
    }
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await bcrypt.compare(String(actual), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    const password_hash = await bcrypt.hash(String(nueva), 10);
    await store.updateUser(user.id, { password_hash, must_change_password: 0 });
    res.json({ ok: true });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  });

  return router;
};