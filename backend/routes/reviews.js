const express = require('express');
const db = require('../db');
const { generateDiscountCode } = require('../utils/discount');
const upload = require('../utils/upload');

const router = express.Router();

router.post('/', upload.single('photo'), async (req, res) => {
  const { shopDomain, orderId, customerEmail, rating, reviewText } = req.body;

  if (!shopDomain || !orderId || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Normalise optional fields
  const email = customerEmail || '';
  const text = reviewText || '';

  try {
    const shop = await db.get('SELECT * FROM shops WHERE shop_domain = ?', [shopDomain]);
    if (!shop) {
      return res.status(401).json({ error: 'Shop not found' });
    }

    const settings = await db.get('SELECT * FROM reward_settings WHERE shop_domain = ?', [shopDomain]);

    // Only enforce min_review_chars if a comment was actually provided
    if (text.length > 0 && settings && text.length < settings.min_review_chars) {
      return res.status(400).json({ error: `Review must be at least ${settings.min_review_chars} characters` });
    }

    const existing = await db.get('SELECT * FROM reviews WHERE order_id = ? AND shop_domain = ?', [orderId, shopDomain]);
    if (existing) {
      return res.status(409).json({ error: 'Review already submitted for this order' });
    }

    const hasPhoto = req.file && req.file.mimetype.startsWith('image/');
    const tier = hasPhoto ? 2 : 1;
    const photoUrl = hasPhoto ? `/uploads/${req.file.filename}` : null;

    await db.run(
      'INSERT INTO reviews (shop_domain, order_id, customer_email, rating, review_text, photo_url, tier) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [shopDomain, orderId, email, rating, text, photoUrl, tier]
    );

    const priceRuleId = tier === 2 ? shop.price_rule_tier2_id : shop.price_rule_tier1_id;

    try {
      const { code, expiresAt, shopifyCodeId } = await generateDiscountCode(shopDomain, shop.access_token, priceRuleId, tier);

      await db.run(
        'INSERT INTO discount_codes (shop_domain, order_id, customer_email, code, tier, shopify_code_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [shopDomain, orderId, email, code, tier, shopifyCodeId, expiresAt]
      );

      const reward = tier === 2 ? `${settings.tier2_percent}% off your next order` : `₹${settings.tier1_amount} off your next order`;

      res.json({ success: true, tier, code, expiresAt, reward, message: `Thank you! You earned ${reward}` });

    } catch (discountErr) {
      console.error('Discount error:', discountErr.message);
      res.json({ success: true, tier, code: null, message: 'Review submitted! Your reward code will be emailed shortly.' });
    }

  } catch (err) {
    console.error('Review error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;