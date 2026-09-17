require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function setup() {
  const url = process.env.MYSQL_URL;
  if (!url) {
    console.log('Defina MYSQL_URL en .env (ej. mysql://root:password@localhost:3306/smartroad_sos) para aplicar el esquema.');
    process.exit(0);
  }
  const conn = await mysql.createConnection(url);
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length);
  for (const stmt of statements) {
    await conn.query(stmt);
  }
  console.log('[SmartRoad S.O.S] Esquema MySQL aplicado correctamente.');
  await conn.end();
}

setup().catch((err) => {
  console.error('[SmartRoad S.O.S] Error aplicando esquema:', err.message);
  process.exit(1);
});