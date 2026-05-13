const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');

const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../widget')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'ReviewReward' });
});

app.get('/api/test/reset', (req, res) => {
  db.run('DELETE FROM reviews').then(() => {
    db.run('DELETE FROM discount_codes').then(() => {
      res.json({ success: true, message: 'Test data cleared' });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ReviewReward app running on port ${PORT}`);
});