const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { randomUUID } = require('crypto');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');
const listPath = path.join(__dirname, 'data', 'lista-pessoas.json');

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function fold(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function personKey(person) {
  const doc = digits(person.rg);
  if (doc.length >= 8) return `doc:${doc}`;
  return `name:${fold(person.name)}|${digits(person.phone)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (error) => (error ? reject(error) : resolve(db)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

async function main() {
  if (!fs.existsSync(listPath)) {
    throw new Error(`Lista não encontrada: ${listPath}`);
  }
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Banco não encontrado: ${dbPath}`);
  }

  const incoming = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  const db = await openDb();
  const existing = await all(db, 'SELECT name, rg, phone FROM people');
  const seen = new Set(existing.map((person) => personKey(person)));

  let created = 0;
  let skipped = 0;

  await run(db, 'BEGIN');
  try {
    for (const person of incoming) {
      const name = String(person.name || '').trim();
      if (!name) continue;
      const key = personKey(person);
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      await run(
        'INSERT INTO people (id, name, rg, phone, doc_type, reference_point) VALUES (?, ?, ?, ?, ?, ?)',
        [
          randomUUID(),
          name,
          person.rg || '',
          person.phone || '',
          person.doc_type || 'Outro',
          person.reference_point || '',
        ],
      );
      seen.add(key);
      created += 1;
    }
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK');
    throw error;
  } finally {
    db.close();
  }

  console.log(`Banco: ${dbPath}`);
  console.log(`Na lista: ${incoming.length}`);
  console.log(`Novas pessoas: ${created}`);
  console.log(`Já estavam: ${skipped}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
