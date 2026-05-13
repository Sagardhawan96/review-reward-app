const express = require('express');
const db = require('../db');
const { generateDiscountCode } = require('../utils/discount');
const upload = require('../utils/upload');

const router = express.Router();

router.post('/', upload.single('photo'), async (req, res) => {
  const { shopDomain, orderId, customerEmail, rating, reviewText } = req.body;

  if (!shopDomain || !orderId || !customerEmail || !rating || !reviewText) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const shop = await db.get('SELECT * FROM shops WHERE shop_domain = ?', [shopDomain]);
    if (!shop) {
      return res.status(401).json({ error: 'Shop not found' });
    }

    const settings = await db.get('SELECT * FROM reward_settings WHERE shop_domain = ?', [shopDomain]);

    if (reviewText.length < settings.min_review_chars) {
      return res.status(400).json({
        error: `Review must be at least ${settings.min_review_chars} characters long`
      });
    }

    const existing = await db.get(
      'SELECT * FROM reviews WHERE order_id = ? AND shop_domain = ?',
      [orderId, shopDomain]
    );
    if (existing) {
      return res.status(409).json({ error: 'Review already submitted for this order' });
    }

    const hasPhoto = req.file && req.file.mimetype.startsWith('image/');
    const tier = hasPhoto ? 2 : 1;
    const photoUrl = hasPhoto ? `/uploads/${req.file.filename}` : null;

    await db.run(
      'INSERT INTO reviews (shop_domain, order_id, customer_email, rating, review_text, photo_url, tier) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [shopDomain, orderId, customerEmail, rating, reviewText, photoUrl, tier]
    );

    const settings2 = await db.get('SELECT * FROM reward_settings WHERE shop_domain = ?', [shopDomain]);
    const priceRuleId = tier === 2 ? shop.price_rule_tier2_id : shop.price_rule_tier1_id;

    try {
      const { code, expiresAt, shopifyCodeId } = await generateDiscountCode(
        shopDomain, shop.access_token, priceRuleId, tier
      );

      await db.run(
        'INSERT INTO discount_codes (shop_domain, order_id, customer_email, code, tier, shopify_code_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',