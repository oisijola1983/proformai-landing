import { createClerkClient } from "@clerk/backend";
import { getStripe } from "../_lib/stripe.js";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function getRawBody(req) {
  if (typeof req.body === "string") return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length) return Buffer.concat(chunks).toString("utf8");
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) return res.status(400).json({ error: "Missing webhook signature config" });

    const body = await getRawBody(req);
    const event = stripe.webhooks.constructEvent(body, signature, secret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const clerkUserId = session.metadata?.clerkUserId || session.client_reference_id;
      if (clerkUserId && session.payment_status === "paid") {
        const user = await clerkClient.users.getUser(clerkUserId);
        const privateMetadata = user.privateMetadata || {};

        if (privateMetadata.lastStripeSessionId !== session.id) {
          const currentCredits = Number(privateMetadata.credits || process.env.STARTER_CREDITS || 0);
          const topup = Number(process.env.CREDIT_PACK_SIZE || 100);
          await clerkClient.users.updateUserMetadata(clerkUserId, {
            privateMetadata: {
              ...privateMetadata,
              credits: currentCredits + topup,
              lastStripeSessionId: session.id,
              lastPaymentAt: new Date().toISOString(),
            },
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Webhook error" });
  }
}
