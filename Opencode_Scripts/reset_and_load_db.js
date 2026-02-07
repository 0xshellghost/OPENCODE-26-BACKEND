import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const dumpOnly = process.env.DUMP_ONLY === 'true' || process.argv.includes('--dump-only');

async function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const database = url.pathname ? url.pathname.replace(/^\//, '') : undefined;
  const sslMode = url.searchParams.get('ssl-mode');

  const config = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };

  if (sslMode && sslMode.toUpperCase() === 'REQUIRED') {
    // Allow self-signed certificates from managed providers (Aiven) by
    // disabling strict certificate verification. For production, prefer
    // providing the CA cert instead: { ca: fs.readFileSync('ca.pem') }
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

async function dropAllTables(conn, dbName) {
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

  const [tables] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE';",
    [dbName]
  );

  for (const row of tables) {
    const name = row.TABLE_NAME || row.table_name || Object.values(row)[0];
    console.log('Dropping table', name);
    await conn.query(`DROP TABLE IF EXISTS \`${name}\`;`);
  }

  const [views] = await conn.query(
    'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?;',
    [dbName]
  );

  for (const row of views) {
    const name = row.TABLE_NAME || Object.values(row)[0];
    console.log('Dropping view', name);
    await conn.query(`DROP VIEW IF EXISTS \`${name}\`;`);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  const config = await parseDatabaseUrl(databaseUrl);
  console.log('DB host:', config.host, 'DB name:', config.database);

  const conn = await mysql.createConnection({ ...config, multipleStatements: true });

  try {
    if (!dumpOnly) {
      console.log('Dropping all tables and views...');
      await dropAllTables(conn, config.database);
      console.log('All tables/views dropped.');
    } else {
      console.log('Dump-only mode: skipping drop of tables/views.');
    }

    if (!dumpOnly) {
      console.log('Running `npx prisma db push` to create Prisma schema (skipping client generation)...');
      try {
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'inherit',
          cwd: path.resolve(__dirname, '..'),
          env: process.env,
        });
      } catch (e) {
        if (e && e.code === 'EPERM') {
          console.warn('Warning: EPERM while running prisma. Continuing without generating Prisma client.');
        } else {
          throw e;
        }
      }
    } else {
      console.log('Dump-only mode: skipping Prisma db push.');
    }

    const sqlFile = path.resolve(__dirname, '..', 'OPENCODE.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error('SQL file not found at', sqlFile);
      process.exit(1);
    }

    console.log('Reading SQL file:', sqlFile);
    // Read as buffer and detect encoding / compression
    let fileBuf = fs.readFileSync(sqlFile);
    let decodedBuf = fileBuf;
    // Detect gzip
    if (decodedBuf.length >= 2 && decodedBuf[0] === 0x1f && decodedBuf[1] === 0x8b) {
      console.log('SQL file appears gzipped; decompressing...');
      const zlib = require('zlib');
      decodedBuf = zlib.gunzipSync(decodedBuf);
    }

    let sql;
    // UTF-16 LE BOM
    if (decodedBuf.length >= 2 && decodedBuf[0] === 0xff && decodedBuf[1] === 0xfe) {
      console.log('Detected UTF-16 LE BOM; decoding as utf16le');
      sql = decodedBuf.toString('utf16le');
    // UTF-16 BE BOM
    } else if (decodedBuf.length >= 2 && decodedBuf[0] === 0xfe && decodedBuf[1] === 0xff) {
      console.log('Detected UTF-16 BE BOM; converting to utf16le');
      const swapped = Buffer.alloc(decodedBuf.length);
      for (let i = 0; i + 1 < decodedBuf.length; i += 2) {
        swapped[i] = decodedBuf[i + 1];
        swapped[i + 1] = decodedBuf[i];
      }
      sql = swapped.toString('utf16le');
    // UTF-8 BOM
    } else if (decodedBuf.length >= 3 && decodedBuf[0] === 0xef && decodedBuf[1] === 0xbb && decodedBuf[2] === 0xbf) {
      console.log('Detected UTF-8 BOM; decoding as utf8 and stripping BOM');
      sql = decodedBuf.toString('utf8').replace(/^\uFEFF/, '');
    } else {
      // fallback to utf8
      sql = decodedBuf.toString('utf8');
    }

    // Trim any leading non-printable characters that could break SQL parsing
    sql = sql.replace(/^([\x00-\x1F])+/, '');

    console.log('Importing SQL into database (this may take a while)...');
    await conn.query(sql);

    console.log('SQL import completed successfully.');
  } catch (err) {
    console.error('Error:', err?.message ?? err);
    process.exit(1);
  } finally {
    try {
      await conn.end();
    } catch {}
  }
}

main();
