const axios = require('axios');

const PLAN_NAME = 'ReviewReward Monthly';
const PLAN_PRICE = '9.99';
const TRIAL_DAYS = 7;

/**
 * Create a recurring application charge and return the charge object.
 * The caller should redirect the merchant to charge.confirmation_url.
 */
async function createBillingCharge(shopDomain, accessToken, returnUrl) {
  const res = await axios.post(
    `https://${shopDomain}/admin/api/2024-07/recurring_application_charges.json`,
    {
      recurring_application_charge: {
        name: PLAN_NAME,
        price: PLAN_PRICE,
        return_url: returnUrl,
        trial_days: TRIAL_DAYS,
        test: true, // safe for dev/test stores — no real charges
      },
    },
    { headers: { 'X-Shopify-Access-Token': accessToken } }
  );
  return res.data.recurring_application_charge;
}

/**
 * Retrieve a specific charge by ID.
 */
async function getBillingCharge(shopDomain, accessToken, chargeId) {
  const res = await axios.get(
    `https://${shopDomain}/admin/api/2024-07/recurring_application_charges/${chargeId}.json`,
    { headers: { 'X-Shopify-Access-Token': accessToken } }
  );
  return res.data.recurring_application_charge;
}

/**
 * Activate an accepted charge.
 */
async function activateBillingCharge(shopDomain, accessToken, chargeId) {
  const res = await axios.post(
    `https://${shopDomain}/admin/api/2024-07/recurring_application_charges/${chargeId}/activate.json`,
    { recurring_application_charge: { id: chargeId } },
    { headers: { 'X-Shopify-Access-Token': accessToken } }
  );
  return res.data.recurring_application_charge;
}

module.exports = { createBillingCharge, getBillingCharge, activateBillingCharge };
