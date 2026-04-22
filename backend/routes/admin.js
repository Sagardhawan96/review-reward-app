const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/reviews/:shopDomain', (req, res) => {
  const { shopDomain } = req.params;

  const reviews = db.prepare(`
    SELECT * FROM reviews 
    WHERE shop_domain = ? 
    ORDER BY created_at DESC
  `).all(shopDomain);

  const stats = {
    total: reviews.length,
    withPhoto: reviews.filter(r => r.photo_url).length,
    textOnly: reviews.filter(r => !r.photo_url).length,
    avgRating: reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0,
    byRating: [1, 2, 3, 4, 5].map(n => ({
      rating: n,
      count: reviews.filter(r => r.rating === n).length
    }))
  };

  res.json({ reviews, stats });
});

router.get('/codes/:shopDomain', (req, res) => {
  const { shopDomain } = req.params;

  const codes = db.prepare(`
    SELECT * FROM discount_codes 
    WHERE shop_domain = ? 
    ORDER BY created_at DESC
  `).all(shopDomain);

  res.json({ codes });
});

module.exports = router;