const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(process.env.DB_FILE || 'events.db');
app.use(express.json());

// ---------- Database models ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  location TEXT,
  capacity INTEGER NOT NULL DEFAULT 50
);
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER NOT NULL REFERENCES events(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id)
);
`);

// Sample events (only when empty)
if (db.prepare('SELECT COUNT(*) AS n FROM events').get().n === 0) {
  const add = db.prepare('INSERT INTO events (title, description, date, location, capacity) VALUES (?,?,?,?,?)');
  add.run('Web Dev Workshop', 'Intro to Node.js and Express', '2026-11-05', 'KUST Lab 1', 30);
  add.run('Tech Talk', 'Careers in software engineering', '2026-11-12', 'Main Hall', 100);
}

// ---------- Users ----------
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  try {
    const r = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    res.status(201).json({ id: r.lastInsertRowid, name, email });
  } catch {
    res.status(409).json({ error: 'Email already registered' });
  }
});

// ---------- Events ----------
app.get('/api/events', (req, res) => {
  const events = db.prepare(`
    SELECT e.*, e.capacity - COUNT(r.id) AS seats_left
    FROM events e LEFT JOIN registrations r ON r.event_id = e.id
    GROUP BY e.id ORDER BY e.date`).all();
  res.json(events);
});

app.get('/api/events/:id', (req, res) => {
  const event = db.prepare(`
    SELECT e.*, e.capacity - COUNT(r.id) AS seats_left
    FROM events e LEFT JOIN registrations r ON r.event_id = e.id
    WHERE e.id = ? GROUP BY e.id`).get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

app.post('/api/events', (req, res) => {
  const { title, description, date, location, capacity } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
  const r = db.prepare('INSERT INTO events (title, description, date, location, capacity) VALUES (?,?,?,?,?)')
    .run(title, description || '', date, location || '', capacity || 50);
  res.status(201).json({ id: r.lastInsertRowid, title, date });
});

// ---------- Registrations ----------
app.post('/api/events/:id/register', (req, res) => {
  const { user_id } = req.body;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const taken = db.prepare('SELECT COUNT(*) AS n FROM registrations WHERE event_id = ?').get(event.id).n;
  if (taken >= event.capacity) return res.status(400).json({ error: 'Event is full' });

  try {
    const r = db.prepare('INSERT INTO registrations (user_id, event_id) VALUES (?, ?)').run(user.id, event.id);
    res.status(201).json({ id: r.lastInsertRowid, message: 'Registered successfully' });
  } catch {
    res.status(409).json({ error: 'Already registered for this event' });
  }
});

// View a user's registrations
app.get('/api/users/:id/registrations', (req, res) => {
  const rows = db.prepare(`
    SELECT r.id, e.title, e.date, e.location, r.created_at
    FROM registrations r JOIN events e ON e.id = r.event_id
    WHERE r.user_id = ?`).all(req.params.id);
  res.json(rows);
});

// Cancel a registration
app.delete('/api/registrations/:id', (req, res) => {
  const r = db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Registration not found' });
  res.json({ message: 'Registration cancelled' });
});

app.listen(process.env.PORT || 3000, () => console.log('Running on http://localhost:3000'));
