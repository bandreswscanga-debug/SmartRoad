const { getPool } = require('./db');

const DEFINICIONES = {
  conductor: {
    table: 'conductor', alias: 'c', pk: 'id_conductor',
    columns: ['nombre', 'documento', 'telefono', 'estado'],
    required: ['nombre', 'documento', 'telefono'], defaultValues: { estado: 'activo' },
    select: 'c.*', from: 'conductor c', joins: '', order: 'c.id_conductor ASC'
  },
  vehiculo: {
    table: 'vehiculo', alias: 'v', pk: 'id_vehiculo',
    columns: ['placa', 'tipo', 'id_conductor'],
    required: ['placa', 'tipo', 'id_conductor'], defaultValues: {},
    select: 'v.id_vehiculo, v.placa, v.tipo, v.id_conductor, c.nombre AS nombre_conductor, c.telefono AS telefono_conductor, c.estado AS estado_conductor',
    from: 'vehiculo v', joins: 'INNER JOIN conductor c ON c.id_conductor = v.id_conductor', order: 'v.id_vehiculo ASC',
    foreignKey: { column: 'id_conductor', table: 'conductor', pk: 'id_conductor' }
  },
  dispositivo: {
    table: 'dispositivo', alias: 'd', pk: 'id_dispositivo',
    columns: ['tipo_sensor', 'estado', 'id_vehiculo'],
    required: ['tipo_sensor', 'id_vehiculo'], defaultValues: { estado: 'activo' },
    select: 'd.id_dispositivo, d.tipo_sensor, d.estado, d.id_vehiculo, v.placa, v.tipo AS tipo_vehiculo, c.nombre AS nombre_conductor',
    from: 'dispositivo d', joins: 'INNER JOIN vehiculo v ON v.id_vehiculo = d.id_vehiculo INNER JOIN conductor c ON c.id_conductor = v.id_conductor', order: 'd.id_dispositivo ASC',
    foreignKey: { column: 'id_vehiculo', table: 'vehiculo', pk: 'id_vehiculo' }
  },
  evento: {
    table: 'evento', alias: 'e', pk: 'id_evento',
    columns: ['tipo_evento', 'fecha_hora', 'nivel_riesgo', 'id_dispositivo'],
    required: ['tipo_evento', 'nivel_riesgo', 'id_dispositivo'], defaultValues: {},
    select: 'e.id_evento, e.tipo_evento, e.fecha_hora, e.nivel_riesgo, e.id_dispositivo, d.tipo_sensor, d.id_vehiculo, v.placa, c.nombre AS nombre_conductor',
    from: 'evento e', joins: 'INNER JOIN dispositivo d ON d.id_dispositivo = e.id_dispositivo INNER JOIN vehiculo v ON v.id_vehiculo = d.id_vehiculo INNER JOIN conductor c ON c.id_conductor = v.id_conductor', order: 'e.id_evento ASC',
    foreignKey: { column: 'id_dispositivo', table: 'dispositivo', pk: 'id_dispositivo' }
  },
  alerta: {
    table: 'alerta', alias: 'a', pk: 'id_alerta',
    columns: ['tipo_alerta', 'estado', 'id_evento'],
    required: ['tipo_alerta', 'id_evento'], defaultValues: { estado: 'pendiente' },
    select: 'a.id_alerta, a.tipo_alerta, a.estado, a.id_evento, e.tipo_evento, e.fecha_hora, e.nivel_riesgo, d.tipo_sensor, v.placa, c.nombre AS nombre_conductor',
    from: 'alerta a', joins: 'INNER JOIN evento e ON e.id_evento = a.id_evento INNER JOIN dispositivo d ON d.id_dispositivo = e.id_dispositivo INNER JOIN vehiculo v ON v.id_vehiculo = d.id_vehiculo INNER JOIN conductor c ON c.id_conductor = v.id_conductor', order: 'a.id_alerta ASC',
    foreignKey: { column: 'id_evento', table: 'evento', pk: 'id_evento' }
  }
};

function obtenerDefinicion(nombre) {
  const definicion = DEFINICIONES[nombre];
  if (!definicion) throw new Error(`Tabla no soportada: ${nombre}`);
  return definicion;
}
function listar(nombre) {
  const d = obtenerDefinicion(nombre);
  return getPool().query(`SELECT ${d.select} FROM ${d.from} ${d.joins} ORDER BY ${d.order}`).then(([filas]) => filas);
}
function obtenerPorId(nombre, id) {
  const d = obtenerDefinicion(nombre);
  return getPool().query(`SELECT ${d.select} FROM ${d.from} ${d.joins} WHERE ${d.alias}.${d.pk} = ? LIMIT 1`, [id]).then(([filas]) => filas[0] || null);
}
function crear(nombre, data) {
  const d = obtenerDefinicion(nombre);
  const fields = d.columns.filter((field) => data[field] !== undefined);
  if (!fields.length) throw new Error('No hay campos para crear el registro.');
  return getPool().query(`INSERT INTO \`${d.table}\` (${fields.map((field) => `\`${field}\``).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, fields.map((field) => data[field])).then(([r]) => r.insertId);
}
function actualizar(nombre, id, data) {
  const d = obtenerDefinicion(nombre);
  const fields = d.columns.filter((field) => data[field] !== undefined);
  if (!fields.length) throw new Error('No hay campos para actualizar el registro.');
  return getPool().query(`UPDATE \`${d.table}\` SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')} WHERE \`${d.pk}\` = ?`, [...fields.map((field) => data[field]), id]).then(([r]) => r.affectedRows);
}
function eliminar(nombre, id) {
  const d = obtenerDefinicion(nombre);
  return getPool().query(`DELETE FROM \`${d.table}\` WHERE \`${d.pk}\` = ?`, [id]).then(([r]) => r.affectedRows);
}
function existe(nombre, id) {
  const d = obtenerDefinicion(nombre);
  return getPool().query(`SELECT 1 AS existe FROM \`${d.table}\` WHERE \`${d.pk}\` = ? LIMIT 1`, [id]).then(([filas]) => filas.length > 0);
}
function contarPorVehiculo(idVehiculo) {
  return getPool().query('SELECT COUNT(*) AS total FROM `dispositivo` WHERE `id_vehiculo` = ?', [idVehiculo]).then(([filas]) => Number(filas[0].total));
}
module.exports = { DEFINICIONES, obtenerDefinicion, listar, obtenerPorId, crear, actualizar, eliminar, existe, contarPorVehiculo };
