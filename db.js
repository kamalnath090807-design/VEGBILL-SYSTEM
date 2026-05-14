'use strict';
/**
 * db.js — Required ONLY after app.whenReady(), so app.getPath() is always safe.
 */
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const { app }  = require('electron');

const dataDir = app.getPath('userData');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'vegbilling.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous  = NORMAL');

/* ── Schema ── */
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    active     INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS prices (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    price      REAL    NOT NULL DEFAULT 0,
    date       TEXT    NOT NULL,
    UNIQUE(product_id, date)
  );
  CREATE TABLE IF NOT EXISTS bills (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id    INTEGER,
    shop_name  TEXT NOT NULL,
    date       TEXT NOT NULL,
    time       TEXT NOT NULL,
    total      REAL NOT NULL DEFAULT 0,
    note       TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  CREATE TABLE IF NOT EXISTS bill_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id      INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id   INTEGER,
    product_name TEXT NOT NULL,
    quantity     REAL NOT NULL DEFAULT 0,
    price        REAL NOT NULL DEFAULT 0,
    amount       REAL NOT NULL DEFAULT 0
  );
`);

/* ── MIGRATION: safely add columns that may be missing in old DBs ── */
function columnExists(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(r => r.name === col);
}
if (!columnExists('shops', 'address'))  db.exec(`ALTER TABLE shops ADD COLUMN address  TEXT NOT NULL DEFAULT ''`);
if (!columnExists('shops', 'phone'))    db.exec(`ALTER TABLE shops ADD COLUMN phone    TEXT NOT NULL DEFAULT ''`);
if (!columnExists('shops', 'map_link')) db.exec(`ALTER TABLE shops ADD COLUMN map_link TEXT NOT NULL DEFAULT ''`);

/* ── Seed products ── */
if (db.prepare('SELECT COUNT(*) AS c FROM products').get().c === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO products (name) VALUES (?)');
  db.transaction(list => list.forEach(n => ins.run(n)))([
    'Tomato','Onion','Potato','Carrot','Cabbage','Cauliflower','Brinjal',
    'Beans','Peas','Spinach','Bitter Gourd','Bottle Gourd','Ridge Gourd',
    'Snake Gourd','Lady Finger','Drumstick','Banana Flower','Raw Banana',
    'Colocasia','Yam','Radish','Beetroot','Turnip','Spring Onion',
    'Garlic','Ginger','Green Chilli','Coriander','Curry Leaves','Mint'
  ]);
}

/* ══ SHOPS ══════════════════════════════════════════════════════ */
function getAllShops() {
  return db.prepare('SELECT * FROM shops ORDER BY name ASC').all();
}
function addShop(d) {
  const name = (d.name || '').trim();
  if (!name) throw new Error('Shop name cannot be empty');
  if (db.prepare('SELECT id FROM shops WHERE lower(name)=lower(?)').get(name))
    throw new Error(`Shop "${name}" already exists`);
  const r = db.prepare(
    'INSERT INTO shops (name,address,phone,map_link) VALUES (?,?,?,?)'
  ).run(name, d.address || '', d.phone || '', d.map_link || '');
  return { id: r.lastInsertRowid, name, address: d.address || '', phone: d.phone || '', map_link: d.map_link || '' };
}
function updateShop(d) {
  if (!d.id) throw new Error('ID required');
  const name = (d.name || '').trim();
  if (!name) throw new Error('Shop name cannot be empty');
  if (db.prepare('SELECT id FROM shops WHERE lower(name)=lower(?) AND id!=?').get(name, d.id))
    throw new Error(`Another shop named "${name}" already exists`);
  db.prepare('UPDATE shops SET name=?,address=?,phone=?,map_link=? WHERE id=?')
    .run(name, d.address || '', d.phone || '', d.map_link || '', d.id);
  return { id: d.id, name, address: d.address || '', phone: d.phone || '', map_link: d.map_link || '' };
}
function deleteShop(id) {
  db.prepare('DELETE FROM shops WHERE id=?').run(id);
  return true;
}

/* ══ PRODUCTS ════════════════════════════════════════════════════ */
function getAllProducts() {
  return db.prepare('SELECT * FROM products WHERE active=1').all(); /* JS handles ordering via USAGE_ORDER + pin */
}

/* ══ PRICES ══════════════════════════════════════════════════════ */
function getLatestPrices() {
  return db.prepare(`
    SELECT pr.id AS product_id, pr.name AS product_name,
           COALESCE(p.price,0) AS price, COALESCE(p.date,'') AS date
    FROM products pr
    LEFT JOIN prices p ON pr.id=p.product_id
      AND p.date=(SELECT MAX(p2.date) FROM prices p2 WHERE p2.product_id=pr.id)
    WHERE pr.active=1 ORDER BY pr.name ASC
  `).all();
}
function getPricesForDate(date) {
  if (!date) return [];
  return db.prepare(`
    SELECT pr.id AS product_id, pr.name AS product_name,
           COALESCE(p.price,0) AS price, ? AS date
    FROM products pr
    LEFT JOIN prices p ON p.product_id=pr.id AND p.date=?
    WHERE pr.active=1 ORDER BY pr.name ASC
  `).all(date, date);
}
function savePrices(list) {
  if (!Array.isArray(list) || !list.length) throw new Error('No prices provided');
  const upsert = db.prepare(`
    INSERT INTO prices (product_id,price,date) VALUES (@pid,@price,@date)
    ON CONFLICT(product_id,date) DO UPDATE SET price=excluded.price
  `);
  db.transaction(rows => {
    for (const r of rows) {
      if (!r.product_id) continue;
      upsert.run({ pid: Number(r.product_id), price: Number(r.price) || 0, date: r.date });
    }
  })(list);
  return true;
}

/* ══ BILLS ═══════════════════════════════════════════════════════ */
function saveBill(bill) {
  if (!bill?.shop_name)  throw new Error('Shop name required');
  if (!Array.isArray(bill.items) || !bill.items.length) throw new Error('No items in bill');

  const insB = db.prepare('INSERT INTO bills (shop_id,shop_name,date,time,total,note) VALUES (?,?,?,?,?,?)');
  const insI = db.prepare('INSERT INTO bill_items (bill_id,product_id,product_name,quantity,price,amount) VALUES (?,?,?,?,?,?)');

  const billId = db.transaction(b => {
    const r   = insB.run(b.shop_id || null, b.shop_name, b.date, b.time, Number(b.total) || 0, b.note || '');
    const bid = r.lastInsertRowid;
    for (const it of b.items) {
      insI.run(bid, it.product_id || null, it.product_name, Number(it.quantity) || 0, Number(it.price) || 0, Number(it.amount) || 0);
    }
    return bid;
  })(bill);

  return { bill_id: billId };
}
function getAllBills() {
  return db.prepare('SELECT id,shop_id,shop_name,date,time,total,note,created_at FROM bills ORDER BY created_at DESC LIMIT 500').all();
}
function getBillDetail(id) {
  const bill  = db.prepare('SELECT * FROM bills WHERE id=?').get(id);
  if (!bill) return null;
  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id=? ORDER BY product_name').all(id);
  return { ...bill, items };
}
function deleteBill(id) {
  db.prepare('DELETE FROM bills WHERE id=?').run(id);
  return true;
}



/* ══ CLEAR ALL USER DATA (keeps product seed list) ══════════════ */
function clearAllData() {
  db.transaction(() => {
    db.exec('DELETE FROM bill_items');
    db.exec('DELETE FROM bills');
    db.exec('DELETE FROM prices');
    db.exec('DELETE FROM shops');
    /* Reset bill ID sequence back to 0 so next bill starts at #1 */
    db.exec("DELETE FROM sqlite_sequence WHERE name='bills'");
    db.exec("DELETE FROM sqlite_sequence WHERE name='bill_items'");
  })();
  return true;
}

module.exports = {
  getAllShops, addShop, updateShop, deleteShop,
  getAllProducts,
  getLatestPrices, getPricesForDate, savePrices,
  saveBill, getAllBills, getBillDetail, deleteBill,
  clearAllData,
};
