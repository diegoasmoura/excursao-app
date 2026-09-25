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
  const existing = await all(db, 'SELECT name, rg FROM people');
  const seenDocs = new Set(
    existing.map((person) => digits(person.rg)).filter((doc) => doc.length >= 8),
  );
  const seenNames = new Set(existing.map((person) => fold(person.name)).filter(Boolean));

  let created = 0;
  let skipped = 0;

  await run(db, 'BEGIN');
  try {
    for (const person of incoming) {
      const name = String(person.name || '').trim();
      if (!name) continue;

      const doc = digits(person.rg);
      const already = doc.length >= 8 ? seenDocs.has(doc) : seenNames.has(fold(name));
      if (already) {
        skipped += 1;
        continue;
      }

      await run(
        db,
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

      if (doc.length >= 8) seenDocs.add(doc);
      seenNames.add(fold(name));
      created += 1;
    }
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK');
    throw error;
  }

  const total = await all(db, 'SELECT COUNT(*) AS count FROM people');
  db.close();

  console.log(`Banco: ${dbPath}`);
  console.log(`Na lista: ${incoming.length}`);
  console.log(`Novas pessoas: ${created}`);
  console.log(`Já estavam (mesmo documento ou mesmo nome sem documento): ${skipped}`);
  console.log(`Total no cadastro agora: ${total[0].count}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
