const express = require('express');
const path = require('path');
const db = require('../db');
const { generateDiscountCode } = require('../utils/discount');
const upload = require('../utils/upload');

const router = express.Router();

router.post('/', upload.single('photo'), async (req, res) => {
  const { shopDomain, orderId, customerEmail, rating, reviewText } = req.body;

  if (!shopDomain || !orderId || !customerEmail || !rating || !reviewText) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const shop = db.prepare('SELECT * FROM shops WHERE shop_domain = ?').get(shopDomain);
  if (!shop) {
    return res.status(401).json({ error: 'Shop not found' });
  }

  const settings = db.prepare('SELECT * FROM reward_settings WHERE shop_domain = ?').get(shopDomain);

  if (reviewText.length < settings.min_review_chars) {
    return res.status(400).json({ 
      error: `Review must be at least ${settings.min_review_chars} characters long` 
    });
  }

  const existing = db.prepare('SELECT * FROM reviews WHERE order_id = ? AND shop_domain = ?').get(orderId, shopDomain);
  if (existing) {
    return res.status(409).json({ error: 'Review already submitted for this order' });
  }

  const hasPhoto = req.file && req.file.mimetype.startsWith('image/');
  const tier = hasPhoto ? 2 : 1;
  const photoUrl = hasPhoto ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO reviews (shop_domain, order_id, customer_email, rating, review_text, photo_url, tier)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(shopDomain, orderId, customerEmail, rating, reviewText, photoUrl, tier);

  try {
    const priceRuleId = tier === 2 ? shop.price_rule_tier2_id : shop.price_rule_tier1_id;
    const { code, expiresAt, shopifyCodeId } = await generateDiscountCode(
      shopDomain, shop.access_token, priceRuleId, tier
    );

    db.prepare(`
      INSERT INTO discount_codes (shop_domain, order_id, customer_email, code, tier, shopify_code_id, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(shopDomain, orderId, customerEmail, code, tier, shopifyCodeId, expiresAt);

    const reward = tier === 2
      ? `${settings.tier2_percent}% off your next order`
      : `₹${settings.tier1_amount} off your next order`;

    res.json({
      success: true,
      tier,
      code,
      expiresAt,
      reward,
      message: `Thank you! You earned ${reward}`
    });

  } catch (err) {
    console.error('Discount error:', err.message);
    res.json({
      success: true,
      tier,
      code: null,
      message: 'Review submitted! Your reward code will be emailed shortly.'
    });
  }
});

module.exports = router;