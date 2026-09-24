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
  const schemaFiles = ['schema.sql', 'crud_schema.sql'];
  for (const schemaFile of schemaFiles) {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', schemaFile), 'utf8');
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length && !s.startsWith('--'));
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (error) {
        // MySQL no tiene CREATE INDEX IF NOT EXISTS; ignora únicamente índices ya existentes.
        if (error.code !== 'ER_DUP_KEYNAME' && error.errno !== 1061) throw error;
      }
    }
  }
  console.log('[SmartRoad S.O.S] Esquema MySQL aplicado correctamente.');
  await conn.end();
}

setup().catch((err) => {
  console.error('[SmartRoad S.O.S] Error aplicando esquema:', err.message);
  process.exit(1);
});