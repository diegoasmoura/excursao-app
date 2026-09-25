const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const scrypt = promisify(crypto.scrypt);

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function inferDocType(docStr) {
  const digits = (docStr || '').replace(/\D/g, '');
  if (digits.length === 11 && !/[a-zA-Z]/.test(docStr || '')) return 'CPF';
  if (digits.length === 32) return 'Certidão';
  if (docStr && String(docStr).trim()) return 'RG';
  return 'Outro';
}

function personKey(name, rg, phone) {
  return [name, rg, phone]
    .map((value) => (value || '').trim().toLowerCase())
    .join('|');
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateForWeekday(weekday, from) {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  const delta = (Number(weekday) - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function mapSeat(row) {
  if (!row) return row;
  return { ...row, is_paid: row.is_paid === 1 || row.is_paid === true };
}

function asyncRoute(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
  };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scrypt(password, salt, expected.length);
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function readBearer(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(\S+)/i);
  return match ? match[1] : '';
}

function sessionExpiry(remember) {
  const expires = new Date();
  if (remember) expires.setFullYear(expires.getFullYear() + 1);
  else expires.setHours(expires.getHours() + 12);
  return expires.toISOString();
}

function requireAuth(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const token = readBearer(req);
      if (!token) {
        res.status(401).json({ error: 'Faça o login para continuar.' });
        return;
      }
      const session = await get(
        `
          SELECT s.token, s.expires_at, u.id AS user_id, u.username
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token = ?
        `,
        [token],
      );
      if (!session || Date.parse(session.expires_at) <= Date.now()) {
        if (session) await run('DELETE FROM sessions WHERE token = ?', [token]);
        res.status(401).json({ error: 'Faça o login para continuar.' });
        return;
      }
      req.user = { id: session.user_id, username: session.username };
      next();
    })
    .catch((err) => {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
}

async function setupDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      trip_date TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 40,
      price REAL NOT NULL DEFAULT 0.00,
      status TEXT NOT NULL DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS passengers (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL,
      rg TEXT,
      phone TEXT,
      is_paid INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rg TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS schedule_rules (
      id TEXT PRIMARY KEY,
      weekday INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 40,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  const admin = await get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', ['Gomoura']);
  if (!admin) {
    await run('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [
      uuidv4(),
      'Gomoura',
      await hashPassword('Gomoura#'),
    ]);
  }

  const columns = await all('PRAGMA table_info(passengers)');
  if (!columns.some((column) => column.name === 'person_id')) {
    await run('ALTER TABLE passengers ADD COLUMN person_id TEXT');
  }

  const peopleColumns = await all('PRAGMA table_info(people)');
  if (!peopleColumns.some((column) => column.name === 'reference_point')) {
    await run("ALTER TABLE people ADD COLUMN reference_point TEXT NOT NULL DEFAULT ''");
  }

  if (!peopleColumns.some((column) => column.name === 'doc_type')) {
    await run("ALTER TABLE people ADD COLUMN doc_type TEXT NOT NULL DEFAULT 'Outro'");
    const peopleRows = await all('SELECT id, rg FROM people');
    for (const person of peopleRows) {
      await run('UPDATE people SET doc_type = ? WHERE id = ?', [inferDocType(person.rg), person.id]);
    }
  }

  const orphans = await all(`
    SELECT id, name, rg, phone
    FROM passengers
    WHERE person_id IS NULL OR person_id = ''
  `);

  const groups = new Map();
  for (const row of orphans) {
    const name = (row.name || '').trim();
    if (!name) continue;
    const key = personKey(name, row.rg, row.phone);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, name });
  }

  for (const group of groups.values()) {
    const sample = group[0];
    const personId = uuidv4();
    await run(
      'INSERT INTO people (id, name, rg, phone, doc_type) VALUES (?, ?, ?, ?, ?)',
      [personId, sample.name, sample.rg || '', sample.phone || '', inferDocType(sample.rg)],
    );
    for (const row of group) {
      await run('UPDATE passengers SET person_id = ?, name = ? WHERE id = ?', [
        personId,
        sample.name,
        row.id,
      ]);
    }
  }

  const duplicates = await all(`
    SELECT trip_id, person_id, MIN(id) AS keep_id
    FROM passengers
    WHERE person_id IS NOT NULL AND person_id != ''
    GROUP BY trip_id, person_id
    HAVING COUNT(*) > 1
  `);
  for (const duplicate of duplicates) {
    await run(
      'DELETE FROM passengers WHERE trip_id = ? AND person_id = ? AND id != ?',
      [duplicate.trip_id, duplicate.person_id, duplicate.keep_id],
    );
  }

  await run(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_person ON passengers(trip_id, person_id)',
  );

  const ruleCount = await get('SELECT COUNT(*) AS count FROM schedule_rules');
  if (!ruleCount || ruleCount.count === 0) {
    await run(
      `INSERT INTO schedule_rules (id, weekday, origin, destination, capacity, sort_order)
       VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(), 2, 'Uberlândia', 'Pirapora', 40, 0,
        uuidv4(), 4, 'Pirapora', 'Uberlândia', 40, 1,
      ],
    );
  }
}

function mapTrip(row) {
  if (!row) return null;
  const passengerCount = Number(row.passenger_count ?? 0);
  const paidCount = Number(row.paid_count ?? 0);
  return {
    ...row,
    passenger_count: passengerCount,
    paid_count: paidCount,
    passengers: [{ count: passengerCount }],
  };
}

async function tripWithCount(id) {
  const row = await get(
    `
      SELECT t.*,
             COUNT(p.id) AS passenger_count,
             SUM(CASE WHEN p.is_paid = 1 THEN 1 ELSE 0 END) AS paid_count
      FROM trips t
      LEFT JOIN passengers p ON t.id = p.trip_id
      WHERE t.id = ?
      GROUP BY t.id
    `,
    [id],
  );
  return mapTrip(row);
}

async function assertSeatAvailable(tripId, personId) {
  const trip = await get('SELECT id, capacity FROM trips WHERE id = ?', [tripId]);
  if (!trip) {
    const error = new Error('Viagem não encontrada.');
    error.status = 404;
    throw error;
  }

  const occupied = await get('SELECT COUNT(*) AS count FROM passengers WHERE trip_id = ?', [tripId]);
  if (occupied.count >= trip.capacity) {
    const error = new Error('Esta excursão já atingiu a lotação máxima.');
    error.status = 400;
    throw error;
  }

  if (personId) {
    const existing = await get(
      'SELECT id FROM passengers WHERE trip_id = ? AND person_id = ?',
      [tripId, personId],
    );
    if (existing) {
      const error = new Error('Esta pessoa já está nesta viagem.');
      error.status = 400;
      throw error;
    }
  }

  return trip;
}

async function seatById(id) {
  const row = await get(
    `
      SELECT p.id, p.trip_id, p.person_id, p.is_paid, p.created_at,
             pe.name, pe.rg, pe.phone, pe.doc_type, pe.reference_point
      FROM passengers p
      JOIN people pe ON pe.id = p.person_id
      WHERE p.id = ?
    `,
    [id],
  );
  return mapSeat(row);
}

app.post('/api/login', asyncRoute(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const remember = Boolean(req.body?.remember);
  const user = await get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username]);
  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  if (!valid) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [
    token,
    user.id,
    sessionExpiry(remember),
  ]);
  res.json({ token, username: user.username });
}));

app.post('/api/logout', requireAuth, asyncRoute(async (req, res) => {
  const token = readBearer(req);
  if (token) await run('DELETE FROM sessions WHERE token = ?', [token]);
  res.json({ ok: true });
}));

app.get('/api/me', requireAuth, asyncRoute(async (req, res) => {
  res.json({ username: req.user.username });
}));

app.use('/api', (req, res, next) => {
  if (req.path === '/login') return next();
  return requireAuth(req, res, next);
});

app.get('/api/trips', asyncRoute(async (_req, res) => {
  const rows = await all(`
    SELECT t.*,
           COUNT(p.id) AS passenger_count,
           SUM(CASE WHEN p.is_paid = 1 THEN 1 ELSE 0 END) AS paid_count
    FROM trips t
    LEFT JOIN passengers p ON t.id = p.trip_id
    GROUP BY t.id
    ORDER BY t.trip_date ASC
  `);
  res.json(rows.map(mapTrip));
}));

app.post('/api/trips', asyncRoute(async (req, res) => {
  const { origin, destination, trip_date, capacity } = req.body;
  if (!origin?.trim() || !destination?.trim() || !trip_date) {
    return res.status(400).json({ error: 'Origem, destino e data são obrigatórios.' });
  }
  const id = uuidv4();
  await run(
    'INSERT INTO trips (id, origin, destination, trip_date, capacity, price) VALUES (?, ?, ?, ?, ?, 0)',
    [id, origin.trim(), destination.trim(), trip_date, Number(capacity) || 40],
  );
  res.json([await tripWithCount(id)]);
}));

app.put('/api/trips/:id', asyncRoute(async (req, res) => {
  const { origin, destination, trip_date, capacity } = req.body;
  if (!origin?.trim() || !destination?.trim() || !trip_date) {
    return res.status(400).json({ error: 'Origem, destino e data são obrigatórios.' });
  }
  const seats = await get('SELECT COUNT(*) AS count FROM passengers WHERE trip_id = ?', [req.params.id]);
  const nextCapacity = Number(capacity) || 40;
  if (seats.count > nextCapacity) {
    return res.status(400).json({ error: 'A lotação não pode ficar menor que o número de pessoas já colocadas.' });
  }
  const result = await run(
    'UPDATE trips SET origin = ?, destination = ?, trip_date = ?, capacity = ? WHERE id = ?',
    [origin.trim(), destination.trim(), trip_date, nextCapacity, req.params.id],
  );
  if (!result.changes) return res.status(404).json({ error: 'Viagem não encontrada.' });
  res.json(await tripWithCount(req.params.id));
}));

app.delete('/api/trips/:id', asyncRoute(async (req, res) => {
  const trip = await get('SELECT id FROM trips WHERE id = ?', [req.params.id]);
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });
  await run('DELETE FROM passengers WHERE trip_id = ?', [req.params.id]);
  await run('DELETE FROM trips WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

app.post('/api/trips/generate-week', asyncRoute(async (_req, res) => {
  const rules = await all('SELECT * FROM schedule_rules ORDER BY sort_order ASC, weekday ASC');
  if (!rules.length) {
    return res.status(400).json({ error: 'Escolha o dia, a origem e o destino para criar a semana.' });
  }

  let from = new Date();
  from.setHours(0, 0, 0, 0);
  const created = [];

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const anchor = dateForWeekday(rules[0].weekday, from);
    const candidates = [];
    for (const rule of rules) {
      const date = toISODate(dateForWeekday(rule.weekday, anchor));
      const existing = await get(
        'SELECT id FROM trips WHERE trip_date = ? AND origin = ? AND destination = ?',
        [date, rule.origin, rule.destination],
      );
      candidates.push({ rule, date, existing: Boolean(existing) });
    }

    if (candidates.every((item) => item.existing)) {
      const latest = candidates.map((item) => item.date).sort().at(-1);
      from = new Date(`${latest}T12:00:00`);
      from.setDate(from.getDate() + 1);
      continue;
    }

    for (const item of candidates) {
      if (item.existing) continue;
      const id = uuidv4();
      await run(
        'INSERT INTO trips (id, origin, destination, trip_date, capacity, price) VALUES (?, ?, ?, ?, ?, 0)',
        [id, item.rule.origin, item.rule.destination, item.date, item.rule.capacity],
      );
      created.push(await tripWithCount(id));
    }
    break;
  }

  if (!created.length) {
    return res.status(400).json({ error: 'Não foi possível criar novas viagens.' });
  }
  res.json({ created });
}));

app.get('/api/schedule', asyncRoute(async (_req, res) => {
  const rules = await all('SELECT * FROM schedule_rules ORDER BY sort_order ASC, weekday ASC');
  res.json(rules);
}));

app.put('/api/schedule', asyncRoute(async (req, res) => {
  const rules = Array.isArray(req.body?.rules) ? req.body.rules : null;
  if (!rules?.length) {
    return res.status(400).json({ error: 'Informe ao menos um dia da semana.' });
  }

  for (const rule of rules) {
    if (!rule.origin?.trim() || !rule.destination?.trim()) {
      return res.status(400).json({ error: 'Cada dia precisa de origem e destino.' });
    }
    const weekday = Number(rule.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return res.status(400).json({ error: 'Dia da semana inválido.' });
    }
  }

  await run('DELETE FROM schedule_rules');
  for (const [index, rule] of rules.entries()) {
    await run(
      `INSERT INTO schedule_rules (id, weekday, origin, destination, capacity, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        rule.id || uuidv4(),
        Number(rule.weekday),
        rule.origin.trim(),
        rule.destination.trim(),
        Number(rule.capacity) || 40,
        index,
      ],
    );
  }

  const saved = await all('SELECT * FROM schedule_rules ORDER BY sort_order ASC, weekday ASC');
  res.json(saved);
}));

app.get('/api/settings/whatsapp', asyncRoute(async (_req, res) => {
  const row = await get("SELECT value FROM app_settings WHERE key = 'whatsapp'");
  res.json({ phone: row?.value || '' });
}));

app.put('/api/settings/whatsapp', asyncRoute(async (req, res) => {
  const phone = String(req.body?.phone || '').replace(/\D/g, '').slice(0, 11);
  if (phone && phone.length < 10) {
    return res.status(400).json({ error: 'Informe o DDD e o número.' });
  }
  await run(
    `INSERT INTO app_settings (key, value) VALUES ('whatsapp', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [phone],
  );
  res.json({ phone });
}));

app.get('/api/people', asyncRoute(async (_req, res) => {
  const rows = await all(
    `
      SELECT pe.*,
             COALESCE(COUNT(t.id), 0) AS trip_count,
             (
               SELECT t2.trip_date
               FROM passengers p2
               JOIN trips t2 ON t2.id = p2.trip_id
               WHERE p2.person_id = pe.id
               ORDER BY t2.trip_date DESC
               LIMIT 1
             ) AS last_trip_date,
             (
               SELECT t2.id
               FROM passengers p2
               JOIN trips t2 ON t2.id = p2.trip_id
               WHERE p2.person_id = pe.id
               ORDER BY t2.trip_date DESC
               LIMIT 1
             ) AS last_trip_id
      FROM people pe
      LEFT JOIN passengers p ON p.person_id = pe.id
      LEFT JOIN trips t ON t.id = p.trip_id
      GROUP BY pe.id
      ORDER BY pe.name COLLATE NOCASE ASC
    `,
  );
  res.json(rows.map((row) => ({
    ...row,
    trip_count: Number(row.trip_count) || 0,
    past_count: Number(row.trip_count) || 0,
  })));
}));

app.get('/api/people/:id', asyncRoute(async (req, res) => {
  const person = await get('SELECT * FROM people WHERE id = ?', [req.params.id]);
  if (!person) return res.status(404).json({ error: 'Pessoa não encontrada.' });
  const trips = await all(
    `
      SELECT t.id, t.origin, t.destination, t.trip_date, p.is_paid, p.id AS seat_id
      FROM passengers p
      JOIN trips t ON t.id = p.trip_id
      WHERE p.person_id = ?
      ORDER BY t.trip_date ASC
    `,
    [req.params.id],
  );
  res.json({ ...person, trips: trips.map(mapSeat) });
}));

app.post('/api/people', asyncRoute(async (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'O nome é obrigatório.' });
  const id = uuidv4();
  await run('INSERT INTO people (id, name, rg, phone, doc_type, reference_point) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    name,
    req.body.rg || '',
    req.body.phone || '',
    req.body.doc_type || inferDocType(req.body.rg),
    String(req.body.reference_point || '').trim(),
  ]);
  res.json(await get('SELECT * FROM people WHERE id = ?', [id]));
}));

app.put('/api/people/:id', asyncRoute(async (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'O nome é obrigatório.' });
  const result = await run('UPDATE people SET name = ?, rg = ?, phone = ?, doc_type = ?, reference_point = ? WHERE id = ?', [
    name,
    req.body.rg || '',
    req.body.phone || '',
    req.body.doc_type || inferDocType(req.body.rg),
    String(req.body.reference_point || '').trim(),
    req.params.id,
  ]);
  if (!result.changes) return res.status(404).json({ error: 'Pessoa não encontrada.' });
  await run('UPDATE passengers SET name = ?, rg = ?, phone = ? WHERE person_id = ?', [
    name,
    req.body.rg || '',
    req.body.phone || '',
    req.params.id,
  ]);
  res.json(await get('SELECT * FROM people WHERE id = ?', [req.params.id]));
}));

app.delete('/api/people/:id', asyncRoute(async (req, res) => {
  const person = await get('SELECT id FROM people WHERE id = ?', [req.params.id]);
  if (!person) return res.status(404).json({ error: 'Pessoa não encontrada.' });
  await run('DELETE FROM passengers WHERE person_id = ?', [req.params.id]);
  await run('DELETE FROM people WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/trips/:tripId/passengers', asyncRoute(async (req, res) => {
  const rows = await all(
    `
      SELECT p.id, p.trip_id, p.person_id, p.is_paid, p.created_at,
             pe.name, pe.rg, pe.phone, pe.doc_type, pe.reference_point
      FROM passengers p
      JOIN people pe ON pe.id = p.person_id
      WHERE p.trip_id = ?
      ORDER BY pe.name COLLATE NOCASE ASC
    `,
    [req.params.tripId],
  );
  res.json(rows.map(mapSeat));
}));

app.post('/api/trips/:tripId/passengers', asyncRoute(async (req, res) => {
  const tripId = req.params.tripId;
  let personId = req.body?.person_id;
  const isPaid = req.body?.is_paid ? 1 : 0;

  if (!personId) {
    const name = req.body?.name?.trim();
    if (!name) return res.status(400).json({ error: 'Escolha uma pessoa ou informe o nome.' });
    personId = uuidv4();
    await run('INSERT INTO people (id, name, rg, phone, doc_type, reference_point) VALUES (?, ?, ?, ?, ?, ?)', [
      personId,
      name,
      req.body.rg || '',
      req.body.phone || '',
      req.body.doc_type || inferDocType(req.body.rg),
      String(req.body.reference_point || '').trim(),
    ]);
  } else {
    const person = await get('SELECT id FROM people WHERE id = ?', [personId]);
    if (!person) return res.status(404).json({ error: 'Pessoa não encontrada.' });
  }

  try {
    await assertSeatAvailable(tripId, personId);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }

  const person = await get('SELECT * FROM people WHERE id = ?', [personId]);
  const seatId = uuidv4();
  await run(
    `INSERT INTO passengers (id, trip_id, person_id, name, rg, phone, is_paid)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [seatId, tripId, personId, person.name, person.rg || '', person.phone || '', isPaid],
  );
  res.json(await seatById(seatId));
}));

app.patch('/api/passengers/:id/payment', asyncRoute(async (req, res) => {
  const result = await run('UPDATE passengers SET is_paid = ? WHERE id = ?', [
    req.body?.is_paid ? 1 : 0,
    req.params.id,
  ]);
  if (!result.changes) return res.status(404).json({ error: 'Lugar não encontrado.' });
  res.json({ success: true });
}));

app.delete('/api/passengers/:id', asyncRoute(async (req, res) => {
  const result = await run('DELETE FROM passengers WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ error: 'Lugar não encontrado.' });
  res.json({ success: true });
}));

const PORT = 3005;

setupDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT} (acessível na rede local)`);
    });
  })
  .catch((err) => {
    console.error('Erro ao preparar o banco', err);
    process.exit(1);
  });
