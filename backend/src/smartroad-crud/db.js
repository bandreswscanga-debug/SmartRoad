require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

function obtenerConfiguracion() {
  const url = process.env.CRUD_MYSQL_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 3306,
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname.replace(/^\//, ''),
    };
  }

  const required = ['CRUD_DB_HOST', 'CRUD_DB_PORT', 'CRUD_DB_USER', 'CRUD_DB_PASSWORD', 'CRUD_DB_NAME'];
  const missing = required.filter((key) => process.env[key] === undefined);
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno del CRUD: ${missing.join(', ')}`);
  }

  const port = Number(process.env.CRUD_DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('CRUD_DB_PORT debe ser un puerto válido.');
  }

  return {
    host: process.env.CRUD_DB_HOST,
    port,
    user: process.env.CRUD_DB_USER,
    password: process.env.CRUD_DB_PASSWORD,
    database: process.env.CRUD_DB_NAME,
  };
}

function getPool() {
  if (!pool) {
    const config = obtenerConfiguracion();
    const limit = Number(process.env.CRUD_DB_CONNECTION_LIMIT || 10);
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: Number.isInteger(limit) && limit > 0 ? limit : 10,
      queueLimit: 0,
      dateStrings: true,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

async function verificarConexion() {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = { getPool, verificarConexion };
