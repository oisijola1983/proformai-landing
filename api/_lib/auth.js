import { verifyToken } from "@clerk/backend";

export async function requireAuth(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("Unauthorized");

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  if (!payload?.sub) throw new Error("Unauthorized");
  return { clerkUserId: payload.sub };
}
