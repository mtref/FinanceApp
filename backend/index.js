// backend/index.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Use CORS middleware
app.use(cors());

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
  // --- START: New Tables for Menus Feature ---
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
  // --- END: New Tables for Menus Feature ---
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
  const id = Number(req.params.id);
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
          [id, date, amount, req.body.shop || "إيداع في الحساب"],
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

app.get("/api/participants/:id/transactions", (req, res) => {
  const pid = Number(req.params.id);
  db.all(
    "SELECT date, amount FROM transactions WHERE participant_id = ? ORDER BY date DESC, id DESC",
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
    SELECT t.id, t.date, p.name, t.amount, t.shop
    FROM transactions t
    JOIN participants p ON p.id = t.participant_id
    ORDER BY t.date DESC, t.id DESC
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

// ===== START: Dashboard API Routes =====
app.get("/api/dashboard/payer-summary", (req, res) => {
  const query = `
    SELECT p.name, SUM(t.amount) as total_paid
    FROM transactions t
    JOIN participants p ON p.id = t.participant_id
    WHERE t.amount > 0 AND p.deleted = 0
    GROUP BY p.name
    ORDER BY total_paid DESC;
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/dashboard/spending-over-time", (req, res) => {
  const query = `
    SELECT date, SUM(ABS(amount)) as total_spent
    FROM transactions
    WHERE amount < 0
    GROUP BY date
    ORDER BY date ASC;
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/dashboard/spending-by-shop", (req, res) => {
  const query = `
    SELECT shop, SUM(ABS(amount)) as total_spent
    FROM transactions
    WHERE amount < 0 AND shop != 'خصم نقدي من الحساب'
    GROUP BY shop
    ORDER BY total_spent DESC;
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/dashboard/balance-distribution", (req, res) => {
  const query = `
    SELECT
      CASE
        WHEN balance < 0 THEN 'مدين (عليه دين)'
        ELSE 'دائن (له رصيد)'
      END as status,
      COUNT(*) as count
    FROM participants
    WHERE deleted = 0 AND balance != 0
    GROUP BY status;
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/dashboard/average-spending", (req, res) => {
  const query = `
    SELECT
      p.name,
      AVG(ABS(t.amount)) as avg_spent
    FROM transactions t
    JOIN participants p ON p.id = t.participant_id
    WHERE t.amount < 0 AND p.deleted = 0
    GROUP BY p.name
    ORDER BY avg_spent DESC;
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => ({...row, avg_spent: parseFloat(row.avg_spent.toFixed(3))})));
  });
});

// ===== END: Dashboard API Routes =====


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
    ORDER BY pt.date DESC, pt.id DESC
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

// ===== START: New API Routes for Menus Feature =====

// Get all coffee shops
app.get("/api/menus/shops", (req, res) => {
  db.all("SELECT * FROM menu_shops ORDER BY name", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add a new coffee shop
app.post("/api/menus/shops", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Shop name is required" });
  }
  db.run(
    "INSERT INTO menu_shops (name) VALUES (?)",
    [name.trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({ error: "Shop name already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name: name.trim() });
    }
  );
});

// Get a single shop with its menu items
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

// Add a menu item to a specific shop
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

// Update a menu item
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

// Delete a menu item
app.delete("/api/menus/items/:itemId", (req, res) => {
  const { itemId } = req.params;
  db.run(`DELETE FROM menu_items WHERE id = ?`, [itemId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Item not found" });
    res.status(200).json({ message: "Item deleted successfully" });
  });
});

// Delete a coffee shop (and all its items)
app.delete("/api/menus/shops/:shopId", (req, res) => {
  const { shopId } = req.params;

  // Use db.serialize to run commands in order
  db.serialize(() => {
    // Begin a transaction to ensure both operations succeed or fail together
    db.run("BEGIN TRANSACTION;");

    let transactionError = null;

    // Step 1: Delete all items belonging to the shop
    db.run(
      `DELETE FROM menu_items WHERE shop_id = ?`,
      [shopId],
      function (err) {
        if (err) {
          transactionError = err;
        }
      }
    );

    // Step 2: Delete the shop itself
    db.run(`DELETE FROM menu_shops WHERE id = ?`, [shopId], function (err) {
      if (err) {
        transactionError = err;
      } else if (this.changes === 0) {
        // If the shop wasn't found, create an error
        transactionError = new Error("Shop not found");
      }
    });

    // Step 3: Finalize the transaction
    db.run(transactionError ? "ROLLBACK;" : "COMMIT;", (err) => {
      if (transactionError) {
        console.error("Error deleting shop:", transactionError.message);
        // Use a 404 for "not found" or 500 for other errors
        const statusCode =
          transactionError.message === "Shop not found" ? 404 : 500;
        return res.status(statusCode).json({ error: transactionError.message });
      }
      if (err) {
        // Handle commit error
        return res.status(500).json({ error: err.message });
      }
      res
        .status(200)
        .json({ message: "Shop and all its items deleted successfully" });
    });
  });
});
// ===== END: New API Routes for Menus Feature =====

// Fallback to serve index.html for React Router
app.get("*", (_, res) => {
  res.sendFile(path.resolve(__dirname, "frontend/dist/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});