'use strict';

// IA (Groq): sin key no tumba nada; endpoints exigen sesión y
// el conductor no analiza datos ajenos.
process.env.MYSQL_URL = '';
process.env.JWT_SECRET = 'smartroad_sos_secret_test';
delete process.env.GROQ_API_KEY;

const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/server');

let server;
let base;

test.before(async () => {
  const { app } = await createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function request(p, { method = 'GET', body, token } = {}) {
  const res = await fetch(base + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_err) {
    /* body vacío */
  }
  return { status: res.status, json };
}

async function login(email, password) {
  const r = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  return r.json.token;
}

test('GET /api/ia/estado exige sesión', async () => {
  const { status } = await request('/api/ia/estado');
  assert.equal(status, 401);
});

test('POST /api/ia/analizar sin key devuelve 503 sin tumbar', async () => {
  const token = await login('admin@smartroad-demo.com', 'Admin123');
  const { status, json } = await request('/api/ia/analizar', {
    method: 'POST',
    token,
    body: { tipo: 'MICRO_SUENO', riesgo: 'MEDIO', descripcion: 'Prueba', vehiculo_id: 1 }
  });
  assert.equal(status, 503);
  assert.match(json.error, /GROQ_API_KEY/);
});

test('conductor no analiza vehículo ajeno (403)', async () => {
  const token = await login('juan@smartroad-demo.com', 'Conductor123');
  const { status } = await request('/api/ia/analizar', {
    method: 'POST',
    token,
    body: { tipo: 'SOS', vehiculo_id: 4 }
  });
  assert.equal(status, 403);
});
