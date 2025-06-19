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
  // --- START: New Tables for Purchases Feature ---
  db.run(`
    CREATE TABLE IF NOT EXISTS purchases_names (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS purchases_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL, -- 'credit' or 'purchase'
      amount REAL NOT NULL,
      name_id INTEGER,
      details TEXT,
      FOREIGN KEY (name_id) REFERENCES purchases_names(id)
    );
  `);
  // --- END: New Tables for Purchases Feature ---
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

// START: NEW CODE FOR DEBIT
// Debit amount from a participant
app.post("/api/participants/:id/debit", (req, res) => {
  const id = Number(req.params.id);
  const { amount, date } = req.body;
  if (isNaN(amount) || !date || amount <= 0) {
    // Ensure amount is positive
    return res.status(400).json({ error: "Invalid amount" });
  }

  db.serialize(() => {
    // Subtract from the balance
    db.run(
      `UPDATE participants
       SET balance = balance - ?
       WHERE id = ?`,
      [amount, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0)
          return res.status(404).json({ error: "Participant not found" });

        // Log the transaction with a negative amount and "Debited" as shop
        db.run(
          `INSERT INTO transactions (participant_id, date, amount, shop) VALUES (?, ?, ?, ?)`,
          [id, date, -Math.abs(amount), "خصم نقدي من الحساب"], // Store amount as negative
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
// END: NEW CODE FOR DEBIT

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

// ===== START: New API Routes for Purchases Feature =====

// --- Names for Purchases ---
app.get("/api/purchases/names", (req, res) => {
  db.all("SELECT * FROM purchases_names ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/purchases/names", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  db.run(
    "INSERT INTO purchases_names (name) VALUES (?)",
    [name.trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({ error: "Name already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name: name.trim() });
    }
  );
});

// --- Transactions for Purchases ---
app.get("/api/purchases/transactions", (req, res) => {
  db.all(
    `
    SELECT pt.id, pt.date, pt.type, pt.amount, pt.details, pn.name as name
    FROM purchases_transactions pt
    LEFT JOIN purchases_names pn ON pn.id = pt.name_id
    ORDER BY pt.id DESC
  `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Calculate total cash
      const totalCash = rows.reduce((acc, tx) => {
        if (tx.type === "credit") return acc + tx.amount;
        if (tx.type === "purchase") return acc - tx.amount;
        return acc;
      }, 0);

      res.json({
        transactions: rows,
        totalCash: totalCash,
      });
    }
  );
});

app.post("/api/purchases/transactions", (req, res) => {
  const { date, type, amount, name_id, details } = req.body;
  if (!date || !type || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (type !== "credit" && type !== "purchase") {
    return res.status(400).json({ error: "Invalid transaction type" });
  }

  db.run(
    `INSERT INTO purchases_transactions (date, type, amount, name_id, details) VALUES (?, ?, ?, ?, ?)`,
    [date, type, amount, name_id || null, details || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// ===== END: New API Routes for Purchases Feature =====

// Test
// Fallback to serve index.html for React Router
app.get("*", (_, res) => {
  res.sendFile(path.resolve(__dirname, "frontend/dist/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});
