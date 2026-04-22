const axios = require('axios');

async function shopifyRequest(shopDomain, accessToken, method, endpoint, data = null) {
  const url = `https://${shopDomain}/admin/api/2024-01${endpoint}`;
  const config = {
    method,
    url,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  };
  if (data) config.data = data;
  const res = await axios(config);
  return res.data;
}

async function createPriceRules(shopDomain, accessToken) {
  const tier1 = await shopifyRequest(shopDomain, accessToken, 'POST', '/price_rules.json', {
    price_rule: {
      title: 'ReviewReward - Text Review (Tier 1)',
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      value_type: 'fixed_amount',
      value: '-200.00',
      customer_selection: 'all',
      starts_at: new Date().toISOString(),
      once_per_customer: true
    }
  });

  const tier2 = await shopifyRequest(shopDomain, accessToken, 'POST', '/price_rules.json', {
    price_rule: {
      title: 'ReviewReward - Photo Review (Tier 2)',
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      value_type: 'percentage',
      value: '-10.0',
      customer_selection: 'all',
      starts_at: new Date().toISOString(),
      once_per_customer: true
    }
  });

  return {
    tier1Id: tier1.price_rule.id,
    tier2Id: tier2.price_rule.id
  };
}

async function updatePriceRules(shopDomain, accessToken, tier1Id, tier2Id, tier1Amount, tier2Percent, validityDays) {
  await shopifyRequest(shopDomain, accessToken, 'PUT', `/price_rules/${tier1Id}.json`, {
    price_rule: {
      id: tier1Id,
      value: `-${tier1Amount}.00`
    }
  });

  await shopifyRequest(shopDomain, accessToken, 'PUT', `/price_rules/${tier2Id}.json`, {
    price_rule: {
      id: tier2Id,
      value: `-${tier2Percent}.0`
    }
  });
}

module.exports = { shopifyRequest, createPriceRules, updatePriceRules };