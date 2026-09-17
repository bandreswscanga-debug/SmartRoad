const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'smartroad_sos_secret_2026';

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }, SECRET, {
    expiresIn: process.env.TOKEN_EXPIRES || '12h'
  });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.rol === 'admin') return next();
  return res.status(403).json({ error: 'Acceso restringido a administradores' });
}

module.exports = { sign, requireAuth, requireAdmin };