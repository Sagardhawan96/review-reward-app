const express = require('express');
const db = require('../db');
const { createBillingCharge, getBillingCharge, activateBillingCharge } = require('../utils/billing');

const router = express.Router();
const APP_URL = process.env.APP_URL;

// Step 1 — redirect merchant to Shopify billing approval page
router.get('/', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop parameter');

  try {
    const shopData = await db.get('SELECT * FROM shops WHERE shop_domain = ?', [shop]);
    if (!shopData) return res.status(401).send('Shop not found — please reinstall the app.');

    // Already active — skip billing and go to admin
    if (shopData.billing_active) {
      return res.redirect(`https://${shop}/admin/apps`);
    }

    const returnUrl = `${APP_URL}/auth/billing/callback?shop=${shop}`;
    const charge = await createBillingCharge(shop, shopData.access_token, returnUrl);

    // Persist the pending charge ID so we can verify it on callback
    await db.run(
      'UPDATE shops SET billing_charge_id = ?, billing_status = ? WHERE shop_domain = ?',
      [String(charge.id), 'pending', shop]
    );

    console.log(`Billing charge created for ${shop}: ${charge.id}`);
    res.redirect(charge.confirmation_url);

  } catch (err) {
    console.error('Billing init error:', err.response?.data || err.message);
    res.status(500).send('Billing setup failed: ' + err.message);
  }
});

// Step 2 — Shopify redirects back here after merchant approves/declines
router.get('/callback', async (req, res) => {
  const { shop, charge_id } = req.query;
  if (!shop || !charge_id) return res.status(400).send('Missing parameters');

  try {
    const shopData = await db.get('SELECT * FROM shops WHERE shop_domain = ?', [shop]);
    if (!shopData) return res.status(401).send('Shop not found.');

    const charge = await getBillingCharge(shop, shopData.access_token, charge_id);
    console.log(`Billing callback for ${shop}: status=${charge.status}`);

    if (charge.status === 'accepted') {
      await activateBillingCharge(shop, shopData.access_token, charge_id);
      await db.run(
        'UPDATE shops SET billing_active = true, billing_charge_id = ?, billing_status = ? WHERE shop_domain = ?',
        [String(charge_id), 'active', shop]
      );
      console.log(`Billing activated for ${shop}`);
      res.redirect(`https://${shop}/admin/apps`);

    } else if (charge.status === 'declined') {
      await db.run(
        "UPDATE shops SET billing_status = ? WHERE shop_domain = ?",
        ['declined', shop]
      );
      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>Subscription Declined</h2>
          <p>ReviewReward requires an active subscription to work.</p>
          <a href="${APP_URL}/auth/billing?shop=${shop}" style="background:#5c6ac4;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none">
            Subscribe Now — $9.99/mo (7-day free trial)
          </a>
        </body></html>
      `);

    } else {
      res.status(400).send('Unexpected charge status: ' + charge.status);
    }

  } catch (err) {
    console.error('Billing callback error:', err.response?.data || err.message);
    res.status(500).send('Billing callback failed: ' + err.message);
  }
});

module.exports = router;
