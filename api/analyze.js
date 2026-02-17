import { createClerkClient } from "@clerk/backend";
import { requireAuth } from "./_lib/auth.js";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function callAnthropic({ model, max_tokens, messages, system }) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) throw new Error("API key not configured");

  const body = {
    model: model || "claude-sonnet-4-20250514",
    max_tokens: max_tokens || 4000,
    messages,
  };
  if (system) body.system = system;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { status: response.status, data };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { clerkUserId } = await requireAuth(req);
    const user = await clerkClient.users.getUser(clerkUserId);
    const currentCredits = Number(user.privateMetadata?.credits ?? process.env.STARTER_CREDITS ?? 0);

    if (currentCredits <= 0) {
      return res.status(402).json({
        error: "No credits remaining. Please buy more credits.",
        credits: 0,
      });
    }

    const { model, max_tokens, messages, system } = req.body || {};
    const { status, data } = await callAnthropic({ model, max_tokens, messages, system });

    if (status >= 400) {
      return res.status(status).json(data);
    }

    const nextCredits = Math.max(0, currentCredits - 1);
    await clerkClient.users.updateUserMetadata(clerkUserId, {
      privateMetadata: {
        ...(user.privateMetadata || {}),
        credits: nextCredits,
        lastAnalysisAt: new Date().toISOString(),
      },
    });

    return res.status(200).json({ ...data, creditsRemaining: nextCredits });
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : 500;
    return res.status(status).json({ error: error.message || "Analysis failed" });
  }
}
