const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');
const { createPriceRules, createScriptTag } = require('../utils/shopify');

const router = express.Router();

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const APP_URL = process.env.APP_URL;
const SCOPES = 'read_orders,write_price_rules,write_discounts,read_customers,write_script_tags';

router.get('/', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop parameter');

  const nonce = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${APP_URL}/auth/callback`;

  console.log('Starting auth for shop:', shop);
  console.log('Redirect URI:', redirectUri);

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;

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

    // Create price rules for discount code tiers
    let tier1Id = null;
    let tier2Id = null;
    try {
      const rules = await createPriceRules(shop, accessToken);
      tier1Id = rules.tier1Id;
      tier2Id = rules.tier2Id;
      console.log(`Price rules created — Tier1: ${tier1Id}, Tier2: ${tier2Id}`);
    } catch (priceErr) {
      console.error('Price rule creation failed:', priceErr.message);
    }

    const existingShop = await db.get('SELECT * FROM shops WHERE shop_domain = ?', [shop]);
    if (existingShop) {
      await db.run(
        'UPDATE shops SET access_token = ?, price_rule_tier1_id = ?, price_rule_tier2_id = ? WHERE shop_domain = ?',
        [accessToken, tier1Id, tier2Id, shop]
      );
    } else {
      await db.run(
        'INSERT INTO shops (shop_domain, access_token, price_rule_tier1_id, price_rule_tier2_id) VALUES (?, ?, ?, ?)',
        [shop, accessToken, tier1Id, tier2Id]
      );
    }

    const existingSettings = await db.get('SELECT * FROM reward_settings WHERE shop_domain = ?', [shop]);
    if (!existingSettings) {
      await db.run('INSERT INTO reward_settings (shop_domain) VALUES (?)', [shop]);
    }

    // Inject widget script tag into the storefront
    try {
      await createScriptTag(shop, accessToken, APP_URL);
      console.log(`Script tag injected for ${shop}`);
    } catch (tagErr) {
      console.error('Script tag injection failed:', tagErr.message);
    }

    console.log(`App installed for ${shop}`);
    // Redirect to billing approval — merchant must subscribe before using the app
    res.redirect(`${APP_URL}/auth/billing?shop=${shop}`);

  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(500).send('Installation failed: ' + err.message);
  }
});

module.exports = router;