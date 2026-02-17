import { requireAuth } from "../_lib/auth.js";
import { getStripe } from "../_lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { clerkUserId } = await requireAuth(req);
    const stripe = getStripe();

    const baseUrl = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    const priceId = process.env.STRIPE_CREDIT_PRICE_ID;
    if (!priceId) return res.status(500).json({ error: "Missing STRIPE_CREDIT_PRICE_ID" });

    const { email } = req.body || {};
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/app/billing?checkout=success`,
      cancel_url: `${baseUrl}/app/billing?checkout=cancelled`,
      client_reference_id: clerkUserId,
      customer_email: email || undefined,
      metadata: { clerkUserId },
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return res.status(status).json({ error: error.message || "Checkout failed" });
  }
}
