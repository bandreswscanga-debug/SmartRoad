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
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await store.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } });
  });

  return router;
};