const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');
const { createPriceRules } = require('../utils/shopify');

const router = express.Router();

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL;
const SCOPES = 'read_orders,write_discounts,read_customers,write_script_tags';

router.get('/', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop parameter');

  const nonce = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${redirectUri}&state=${nonce}`;

  res.redirect(installUrl);
});

router.get('/callback', async (req, res) => {
  const { shop, code } = req.query;

  try {
    const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    });

    const accessToken = tokenRes.data.access_token;

    const { tier1Id, tier2Id } = await createPriceRules(shop, accessToken);

    const existingShop = db.prepare('SELECT * FROM shops WHERE shop_domain = ?').get(shop);
    if (existingShop) {
      db.prepare('UPDATE shops SET access_token = ?, price_rule_tier1_id = ?, price_rule_tier2_id = ? WHERE shop_domain = ?')
        .run(accessToken, tier1Id, tier2Id, shop);
    } else {
      db.prepare('INSERT INTO shops (shop_domain, access_token, price_rule_tier1_id, price_rule_tier2_id) VALUES (?, ?, ?, ?)')
        .run(shop, accessToken, tier1Id, tier2Id);
    }

    const existingSettings = db.prepare('SELECT * FROM reward_settings WHERE shop_domain = ?').get(shop);
    if (!existingSettings) {
      db.prepare('INSERT INTO reward_settings (shop_domain) VALUES (?)').run(shop);
    }

    console.log(`App installed for ${shop}`);
    res.redirect(`https://${shop}/admin/apps`);

  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(500).send('Installation failed. Please try again.');
  }
});

module.exports = router;