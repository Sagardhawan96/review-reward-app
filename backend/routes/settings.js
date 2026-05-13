const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:shopDomain', (req, res) => {
  const { shopDomain } = req.params;

  db.get('SELECT * FROM reward_settings WHERE shop_domain = ?', [shopDomain])
    .then(settings => {
      if (!settings) return res.status(404).json({ error: 'Shop not found' });
      res.json(settings);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

router.put('/:shopDomain', (req, res) => {
  const { shopDomain } = req.params;
  const { tier1_amount, tier2_percent, validity_days, min_review_chars } = req.body;

  db.run(
    'UPDATE reward_settings SET tier1_amount = ?, tier2_percent = ?, validity_days = ?, min_review_chars = ? WHERE shop_domain = ?',
    [tier1_amount, tier2_percent, validity_days, min_review_chars, shopDomain]
  )
    .then(() => res.json({ success: true, message: 'Settings updated successfully' }))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;