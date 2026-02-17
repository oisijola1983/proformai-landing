import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import UnderwritingApp from "./UnderwritingApp.jsx";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AppFrame({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1C", color: "#f1f5f9" }}>
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#111827",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <strong>ProformAI</strong>
          <Link to="/app" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>Underwrite</Link>
          <Link to="/app/billing" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 13 }}>Billing</Link>
        </div>
        <UserButton afterSignOutUrl="/app/sign-in" />
      </header>
      {children}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/app/sign-in" replace state={{ from: location.pathname }} />
      </SignedOut>
    </>
  );
}

function BillingPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayEmail = useMemo(
    () => user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "",
    [user]
  );

  const checkoutStatus = useMemo(() => {
    const value = new URLSearchParams(location.search).get("checkout");
    return value === "success" || value === "cancelled" ? value : null;
  }, [location.search]);

  async function loadCredits() {
    try {
      setError("");
      const token = await getToken();
      const res = await fetch("/api/credits", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load credits");
      setCredits(json.credits || 0);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadCredits();
  }, [location.search]);

  async function startCheckout() {
    try {
      setLoading(true);
      setError("");
      const token = await getToken();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerkUserId: user?.id,
          email: displayEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to create checkout session");
      window.location.href = json.url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <AppFrame>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
        <h2 style={{ marginTop: 8 }}>Billing & Credits</h2>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Purchase additional underwriting credits.</p>
        {checkoutStatus === "success" && (
          <div style={{ border: "1px solid #14532d", background: "#052e16", color: "#86efac", borderRadius: 10, padding: 10, fontSize: 13, marginTop: 12 }}>
            Payment received. Credits should update in a few seconds.
          </div>
        )}
        {checkoutStatus === "cancelled" && (
          <div style={{ border: "1px solid #7f1d1d", background: "#450a0a", color: "#fca5a5", borderRadius: 10, padding: 10, fontSize: 13, marginTop: 12 }}>
            Checkout cancelled. No charge was made.
          </div>
        )}
        <div style={{ border: "1px solid #1e293b", background: "#111827", borderRadius: 12, padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Current Balance</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>{credits ?? "—"}</div>
          {error && <div style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{error}</div>}
          <button
            onClick={startCheckout}
            disabled={loading}
            style={{ marginTop: 16, background: "#3b82f6", border: "none", color: "white", padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}
          >
            {loading ? "Redirecting..." : "Buy credit pack"}
          </button>
        </div>
      </div>
    </AppFrame>
  );
}

const emailOnlyAppearance = {
  elements: {
    socialButtonsBlockButton: { display: "none" },
    dividerRow: { display: "none" },
  },
};

function SignInPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1C", display: "grid", placeItems: "center", padding: 16 }}>
      <SignIn
        routing="path"
        path="/app/sign-in"
        signUpUrl="/app/sign-up"
        fallbackRedirectUrl="/app"
        appearance={emailOnlyAppearance}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1C", display: "grid", placeItems: "center", padding: 16 }}>
      <SignUp routing="path" path="/app/sign-up" forceRedirectUrl="/app" appearance={emailOnlyAppearance} />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/app/sign-in" element={<SignInPage />} />
      <Route path="/app/sign-up" element={<SignUpPage />} />
      <Route
        path="/app/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppFrame>
              <UnderwritingApp />
            </AppFrame>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default function App() {
  if (!publishableKey) {
    return <div style={{ padding: 24 }}>Missing VITE_CLERK_PUBLISHABLE_KEY</div>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AppRoutes />
    </ClerkProvider>
  );
}
