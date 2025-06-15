// backend/index.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Ensure the data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Use SQLite DB inside data folder
const dbFile = path.join(dataDir, "data.db");
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error("❌ DB open error:", err);
    process.exit(1);
  }
});

// Ensure table exists before handling API requests
db.serialize(() => {
  db.run(`
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0,
    deleted INTEGER DEFAULT 0
  );
`);
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER,
      date TEXT,
      amount REAL,
      shop TEXT
    )`);
});

app.use(express.json());

// Serve static frontend (build output must be at frontend/dist)
app.use(express.static(path.resolve(__dirname, "frontend/dist")));

// API routes
app.get("/api/participants", (req, res) => {
  db.all(
    "SELECT id, name, balance, deleted FROM participants WHERE deleted = 0",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post("/api/participants", (req, res) => {
  const { name } = req.body;
  db.serialize(() => {
    db.run(
      "INSERT INTO participants (name) VALUES (?)",
      [name],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, balance: 0 });
      }
    );
  });
});

// Credit amount to a participant
app.post("/api/participants/:id/credit", (req, res) => {
  const id = Number(req.params.id); // ✅ Fix: define `id` first
  const { amount, date } = req.body;
  if (isNaN(amount) || !date) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  db.serialize(() => {
    db.run(
      `UPDATE participants
       SET balance = balance + ?
       WHERE id = ?`,
      [amount, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0)
          return res.status(404).json({ error: "Participant not found" });

        // Log the transaction (with provided date)
        db.run(
          `INSERT INTO transactions (participant_id, date, amount, shop) VALUES (?, ?, ?, ?)`,
          [id, date, amount, req.body.shop || "Credited"],
          (err2) => {
            if (err2) console.warn("Transaction log failed", err2);
            // Return updated participant
            db.get(
              "SELECT * FROM participants WHERE id = ?",
              [id],
              (err3, row) => {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json(row);
              }
            );
          }
        );
      }
    );
  });
});

app.get("/api/participants/:id/transactions", (req, res) => {
  const pid = Number(req.params.id);
  db.all(
    "SELECT date, amount FROM transactions WHERE participant_id = ? ORDER BY date DESC",
    [pid],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get all transactions across participants
app.get("/api/transactions", (req, res) => {
  db.all(
    `
    SELECT t.date, p.name, t.amount, t.shop
    FROM transactions t
    JOIN participants p ON p.id = t.participant_id
    ORDER BY t.date DESC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.delete("/api/participants/:id", async (req, res) => {
  const id = req.params.id;
  db.run(
    "UPDATE participants SET name = ?, deleted = 1 WHERE id = ?",
    ["محذوف", id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.sendStatus(200);
    }
  );
});

// Test
// Fallback to serve index.html for React Router
app.get("*", (_, res) => {
  res.sendFile(path.resolve(__dirname, "frontend/dist/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});
