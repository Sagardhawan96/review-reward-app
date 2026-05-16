import {
  reactExtension,
  BlockStack,
  InlineStack,
  Heading,
  Text,
  Button,
  TextArea,
  Banner,
  Pressable,
  useOrder,
  useShop,
  useBuyerIdentity,
  useSettings,
} from "@shopify/ui-extensions-react/checkout";
import { useState } from "react";

const APP_URL = "https://review-reward-app-production.up.railway.app";

export default reactExtension("purchase.thank-you.block.render", () => (
  <ReviewWidget />
));

function ReviewWidget() {
  const order = useOrder();
  const shop = useShop();
  const buyer = useBuyerIdentity();

  // Extract plain numeric order ID from GID (gid://shopify/Order/12345)
  const orderId = order?.id
    ? String(order.id).replace("gid://shopify/Order/", "")
    : null;
  const shopDomain = shop?.myshopifyDomain || "";
  const customerEmail = buyer?.email || "";

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [rewardMessage, setRewardMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!orderId) return null;

  async function handleSubmit() {
    if (!rating) {
      setError("Please select a star rating.");
      return;
    }
    if (reviewText.trim().length < 10) {
      setError("Please write at least 10 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const body = new FormData();
      body.append("shopDomain", shopDomain);
      body.append("orderId", orderId);
      body.append("customerEmail", customerEmail);
      body.append("rating", String(rating));
      body.append("reviewText", reviewText.trim());

      const res = await fetch(`${APP_URL}/api/reviews`, {
        method: "POST",
        body,
      });
      const data = await res.json();

      if (data.success) {
        setDiscountCode(data.code || "");
        setRewardMessage(data.reward || "Thank you for your review!");
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch (e) {
      setError("Could not connect to review server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <BlockStack spacing="base">
        <Banner status="success">
          <Text>Thank you for your review!</Text>
        </Banner>
        <Text>{rewardMessage}</Text>
        {discountCode ? (
          <BlockStack spacing="tight">
            <Text size="large" emphasis="bold">
              Your discount code:
            </Text>
            <Text size="extraLarge" emphasis="bold">
              {discountCode}
            </Text>
            <Text size="small" appearance="subdued">
              Use this code at checkout on your next order.
            </Text>
          </BlockStack>
        ) : null}
      </BlockStack>
    );
  }

  return (
    <BlockStack spacing="base">
      <Heading>How was your order?</Heading>
      <Text appearance="subdued">
        Leave a review and earn a reward — ₹200 off your next order!
      </Text>

      {/* Star Rating */}
      <InlineStack spacing="tight">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => setRating(star)}
            onPointerEnter={() => setHovered(star)}
            onPointerLeave={() => setHovered(0)}
            accessibilityLabel={`Rate ${star} stars`}
          >
            <Text size="extraLarge">
              {star <= (hovered || rating) ? "★" : "☆"}
            </Text>
          </Pressable>
        ))}
      </InlineStack>

      <TextArea
        label="Your review"
        placeholder="Tell others about your experience..."
        value={reviewText}
        onChange={(val) => setReviewText(val)}
        rows={4}
      />

      {error ? (
        <Banner status="critical">
          <Text>{error}</Text>
        </Banner>
      ) : null}

      <Button
        kind="primary"
        loading={loading}
        onPress={handleSubmit}
        disabled={loading}
      >
        Submit Review & Get ₹200 Off
      </Button>
    </BlockStack>
  );
}
