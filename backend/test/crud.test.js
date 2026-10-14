'use strict';

process.env.MYSQL_URL = '';
process.env.JWT_SECRET = 'smartroad_sos_secret_test';

const test = require('node:test');
const assert = require('node:assert/strict');

// Mock del pool MySQL con datos simulados
let mockId = 100;
const mockData = {};

const mockPool = {
  query: async (sql, params) => {
    // Simular respuestas según el SQL
    if (sql.includes('INSERT INTO `conductor`')) {
      const id = ++mockId;
      mockData[id] = { id_conductor: id, nombre: params[0], documento: params[1], telefono: params[2], estado: 'activo' };
      return [{ insertId: id }];
    }
    if (sql.includes('SELECT') && sql.includes('FROM `conductor`') && sql.includes('WHERE')) {
      const id = params[0];
      return [mockData[id] ? [mockData[id]] : []];
    }
    if (sql.includes('SELECT') && sql.includes('FROM `conductor`')) {
      return [Object.values(mockData)];
    }
    if (sql.includes('UPDATE `conductor`')) {
      const id = params[params.length - 1];
      if (mockData[id]) Object.assign(mockData[id], { nombre: params[0] });
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('DELETE FROM `conductor`')) {
      const id = params[0];
      delete mockData[id];
      return [{ affectedRows: 1 }];
    }
    // Default
    return [[]];
  },
  execute: async () => [[]],
  getConnection: async () => ({
    ping: async () => {},
    release: () => {}
  })
};

// Inyectar mock antes de requerir el CRUD
const crudDb = require('../src/smartroad-crud/db');
crudDb.getPool = () => mockPool;

const { createApp } = require('../src/server');

let server;
let base;
let adminToken;

test.before(async () => {
  const { app } = await createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@smartroad-demo.com', password: 'Admin123' })
  });
  const loginData = await login.json();
  adminToken = loginData.token;
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

// ============ CONDUCTOR ============

test('CRUD conductor: crear -> leer -> actualizar -> eliminar', async () => {
  // Crear
  const created = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Test Conductor', documento: 'DOC-TEST-001', telefono: '3000000000' }
  });
  assert.equal(created.status, 201);
  assert.ok(created.json.datos.id_conductor);

  const id = created.json.datos.id_conductor;

  // Leer
  const read = await request(`/api/conductor/${id}`, { token: adminToken });
  assert.equal(read.status, 200);
  assert.equal(read.json.datos.nombre, 'Test Conductor');

  // Actualizar
  const updated = await request(`/api/conductor/${id}`, {
    method: 'PUT',
    token: adminToken,
    body: { nombre: 'Test Conductor Actualizado' }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.datos.nombre, 'Test Conductor Actualizado');

  // Eliminar
  const deleted = await request(`/api/conductor/${id}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert.equal(deleted.status, 200);

  // Verificar eliminación
  const notFound = await request(`/api/conductor/${id}`, { token: adminToken });
  assert.equal(notFound.status, 404);
});

test('CRUD conductor: validaciones de campos obligatorios', async () => {
  // Falta nombre
  const sinNombre = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { documento: 'DOC-TEST-002', telefono: '3000000000' }
  });
  assert.equal(sinNombre.status, 400);

  // Falta documento
  const sinDocumento = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Test', telefono: '3000000000' }
  });
  assert.equal(sinDocumento.status, 400);
});

// ============ VEHICULO ============

test('CRUD vehiculo: crear con FK valida -> leer -> actualizar -> eliminar', async () => {
  // Primero crear conductor
  const conductor = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Conductor Vehiculo', documento: 'DOC-VEH-001', telefono: '3000000001' }
  });
  const conductorId = conductor.json.datos.id_conductor;

  // Crear vehiculo
  const created = await request('/api/vehiculo', {
    method: 'POST',
    token: adminToken,
    body: { placa: 'TEST-001', tipo: 'Automóvil', id_conductor: conductorId }
  });
  assert.equal(created.status, 201);
  assert.ok(created.json.datos.id_vehiculo);

  const id = created.json.datos.id_vehiculo;

  // Leer con JOIN
  const read = await request(`/api/vehiculo/${id}`, { token: adminToken });
  assert.equal(read.status, 200);
  assert.equal(read.json.datos.placa, 'TEST-001');
  assert.ok(read.json.datos.nombre_conductor);

  // Actualizar
  const updated = await request(`/api/vehiculo/${id}`, {
    method: 'PUT',
    token: adminToken,
    body: { tipo: 'Camioneta' }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.datos.tipo, 'Camioneta');

  // Eliminar
  const deleted = await request(`/api/vehiculo/${id}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert.equal(deleted.status, 200);

  // Limpiar conductor
  await request(`/api/conductor/${conductorId}`, { method: 'DELETE', token: adminToken });
});

test('CRUD vehiculo: FK invalida devuelve 400', async () => {
  const res = await request('/api/vehiculo', {
    method: 'POST',
    token: adminToken,
    body: { placa: 'TEST-002', tipo: 'Automóvil', id_conductor: 999999 }
  });
  assert.equal(res.status, 400);
});

// ============ DISPOSITIVO ============

test('CRUD dispositivo: crear -> leer -> actualizar -> eliminar', async () => {
  // Crear conductor y vehiculo
  const conductor = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Conductor Dispositivo', documento: 'DOC-DIS-001', telefono: '3000000002' }
  });
  const vehiculo = await request('/api/vehiculo', {
    method: 'POST',
    token: adminToken,
    body: { placa: 'TEST-003', tipo: 'Automóvil', id_conductor: conductor.json.datos.id_conductor }
  });
  const vehiculoId = vehiculo.json.datos.id_vehiculo;

  // Crear dispositivo
  const created = await request('/api/dispositivo', {
    method: 'POST',
    token: adminToken,
    body: { tipo_sensor: 'Cámara IA', id_vehiculo: vehiculoId }
  });
  assert.equal(created.status, 201);
  assert.ok(created.json.datos.id_dispositivo);

  const id = created.json.datos.id_dispositivo;

  // Leer
  const read = await request(`/api/dispositivo/${id}`, { token: adminToken });
  assert.equal(read.status, 200);
  assert.equal(read.json.datos.tipo_sensor, 'Cámara IA');

  // Actualizar
  const updated = await request(`/api/dispositivo/${id}`, {
    method: 'PUT',
    token: adminToken,
    body: { tipo_sensor: 'Cámara IA PRO' }
  });
  assert.equal(updated.status, 200);

  // Eliminar
  const deleted = await request(`/api/dispositivo/${id}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert.equal(deleted.status, 200);

  // Limpiar
  await request(`/api/vehiculo/${vehiculoId}`, { method: 'DELETE', token: adminToken });
  await request(`/api/conductor/${conductor.json.datos.id_conductor}`, { method: 'DELETE', token: adminToken });
});

test('CRUD dispositivo: duplicado devuelve 409', async () => {
  // Crear conductor y vehiculo
  const conductor = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Conductor Dup', documento: 'DOC-DUP-001', telefono: '3000000003' }
  });
  const vehiculo = await request('/api/vehiculo', {
    method: 'POST',
    token: adminToken,
    body: { placa: 'TEST-004', tipo: 'Automóvil', id_conductor: conductor.json.datos.id_conductor }
  });
  const vehiculoId = vehiculo.json.datos.id_vehiculo;

  // Crear primer dispositivo
  await request('/api/dispositivo', {
    method: 'POST',
    token: adminToken,
    body: { tipo_sensor: 'Cámara IA', id_vehiculo: vehiculoId }
  });

  // Intentar crear segundo dispositivo para el mismo vehiculo
  const duplicado = await request('/api/dispositivo', {
    method: 'POST',
    token: adminToken,
    body: { tipo_sensor: 'Cámara IA 2', id_vehiculo: vehiculoId }
  });
  assert.equal(duplicado.status, 409);

  // Limpiar
  const dispositivos = await request('/api/dispositivo', { token: adminToken });
  for (const d of dispositivos.json.datos) {
    if (d.id_vehiculo === vehiculoId) {
      await request(`/api/dispositivo/${d.id_dispositivo}`, { method: 'DELETE', token: adminToken });
    }
  }
  await request(`/api/vehiculo/${vehiculoId}`, { method: 'DELETE', token: adminToken });
  await request(`/api/conductor/${conductor.json.datos.id_conductor}`, { method: 'DELETE', token: adminToken });
});

// ============ EVENTO ============

test('CRUD evento: crear -> leer -> actualizar -> eliminar', async () => {
  // Crear cadena completa
  const conductor = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Conductor Evento', documento: 'DOC-EVE-001', telefono: '3000000004' }
  });
  const vehiculo = await request('/api/vehiculo', {
    method: 'POST',
    token: adminToken,
    body: { placa: 'TEST-005', tipo: 'Automóvil', id_conductor: conductor.json.datos.id_conductor }
  });
  const dispositivo = await request('/api/dispositivo', {
    method: 'POST',
    token: adminToken,
    body: { tipo_sensor: 'Cámara IA', id_vehiculo: vehiculo.json.datos.id_vehiculo }
  });
  const dispositivoId = dispositivo.json.datos.id_dispositivo;

  // Crear evento
  const created = await request('/api/evento', {
    method: 'POST',
    token: adminToken,
    body: { tipo_evento: 'Somnolencia', nivel_riesgo: 'alto', id_dispositivo: dispositivoId }
  });
  assert.equal(created.status, 201);
  assert.ok(created.json.datos.id_evento);

  const id = created.json.datos.id_evento;

  // Leer
  const read = await request(`/api/evento/${id}`, { token: adminToken });
  assert.equal(read.status, 200);
  assert.equal(read.json.datos.tipo_evento, 'Somnolencia');

  // Actualizar
  const updated = await request(`/api/evento/${id}`, {
    method: 'PUT',
    token: adminToken,
    body: { nivel_riesgo: 'critico' }
  });
  assert.equal(updated.status, 200);

  // Eliminar
  const deleted = await request(`/api/evento/${id}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert.equal(deleted.status, 200);

  // Limpiar
  await request(`/api/dispositivo/${dispositivoId}`, { method: 'DELETE', token: adminToken });
  await request(`/api/vehiculo/${vehiculo.json.datos.id_vehiculo}`, { method: 'DELETE', token: adminToken });
  await request(`/api/conductor/${conductor.json.datos.id_conductor}`, { method: 'DELETE', token: adminToken });
});

// ============ ALERTA ============

test('CRUD alerta: crear -> leer -> actualizar -> eliminar', async () => {
  // Crear cadena completa
  const conductor = await request('/api/conductor', {
    method: 'POST',
    token: adminToken,
    body: { nombre: 'Conductor Alerta', documento: 'DOC-ALA-001', telefono: '3000000005' }
  });
  const vehiculo = await request('/api/vehiculo', {
    method: 'POST',
    token: adminToken,
    body: { placa: 'TEST-006', tipo: 'Automóvil', id_conductor: conductor.json.datos.id_conductor }
  });
  const dispositivo = await request('/api/dispositivo', {
    method: 'POST',
    token: adminToken,
    body: { tipo_sensor: 'Cámara IA', id_vehiculo: vehiculo.json.datos.id_vehiculo }
  });
  const evento = await request('/api/evento', {
    method: 'POST',
    token: adminToken,
    body: { tipo_evento: 'Somnolencia', nivel_riesgo: 'alto', id_dispositivo: dispositivo.json.datos.id_dispositivo }
  });
  const eventoId = evento.json.datos.id_evento;

  // Crear alerta
  const created = await request('/api/alerta', {
    method: 'POST',
    token: adminToken,
    body: { tipo_alerta: 'SMS', id_evento: eventoId }
  });
  assert.equal(created.status, 201);
  assert.ok(created.json.datos.id_alerta);

  const id = created.json.datos.id_alerta;

  // Leer
  const read = await request(`/api/alerta/${id}`, { token: adminToken });
  assert.equal(read.status, 200);
  assert.equal(read.json.datos.tipo_alerta, 'SMS');

  // Actualizar
  const updated = await request(`/api/alerta/${id}`, {
    method: 'PUT',
    token: adminToken,
    body: { estado: 'atendida' }
  });
  assert.equal(updated.status, 200);

  // Eliminar
  const deleted = await request(`/api/alerta/${id}`, {
    method: 'DELETE',
    token: adminToken
  });
  assert.equal(deleted.status, 200);

  // Limpiar
  await request(`/api/evento/${eventoId}`, { method: 'DELETE', token: adminToken });
  await request(`/api/dispositivo/${dispositivo.json.datos.id_dispositivo}`, { method: 'DELETE', token: adminToken });
  await request(`/api/vehiculo/${vehiculo.json.datos.id_vehiculo}`, { method: 'DELETE', token: adminToken });
  await request(`/api/conductor/${conductor.json.datos.id_conductor}`, { method: 'DELETE', token: adminToken });
});

// ============ AUTENTICACION ============

test('CRUD: escrituras exigen autenticacion', async () => {
  const res = await request('/api/conductor', {
    method: 'POST',
    body: { nombre: 'Test', documento: 'DOC-AUTH-001', telefono: '3000000000' }
  });
  assert.equal(res.status, 401);
});

test('CRUD: escrituras exigen rol admin', async () => {
  // Login como conductor
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'juan@smartroad-demo.com', password: 'Conductor123' })
  });
  const { token } = await login.json();

  const res = await request('/api/conductor', {
    method: 'POST',
    token,
    body: { nombre: 'Test', documento: 'DOC-AUTH-002', telefono: '3000000000' }
  });
  assert.equal(res.status, 403);
});
