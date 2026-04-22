const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'reviewreward.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_domain TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    price_rule_tier1_id INTEGER,
    price_rule_tier2_id INTEGER,
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reward_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_domain TEXT UNIQUE NOT NULL,
    tier1_amount INTEGER DEFAULT 200,
    tier2_percent INTEGER DEFAULT 10,
    validity_days INTEGER DEFAULT 30,
    min_review_chars INTEGER DEFAULT 50
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_domain TEXT NOT NULL,
    order_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review_text TEXT NOT NULL,
    photo_url TEXT,
    tier INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS discount_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_domain TEXT NOT NULL,
    order_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    code TEXT NOT NULL,
    tier INTEGER NOT NULL,
    shopify_code_id TEXT,
    expires_at DATETIME,
    redeemed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

db.get = (sql, params) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

db.all = (sql, params) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

db.run = (sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    err ? reject(err) : resolve(this);
  });
});

module.exports = db;