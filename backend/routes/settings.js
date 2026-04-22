const express = require('express');
const db = require('../db');
const { updatePriceRules } = require('../utils/shopify');

const router = express.Router();

router.get('/:shopDomain', (req, res) => {
  const { shopDomain } = req.params;

  const settings = db.prepare('SELECT * FROM reward_settings WHERE shop_domain = ?').get(shopDomain);
  if (!settings) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  res.json(settings);
});

router.put('/:shopDomain', async (req, res) => {
  const { shopDomain } = req.params;
  const { tier1_amount, tier2_percent, validity_days, min_review_chars } = req.body;

  const shop = db.prepare('SELECT * FROM shops WHERE shop_domain = ?').get(shopDomain);
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  db.prepare(`
    UPDATE reward_settings 
    SET tier1_amount = ?, tier2_percent = ?, validity_days = ?, min_review_chars = ?
    WHERE shop_domain = ?
  `).run(tier1_amount, tier2_percent, validity_days, min_review_chars, shopDomain);

  try {
    await updatePriceRules(
      shopDomain,
      shop.access_token,
      shop.price_rule_tier1_id,
      shop.price_rule_tier2_id,
      tier1_amount,
      tier2_percent,
      validity_days
    );
  } catch (err) {
    console.error('Price rule update error:', err.message);
  }

  res.json({ success: true, message: 'Settings updated successfully' });
});

module.exports = router;