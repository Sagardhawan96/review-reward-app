const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/reviews/:shopDomain', (req, res) => {
  const { shopDomain } = req.params;

  db.all('SELECT * FROM reviews WHERE shop_domain = ? ORDER BY created_at DESC', [shopDomain])
    .then(reviews => {
      const stats = {
        total: reviews.length,
        withPhoto: reviews.filter(r => r.photo_url).length,
        textOnly: reviews.filter(r => !r.photo_url).length,
        avgRating: reviews.length
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : 0,
        byRating: [1,2,3,4,5].map(n => ({
          rating: n,
          count: reviews.filter(r => r.rating === n).length
        }))
      };
      res.json({ reviews, stats });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

router.get('/codes/:shopDomain', (req, res) => {
  const { shopDomain } = req.params;

  db.all('SELECT * FROM discount_codes WHERE shop_domain = ? ORDER BY created_at DESC', [shopDomain])
    .then(codes => res.json({ codes }))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;