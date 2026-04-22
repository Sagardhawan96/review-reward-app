const crypto = require('crypto');
const { shopifyRequest } = require('./shopify');

async function generateDiscountCode(shopDomain, accessToken, priceRuleId, tier) {
  const prefix = tier === 2 ? 'PHO' : 'TXT';
  const code = `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const result = await shopifyRequest(
    shopDomain,
    accessToken,
    'POST',
    `/price_rules/${priceRuleId}/discount_codes.json`,
    {
      discount_code: {
        code
      }
    }
  );

  return {
    code,
    expiresAt,
    shopifyCodeId: result.discount_code.id.toString()
  };
}

module.exports = { generateDiscountCode };