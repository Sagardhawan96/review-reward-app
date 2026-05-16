import {
  reactExtension,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  Banner,
  useApi,
  useSubscription,
  useShop,
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";

const BACKEND_URL = "https://review-reward-app-production.up.railway.app";

export default reactExtension("purchase.thank-you.block.render", () => (
  <ReviewWidget />
));

function ReviewWidget() {
  const api = useApi();

  // purchase.thank-you.block.render exposes orderConfirmation (not 'order')
  const orderConfirmation = useSubscription(api.orderConfirmation);
  const shop = useShop();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [discountCode, setDiscountCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // GID "gid://shopify/Order/12345" → "12345"
  const rawId = orderConfirmation?.order?.id ?? "";
  const orderId = rawId.includes("/") ? rawId.split("/").pop() : rawId;

  // Email may live on the order's contact email — no customer-data permission needed
  const email = orderConfirmation?.order?.email ?? "";
  const shopDomain = shop?.myshopifyDomain ?? "";

  const handleSubmit = async () => {
    if (rating === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain,
          orderId,
          customerEmail: email || "unknown@checkout.extension",
          rating,
          reviewText: comment || "(no comment)",
        }),
      });
      const data = await res.json();
      // Backend returns { code } (not discountCode)
      const code = data.code || data.discountCode;
      if (data.success && code) {
        setDiscountCode(code);
        setSubmitted(true);
      } else if (data.success) {
        // Review saved but discount code generation failed — still a win
        setDiscountCode("CHECK YOUR EMAIL");
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted && discountCode) {
    return (
      <BlockStack spacing="base">
        <Banner status="success">
          <Text emphasis="bold">Thank you for your review!</Text>
        </Banner>
        <Text>Here is your discount code:</Text>
        <Text emphasis="bold" size="large">{discountCode}</Text>
        <Text size="small">Copy this code and use it on your next order.</Text>
      </BlockStack>
    );
  }

  return (
    <BlockStack spacing="base">
      <Text emphasis="bold" size="large">Leave a Review & Earn a Discount</Text>
      <Text size="small">Share your experience and we'll send you a discount code!</Text>

      <Text>Your rating:</Text>
      <InlineStack spacing="tight">
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
            key={star}
            kind={rating >= star ? "primary" : "secondary"}
            onPress={() => setRating(star)}
          >
            {String(star) + " ★"}
          </Button>
        ))}
      </InlineStack>

      <TextField
        label="Tell us more (optional)"
        value={comment}
        onChange={setComment}
        multiline={3}
      />

      {error ? (
        <Banner status="critical">
          <Text>{error}</Text>
        </Banner>
      ) : null}

      <Button
        kind="primary"
        onPress={handleSubmit}
        disabled={rating === 0 || loading}
      >
        {loading ? "Submitting…" : "Submit Review"}
      </Button>
    </BlockStack>
  );
}
