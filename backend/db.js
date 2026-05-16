const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Convert SQLite-style ? placeholders to Postgres $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Create tables on first connect (runs once at startup)
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        shop_domain TEXT UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        price_rule_tier1_id BIGINT,
        price_rule_tier2_id BIGINT,
        installed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_settings (
        id SERIAL PRIMARY KEY,
        shop_domain TEXT UNIQUE NOT NULL,
        tier1_amount INTEGER DEFAULT 200,
        tier2_percent INTEGER DEFAULT 10,
        validity_days INTEGER DEFAULT 30,
        min_review_chars INTEGER DEFAULT 50
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        shop_domain TEXT NOT NULL,
        order_id TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT NOT NULL,
        photo_url TEXT,
        tier INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id SERIAL PRIMARY KEY,
        shop_domain TEXT NOT NULL,
        order_id TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        code TEXT NOT NULL,
        tier INTEGER NOT NULL,
        shopify_code_id TEXT,
        expires_at TIMESTAMP,
        redeemed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database tables ready (Neon Postgres)');
  } finally {
    client.release();
  }
}

initDb().catch(err => console.error('DB init error:', err.message));

const db = {
  // Returns first matching row (or undefined)
  get: async (sql, params = []) => {
    const result = await pool.query(convertPlaceholders(sql), params);
    return result.rows[0];
  },

  // Returns all matching rows
  all: async (sql, params = []) => {
    const result = await pool.query(convertPlaceholders(sql), params);
    return result.rows;
  },

  // Executes INSERT / UPDATE / DELETE — returns { rowCount }
  run: async (sql, params = []) => {
    const result = await pool.query(convertPlaceholders(sql), params);
    return { rowCount: result.rowCount };
  }
};

module.exports = db;
