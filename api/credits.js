import { createClerkClient } from "@clerk/backend";
import { requireAuth } from "./_lib/auth.js";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { clerkUserId } = await requireAuth(req);
    const user = await clerkClient.users.getUser(clerkUserId);
    const credits = Number(user.privateMetadata?.credits || process.env.STARTER_CREDITS || 0);
    return res.status(200).json({ credits });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return res.status(status).json({ error: error.message || "Failed to fetch credits" });
  }
}
