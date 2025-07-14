// backend/index.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3000;

// --- Middleware Setup ---
// Define middleware before any routes.
app.use(cors());
app.use(express.json());

// --- Database Setup ---
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbFile = path.join(dataDir, "data.db");
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error("❌ DB open error:", err);
    process.exit(1);
  }
});

// --- Schema Migration & Table Creation ---
db.serialize(() => {
  // Create tables if they don't exist
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

  // Add 'items' column to 'transactions' if it doesn't exist (MIGRATION)
  db.all("PRAGMA table_info(transactions)", (err, columns) => {
    if (err) {
      console.error("Error getting table info for transactions:", err.message);
      return;
    }
    const hasItemsColumn = columns.some((col) => col.name === "items");
    if (!hasItemsColumn) {
      db.run("ALTER TABLE transactions ADD COLUMN items TEXT", (alterErr) => {
        if (alterErr) {
          console.error("Error altering transactions table:", alterErr.message);
        } else {
          console.log("✅ 'items' column added to 'transactions' table.");
        }
      });
    }
  });

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
  db.run(`
        CREATE TABLE IF NOT EXISTS menu_shops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
    `);
  db.run(`
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shop_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (shop_id) REFERENCES menu_shops(id) ON DELETE CASCADE
        );
    `);
});

// --- API Routes ---
// IMPORTANT: All API routes must be defined before the static file serving.

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

app.post("/api/participants/:id/credit", (req, res) => {
  const id = Number(req.params.id);
  const { amount, date, items } = req.body; // `items` can be passed now
  if (isNaN(amount) || !date) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  const itemsJson = JSON.stringify(items || null);

  db.serialize(() => {
    db.run(
      `UPDATE participants SET balance = balance + ? WHERE id = ?`,
      [amount, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0)
          return res.status(404).json({ error: "Participant not found" });
        db.run(
          `INSERT INTO transactions (participant_id, date, amount, shop, items) VALUES (?, ?, ?, ?, ?)`,
          [id, date, amount, req.body.shop || "إيداع في الحساب", itemsJson],
          (err2) => {
            if (err2) console.warn("Transaction log failed", err2);
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

app.post("/api/participants/:id/debit", (req, res) => {
  const id = Number(req.params.id);
  const { amount, date } = req.body;
  if (isNaN(amount) || !date || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  db.serialize(() => {
    db.run(
      `UPDATE participants SET balance = balance - ? WHERE id = ?`,
      [amount, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0)
          return res.status(404).json({ error: "Participant not found" });
        db.run(
          `INSERT INTO transactions (participant_id, date, amount, shop, items) VALUES (?, ?, ?, ?, ?)`,
          [id, date, -Math.abs(amount), "خصم نقدي من الحساب", null],
          (err2) => {
            if (err2) console.warn("Transaction log failed", err2);
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

app.get("/api/transactions", (req, res) => {
  db.all(
    `SELECT t.id, t.date, p.name, t.amount, t.shop FROM transactions t JOIN participants p ON p.id = t.participant_id ORDER BY t.date DESC, t.id DESC`,
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

app.get("/api/bill-details", (req, res) => {
  const { shop, date } = req.query;
  if (!shop || !date)
    return res.status(400).json({ error: "Shop and date are required" });
  const query = `SELECT t.amount, p.name, t.items FROM transactions t JOIN participants p ON p.id = t.participant_id WHERE t.shop = ? AND t.date = ? AND p.deleted = 0`;
  db.all(query, [shop, date], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0)
      return res.status(404).json({ error: "Bill not found" });

    const payer = rows.find((r) => r.amount > 0);
    const participants = rows
      .filter((r) => r.amount < 0)
      .map((p) => ({
        name: p.name,
        amount: Math.abs(p.amount),
        items: p.items ? JSON.parse(p.items) : [],
      }));
    const totalAmount = payer
      ? payer.amount
      : participants.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      shop,
      date,
      totalAmount,
      payer: payer ? payer.name : "Unknown",
      participants,
    });
  });
});

// --- Dashboard API Routes ---
app.get("/api/dashboard/payer-summary", (req, res) => {
  const query = `SELECT p.name, SUM(t.amount) as total_paid FROM transactions t JOIN participants p ON p.id = t.participant_id WHERE t.amount > 0 AND p.deleted = 0 GROUP BY p.name ORDER BY total_paid DESC;`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.get("/api/dashboard/spending-over-time", (req, res) => {
  const query = `SELECT date, SUM(ABS(amount)) as total_spent FROM transactions WHERE amount < 0 GROUP BY date ORDER BY date ASC;`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.get("/api/dashboard/spending-by-shop", (req, res) => {
  const query = `SELECT shop, SUM(ABS(amount)) as total_spent FROM transactions WHERE amount < 0 AND shop NOT IN ('خصم نقدي من الحساب', 'إيداع في الحساب') GROUP BY shop ORDER BY total_spent DESC;`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.get("/api/dashboard/balance-distribution", (req, res) => {
  const query = `SELECT CASE WHEN balance < 0 THEN 'مدين (عليه دين)' ELSE 'دائن (له رصيد)' END as status, COUNT(*) as count FROM participants WHERE deleted = 0 AND balance != 0 GROUP BY status;`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.get("/api/dashboard/participant-spending", (req, res) => {
  const query = `SELECT p.name, SUM(ABS(t.amount)) as total_spent_in_bills FROM transactions t JOIN participants p ON p.id = t.participant_id WHERE t.amount < 0 AND p.deleted = 0 AND t.shop NOT IN ('خصم نقدي من الحساب', 'إيداع في الحساب') GROUP BY p.name ORDER BY total_spent_in_bills DESC;`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(
      rows.map((row) => ({
        ...row,
        total_spent_in_bills: parseFloat(row.total_spent_in_bills.toFixed(3)),
      }))
    );
  });
});

// --- Purchases API Routes ---
app.get("/api/purchases/names-status", (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateString = thirtyDaysAgo.toISOString().split("T")[0];
  const query = `SELECT pn.id, pn.name, COALESCE(SUM(pt.amount), 0) as total_credit FROM purchases_names pn LEFT JOIN purchases_transactions pt ON pn.id = pt.name_id AND pt.type = 'credit' AND pt.date >= ? GROUP BY pn.id, pn.name ORDER BY pn.name;`;
  db.all(query, [dateString], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const namesWithStatus = rows.map((row) => ({
      ...row,
      hasSufficientCredit: row.total_credit >= 5,
    }));
    res.json(namesWithStatus);
  });
});
app.get("/api/purchases/names", (req, res) => {
  db.all("SELECT * FROM purchases_names ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.post("/api/purchases/names", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Name is required" });
  db.run(
    "INSERT INTO purchases_names (name) VALUES (?)",
    [name.trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed"))
          return res.status(409).json({ error: "Name already exists" });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name: name.trim() });
    }
  );
});
app.get("/api/purchases/transactions", (req, res) => {
  const transactionsQuery = `SELECT pt.id, pt.date, pt.type, pt.amount, pt.details, pn.name as name FROM purchases_transactions pt LEFT JOIN purchases_names pn ON pn.id = pt.name_id ORDER BY pt.date DESC, pt.id DESC`;
  const totalQuery = `SELECT SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as totalCash FROM purchases_transactions`;
  db.all(transactionsQuery, [], (err, transactions) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get(totalQuery, [], (err, totalRow) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        transactions: transactions,
        totalCash: totalRow.totalCash || 0,
      });
    });
  });
});
app.post("/api/purchases/transactions", (req, res) => {
  const { date, type, amount, name_id, details } = req.body;
  if (!date || !type || !amount)
    return res.status(400).json({ error: "Missing required fields" });
  if (type !== "credit" && type !== "purchase")
    return res.status(400).json({ error: "Invalid transaction type" });
  db.run(
    `INSERT INTO purchases_transactions (date, type, amount, name_id, details) VALUES (?, ?, ?, ?, ?)`,
    [date, type, amount, name_id || null, details || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// --- Menus API Routes ---
app.get("/api/menus/shops", (req, res) => {
  db.all("SELECT * FROM menu_shops ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
app.post("/api/menus/shops", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Shop name is required" });
  db.run(
    "INSERT INTO menu_shops (name) VALUES (?)",
    [name.trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed"))
          return res.status(409).json({ error: "Shop name already exists" });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name: name.trim() });
    }
  );
});
app.get("/api/menus/shops/:id", (req, res) => {
  const shopId = req.params.id;
  db.get("SELECT * FROM menu_shops WHERE id = ?", [shopId], (err, shop) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    db.all(
      "SELECT * FROM menu_items WHERE shop_id = ? ORDER BY item_name",
      [shopId],
      (err2, items) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ ...shop, menu_items: items });
      }
    );
  });
});
app.post("/api/menus/shops/:id/items", (req, res) => {
  const shopId = req.params.id;
  const { item_name, price } = req.body;
  if (!item_name || !item_name.trim() || !price || isNaN(parseFloat(price))) {
    return res.status(400).json({ error: "Invalid item name or price" });
  }
  db.run(
    "INSERT INTO menu_items (shop_id, item_name, price) VALUES (?, ?, ?)",
    [shopId, item_name.trim(), parseFloat(price)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, item_name, price });
    }
  );
});
app.put("/api/menus/items/:itemId", (req, res) => {
  const { itemId } = req.params;
  const { item_name, price } = req.body;
  if (!item_name || !item_name.trim() || !price || isNaN(parseFloat(price))) {
    return res.status(400).json({ error: "Invalid item name or price" });
  }
  db.run(
    `UPDATE menu_items SET item_name = ?, price = ? WHERE id = ?`,
    [item_name.trim(), parseFloat(price), itemId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Item not found" });
      res.status(200).json({ message: "Item updated successfully" });
    }
  );
});
app.delete("/api/menus/items/:itemId", (req, res) => {
  const { itemId } = req.params;
  db.run(`DELETE FROM menu_items WHERE id = ?`, [itemId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Item not found" });
    res.status(200).json({ message: "Item deleted successfully" });
  });
});
app.delete("/api/menus/shops/:shopId", (req, res) => {
  const { shopId } = req.params;
  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");
    let transactionError = null;
    db.run(
      `DELETE FROM menu_items WHERE shop_id = ?`,
      [shopId],
      function (err) {
        if (err) transactionError = err;
      }
    );
    db.run(`DELETE FROM menu_shops WHERE id = ?`, [shopId], function (err) {
      if (err) transactionError = err;
      else if (this.changes === 0)
        transactionError = new Error("Shop not found");
    });
    db.run(transactionError ? "ROLLBACK;" : "COMMIT;", (err) => {
      if (transactionError) {
        const statusCode =
          transactionError.message === "Shop not found" ? 404 : 500;
        return res.status(statusCode).json({ error: transactionError.message });
      }
      if (err) return res.status(500).json({ error: err.message });
      res
        .status(200)
        .json({ message: "Shop and all its items deleted successfully" });
    });
  });
});

// --- Serve Frontend ---
// This now comes AFTER all API routes.
app.use(express.static(path.join(__dirname, "frontend", "dist")));

// Fallback to serve index.html for React Router
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});
