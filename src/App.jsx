import * as Sentry from "@sentry/react";

// ── SENTRY ─────────────────────────────────────────────────────────────────
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://b462a14c5b6fba2fe05b4901ad6884750e04511397151783040.ingest.us.sentry.io/4511399626604544",
  environment: import.meta.env.MODE || "production",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0, // capture full replay when an error occurs
});

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ngfsttuxdfiyjauzlgtu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZnN0dHV4ZGZpeWphdXpsZ3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTE5NDUsImV4cCI6MjA5MjU2Nzk0NX0.C9cpFEDNhHHlfsBvzkW_IrhV34CfYWKUpeM2SR2Mzys"
);

const PLATFORMS = [
  { id: "google", label: "Google", color: "#4A90D9", icon: "G" },
  { id: "yelp", label: "Yelp", color: "#C0392B", icon: "Y" },
];

const C = {
  bg: "#F4F7FB", surface: "#FFFFFF", surfaceHover: "#EEF3FA",
  border: "#D6E2F0", gold: "#1A5FBF", text: "#0D1117",
  textMuted: "#6B7A99", textSub: "#9DADC4", green: "#1A8C4E", greenBg: "#E8F7EF",
  blue: "#4A90D9",
};

const font = {
  display: "'Playfair Display', Georgia, serif",
  body: "'Cormorant Garamond', Georgia, serif",
  mono: "'Courier New', monospace",
};

const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Cormorant+Garamond:wght@300;400;500;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F4F7FB; }
input::placeholder, textarea::placeholder { color: #B0BEDA; }
input:focus, textarea:focus { outline: none; border-color: #1A5FBF !important; box-shadow: 0 0 0 3px rgba(26,95,191,0.1); }
input:disabled, textarea:disabled { opacity: 0.5; cursor: not-allowed; }
@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
.fade-up { animation: fadeUp 0.4s ease forwards; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #F4F7FB; }
::-webkit-scrollbar-thumb { background: #D6E2F0; border-radius: 10px; }
`;

const SERVER = "https://reviewsend-server-production.up.railway.app";
const SUPER_ADMIN_EMAIL = "bentonisaiah03@gmail.com";

// ── FEATURE 4: Photo upload validation ───────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/svg+xml", "image/avif", "image/heic", "image/heif",
]);
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "heic", "heif",
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateImageFile(file) {
  if (!file) return { ok: false, error: "No file selected." };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `File is too large (${mb} MB). Maximum size is 10 MB.` };
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: `File type "${file.type || "unknown"}" is not allowed. Please upload an image (JPG, PNG, WebP, GIF, etc.)` };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `File extension ".${ext}" is not allowed. Please upload an image file.` };
  }
  return { ok: true };
}

// ── FEATURE 2 + 5: Send Confirmation Modal ───────────────────────────────────
const BULK_SEND_HARD_CAP = 50;

function SendConfirmationModal({ customerName, phone, platform, businessName, messagePreview, onConfirm, onCancel }) {
  const [sending, setSending] = useState(false);
  const handleConfirm = async () => {
    setSending(true);
    await onConfirm();
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && !sending && onCancel()}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, margin: 0 }}>Confirm review request</h2>
          {!sending && <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 20, lineHeight: 1 }}>×</button>}
        </div>
        {/* Recipient */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#F4F7FB", borderRadius: 10, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#ede9fe", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, fontFamily: font.display, flexShrink: 0 }}>
            {(customerName || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 600, color: C.text }}>{customerName}</div>
            <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted }}>+1{phone.replace(/\D/g, "")}</div>
          </div>
          <div style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 99, background: platform === "google" ? "#4A90D918" : "#C0392B18", color: platform === "google" ? "#4A90D9" : "#C0392B", fontFamily: font.body, fontSize: 12, fontWeight: 600, border: `1px solid ${platform === "google" ? "#4A90D933" : "#C0392B33"}` }}>
            {platform === "google" ? "Google" : "Yelp"}
          </div>
        </div>
        {/* Message preview */}
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, color: "#0369a1", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>Text message preview</p>
          <p style={{ fontFamily: font.body, fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>{messagePreview}</p>
        </div>
        <p style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, textAlign: "center", margin: "0 0 18px" }}>
          Sending as <strong>{businessName}</strong> · 1 SMS
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={sending} style={{ flex: 1, padding: "11px", background: "#fff", color: C.textMuted, border: `1.5px solid ${C.border}`, borderRadius: 8, fontFamily: font.body, fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: sending ? 0.5 : 1 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={sending} style={{ flex: 2, padding: "11px", background: sending ? "rgba(26,95,191,0.6)" : "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff", border: "none", borderRadius: 8, fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer" }}>
            {sending ? "Sending…" : "Send text"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FEATURE 1: Forgot Password ───────────────────────────────────────────────
function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    if (error) { setStatus("error"); setErrorMsg("Something went wrong. Please try again."); }
    else setStatus("sent");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, margin: 0 }}>Reset your password</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>✉️</div>
            <p style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>Check your email</p>
            <p style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: "0 0 24px" }}>
              If <strong>{email}</strong> has a ReviewSend account, you'll receive a reset link shortly.
            </p>
            <button onClick={onClose} style={{ ...btnStyle, width: "100%" }}>Back to login</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, lineHeight: 1.5, margin: "0 0 18px" }}>
              Enter your account email and we'll send you a link to reset your password.
            </p>
            <Label>Email address</Label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus style={{ ...inputStyle, marginBottom: 8 }} />
            {status === "error" && <p style={{ color: "#ef4444", fontSize: 13, fontFamily: font.body, margin: "0 0 12px" }}>{errorMsg}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", background: "#fff", color: C.textMuted, border: `1.5px solid ${C.border}`, borderRadius: 8, fontFamily: font.body, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button type="submit" disabled={status === "loading" || !email.trim()} style={{ flex: 2, ...btnStyle, padding: "11px", opacity: (status === "loading" || !email.trim()) ? 0.6 : 1 }}>
                {status === "loading" ? "Sending…" : "Send reset link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [marketingData, setMarketingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false); // Feature 1

  const [accountManagerData, setAccountManagerData] = useState(null);
  const [setPasswordMode, setSetPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [setPasswordLoading, setSetPasswordLoading] = useState(false);
  const [setPasswordError, setSetPasswordError] = useState("");
  const [setPasswordSuccess, setSetPasswordSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCode = urlParams.get("code");
    const oauthState = urlParams.get("state");
    if (oauthCode && oauthState) {
      sessionStorage.setItem("google_oauth_code", oauthCode);
      sessionStorage.setItem("google_oauth_state", String(oauthState));
      window.history.replaceState({}, "", window.location.pathname);
    }

    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setSetPasswordMode(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && !hash.includes("type=recovery")) loadUserRole(session.user.email);
      else if (!session) setLoading(false);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === "PASSWORD_RECOVERY") {
        setSetPasswordMode(true);
        setLoading(false);
        return;
      }
      if (session && !setPasswordMode) loadUserRole(session.user.email);
      else if (!session) { setLoading(false); setUserRole(null); setBusinessData(null); setMarketingData(null); setAccountManagerData(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async () => {
    setSetPasswordError("");
    if (!newPassword || newPassword.length < 6) { setSetPasswordError("Password must be at least 6 characters."); return; }
    if (newPassword !== newPasswordConfirm) { setSetPasswordError("Passwords do not match."); return; }
    setSetPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setSetPasswordError(error.message); setSetPasswordLoading(false); return; }
    setSetPasswordSuccess(true);
    setSetPasswordLoading(false);
    window.history.replaceState(null, "", window.location.pathname);
    setTimeout(() => { setSetPasswordMode(false); setSetPasswordSuccess(false); supabase.auth.signOut(); }, 2500);
  };

  const loadUserRole = async (email) => {
    setLoading(true);
    if (email === SUPER_ADMIN_EMAIL) { setUserRole("superadmin"); setLoading(false); return; }
    const { data: mc } = await supabase.from("marketing_companies").select("*").eq("email", email).single();
    if (mc) { setUserRole("marketing"); setMarketingData(mc); setLoading(false); return; }
    const { data: am } = await supabase.from("account_managers").select("*, marketing_companies(*)").eq("email", email).single();
    if (am) { setUserRole("accountmanager"); setAccountManagerData(am); setLoading(false); return; }
    const { data: biz } = await supabase.from("businesses").select("*").eq("email", email).single();
    if (biz) { setUserRole("business"); setBusinessData(biz); setLoading(false); return; }
    setUserRole("unknown");
    setLoading(false);
  };

  // Feature 6: rate-limited login — hit server first, then Supabase
  const handleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    const cleanEmail = authEmail.trim().toLowerCase();

    // Check if employee first (route to server-side rate-limited endpoint)
    // We try the employee path via server which handles its own rate limiting
    try {
      const empRes = await fetch(`${SERVER}/employee-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: authPassword }),
      });
      if (empRes.status === 429) {
        const body = await empRes.json();
        const mins = Math.ceil((body.retryAfter || 600) / 60);
        setAuthError(`Too many attempts. Please wait ${mins} minute${mins !== 1 ? "s" : ""} and try again.`);
        setAuthLoading(false);
        return;
      }
      const empData = await empRes.json();
      if (empData.success && empData.employee) {
        // Employee login successful
        setUserRole("employee");
        setBusinessData(empData.business);
        setSession({ user: { email: cleanEmail } });
        setLoading(false);
        setAuthLoading(false);
        return;
      }
      // If employee not found (401 with "Invalid credentials" could mean not an employee)
      // Fall through to business owner login
      if (empRes.status === 401 && !empData.success) {
        // Could be a business owner — check rate limit for business owner login
        const checkRes = await fetch(`${SERVER}/business-login-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (checkRes.status === 429) {
          const body = await checkRes.json();
          const mins = Math.ceil((body.retryAfter || 900) / 60);
          setAuthError(`Too many attempts. Please wait ${mins} minute${mins !== 1 ? "s" : ""} and try again.`);
          setAuthLoading(false);
          return;
        }
        // Rate check passed — attempt Supabase auth
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: authPassword });
        if (error) setAuthError(error.message);
      }
    } catch (err) {
      // Server unreachable — fall back to direct Supabase (graceful degradation)
      console.warn("Rate limit server unreachable, falling back:", err.message);
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: authPassword });
      if (error) setAuthError(error.message);
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    if (userRole === "employee") { setSession(null); setUserRole(null); setBusinessData(null); return; }
    await supabase.auth.signOut();
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{globalCSS}</style>
      <div style={{ fontFamily: font.body, fontSize: 16, color: C.textMuted, letterSpacing: 2 }}>Loading…</div>
    </div>
  );

  if (setPasswordMode) return (
    <SetPasswordScreen
      newPassword={newPassword} setNewPassword={setNewPassword}
      newPasswordConfirm={newPasswordConfirm} setNewPasswordConfirm={setNewPasswordConfirm}
      handleSetPassword={handleSetPassword}
      loading={setPasswordLoading} error={setPasswordError} success={setPasswordSuccess}
    />
  );

  if (!session) return (
    <>
      <LoginScreen
        authMode={authMode} setAuthMode={setAuthMode}
        authEmail={authEmail} setAuthEmail={setAuthEmail}
        authPassword={authPassword} setAuthPassword={setAuthPassword}
        authError={authError} authLoading={authLoading}
        handleLogin={handleLogin}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
    </>
  );

  if (userRole === "superadmin") return <SuperAdminDashboard onSignOut={handleSignOut} />;
  if (userRole === "marketing") return <MarketingDashboard data={marketingData} onSignOut={handleSignOut} />;
  if (userRole === "accountmanager") return <AccountManagerDashboard data={accountManagerData} onSignOut={handleSignOut} />;
  if (userRole === "business") return <BusinessApp data={businessData} onSignOut={handleSignOut} isEmployee={false} />;
  if (userRole === "employee") return <BusinessApp data={businessData} onSignOut={handleSignOut} isEmployee={true} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{globalCSS}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: font.display, fontSize: 20, color: C.text, marginBottom: 12 }}>Account not found</div>
        <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, marginBottom: 24 }}>Your email is not linked to any account. Please contact support.</div>
        <button onClick={handleSignOut} style={{ ...btnStyle }}>Sign Out</button>
      </div>
    </div>
  );
}

// ── SET PASSWORD SCREEN ──────────────────────────────────────────────────────
function SetPasswordScreen({ newPassword, setNewPassword, newPasswordConfirm, setNewPasswordConfirm, handleSetPassword, loading, error, success }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{globalCSS}</style>
      <div className="fade-up" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, letterSpacing: 5, color: "#1A5FBF", marginBottom: 10 }}>★ REVIEWSEND</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, fontWeight: 600, color: "#0D1117", letterSpacing: "-0.5px" }}>Set Your Password</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#6B7A99", fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
            Create a password for your ReviewSend account. You'll use this to log in going forward.
          </p>
        </div>
        <div style={{ background: "#fff", border: "1px solid #D6E2F0", borderRadius: 16, padding: 36, boxShadow: "0 2px 16px rgba(26,95,191,0.06)" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#0D1117", marginBottom: 8 }}>Password Set!</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, color: "#6B7A99" }}>Redirecting you to sign in…</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#6B7A99", marginBottom: 8 }}>New Password</label>
                <input type="password" value={newPassword} placeholder="At least 6 characters"
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: "100%", padding: "13px 16px", border: "1px solid #D6E2F0", borderRadius: 10, fontSize: 15, fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#0D1117", outline: "none", background: "#fff" }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#6B7A99", marginBottom: 8 }}>Confirm Password</label>
                <input type="password" value={newPasswordConfirm} placeholder="Repeat your password"
                  onChange={e => setNewPasswordConfirm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSetPassword()}
                  style={{ width: "100%", padding: "13px 16px", border: "1px solid #D6E2F0", borderRadius: 10, fontSize: 15, fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#0D1117", outline: "none", background: "#fff" }} />
              </div>
              {error && <p style={{ color: "#e74c3c", fontSize: 13, fontFamily: "'Cormorant Garamond', Georgia, serif", marginBottom: 16 }}>{error}</p>}
              <button onClick={handleSetPassword} disabled={loading}
                style={{ width: "100%", padding: "14px", background: "#1A5FBF", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, fontFamily: "'Cormorant Garamond', Georgia, serif", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Setting password…" : "Set My Password →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── LOGIN SCREEN (Feature 1: forgot password link added) ─────────────────────
function LoginScreen({ authEmail, setAuthEmail, authPassword, setAuthPassword, authError, authLoading, handleLogin, onForgotPassword }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{globalCSS}</style>
      <div className="fade-up" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 5, color: C.gold, marginBottom: 10 }}>★ REVIEWSEND</div>
          <h1 style={{ fontFamily: font.display, fontSize: 32, fontWeight: 400, color: C.text, letterSpacing: "-0.5px" }}>Welcome back</h1>
          <p style={{ fontFamily: font.body, color: C.textMuted, fontSize: 15, marginTop: 8 }}>Sign in to your dashboard</p>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 36, boxShadow: "0 2px 16px rgba(26,95,191,0.06)" }}>
          <div style={{ marginBottom: 18 }}>
            <Label>Email</Label>
            <input type="email" value={authEmail} placeholder="you@yourbusiness.com"
              onChange={e => setAuthEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <Label>Password</Label>
            <input type="password" value={authPassword} placeholder="••••••••"
              onChange={e => setAuthPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={inputStyle} />
          </div>
          {/* Feature 1: Forgot password link */}
          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <button
              type="button"
              onClick={onForgotPassword}
              style={{ background: "none", border: "none", color: C.gold, fontFamily: font.body, fontSize: 13, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              Forgot password?
            </button>
          </div>
          {authError && <p style={{ color: "#e74c3c", fontSize: 13, fontFamily: font.body, marginBottom: 16 }}>{authError}</p>}
          <button onClick={handleLogin} disabled={authLoading}
            style={{ ...btnStyle, width: "100%", fontSize: 16 }}>
            {authLoading ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SERVER HELPERS ────────────────────────────────────────────────────────────
async function deleteAuthUser(email) {
  try {
    const response = await fetch(`${SERVER}/delete-user`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return data.success;
  } catch (err) { console.error("deleteAuthUser error:", err); return false; }
}

async function createAuthUser(email) {
  try {
    const response = await fetch(`${SERVER}/create-user`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return data.success;
  } catch (err) { console.error("createAuthUser error:", err); return false; }
}

async function sendInviteEmail(email, businessName) {
  try {
    const response = await fetch(`${SERVER}/send-invite`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, businessName }),
    });
    const data = await response.json();
    if (!data.success) { console.error("Invite email error:", data.error); return false; }
    return true;
  } catch (err) { console.error("Invite email error:", err); return false; }
}

// ── SUPER ADMIN DASHBOARD ─────────────────────────────────────────────────────
function SuperAdminDashboard({ onSignOut }) {
  const [tab, setTab] = useState("companies");
  const [companies, setCompanies] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", email: "", password: "", revenue_share: 20 });
  const [newBusiness, setNewBusiness] = useState({ name: "", email: "", password: "", google_link: "", yelp_link: "", marketing_company_id: "" });
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    loadData();
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadData = async () => {
    const { data: mc } = await supabase.from("marketing_companies").select("*").order("created_at", { ascending: false });
    const { data: biz } = await supabase.from("businesses").select("*, marketing_companies(name)").order("created_at", { ascending: false });
    if (mc) setCompanies(mc);
    if (biz) setBusinesses(biz);
  };

  const addCompany = async () => {
    setSaving(true);
    await supabase.auth.admin?.createUser({ email: newCompany.email, password: newCompany.password });
    const { error } = await supabase.from("marketing_companies").insert([{ name: newCompany.name, email: newCompany.email, revenue_share: newCompany.revenue_share }]);
    if (!error) { setShowAddCompany(false); setNewCompany({ name: "", email: "", password: "", revenue_share: 20 }); loadData(); }
    setSaving(false);
  };

  const addBusiness = async () => {
    setSaving(true);
    const cleanEmail = newBusiness.email.trim().toLowerCase();
    await createAuthUser(cleanEmail);
    const { error } = await supabase.from("businesses").insert([{
      name: newBusiness.name, email: cleanEmail,
      google_link: newBusiness.google_link, yelp_link: newBusiness.yelp_link,
      marketing_company_id: newBusiness.marketing_company_id || null,
      message_template: "Hi {name}! Thanks for visiting {business}. Leave us a review here: {link} 🙏",
      follow_up_template: "Hi {name}! Just a reminder — we'd love your review: {link} ⭐",
    }]);
    if (!error) {
      await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: "https://app.reviewsend.io" });
      await sendInviteEmail(cleanEmail, newBusiness.name);
      setShowAddBusiness(false);
      setNewBusiness({ name: "", email: "", password: "", google_link: "", yelp_link: "", marketing_company_id: "" });
      loadData();
      alert("Client created! A password setup email has been sent to " + cleanEmail);
    } else { alert("Error saving client: " + error.message); }
    setSaving(false);
  };

  const deleteCompany = async (id) => {
    if (!window.confirm("Are you sure you want to delete this marketing company? This cannot be undone.")) return;
    await supabase.from("marketing_companies").delete().eq("id", id);
    loadData();
  };

  const deleteBusiness = async (id, name, email) => {
    if (!window.confirm("Are you sure you want to delete " + (name || "this business") + "?\n\nThis will permanently delete all their messages, photos, and history. This cannot be undone.")) return;
    await supabase.from("messages").delete().eq("business_id", id);
    await supabase.from("photos").delete().eq("business_id", id);
    await supabase.from("bulk_sends").delete().eq("business_id", id);
    await supabase.from("employees").delete().eq("business_id", id);
    await supabase.from("businesses").delete().eq("id", id);
    if (email) await deleteAuthUser(email);
    loadData();
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{globalCSS}</style>
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 5, color: C.gold }}>★ REVIEWSEND <span style={{ fontSize: 10, letterSpacing: 2, color: C.textMuted, marginLeft: 8 }}>SUPER ADMIN</span></div>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4.5 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: "block", width: 18, height: 1.5, background: C.text, borderRadius: 2 }} />)}
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, minWidth: 200, overflow: "hidden", boxShadow: "0 12px 40px rgba(13,17,23,0.12)" }}>
                {[["companies","◈","Marketing Companies"],["businesses","◉","All Businesses"],["photos","📸","All Photos"],["analytics","📊","Analytics"]].map(([id,ico,label]) => (
                  <button key={id} onClick={() => { setTab(id); setMenuOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 18px", background: tab === id ? C.surfaceHover : "none", border: "none", color: tab === id ? C.gold : C.textMuted, cursor: "pointer", fontFamily: font.body, fontSize: 14, textAlign: "left" }}>
                    <span style={{ fontSize: 11, color: C.gold }}>{ico}</span>{label}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                  <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 18px", background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontFamily: font.body, fontSize: 14, textAlign: "left" }}>→ Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "44px 28px 80px" }}>
        {tab === "companies" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
              <PageHeader title="Marketing Companies" sub={`${companies.length} companies`} />
              <button onClick={() => setShowAddCompany(true)} style={{ ...btnStyle, marginTop: 8 }}>+ Add Company</button>
            </div>
            {showAddCompany && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontFamily: font.display, fontSize: 18, marginBottom: 20, color: C.text }}>New Marketing Company</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><Label>Company Name</Label><input style={inputStyle} value={newCompany.name} onChange={e => setNewCompany(d => ({...d, name: e.target.value}))} placeholder="XYZ Marketing" /></div>
                  <div><Label>Email</Label><input style={inputStyle} value={newCompany.email} onChange={e => setNewCompany(d => ({...d, email: e.target.value}))} placeholder="contact@xyzmarketing.com" /></div>
                  <div><Label>Password</Label><input type="password" style={inputStyle} value={newCompany.password} onChange={e => setNewCompany(d => ({...d, password: e.target.value}))} placeholder="Create a password" /></div>
                  <div><Label>Revenue Share %</Label><input type="number" style={inputStyle} value={newCompany.revenue_share} onChange={e => setNewCompany(d => ({...d, revenue_share: e.target.value}))} placeholder="20" /></div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={addCompany} disabled={saving} style={{ ...btnStyle }}>{saving ? "Saving…" : "Create Company"}</button>
                  <button onClick={() => setShowAddCompany(false)} style={{ ...ghostBtnStyle }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {companies.map(c => (
                <div key={c.id} style={{ ...card, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: font.display, fontSize: 17, color: C.text, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted, marginTop: 4 }}>{c.email}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: font.body, fontSize: 13, padding: "4px 12px", borderRadius: 99, background: "#EEF3FA", color: C.gold, fontWeight: 600 }}>{c.revenue_share}% share</span>
                      <button onClick={() => deleteCompany(c.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontFamily: font.body, fontSize: 13 }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              {companies.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No marketing companies yet. Add one above!</div>}
            </div>
          </div>
        )}
        {tab === "businesses" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
              <PageHeader title="All Businesses" sub={`${businesses.length} businesses`} />
              <button onClick={() => setShowAddBusiness(true)} style={{ ...btnStyle, marginTop: 8 }}>+ Add Business</button>
            </div>
            {showAddBusiness && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontFamily: font.display, fontSize: 18, marginBottom: 20, color: C.text }}>New Business</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><Label>Business Name</Label><input style={inputStyle} value={newBusiness.name} onChange={e => setNewBusiness(d => ({...d, name: e.target.value}))} placeholder="Joe's Restaurant" /></div>
                  <div><Label>Email</Label><input style={inputStyle} value={newBusiness.email} onChange={e => setNewBusiness(d => ({...d, email: e.target.value}))} placeholder="joe@restaurant.com" /></div>
                  <div><Label>Google Review Link</Label><input style={inputStyle} value={newBusiness.google_link} onChange={e => setNewBusiness(d => ({...d, google_link: e.target.value}))} placeholder="https://g.page/r/..." /></div>
                  <div><Label>Yelp Review Link</Label><input style={inputStyle} value={newBusiness.yelp_link} onChange={e => setNewBusiness(d => ({...d, yelp_link: e.target.value}))} placeholder="https://www.yelp.com/biz/..." /></div>
                  <div><Label>Marketing Company</Label>
                    <select style={inputStyle} value={newBusiness.marketing_company_id} onChange={e => setNewBusiness(d => ({...d, marketing_company_id: e.target.value}))}>
                      <option value="">None (Direct Client)</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={addBusiness} disabled={saving} style={{ ...btnStyle }}>{saving ? "Saving…" : "Create Business"}</button>
                  <button onClick={() => setShowAddBusiness(false)} style={{ ...ghostBtnStyle }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {businesses.map(b => (
                <div key={b.id} style={{ ...card, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: font.display, fontSize: 17, color: C.text, fontWeight: 600 }}>{b.name}</div>
                      <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted, marginTop: 4 }}>{b.email}</div>
                      {b.marketing_companies && <div style={{ fontFamily: font.body, fontSize: 12, color: C.gold, marginTop: 4 }}>via {b.marketing_companies.name}</div>}
                    </div>
                    <button onClick={() => deleteBusiness(b.id, b.name, b.email)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontFamily: font.body, fontSize: 13 }}>🗑️ Delete</button>
                  </div>
                </div>
              ))}
              {businesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No businesses yet. Add one above!</div>}
            </div>
          </div>
        )}
        {tab === "photos" && <PhotosTab isAdmin={true} />}
        {tab === "analytics" && (
          <div className="fade-up">
            <PageHeader title="Analytics" sub="Performance across all companies and businesses" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { value: companies.length, label: "Marketing Companies", color: C.gold },
                { value: businesses.length, label: "Total Businesses", color: "#4A90D9" },
                { value: businesses.length, label: "Active This Month", color: C.green },
              ].map((s, i) => (
                <div key={i} style={{ ...card, padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>All Businesses</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {businesses.map(b => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontFamily: font.display, fontSize: 15, color: C.text, fontWeight: 600 }}>{b.name}</div>
                      {b.marketing_companies && <div style={{ fontFamily: font.body, fontSize: 12, color: C.gold, marginTop: 2 }}>via {b.marketing_companies.name}</div>}
                    </div>
                    <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted }}>{b.email}</div>
                  </div>
                ))}
                {businesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 20 }}>No businesses yet.</div>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


// ── MARKETING COMPANY DASHBOARD ───────────────────────────────────────────────
// ── MARKETING COMPANY REBUILD ─────────────────────────────────────────────────
// Same redesign as the account manager side: one Calendar (here showing every
// account manager's appointments together, labeled by manager), searchable
// Clients list, per-client workspace (Messages, Notes, Appointments, Photos,
// Analytics, full Settings), and a Photos directory grouped by client.
// Marketing-only additions on top of that: a Managers tab, adding new clients,
// assigning a client to an account manager, and the Danger Zone delete.
function MarketingDashboard({ data, onSignOut }) {
  const [view, setView] = useState("calendar"); // calendar | clients | photos | managers
  const [businesses, setBusinesses] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthDate, setMonthDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState(null);
  const [modalDefaultBiz, setModalDefaultBiz] = useState(null);
  const [editingAppt, setEditingAppt] = useState(null);

  const [showAddClient, setShowAddClient] = useState(false);
  const [newBiz, setNewBiz] = useState({ name: "", email: "", google_link: "", yelp_link: "" });
  const [savingClient, setSavingClient] = useState(false);

  const [showAddManager, setShowAddManager] = useState(false);
  const [newManager, setNewManager] = useState({ name: "", email: "" });
  const [savingManager, setSavingManager] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [businessToDelete, setBusinessToDelete] = useState(null);

  const [bizMessages, setBizMessages] = useState([]);
  const [bizPhotos, setBizPhotos] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChatByBiz, setUnreadChatByBiz] = useState({});
  const [pendingPhotosByBiz, setPendingPhotosByBiz] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const { data: biz } = await supabase.from("businesses").select("*").eq("marketing_company_id", data.id).order("name");
    if (biz) {
      setBusinesses(biz);
      const ids = biz.map(b => b.id);
      if (ids.length > 0) {
        const { data: photos } = await supabase.from("photos").select("business_id, status").in("business_id", ids).eq("status", "pending");
        if (photos) {
          const counts = {};
          photos.forEach(p => { counts[p.business_id] = (counts[p.business_id] || 0) + 1; });
          setPendingPhotosByBiz(counts);
        }
        const { data: unread } = await supabase.from("chat_messages").select("business_id").in("business_id", ids).eq("sender_role", "owner").eq("read", false);
        if (unread) {
          const chatCounts = {};
          unread.forEach(m => { chatCounts[m.business_id] = (chatCounts[m.business_id] || 0) + 1; });
          setUnreadChatByBiz(chatCounts);
        }
      }
    }
    const { data: ams } = await supabase.from("account_managers").select("*").eq("marketing_company_id", data.id).order("name");
    if (ams) setAccountManagers(ams);
    const { data: appts } = await supabase.from("appointments").select("*").eq("marketing_company_id", data.id).order("starts_at");
    if (appts) setAppointments(appts);
  };

  const businessNameById = businesses.reduce((acc, b) => { acc[b.id] = b.name; return acc; }, {});
  const managerNameById = accountManagers.reduce((acc, m) => { acc[m.id] = m.name; return acc; }, {});

  const openScheduleModal = (date, businessId, appt) => {
    setModalDefaultDate(date || null);
    setModalDefaultBiz(businessId || (selectedBusiness ? selectedBusiness.id : null));
    setEditingAppt(appt || null);
    setModalOpen(true);
  };

  const handleSaveAppt = async ({ business_id, starts_at, duration_minutes, title, notes }) => {
    const business = businesses.find(b => b.id === business_id);
    if (editingAppt) {
      const { data: updated } = await supabase.from("appointments").update({ business_id, starts_at, duration_minutes, title, notes }).eq("id", editingAppt.id).select().single();
      if (updated) setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
    } else {
      const { data: inserted } = await supabase.from("appointments").insert([{
        business_id, starts_at, duration_minutes, title, notes,
        account_manager_id: business?.account_manager_id || null,
        marketing_company_id: data.id,
      }]).select().single();
      if (inserted) setAppointments(prev => [...prev, inserted]);
    }
    setModalOpen(false);
  };

  const handleDeleteAppt = async (id) => {
    await supabase.from("appointments").delete().eq("id", id);
    setAppointments(prev => prev.filter(a => a.id !== id));
    setModalOpen(false);
  };

  const nextApptFor = (businessId) => {
    const now = new Date();
    return appointments.filter(a => a.business_id === businessId && new Date(a.starts_at) >= now).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
  };

  const selectBusiness = async (biz) => {
    setSelectedBusiness(biz);
    const { data: msgs } = await supabase.from("messages").select("*").eq("business_id", biz.id).order("sent_at", { ascending: false });
    setBizMessages(msgs || []);
    const { data: photos } = await supabase.from("photos").select("*").eq("business_id", biz.id);
    setBizPhotos(photos || []);
    await loadChat(biz.id);
  };

  const loadChat = async (bizId) => {
    const { data: msgs } = await supabase.from("chat_messages").select("*").eq("business_id", bizId).order("created_at", { ascending: true });
    setChatMessages(msgs || []);
    await supabase.from("chat_messages").update({ read: true }).eq("business_id", bizId).eq("sender_role", "owner").eq("read", false);
    setUnreadChatByBiz(prev => ({ ...prev, [bizId]: 0 }));
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !selectedBusiness) return;
    const msg = { business_id: selectedBusiness.id, sender_role: "manager", sender_name: data.name, message: chatInput.trim(), read: false };
    const { data: inserted } = await supabase.from("chat_messages").insert([msg]).select().single();
    if (inserted) setChatMessages(prev => [...prev, inserted]);
    setChatInput("");
  };

  const assignToManager = async (bizId, amId) => {
    await supabase.from("businesses").update({ account_manager_id: amId || null }).eq("id", bizId);
    setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, account_manager_id: amId || null } : b));
    setSelectedBusiness(b => b ? { ...b, account_manager_id: amId || null } : null);
  };

  const addBusiness = async () => {
    setSavingClient(true);
    const cleanEmail = newBiz.email.trim().toLowerCase();
    await createAuthUser(cleanEmail);
    const { error } = await supabase.from("businesses").insert([{
      name: newBiz.name, email: cleanEmail,
      google_link: newBiz.google_link, yelp_link: newBiz.yelp_link,
      marketing_company_id: data.id,
      message_template: "Hi {name}! Thanks for visiting {business}. Leave us a review here: {link} 🙏",
      follow_up_template: "Hi {name}! Just a reminder — we'd love your review: {link} ⭐",
    }]);
    if (!error) {
      await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: "https://app.reviewsend.io" });
      await sendInviteEmail(cleanEmail, newBiz.name);
      setShowAddClient(false);
      setNewBiz({ name: "", email: "", google_link: "", yelp_link: "" });
      loadAll();
      alert("Client created! A password setup email has been sent to " + cleanEmail);
    } else {
      alert(error.message.includes("duplicate key") || error.message.includes("unique constraint") ? "A client with that email address already exists." : "Error saving client: " + error.message);
    }
    setSavingClient(false);
  };

  const addAccountManager = async () => {
    setSavingManager(true);
    const { error } = await supabase.from("account_managers").insert([{ name: newManager.name, email: newManager.email, marketing_company_id: data.id }]);
    if (!error) { setShowAddManager(false); setNewManager({ name: "", email: "" }); loadAll(); }
    else alert("Error: " + error.message);
    setSavingManager(false);
  };

  const removeAccountManager = async (id) => {
    if (!window.confirm("Remove this account manager? Their assigned clients will become unassigned.")) return;
    await supabase.from("businesses").update({ account_manager_id: null }).eq("account_manager_id", id);
    await supabase.from("account_managers").delete().eq("id", id);
    loadAll();
  };

  const confirmDeleteClient = async () => {
    if (!businessToDelete) return;
    if (deleteConfirmText.trim().toLowerCase() !== businessToDelete.name.trim().toLowerCase()) {
      alert("Business name does not match. Please type the name exactly as shown.");
      return;
    }
    await supabase.from("messages").delete().eq("business_id", businessToDelete.id);
    await supabase.from("photos").delete().eq("business_id", businessToDelete.id);
    await supabase.from("bulk_sends").delete().eq("business_id", businessToDelete.id);
    await supabase.from("employees").delete().eq("business_id", businessToDelete.id);
    await supabase.from("appointments").delete().eq("business_id", businessToDelete.id);
    await supabase.from("client_notes").delete().eq("business_id", businessToDelete.id);
    await supabase.from("businesses").delete().eq("id", businessToDelete.id);
    if (businessToDelete.email) await deleteAuthUser(businessToDelete.email);
    setShowDeleteModal(false); setDeleteConfirmText(""); setBusinessToDelete(null);
    setSelectedBusiness(null);
    loadAll();
  };

  const filteredBusinesses = businesses.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const todaysAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), new Date())).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex" }}>
      <style>{globalCSS}</style>

      {modalOpen && (
        <ScheduleModal
          businesses={businesses}
          defaultBusinessId={modalDefaultBiz}
          defaultDate={modalDefaultDate}
          editingAppt={editingAppt}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveAppt}
          onDelete={handleDeleteAppt}
        />
      )}

      {showDeleteModal && businessToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: "#cc0000", marginBottom: 8 }}>Delete Client</div>
            <p style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>This will permanently delete <strong>{businessToDelete.name}</strong> and all their data. This cannot be undone.</p>
            <div style={{ background: "#fff5f5", border: "1px solid #ffcccc", borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <div style={{ fontFamily: font.body, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>Type the business name to confirm:</div>
              <div style={{ fontFamily: font.body, fontSize: 13, color: "#cc0000", fontWeight: 700, marginBottom: 10 }}>{businessToDelete.name}</div>
              <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={businessToDelete.name} style={{ ...inputStyle, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); setBusinessToDelete(null); }} style={{ ...ghostBtnStyle, flex: 1 }}>Cancel</button>
              <button onClick={confirmDeleteClient} disabled={deleteConfirmText.trim().toLowerCase() !== businessToDelete.name.trim().toLowerCase()}
                style={{ flex: 1, padding: "11px", background: deleteConfirmText.trim().toLowerCase() === businessToDelete.name.trim().toLowerCase() ? "#cc0000" : "#ffaaaa", border: "none", borderRadius: 8, fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#fff" }}>
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 4, color: C.gold, padding: "0 8px 20px" }}>★ REVIEWSEND</div>
        {[["calendar", "Calendar"], ["clients", "Clients"], ["photos", "Photos"], ["managers", "Managers"]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: "none", background: view === id ? "#EEF3FA" : "transparent", color: view === id ? C.gold : C.textMuted, fontFamily: font.body, fontSize: 14, fontWeight: view === id ? 600 : 400, textAlign: "left", cursor: "pointer" }}>
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, padding: "0 8px 8px" }}>{data.name}</div>
          <button onClick={onSignOut} style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", color: C.textMuted, fontFamily: font.body, fontSize: 13, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: `1px solid ${C.border}`, background: C.surface, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600 }}>
            {view === "calendar" ? "Calendar — every account manager" : view === "clients" ? "Clients" : view === "photos" ? "Photos — by client" : "Account Managers"}
          </div>
          {view === "clients" && <button onClick={() => setShowAddClient(true)} style={{ ...btnStyle, fontSize: 14 }}>+ Add Client</button>}
          {view === "managers" && <button onClick={() => setShowAddManager(true)} style={{ ...btnStyle, fontSize: 14 }}>+ Add Manager</button>}
          {(view === "calendar" || view === "clients") && <button onClick={() => openScheduleModal(null, null, null)} style={{ ...btnStyle, fontSize: 14 }}>+ Schedule</button>}
        </div>

        <div style={{ padding: 32 }}>

          {view === "calendar" && (
            <div className="fade-up">
              <div style={{ ...card, padding: 16, marginBottom: 16, background: "#EEF3FA" }}>
                {todaysAppts.length === 0 ? (
                  <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted }}>Nothing on the calendar today.</div>
                ) : (
                  <>
                    <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Today — {todaysAppts.length} appointment{todaysAppts.length > 1 ? "s" : ""}</div>
                    {todaysAppts.map(a => (
                      <div key={a.id} style={{ fontFamily: font.body, fontSize: 14, color: C.text }}>
                        {fmtTime(new Date(a.starts_at))} · {businessNameById[a.business_id]} — {a.title}
                        {managerNameById[a.account_manager_id] && <span style={{ color: C.textMuted }}> ({managerNameById[a.account_manager_id]})</span>}
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ ...ghostBtnStyle, padding: "6px 12px", fontSize: 13 }}>←</button>
                <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600 }}>{monthLabel(monthDate)}</div>
                <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ ...ghostBtnStyle, padding: "6px 12px", fontSize: 13 }}>→</button>
              </div>
              <p style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Every account manager's appointments, in one place — labeled by manager. Click an empty day to schedule, click an appointment to edit or cancel it.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ textAlign: "center", fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{d}</div>)}
              </div>
              <CalendarMonthGrid
                monthDate={monthDate}
                appointments={appointments}
                businessNameById={businessNameById}
                managerNameById={managerNameById}
                onDayClick={(date) => openScheduleModal(date, null, null)}
                onApptClick={(appt) => openScheduleModal(null, appt.business_id, appt)}
              />
            </div>
          )}

          {view === "clients" && (
            <div className="fade-up" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ width: 300, flexShrink: 0 }}>
                {showAddClient && (
                  <div style={{ ...card, marginBottom: 16 }}>
                    <div style={{ fontFamily: font.display, fontSize: 16, marginBottom: 14 }}>New Client Business</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                      <input style={inputStyle} value={newBiz.name} onChange={e => setNewBiz(d => ({ ...d, name: e.target.value }))} placeholder="Business name" />
                      <input style={inputStyle} value={newBiz.email} onChange={e => setNewBiz(d => ({ ...d, email: e.target.value }))} placeholder="Login email" />
                      <input style={inputStyle} value={newBiz.google_link} onChange={e => setNewBiz(d => ({ ...d, google_link: e.target.value }))} placeholder="Google review link" />
                      <input style={inputStyle} value={newBiz.yelp_link} onChange={e => setNewBiz(d => ({ ...d, yelp_link: e.target.value }))} placeholder="Yelp review link" />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={addBusiness} disabled={savingClient} style={{ ...btnStyle, fontSize: 13, padding: "8px 14px" }}>{savingClient ? "Saving…" : "Create"}</button>
                      <button onClick={() => setShowAddClient(false)} style={{ ...ghostBtnStyle, fontSize: 13, padding: "8px 14px" }}>Cancel</button>
                    </div>
                  </div>
                )}
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search clients…" style={{ ...inputStyle, marginBottom: 16 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
                  {filteredBusinesses.map(b => (
                    <div key={b.id} onClick={() => selectBusiness(b)}
                      style={{ ...card, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: selectedBusiness?.id === b.id ? `2px solid ${C.gold}` : `1px solid ${C.border}` }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EEF3FA", color: C.gold, fontFamily: font.display, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{b.name.charAt(0)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                        <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.email}</div>
                        {managerNameById[b.account_manager_id] && <div style={{ fontFamily: font.body, fontSize: 11, color: C.gold }}>👤 {managerNameById[b.account_manager_id]}</div>}
                      </div>
                      {unreadChatByBiz[b.id] > 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E85D04", flexShrink: 0 }} />}
                      {pendingPhotosByBiz[b.id] > 0 && <span style={{ background: "#FFF3CD", color: "#856404", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, flexShrink: 0 }}>{pendingPhotosByBiz[b.id]}</span>}
                    </div>
                  ))}
                  {filteredBusinesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, textAlign: "center", padding: 30 }}>{searchQuery ? "No clients match." : "No clients yet."}</div>}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {!selectedBusiness ? (
                  <div style={{ ...card, padding: 60, textAlign: "center", color: C.textMuted, fontFamily: font.body, fontSize: 14 }}>Select a client from the list to view their workspace.</div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EEF3FA", color: C.gold, fontFamily: font.display, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{selectedBusiness.name.charAt(0)}</div>
                      <div><div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600 }}>{selectedBusiness.name}</div><div style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted }}>{selectedBusiness.email}</div></div>
                    </div>
                    {(() => {
                      const next = nextApptFor(selectedBusiness.id);
                      return <div style={{ fontFamily: font.body, fontSize: 13, color: C.gold, marginBottom: 12 }}>{next ? `Next: ${new Date(next.starts_at).toLocaleDateString([], { month: "short", day: "numeric" })}, ${fmtTime(new Date(next.starts_at))} — ${next.title}` : "No upcoming appointment"}</div>;
                    })()}

                    <div style={{ marginBottom: 20 }}>
                      <Label>Assigned Account Manager</Label>
                      <select value={selectedBusiness.account_manager_id || ""} onChange={e => assignToManager(selectedBusiness.id, e.target.value)} style={inputStyle}>
                        <option value="">Unassigned</option>
                        {accountManagers.map(am => <option key={am.id} value={am.id}>{am.name}</option>)}
                      </select>
                    </div>

                    {/* Messages */}
                    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600 }}>Messages</div>
                        {unreadChatByBiz[selectedBusiness.id] > 0 && <span style={{ background: "#E85D04", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{unreadChatByBiz[selectedBusiness.id]} new</span>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                        {chatMessages.length === 0 && <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted }}>No messages yet.</div>}
                        {chatMessages.map((m, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: m.sender_role === "manager" ? "flex-end" : "flex-start" }}>
                            <div style={{ maxWidth: "75%", padding: "8px 12px", borderRadius: 14, background: m.sender_role === "manager" ? C.gold : "#F0F4FA", color: m.sender_role === "manager" ? "#fff" : C.text, fontFamily: font.body, fontSize: 13 }}>{m.message}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Message this client…" style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={sendChat} style={{ ...btnStyle, fontSize: 13, padding: "10px 18px" }}>Send</button>
                      </div>
                    </div>

                    <ClientNotesSection businessId={selectedBusiness.id} authorName={data.name} />

                    {/* Appointments — filtered to this client */}
                    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600 }}>Appointments — this client only</div>
                        <span style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>Click a day to schedule</span>
                      </div>
                      <CalendarMonthGrid
                        monthDate={monthDate}
                        appointments={appointments}
                        businessNameById={businessNameById}
                        filterBusinessId={selectedBusiness.id}
                        compact
                        onDayClick={(date) => openScheduleModal(date, selectedBusiness.id, null)}
                        onApptClick={(appt) => openScheduleModal(null, appt.business_id, appt)}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <PhotosTab businessId={selectedBusiness.id} businessName={selectedBusiness.name} business={selectedBusiness} isMarketing={true} onStatusChange={loadAll} />
                    </div>

                    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                      <AnalyticsTab log={bizMessages} businessName={selectedBusiness.name} photos={bizPhotos} socialLinks={selectedBusiness.social_links || {}} embedded={true} />
                    </div>

                    <ClientSettingsFull
                      business={selectedBusiness}
                      onSaved={(updated) => setSelectedBusiness(updated)}
                      onDeleteClient={(biz) => { setBusinessToDelete(biz); setDeleteConfirmText(""); setShowDeleteModal(true); }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "photos" && (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {businesses.map(b => (
                <div key={b.id} onClick={() => { setView("clients"); selectBusiness(b); }} style={{ ...card, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#EEF3FA", color: C.gold, fontFamily: font.display, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{b.name.charAt(0)}</div>
                  <div style={{ flex: 1, fontFamily: font.display, fontSize: 15, fontWeight: 600 }}>{b.name}</div>
                  {pendingPhotosByBiz[b.id] > 0 && <span style={{ background: "#FFF3CD", color: "#856404", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99 }}>{pendingPhotosByBiz[b.id]} pending</span>}
                </div>
              ))}
            </div>
          )}

          {view === "managers" && (
            <div className="fade-up">
              {showAddManager && (
                <div style={{ ...card, marginBottom: 20 }}>
                  <div style={{ fontFamily: font.display, fontSize: 18, marginBottom: 16 }}>New Account Manager</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    <div><Label>Full Name</Label><input style={inputStyle} value={newManager.name} onChange={e => setNewManager(d => ({ ...d, name: e.target.value }))} placeholder="John Smith" /></div>
                    <div><Label>Email</Label><input style={inputStyle} value={newManager.email} onChange={e => setNewManager(d => ({ ...d, email: e.target.value }))} placeholder="john@yourcompany.com" /></div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={addAccountManager} disabled={savingManager} style={btnStyle}>{savingManager ? "Saving…" : "Add Manager"}</button>
                    <button onClick={() => setShowAddManager(false)} style={ghostBtnStyle}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {accountManagers.map(am => {
                  const assignedClients = businesses.filter(b => b.account_manager_id === am.id);
                  return (
                    <div key={am.id} style={{ ...card, padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#EEF3FA", color: C.gold, fontFamily: font.display, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{am.name.charAt(0)}</div>
                          <div>
                            <div style={{ fontFamily: font.display, fontSize: 15, fontWeight: 600 }}>{am.name}</div>
                            <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted }}>{am.email}</div>
                            <div style={{ fontFamily: font.body, fontSize: 12, color: C.gold, marginTop: 2 }}>{assignedClients.length} clients assigned</div>
                          </div>
                        </div>
                        <button onClick={() => removeAccountManager(am.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontFamily: font.body, fontSize: 13 }}>Remove</button>
                      </div>
                    </div>
                  );
                })}
                {accountManagers.length === 0 && <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, textAlign: "center", padding: 40 }}>No account managers yet.</div>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── ACCOUNT MANAGER REBUILD ───────────────────────────────────────────────────
// New: one master calendar per account manager (filterable per client), a private
// running notes log per client, and full client settings editing (business info,
// message template, logo, social links, team members, feature toggles).
// Needs two new Supabase tables — see supabase-new-tables.sql. Nothing else in
// this file changed: MarketingDashboard, SuperAdminDashboard, and BusinessApp
// (the business-owner side) are untouched below.
//
// Known simplification: Google Business Profile "Connect" isn't wired up here —
// you can see status and Disconnect, but connecting still happens from the
// business owner's own Settings tab (same as today), since it requires signing
// into that specific client's Google account.

// ── DATE HELPERS ──────────────────────────────────────────────────────────
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function firstWeekdayOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1).getDay(); }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function monthLabel(d) { return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function fmtTime(d) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function toDateInputValue(d) { return d.toISOString().slice(0, 10); }
function toTimeInputValue(d) { return d.toTimeString().slice(0, 5); }

// ── CALENDAR GRID (shared by the main calendar and the per-client mini one) ─
function CalendarMonthGrid({ monthDate, appointments, businessNameById, managerNameById, filterBusinessId, onDayClick, onApptClick, compact }) {
  const total = daysInMonth(monthDate);
  const offset = firstWeekdayOfMonth(monthDate);
  const today = new Date();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= total; day++) cells.push(day);

  const apptsForDay = (day) => {
    const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    return appointments.filter(a => {
      if (filterBusinessId && a.business_id !== filterBusinessId) return false;
      return isSameDay(new Date(a.starts_at), cellDate);
    }).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {cells.map((day, i) => {
        if (day === null) return <div key={"blank" + i} />;
        const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
        const isToday = isSameDay(cellDate, today);
        const dayAppts = apptsForDay(day);
        return (
          <div key={day}
            onClick={() => onDayClick(cellDate)}
            style={{
              border: `1px solid ${isToday ? C.gold : C.border}`,
              background: isToday ? "#EEF3FA" : "#fff",
              borderRadius: 8, minHeight: compact ? 30 : 46, padding: 3,
              cursor: "pointer", fontFamily: font.mono, fontSize: 10, color: C.textMuted,
            }}>
            <div style={{ fontWeight: isToday ? 700 : 400 }}>{day}</div>
            {dayAppts.map(a => (
              <div key={a.id}
                onClick={(e) => { e.stopPropagation(); onApptClick(a); }}
                title={businessNameById[a.business_id] + (managerNameById && managerNameById[a.account_manager_id] ? " · " + managerNameById[a.account_manager_id] : "") + " — " + a.title}
                style={{ marginTop: 2, fontSize: 9, background: "#ede9fe", color: "#6d28d9", borderRadius: 4, padding: "1px 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fmtTime(new Date(a.starts_at))} {businessNameById[a.business_id]}{managerNameById && managerNameById[a.account_manager_id] ? " (" + managerNameById[a.account_manager_id] + ")" : ""}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── SCHEDULE / EDIT APPOINTMENT MODAL ────────────────────────────────────────
function ScheduleModal({ businesses, defaultBusinessId, defaultDate, editingAppt, onClose, onSave, onDelete }) {
  const [search, setSearch] = useState("");
  const [businessId, setBusinessId] = useState(editingAppt ? editingAppt.business_id : (defaultBusinessId || ""));
  const [date, setDate] = useState(toDateInputValue(editingAppt ? new Date(editingAppt.starts_at) : (defaultDate || new Date())));
  const [time, setTime] = useState(editingAppt ? toTimeInputValue(new Date(editingAppt.starts_at)) : "09:00");
  const [duration, setDuration] = useState(editingAppt ? editingAppt.duration_minutes : 30);
  const [title, setTitle] = useState(editingAppt ? editingAppt.title : "");
  const [notes, setNotes] = useState(editingAppt ? (editingAppt.notes || "") : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = businesses.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!businessId || !date || !time) { setError("Pick a client, date, and time."); return; }
    setSaving(true);
    const starts_at = new Date(`${date}T${time}:00`).toISOString();
    await onSave({ business_id: businessId, starts_at, duration_minutes: Number(duration) || 30, title: title.trim() || "Appointment", notes: notes.trim() || null });
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 16 }}>
          {editingAppt ? "Edit appointment" : "Schedule appointment"}
        </div>

        <Label>Client</Label>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{ ...inputStyle, marginBottom: 6 }} />
        <select size={4} value={businessId} onChange={e => setBusinessId(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
          {filtered.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div><Label>Date</Label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} /></div>
          <div><Label>Time</Label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} /></div>
        </div>

        <Label>Duration</Label>
        <select value={duration} onChange={e => setDuration(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
        </select>

        <Label>Title</Label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Renewal call" style={{ ...inputStyle, marginBottom: 14 }} />

        <Label>Notes (optional)</Label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: "vertical", marginBottom: 8 }} />

        {error && <p style={{ color: "#e74c3c", fontSize: 13, fontFamily: font.body, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {editingAppt && (
            <button onClick={() => onDelete(editingAppt.id)}
              style={{ padding: "10px 14px", background: "#fff", color: "#e74c3c", border: "1.5px solid #e74c3c88", borderRadius: 8, fontFamily: font.body, fontSize: 13, cursor: "pointer" }}>
              Cancel appt.
            </button>
          )}
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <button onClick={onClose} style={{ ...ghostBtnStyle, padding: "10px 16px", fontSize: 13 }}>Close</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, padding: "10px 16px", fontSize: 13 }}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CLIENT NOTES SECTION (private, append-only log) ──────────────────────────
function ClientNotesSection({ businessId, authorName }) {
  const [notes, setNotes] = useState([]);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadNotes(); }, [businessId]);

  const loadNotes = async () => {
    const { data } = await supabase.from("client_notes").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    if (data) setNotes(data);
  };

  const saveNote = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("client_notes").insert([{ business_id: businessId, author_name: authorName, note: text.trim() }]).select().single();
    if (data) setNotes(prev => [data, ...prev]);
    setText(""); setAdding(false); setSaving(false);
  };

  return (
    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
      <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 12 }}>Notes</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {notes.length === 0 && <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted }}>No notes yet.</div>}
        {notes.map(n => (
          <div key={n.id} style={{ borderLeft: `2px solid ${C.gold}`, paddingLeft: 10 }}>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{n.author_name} · {new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
            <div style={{ fontFamily: font.body, fontSize: 13, color: C.text }}>{n.note}</div>
          </div>
        ))}
      </div>
      {adding ? (
        <div>
          <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Write a note" style={{ ...inputStyle, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveNote} disabled={saving} style={{ ...btnStyle, fontSize: 13, padding: "8px 14px" }}>{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => { setAdding(false); setText(""); }} style={{ ...ghostBtnStyle, fontSize: 13, padding: "8px 14px" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ ...ghostBtnStyle, fontSize: 13, padding: "8px 14px" }}>+ Add note</button>
      )}
    </div>
  );
}

// ── FULL CLIENT SETTINGS (everything the business owner can edit, editable here too) ─
function ClientSettingsFull({ business, onSaved, onDeleteClient }) {
  const [form, setForm] = useState({
    name: business.name || "", google_link: business.google_link || "", yelp_link: business.yelp_link || "",
    message_template: business.message_template || "",
    social_google: business.social_links?.google || "", social_instagram: business.social_links?.instagram || "", social_facebook: business.social_links?.facebook || "",
    city: business.city || "", state: business.state || "", business_type: business.business_type || "", short_description: business.short_description || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(business.logo_url || null);
  const logoInputRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [addingEmp, setAddingEmp] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", email: "", password: "" });
  const [features, setFeatures] = useState(business.features || { send: true, analytics: false, history: false, google_posts: false, social: false });

  useEffect(() => {
    supabase.from("employees").select("*").eq("business_id", business.id).then(({ data }) => setEmployees(data || []));
  }, [business.id]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("businesses").update({
      name: form.name, google_link: form.google_link, yelp_link: form.yelp_link,
      message_template: form.message_template,
      social_links: { google: form.social_google, instagram: form.social_instagram, facebook: form.social_facebook },
      city: form.city, state: form.state, business_type: form.business_type, short_description: form.short_description,
    }).eq("id", business.id);
    setSaving(false);
    setSaved(true);
    if (onSaved) onSaved({ ...business, name: form.name });
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFeature = async (key) => {
    const updated = { ...features, [key]: !features[key] };
    setFeatures(updated);
    await supabase.from("businesses").update({ features: updated }).eq("id", business.id);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.ok) { alert(validation.error); e.target.value = ""; return; }
    setLogoUploading(true);
    const fileName = `${business.id}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("business-logos").upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(fileName);
      await supabase.from("businesses").update({ logo_url: urlData.publicUrl }).eq("id", business.id);
      setLogoUrl(urlData.publicUrl);
    }
    setLogoUploading(false);
  };

  const removeLogo = async () => {
    await supabase.from("businesses").update({ logo_url: null }).eq("id", business.id);
    setLogoUrl(null);
  };

  const addEmployee = async () => {
    if (!newEmp.name || !newEmp.email || !newEmp.password) { alert("Fill in all fields."); return; }
    if (newEmp.password.length < 6) { alert("Password must be at least 6 characters."); return; }
    const cleanEmail = newEmp.email.trim().toLowerCase();
    const { error } = await supabase.from("employees").insert([{ business_id: business.id, name: newEmp.name, email: cleanEmail, password: newEmp.password }]);
    if (!error) {
      const { data } = await supabase.from("employees").select("*").eq("business_id", business.id);
      setEmployees(data || []);
      setNewEmp({ name: "", email: "", password: "" });
      setAddingEmp(false);
    } else {
      alert(error.message.includes("duplicate") ? "An employee with that email already exists." : "Error: " + error.message);
    }
  };

  const removeEmployee = async (emp) => {
    if (!window.confirm(`Remove ${emp.name}?`)) return;
    await supabase.from("employees").delete().eq("id", emp.id);
    setEmployees(prev => prev.filter(e => e.id !== emp.id));
  };

  const disconnectGoogle = async () => {
    await supabase.from("businesses").update({ google_access_token: null, google_refresh_token: null, google_token_expiry: null }).eq("id", business.id);
    onSaved && onSaved({ ...business, google_access_token: null });
  };

  const featureDefs = [["send", "Review requests"], ["google_posts", "Google posts"], ["social", "Instagram & Facebook"], ["analytics", "Analytics"], ["history", "History"]];
  const businessTypes = ["Restaurant / Food & Beverage", "Salon / Spa / Beauty", "Auto Shop / Dealership", "Healthcare / Medical", "Retail", "Marketing Agency", "Fitness / Gym", "Legal / Law Firm", "Real Estate", "Other"];

  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>Settings &amp; features</div>

      <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Business info</div>
      <div style={{ marginBottom: 10 }}><Label>Business name</Label><input value={form.name} onChange={set("name")} style={inputStyle} /></div>
      <div style={{ marginBottom: 10 }}><Label>Google review link (used in texts)</Label><input value={form.google_link} onChange={set("google_link")} style={inputStyle} /></div>
      <div style={{ marginBottom: 10 }}><Label>Yelp review link (used in texts)</Label><input value={form.yelp_link} onChange={set("yelp_link")} style={inputStyle} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><Label>City</Label><input value={form.city} onChange={set("city")} style={inputStyle} /></div>
        <div><Label>State</Label><input value={form.state} onChange={set("state")} style={inputStyle} /></div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <Label>Business type</Label>
        <select value={form.business_type} onChange={set("business_type")} style={inputStyle}>
          <option value="">Select one…</option>
          {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}><Label>Short description (used for AI captions)</Label><textarea rows={2} value={form.short_description} onChange={set("short_description")} style={{ ...inputStyle, resize: "vertical" }} /></div>

      <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Message template</div>
      <textarea rows={3} value={form.message_template} onChange={set("message_template")} style={{ ...inputStyle, resize: "vertical", marginBottom: 4 }} />
      <p style={{ fontFamily: font.body, fontSize: 11, color: C.textSub, marginBottom: 20 }}>Placeholders: {"{name}"}, {"{business}"}, {"{link}"}</p>

      <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Logo</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        {logoUrl ? (
          <>
            <img src={logoUrl} alt="Logo" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}` }} />
            <button onClick={removeLogo} style={{ ...ghostBtnStyle, fontSize: 12, padding: "6px 12px" }}>Remove logo</button>
          </>
        ) : (
          <>
            <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
            <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading} style={{ ...ghostBtnStyle, fontSize: 12, padding: "6px 12px" }}>{logoUploading ? "Uploading…" : "Upload logo"}</button>
          </>
        )}
      </div>

      <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Social links</div>
      <div style={{ marginBottom: 10 }}><Label>Google Business Profile URL</Label><input value={form.social_google} onChange={set("social_google")} style={inputStyle} /></div>
      <div style={{ marginBottom: 10 }}><Label>Instagram</Label><input value={form.social_instagram} onChange={set("social_instagram")} style={inputStyle} /></div>
      <div style={{ marginBottom: 20 }}><Label>Facebook</Label><input value={form.social_facebook} onChange={set("social_facebook")} style={inputStyle} /></div>

      <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Google Business Profile connection</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontFamily: font.body, fontSize: 13, color: business.google_access_token ? C.green : C.textMuted }}>
          {business.google_access_token ? "Connected" : "Not connected — the business owner connects this from their own Settings tab"}
        </span>
        {business.google_access_token && <button onClick={disconnectGoogle} style={{ ...ghostBtnStyle, fontSize: 12, padding: "6px 12px", color: "#e74c3c", borderColor: "#e74c3c88" }}>Disconnect</button>}
      </div>

      <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, width: "100%", marginBottom: saved ? 8 : 20 }}>{saving ? "Saving…" : "Save settings"}</button>
      {saved && <p style={{ fontFamily: font.body, fontSize: 12, color: C.green, marginBottom: 20 }}>Saved.</p>}

      <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Team members</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {employees.length === 0 && <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted }}>No team members yet.</div>}
        {employees.map(emp => (
          <div key={emp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div><div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600 }}>{emp.name}</div><div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{emp.email}</div></div>
            <button onClick={() => removeEmployee(emp)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
        ))}
      </div>
      {addingEmp ? (
        <div style={{ marginBottom: 20 }}>
          <input placeholder="Name" value={newEmp.name} onChange={e => setNewEmp(n => ({ ...n, name: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
          <input placeholder="Email" value={newEmp.email} onChange={e => setNewEmp(n => ({ ...n, email: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
          <input type="password" placeholder="Password" value={newEmp.password} onChange={e => setNewEmp(n => ({ ...n, password: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addEmployee} style={{ ...btnStyle, fontSize: 13, padding: "8px 14px" }}>Add</button>
            <button onClick={() => setAddingEmp(false)} style={{ ...ghostBtnStyle, fontSize: 13, padding: "8px 14px" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingEmp(true)} style={{ ...ghostBtnStyle, fontSize: 13, padding: "8px 14px", marginBottom: 20 }}>+ Add team member</button>
      )}

      <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Features</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {featureDefs.map(([key, label]) => {
          const on = !!features[key];
          return (
            <button key={key} onClick={() => toggleFeature(key)}
              style={{ padding: "6px 14px", borderRadius: 99, border: `1.5px solid ${on ? C.green : C.border}`, background: on ? C.greenBg : "#fff", color: on ? C.green : C.textMuted, fontFamily: font.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {on ? "On" : "Off"} — {label}
            </button>
          );
        })}
      </div>

      {onDeleteClient && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #ffcccc" }}>
          <div style={{ fontFamily: font.display, fontSize: 15, color: "#cc0000", marginBottom: 6 }}>Danger Zone</div>
          <p style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, marginBottom: 14 }}>Permanently delete this client and all their data — messages, photos, appointments, and notes. This cannot be undone.</p>
          <button onClick={() => onDeleteClient(business)}
            style={{ padding: "9px 20px", background: "transparent", color: "#cc0000", border: "1.5px solid #cc0000", borderRadius: 8, fontFamily: font.body, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Delete client
          </button>
        </div>
      )}
    </div>
  );
}

// ── MAIN ACCOUNT MANAGER DASHBOARD ────────────────────────────────────────────
function AccountManagerDashboard({ data, onSignOut }) {
  const [view, setView] = useState("calendar"); // calendar | clients | photos
  const [businesses, setBusinesses] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthDate, setMonthDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState(null);
  const [modalDefaultBiz, setModalDefaultBiz] = useState(null);
  const [editingAppt, setEditingAppt] = useState(null);

  const [bizMessages, setBizMessages] = useState([]);
  const [bizPhotos, setBizPhotos] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadChatByBiz, setUnreadChatByBiz] = useState({});
  const [pendingPhotosByBiz, setPendingPhotosByBiz] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const { data: biz } = await supabase.from("businesses").select("*").eq("account_manager_id", data.id).order("name");
    if (biz) {
      setBusinesses(biz);
      const ids = biz.map(b => b.id);
      if (ids.length > 0) {
        const { data: photos } = await supabase.from("photos").select("business_id, status").in("business_id", ids).eq("status", "pending");
        if (photos) {
          const counts = {};
          photos.forEach(p => { counts[p.business_id] = (counts[p.business_id] || 0) + 1; });
          setPendingPhotosByBiz(counts);
        }
        const { data: unread } = await supabase.from("chat_messages").select("business_id").in("business_id", ids).eq("sender_role", "owner").eq("read", false);
        if (unread) {
          const chatCounts = {};
          unread.forEach(m => { chatCounts[m.business_id] = (chatCounts[m.business_id] || 0) + 1; });
          setUnreadChatByBiz(chatCounts);
        }
      }
    }
    const { data: appts } = await supabase.from("appointments").select("*").eq("account_manager_id", data.id).order("starts_at");
    if (appts) setAppointments(appts);
  };

  const businessNameById = businesses.reduce((acc, b) => { acc[b.id] = b.name; return acc; }, {});

  const openScheduleModal = (date, businessId, appt) => {
    setModalDefaultDate(date || null);
    setModalDefaultBiz(businessId || (selectedBusiness ? selectedBusiness.id : null));
    setEditingAppt(appt || null);
    setModalOpen(true);
  };

  const handleSaveAppt = async ({ business_id, starts_at, duration_minutes, title, notes }) => {
    const business = businesses.find(b => b.id === business_id);
    if (editingAppt) {
      const { data: updated } = await supabase.from("appointments").update({ business_id, starts_at, duration_minutes, title, notes }).eq("id", editingAppt.id).select().single();
      if (updated) setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
    } else {
      const { data: inserted } = await supabase.from("appointments").insert([{
        business_id, starts_at, duration_minutes, title, notes,
        account_manager_id: data.id, marketing_company_id: business?.marketing_company_id || null,
      }]).select().single();
      if (inserted) setAppointments(prev => [...prev, inserted]);
    }
    setModalOpen(false);
  };

  const handleDeleteAppt = async (id) => {
    await supabase.from("appointments").delete().eq("id", id);
    setAppointments(prev => prev.filter(a => a.id !== id));
    setModalOpen(false);
  };

  const nextApptFor = (businessId) => {
    const now = new Date();
    return appointments.filter(a => a.business_id === businessId && new Date(a.starts_at) >= now).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
  };

  const selectBusiness = async (biz) => {
    setSelectedBusiness(biz);
    const { data: msgs } = await supabase.from("messages").select("*").eq("business_id", biz.id).order("sent_at", { ascending: false });
    setBizMessages(msgs || []);
    const { data: photos } = await supabase.from("photos").select("*").eq("business_id", biz.id);
    setBizPhotos(photos || []);
    await loadChat(biz.id);
  };

  const loadChat = async (bizId) => {
    const { data: msgs } = await supabase.from("chat_messages").select("*").eq("business_id", bizId).order("created_at", { ascending: true });
    setChatMessages(msgs || []);
    await supabase.from("chat_messages").update({ read: true }).eq("business_id", bizId).eq("sender_role", "owner").eq("read", false);
    setUnreadChatByBiz(prev => ({ ...prev, [bizId]: 0 }));
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !selectedBusiness) return;
    const msg = { business_id: selectedBusiness.id, sender_role: "manager", sender_name: data.name, message: chatInput.trim(), read: false };
    const { data: inserted } = await supabase.from("chat_messages").insert([msg]).select().single();
    if (inserted) setChatMessages(prev => [...prev, inserted]);
    setChatInput("");
  };

  const filteredBusinesses = businesses.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const todaysAppts = appointments.filter(a => isSameDay(new Date(a.starts_at), new Date())).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex" }}>
      <style>{globalCSS}</style>

      {modalOpen && (
        <ScheduleModal
          businesses={businesses}
          defaultBusinessId={modalDefaultBiz}
          defaultDate={modalDefaultDate}
          editingAppt={editingAppt}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveAppt}
          onDelete={handleDeleteAppt}
        />
      )}

      {/* Sidebar */}
      <div style={{ width: 200, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 4, color: C.gold, padding: "0 8px 20px" }}>★ REVIEWSEND</div>
        {[["calendar", "Calendar"], ["clients", "Clients"], ["photos", "Photos"]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: "none", background: view === id ? "#EEF3FA" : "transparent", color: view === id ? C.gold : C.textMuted, fontFamily: font.body, fontSize: 14, fontWeight: view === id ? 600 : 400, textAlign: "left", cursor: "pointer" }}>
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, padding: "0 8px 8px" }}>{data.name}</div>
          <button onClick={onSignOut} style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", color: C.textMuted, fontFamily: font.body, fontSize: 13, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: `1px solid ${C.border}`, background: C.surface, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600 }}>
            {view === "calendar" ? "Calendar" : view === "clients" ? "Clients" : "Photos — by client"}
          </div>
          <button onClick={() => openScheduleModal(null, null, null)} style={{ ...btnStyle, fontSize: 14 }}>+ Schedule</button>
        </div>

        <div style={{ padding: 32 }}>

          {view === "calendar" && (
            <div className="fade-up">
              <div style={{ ...card, padding: 16, marginBottom: 16, background: "#EEF3FA" }}>
                {todaysAppts.length === 0 ? (
                  <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted }}>Nothing on your calendar today.</div>
                ) : (
                  <>
                    <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Today — {todaysAppts.length} appointment{todaysAppts.length > 1 ? "s" : ""}</div>
                    {todaysAppts.map(a => (
                      <div key={a.id} style={{ fontFamily: font.body, fontSize: 14, color: C.text }}>{fmtTime(new Date(a.starts_at))} · {businessNameById[a.business_id]} — {a.title}</div>
                    ))}
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={{ ...ghostBtnStyle, padding: "6px 12px", fontSize: 13 }}>←</button>
                <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600 }}>{monthLabel(monthDate)}</div>
                <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={{ ...ghostBtnStyle, padding: "6px 12px", fontSize: 13 }}>→</button>
              </div>
              <p style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Click an empty day to schedule. Click an existing appointment to edit or cancel it.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} style={{ textAlign: "center", fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{d}</div>)}
              </div>
              <CalendarMonthGrid
                monthDate={monthDate}
                appointments={appointments}
                businessNameById={businessNameById}
                onDayClick={(date) => openScheduleModal(date, null, null)}
                onApptClick={(appt) => openScheduleModal(null, appt.business_id, appt)}
              />
            </div>
          )}

          {view === "clients" && (
            <div className="fade-up" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ width: 300, flexShrink: 0 }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search clients…" style={{ ...inputStyle, marginBottom: 16 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
                  {filteredBusinesses.map(b => (
                    <div key={b.id} onClick={() => selectBusiness(b)}
                      style={{ ...card, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, border: selectedBusiness?.id === b.id ? `2px solid ${C.gold}` : `1px solid ${C.border}` }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EEF3FA", color: C.gold, fontFamily: font.display, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{b.name.charAt(0)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                        <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.email}</div>
                      </div>
                      {unreadChatByBiz[b.id] > 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E85D04", flexShrink: 0 }} />}
                      {pendingPhotosByBiz[b.id] > 0 && <span style={{ background: "#FFF3CD", color: "#856404", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, flexShrink: 0 }}>{pendingPhotosByBiz[b.id]}</span>}
                    </div>
                  ))}
                  {filteredBusinesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, textAlign: "center", padding: 30 }}>No clients match.</div>}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {!selectedBusiness ? (
                  <div style={{ ...card, padding: 60, textAlign: "center", color: C.textMuted, fontFamily: font.body, fontSize: 14 }}>Select a client from the list to view their workspace.</div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EEF3FA", color: C.gold, fontFamily: font.display, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{selectedBusiness.name.charAt(0)}</div>
                      <div><div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600 }}>{selectedBusiness.name}</div><div style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted }}>{selectedBusiness.email}</div></div>
                    </div>
                    {(() => {
                      const next = nextApptFor(selectedBusiness.id);
                      return <div style={{ fontFamily: font.body, fontSize: 13, color: C.gold, marginBottom: 20 }}>{next ? `Next: ${new Date(next.starts_at).toLocaleDateString([], { month: "short", day: "numeric" })}, ${fmtTime(new Date(next.starts_at))} — ${next.title}` : "No upcoming appointment"}</div>;
                    })()}

                    {/* Messages */}
                    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600 }}>Messages</div>
                        {unreadChatByBiz[selectedBusiness.id] > 0 && <span style={{ background: "#E85D04", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{unreadChatByBiz[selectedBusiness.id]} new</span>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                        {chatMessages.length === 0 && <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted }}>No messages yet.</div>}
                        {chatMessages.map((m, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: m.sender_role === "manager" ? "flex-end" : "flex-start" }}>
                            <div style={{ maxWidth: "75%", padding: "8px 12px", borderRadius: 14, background: m.sender_role === "manager" ? C.gold : "#F0F4FA", color: m.sender_role === "manager" ? "#fff" : C.text, fontFamily: font.body, fontSize: 13 }}>{m.message}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Message this client…" style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={sendChat} style={{ ...btnStyle, fontSize: 13, padding: "10px 18px" }}>Send</button>
                      </div>
                    </div>

                    <ClientNotesSection businessId={selectedBusiness.id} authorName={data.name} />

                    {/* Appointments — filtered to this client */}
                    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600 }}>Appointments — this client only</div>
                        <span style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>Click a day to schedule</span>
                      </div>
                      <CalendarMonthGrid
                        monthDate={monthDate}
                        appointments={appointments}
                        businessNameById={businessNameById}
                        filterBusinessId={selectedBusiness.id}
                        compact
                        onDayClick={(date) => openScheduleModal(date, selectedBusiness.id, null)}
                        onApptClick={(appt) => openScheduleModal(null, appt.business_id, appt)}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <PhotosTab businessId={selectedBusiness.id} businessName={selectedBusiness.name} business={selectedBusiness} isMarketing={true} onStatusChange={loadAll} />
                    </div>

                    <div style={{ ...card, padding: 20, marginBottom: 16 }}>
                      <AnalyticsTab log={bizMessages} businessName={selectedBusiness.name} photos={bizPhotos} socialLinks={selectedBusiness.social_links || {}} embedded={true} />
                    </div>

                    <ClientSettingsFull business={selectedBusiness} onSaved={(updated) => setSelectedBusiness(updated)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "photos" && (
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {businesses.map(b => (
                <div key={b.id} onClick={() => { setView("clients"); selectBusiness(b); }} style={{ ...card, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#EEF3FA", color: C.gold, fontFamily: font.display, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{b.name.charAt(0)}</div>
                  <div style={{ flex: 1, fontFamily: font.display, fontSize: 15, fontWeight: 600 }}>{b.name}</div>
                  {pendingPhotosByBiz[b.id] > 0 && <span style={{ background: "#FFF3CD", color: "#856404", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99 }}>{pendingPhotosByBiz[b.id]} pending</span>}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


// ── BUSINESS APP (Feature 2: send confirmation integrated) ────────────────────
function BusinessApp({ data, onSignOut, isEmployee = false }) {
  const [tab, setTab] = useState("send");
  const [settings, setSettings] = useState(data);
  const [editingSettings, setEditingSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState(data);
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({ name: "", email: "", password: "" });
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("google");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [log, setLog] = useState([]);
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);
  const [logoUploadError, setLogoUploadError] = useState("");

  // Feature 2: send confirmation state
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [unreadFromManager, setUnreadFromManager] = useState(0);

  // Google Business Profile state
  const [googleConnected, setGoogleConnected] = useState(!!settings.google_access_token);
  const [googleData, setGoogleData] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const REDIRECT_URI = "https://app.reviewsend.io";
  const GOOGLE_SCOPES = "https://www.googleapis.com/auth/business.manage";

  const connectGoogle = () => {
    const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: "code", scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent", state: String(data.id) });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const disconnectGoogle = async () => {
    await supabase.from("businesses").update({ google_access_token: null, google_refresh_token: null, google_token_expiry: null, google_account_id: null, google_location_id: null }).eq("id", data.id);
    setGoogleConnected(false);
    setGoogleData(null);
    setSettings(s => ({ ...s, google_access_token: null }));
  };

  const fetchGoogleData = async (accessToken) => {
    setGoogleLoading(true);
    setGoogleError("");
    try {
      const res = await fetch(`${SERVER}/google/data`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_token: accessToken }) });
      const result = await res.json();
      if (result.success) { setGoogleData(result); setGoogleConnected(true); }
      else setGoogleError(result.error || "Could not fetch Google data.");
    } catch (err) { setGoogleError("Network error fetching Google data."); }
    setGoogleLoading(false);
  };

  useEffect(() => {
    const code = sessionStorage.getItem("google_oauth_code");
    const state = sessionStorage.getItem("google_oauth_state");
    if (code && String(state) === String(data.id)) {
      sessionStorage.removeItem("google_oauth_code");
      sessionStorage.removeItem("google_oauth_state");
      (async () => {
        setGoogleLoading(true);
        try {
          const res = await fetch(`${SERVER}/google/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, redirectUri: REDIRECT_URI }) });
          const tokens = await res.json();
          if (tokens.success) {
            const expiry = Date.now() + (tokens.expires_in * 1000);
            await supabase.from("businesses").update({ google_access_token: tokens.access_token, google_refresh_token: tokens.refresh_token || null, google_token_expiry: expiry }).eq("id", data.id);
            setSettings(s => ({ ...s, google_access_token: tokens.access_token }));
            window.history.replaceState({}, "", window.location.pathname);
            await fetchGoogleData(tokens.access_token);
          } else { setGoogleError("Failed to connect Google: " + tokens.error); window.history.replaceState({}, "", window.location.pathname); }
        } catch (err) { setGoogleError("Error connecting Google account."); }
        setGoogleLoading(false);
      })();
    } else if (settings.google_access_token) {
      fetchGoogleData(settings.google_access_token);
    }
  }, []);

  const loadChat = async () => {
    const { data: msgs } = await supabase.from("chat_messages").select("*").eq("business_id", data.id).order("created_at", { ascending: true });
    if (msgs) {
      setChatMessages(msgs);
      const unread = msgs.filter(m => m.sender_role === "manager" && !m.read).length;
      setUnreadFromManager(unread);
    }
  };

  const markManagerMessagesRead = async () => {
    await supabase.from("chat_messages").update({ read: true }).eq("business_id", data.id).eq("sender_role", "manager").eq("read", false);
    setUnreadFromManager(0);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    setChatSending(true);
    const msg = { business_id: data.id, sender_role: "owner", sender_name: settings.name, message: chatInput.trim(), read: false };
    const { data: inserted } = await supabase.from("chat_messages").insert([msg]).select().single();
    if (inserted) setChatMessages(prev => [...prev, inserted]);
    setChatInput("");
    setChatSending(false);
  };

  useEffect(() => {
    supabase.from("employees").select("*").eq("business_id", data.id).then(({ data: emps }) => setEmployees(emps || []));
    loadMessages();
    loadPendingPhotos();
    loadChat();
    const chatSub = supabase.channel("chat_" + data.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: "business_id=eq." + data.id }, (payload) => {
        setChatMessages(prev => [...prev, payload.new]);
        if (payload.new.sender_role === "manager") setUnreadFromManager(prev => prev + 1);
      })
      .subscribe();
    return () => supabase.removeChannel(chatSub);
  }, [data.id]);

  const loadMessages = async () => {
    const { data: msgs } = await supabase.from("messages").select("*").eq("business_id", data.id).order("sent_at", { ascending: false });
    if (msgs) setLog(msgs);
  };

  const loadPendingPhotos = async () => {
    const { data: photos } = await supabase.from("photos").select("id").eq("business_id", data.id).eq("status", "pending");
    if (photos) setPendingPhotoCount(photos.length);
  };

  const formatPhone = (raw) => "+1" + raw.replace(/\D/g, "");

  // Feature 2: build message preview for the confirmation modal
  const buildMessagePreview = () => {
    const link = platform === "google" ? settings.google_link : settings.yelp_link;
    return (settings.message_template || "Hi {name}! Thanks for visiting {business}. Leave us a review here: {link} 🙏")
      .replace("{name}", customerName || "Customer")
      .replace("{business}", settings.name)
      .replace("{link}", link || "[review link]");
  };

  // Feature 2: called when user clicks "Send" — shows confirmation first
  const handleSendClick = () => {
    if (!phone || !customerName) return;
    setShowSendConfirm(true);
  };

  // Feature 2: called after user confirms in the modal
  const handleSendConfirmed = async () => {
    setSending(true);
    const link = platform === "google" ? settings.google_link : settings.yelp_link;
    const message = buildMessagePreview().replace("[review link]", link || "");
    try {
      const endpoint = settings.logo_url ? "/send-mms" : "/send-sms";
      const body = settings.logo_url
        ? JSON.stringify({ to: formatPhone(phone), message, mediaUrl: settings.logo_url })
        : JSON.stringify({ to: formatPhone(phone), message });
      const response = await fetch(`${SERVER}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const result = await response.json();
      if (result.success) {
        await supabase.from("messages").insert([{ business_id: data.id, customer_name: customerName, customer_phone: formatPhone(phone), platform: platform === "google" ? "Google" : "Yelp" }]);
        setShowSendConfirm(false);
        setSent(true);
        loadMessages();
        setTimeout(() => { setSent(false); setCustomerName(""); setPhone(""); }, 2800);
      } else { alert("Failed to send: " + result.error); setShowSendConfirm(false); }
    } catch (err) { alert("Could not reach the server."); setShowSendConfirm(false); }
    setSending(false);
  };

  // Feature 4: logo upload with validation
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploadError("");
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setLogoUploadError(validation.error);
      e.target.value = "";
      return;
    }
    setLogoUploading(true);
    const fileName = `${data.id}/logo-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("business-logos").upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(fileName);
      await supabase.from("businesses").update({ logo_url: urlData.publicUrl }).eq("id", data.id);
      setSettings(s => ({ ...s, logo_url: urlData.publicUrl }));
    }
    setLogoUploading(false);
  };

  const removeLogo = async () => {
    await supabase.from("businesses").update({ logo_url: null }).eq("id", data.id);
    setSettings(s => ({ ...s, logo_url: null }));
  };

  const saveSettings = async () => {
    await supabase.from("businesses").update({ name: draftSettings.name, google_link: draftSettings.google_link, yelp_link: draftSettings.yelp_link, message_template: draftSettings.message_template }).eq("id", data.id);
    setSettings({ ...draftSettings });
    setEditingSettings(false);
  };

  const addEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password) { alert("Please fill in all fields."); return; }
    if (newEmployee.password.length < 6) { alert("Password must be at least 6 characters."); return; }
    setEmployeeSaving(true);
    const cleanEmail = newEmployee.email.trim().toLowerCase();
    const { error } = await supabase.from("employees").insert([{ business_id: data.id, name: newEmployee.name, email: cleanEmail, password: newEmployee.password }]);
    if (!error) {
      const { data: emps } = await supabase.from("employees").select("*").eq("business_id", data.id);
      setEmployees(emps || []);
      setNewEmployee({ name: "", email: "", password: "" });
      setAddingEmployee(false);
      alert("Employee added! Email: " + cleanEmail + "  |  Password: " + newEmployee.password);
    } else {
      if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) alert("An employee with that email already exists.");
      else alert("Error adding employee: " + error.message);
    }
    setEmployeeSaving(false);
  };

  const removeEmployee = async (emp) => {
    if (!window.confirm("Remove " + emp.name + " from your team? They will no longer be able to log in.")) return;
    await supabase.from("employees").delete().eq("id", emp.id);
    setEmployees(prev => prev.filter(e => e.id !== emp.id));
  };

  const features = settings.features || { send: true, analytics: false, history: false, google_posts: false, social: false };

  const navItems = isEmployee ? [
    { id: "send", icon: "✉", label: "Send", locked: !features.send },
    { id: "photos", icon: "📸", label: "Photos" },
  ] : [
    { id: "send", icon: "✉", label: "Send", locked: !features.send },
    { id: "photos", icon: "📸", label: "Photos" },
    { id: "log", icon: "📋", label: "History", locked: !features.history },
    { id: "analytics", icon: "📊", label: "Analytics", locked: !features.analytics },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#F4F7FB", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{globalCSS}</style>

      {/* Feature 2: Send confirmation modal */}
      {showSendConfirm && (
        <SendConfirmationModal
          customerName={customerName}
          phone={phone}
          platform={platform}
          businessName={settings.name}
          messagePreview={buildMessagePreview()}
          onConfirm={handleSendConfirmed}
          onCancel={() => setShowSendConfirm(false)}
        />
      )}

      {/* Top Bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(26,95,191,0.1)", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 1px 12px rgba(26,95,191,0.06)" }}>
        <div style={{ fontFamily: font.body, fontSize: 10, letterSpacing: 5, color: "#1A5FBF", textTransform: "uppercase", fontWeight: 600 }}>★ ReviewSend</div>
        <div style={{ fontFamily: font.display, fontSize: 15, color: "#0D1117", fontWeight: 700 }}>{settings.name}</div>
        <button onClick={onSignOut} style={{ background: "none", border: "none", fontFamily: font.body, fontSize: 12, color: "rgba(13,17,23,0.35)", cursor: "pointer", letterSpacing: 0.5 }}>Sign out</button>
      </div>

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {/* SEND TAB */}
        {tab === "send" && !features.send && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #FFF7ED, #FED7AA)", border: "2px solid #FED7AA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 20 }}>🔒</div>
            <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: "#0D1117", marginBottom: 10 }}>Review Requests</div>
            <div style={{ fontFamily: font.body, fontSize: 14, color: "rgba(13,17,23,0.5)", lineHeight: 1.7, marginBottom: 28 }}>Contact your account manager to unlock this feature.</div>
            <button onClick={() => setChatOpen(true)} style={{ background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", borderRadius: 14, padding: "14px 28px", border: "none", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white"/></svg>
              <span style={{ fontFamily: font.body, fontSize: 14, fontWeight: 700, color: "#fff" }}>Message Your Account Manager</span>
            </button>
          </div>
        )}

        {tab === "send" && features.send && (
          <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "24px 20px 20px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: "#0D1117", marginBottom: 4 }}>Send a Review Request</div>
              <div style={{ fontFamily: font.body, fontSize: 13, color: "rgba(13,17,23,0.45)" }}>Text a customer a direct review link</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 4px 24px rgba(26,95,191,0.08)", border: "1px solid rgba(26,95,191,0.08)", marginBottom: 16 }}>
              <label style={{ display: "block", fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.4)", marginBottom: 6 }}>Customer Name</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Sarah"
                style={{ width: "100%", padding: "13px 16px", background: "#F4F7FB", border: "1.5px solid rgba(26,95,191,0.1)", borderRadius: 12, fontSize: 15, fontFamily: font.body, color: "#0D1117", outline: "none", marginBottom: 14, transition: "border-color 0.2s" }} />
              <label style={{ display: "block", fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.4)", marginBottom: 6 }}>Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" type="tel"
                style={{ width: "100%", padding: "13px 16px", background: "#F4F7FB", border: "1.5px solid rgba(26,95,191,0.1)", borderRadius: 12, fontSize: 15, fontFamily: font.body, color: "#0D1117", outline: "none", marginBottom: 14, transition: "border-color 0.2s" }} />
              <label style={{ display: "block", fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.4)", marginBottom: 8 }}>Review Platform</label>
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {[["google", "G", "#4A90D9", "Google"], ["yelp", "Y", "#C0392B", "Yelp"]].map(([id, abbr, color, name]) => (
                  <button key={id} onClick={() => setPlatform(id)}
                    style={{ flex: 1, padding: "12px 8px", borderRadius: 14, border: `1.5px solid ${platform === id ? color : "rgba(26,95,191,0.12)"}`, background: platform === id ? color + "10" : "#F4F7FB", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: platform === id ? color : "rgba(13,17,23,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", transition: "background 0.15s" }}>{abbr}</div>
                    <span style={{ fontFamily: font.body, fontSize: 12, fontWeight: 700, color: platform === id ? color : "rgba(13,17,23,0.45)" }}>{name}</span>
                  </button>
                ))}
              </div>
              {/* Feature 2: onClick now shows confirmation instead of sending directly */}
              <button onClick={handleSendClick} disabled={sending || sent || !customerName || !phone}
                style={{ width: "100%", padding: "16px", background: sent ? "#1A8C4E" : (sending || !customerName || !phone) ? "rgba(26,95,191,0.3)" : "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, fontFamily: font.body, cursor: (sending || !customerName || !phone) ? "not-allowed" : "pointer", letterSpacing: 0.5, boxShadow: sent || sending || !customerName || !phone ? "none" : "0 8px 24px rgba(26,95,191,0.35)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {sent ? "✓ Sent!" : sending ? "Sending…" : "✉ Send Review Request"}
              </button>
            </div>
            {log.length > 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { num: log.length, label: "Total Sent", color: "#1A5FBF" },
                  { num: log.filter(m => { const d = new Date(m.sent_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length, label: "This Month", color: "#1A8C4E" },
                  { num: log.filter(m => m.platform === "Google").length, label: "Google", color: "#4A90D9" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "12px 10px", textAlign: "center", border: "1px solid rgba(26,95,191,0.08)", boxShadow: "0 2px 8px rgba(26,95,191,0.04)" }}>
                    <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.num}</div>
                    <div style={{ fontFamily: font.body, fontSize: 10, color: "rgba(13,17,23,0.4)", marginTop: 4, letterSpacing: 0.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PHOTOS TAB */}
        {tab === "photos" && (
          <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "24px 20px 20px" }}>
            <PhotosTab businessId={data.id} businessName={settings.name} features={features} />
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "log" && !features.history && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #FFF7ED, #FED7AA)", border: "2px solid #FED7AA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 20 }}>🔒</div>
            <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: "#0D1117", marginBottom: 10 }}>Message History</div>
            <div style={{ fontFamily: font.body, fontSize: 14, color: "rgba(13,17,23,0.5)", lineHeight: 1.7 }}>Contact your account manager to unlock this feature.</div>
          </div>
        )}
        {tab === "log" && features.history && (
          <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "24px 20px 20px" }}>
            <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: "#0D1117", marginBottom: 4 }}>History</div>
            <div style={{ fontFamily: font.body, fontSize: 12, color: "rgba(13,17,23,0.4)", marginBottom: 16 }}>All review requests sent</div>
            <div style={{ background: "#fff", border: "1.5px solid rgba(26,95,191,0.12)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "rgba(13,17,23,0.3)", fontSize: 14 }}>🔍</span>
              <input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search by name..." style={{ flex: 1, border: "none", outline: "none", fontFamily: font.body, fontSize: 13, color: "#0D1117", background: "transparent" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {log.filter(m => !historySearch || m.customer_name?.toLowerCase().includes(historySearch.toLowerCase()) || m.customer_phone?.includes(historySearch)).map((msg, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(26,95,191,0.08)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #B8CCE8)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.display, fontSize: 16, fontWeight: 700, color: "#1A5FBF", flexShrink: 0 }}>{msg.customer_name?.[0]?.toUpperCase() || "?"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 700, color: "#0D1117" }}>{msg.customer_name}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 11, color: "rgba(13,17,23,0.4)", marginTop: 2 }}>{msg.customer_phone}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: msg.platform === "Google" ? "#EEF3FA" : "#FEF2F2", color: msg.platform === "Google" ? "#4A90D9" : "#C0392B" }}>{msg.platform}</div>
                    <div style={{ fontFamily: font.mono, fontSize: 10, color: "rgba(13,17,23,0.3)", marginTop: 4 }}>{new Date(msg.sent_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {log.length === 0 && <div style={{ textAlign: "center", padding: 40, fontFamily: font.body, fontSize: 15, color: "rgba(13,17,23,0.4)" }}>No requests sent yet.</div>}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {tab === "analytics" && (
          features.analytics ? (
            <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "24px 20px 20px" }}>
              {googleConnected && googleData && (
                <div style={{ background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", borderRadius: 20, padding: 20, marginBottom: 14, position: "relative", overflow: "hidden" }}>
                  <div style={{ fontFamily: font.body, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Google Business Profile</div>
                  <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{googleData.location_name}</div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Connected ✓</div>
                </div>
              )}
              {!googleConnected && (
                <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, border: "1px solid rgba(26,95,191,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#EEF3FA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📊</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, color: "#0D1117", marginBottom: 2 }}>Connect Google for Live Analytics</div>
                    <div style={{ fontFamily: font.body, fontSize: 11, color: "rgba(13,17,23,0.45)" }}>See your real star rating and reviews</div>
                  </div>
                  <button onClick={() => setTab("settings")} style={{ padding: "8px 14px", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff", border: "none", borderRadius: 10, fontFamily: font.body, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Connect →</button>
                </div>
              )}
              <AnalyticsTab log={log} businessName={settings.name} photos={[]} socialLinks={settings.social_links || {}} onNavigate={setTab} embedded={true} />
            </div>
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 32px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #FFF7ED, #FED7AA)", border: "2px solid #FED7AA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 20 }}>🔒</div>
              <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: "#0D1117", marginBottom: 10 }}>Analytics</div>
              <div style={{ fontFamily: font.body, fontSize: 14, color: "rgba(13,17,23,0.5)", lineHeight: 1.7 }}>Contact your account manager to unlock.</div>
            </div>
          )
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && !isEmployee && (
          <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "24px 20px 20px" }}>
            <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 700, color: "#0D1117", marginBottom: 4 }}>Settings</div>
            <div style={{ fontFamily: font.body, fontSize: 12, color: "rgba(13,17,23,0.4)", marginBottom: 20 }}>Manage your account</div>

            {/* Business Info */}
            <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(26,95,191,0.08)", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,95,191,0.06)" }}>
              <div style={{ padding: "10px 16px", background: "#F4F7FB", borderBottom: "1px solid rgba(26,95,191,0.08)" }}>
                <div style={{ fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.35)" }}>Business Info</div>
              </div>
              {[{ icon: "🏪", label: "Business Name", val: settings.name, key: "name" }, { icon: "🔗", label: "Google Review Link", val: settings.google_link, key: "google_link" }, { icon: "⭐", label: "Yelp Review Link", val: settings.yelp_link, key: "yelp_link" }].map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(26,95,191,0.06)", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF3FA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{row.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: font.body, fontSize: 11, color: "rgba(13,17,23,0.4)", marginBottom: 2 }}>{row.label}</div>
                    {editingSettings ? (
                      <input value={draftSettings[row.key] || ""} onChange={e => setDraftSettings(s => ({ ...s, [row.key]: e.target.value }))}
                        style={{ width: "100%", padding: "6px 10px", border: "1.5px solid rgba(26,95,191,0.2)", borderRadius: 8, fontFamily: font.body, fontSize: 13, color: "#0D1117", outline: "none", background: "#F4F7FB" }} />
                    ) : (
                      <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: "#0D1117", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.val || "Not set"}</div>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ padding: 16 }}>
                {editingSettings ? (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={saveSettings} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff", border: "none", borderRadius: 12, fontFamily: font.body, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Changes</button>
                    <button onClick={() => { setEditingSettings(false); setDraftSettings(settings); }} style={{ flex: 1, padding: "12px", background: "#F4F7FB", color: "rgba(13,17,23,0.6)", border: "1.5px solid rgba(26,95,191,0.12)", borderRadius: 12, fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingSettings(true)} style={{ width: "100%", padding: "12px", background: "#F4F7FB", color: "#1A5FBF", border: "1.5px solid rgba(26,95,191,0.2)", borderRadius: 12, fontFamily: font.body, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Edit Info</button>
                )}
              </div>
            </div>

            {/* Logo — Feature 4: validation added */}
            <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(26,95,191,0.08)", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,95,191,0.06)" }}>
              <div style={{ padding: "10px 16px", background: "#F4F7FB", borderBottom: "1px solid rgba(26,95,191,0.08)" }}>
                <div style={{ fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.35)" }}>Business Logo</div>
              </div>
              <div style={{ padding: 16 }}>
                {settings.logo_url ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={settings.logo_url} alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(26,95,191,0.12)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: "#0D1117", marginBottom: 4 }}>Logo uploaded</div>
                      <div style={{ fontFamily: font.body, fontSize: 11, color: "rgba(13,17,23,0.4)" }}>Sent with every MMS message</div>
                    </div>
                    <button onClick={removeLogo} style={{ background: "none", border: "none", color: "#C0392B", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <div>
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" style={{ display: "none" }} />
                    <button onClick={() => { setLogoUploadError(""); logoInputRef.current?.click(); }} disabled={logoUploading}
                      style={{ width: "100%", padding: "12px", background: "#F4F7FB", color: "#1A5FBF", border: "1.5px dashed rgba(26,95,191,0.25)", borderRadius: 12, fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      {logoUploading ? "Uploading…" : "📷 Upload Logo"}
                    </button>
                    {logoUploadError && <p style={{ color: "#ef4444", fontSize: 12, fontFamily: font.body, marginTop: 8 }}>{logoUploadError}</p>}
                    <div style={{ fontFamily: font.body, fontSize: 11, color: "rgba(13,17,23,0.4)", textAlign: "center", marginTop: 8 }}>Images only · Max 10 MB · JPG, PNG, WebP, GIF</div>
                  </div>
                )}
              </div>
            </div>

            {/* Message Template */}
            <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(26,95,191,0.08)", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,95,191,0.06)" }}>
              <div style={{ padding: "10px 16px", background: "#F4F7FB", borderBottom: "1px solid rgba(26,95,191,0.08)" }}>
                <div style={{ fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.35)" }}>Message Template</div>
              </div>
              <div style={{ padding: 16 }}>
                <textarea rows={4} value={editingSettings ? draftSettings.message_template : settings.message_template} onChange={e => setDraftSettings(s => ({ ...s, message_template: e.target.value }))} disabled={!editingSettings}
                  style={{ width: "100%", padding: "12px", border: "1.5px solid rgba(26,95,191,0.12)", borderRadius: 12, fontFamily: font.body, fontSize: 13, color: "#0D1117", outline: "none", resize: "none", background: editingSettings ? "#fff" : "#F4F7FB", lineHeight: 1.6 }} />
                <div style={{ fontFamily: font.body, fontSize: 11, color: "rgba(13,17,23,0.4)", marginTop: 6 }}>Use {"{name}"}, {"{business}"}, {"{link}"} as placeholders</div>
              </div>
            </div>

            {/* Google Business Profile */}
            <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(26,95,191,0.08)", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,95,191,0.06)" }}>
              <div style={{ padding: "10px 16px", background: "#F4F7FB", borderBottom: "1px solid rgba(26,95,191,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: "#4A90D9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>G</div>
                <div style={{ fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.35)" }}>Google Business Profile</div>
              </div>
              <div style={{ padding: 16 }}>
                {googleLoading ? (
                  <div style={{ textAlign: "center", padding: "12px 0", fontFamily: font.body, fontSize: 13, color: "rgba(13,17,23,0.4)" }}>Connecting to Google...</div>
                ) : googleConnected && googleData ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✓</div>
                      <div>
                        <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, color: "#0D1117" }}>{googleData.location_name}</div>
                        <div style={{ fontFamily: font.body, fontSize: 11, color: "#1A8C4E", fontWeight: 600 }}>Connected to Google Business Profile</div>
                      </div>
                    </div>
                    <button onClick={disconnectGoogle} style={{ width: "100%", padding: "10px", background: "#FEF2F2", color: "#C0392B", border: "1px solid #FECACA", borderRadius: 10, fontFamily: font.body, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Disconnect Google</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: font.body, fontSize: 13, color: "rgba(13,17,23,0.5)", lineHeight: 1.6, marginBottom: 14 }}>Connect your Google Business Profile to see your live star rating and review count in Analytics.</p>
                    {googleError && <p style={{ fontFamily: font.body, fontSize: 12, color: "#C0392B", marginBottom: 10 }}>{googleError}</p>}
                    <button onClick={connectGoogle} style={{ width: "100%", padding: "13px", background: "#fff", border: "2px solid rgba(26,95,191,0.2)", borderRadius: 12, fontFamily: font.body, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: "#4A90D9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>G</div>
                      <span style={{ color: "#0D1117" }}>Connect with Google</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Team */}
            <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(26,95,191,0.08)", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,95,191,0.06)" }}>
              <div style={{ padding: "10px 16px", background: "#F4F7FB", borderBottom: "1px solid rgba(26,95,191,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: font.body, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(13,17,23,0.35)" }}>Team Members</div>
                <button onClick={() => setAddingEmployee(true)} style={{ background: "none", border: "none", color: "#1A5FBF", fontFamily: font.body, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
              </div>
              <div style={{ padding: employees.length > 0 ? 0 : 16 }}>
                {employees.length === 0 && !addingEmployee && <div style={{ textAlign: "center", padding: "16px 0", fontFamily: font.body, fontSize: 13, color: "rgba(13,17,23,0.4)" }}>No employees added yet.</div>}
                {employees.map(emp => (
                  <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid rgba(26,95,191,0.06)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{emp.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.body, fontSize: 14, fontWeight: 700, color: "#0D1117" }}>{emp.name}</div>
                      <div style={{ fontFamily: font.body, fontSize: 11, color: "rgba(13,17,23,0.4)" }}>{emp.email}</div>
                    </div>
                    <button onClick={() => removeEmployee(emp)} style={{ background: "none", border: "none", color: "#C0392B", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
                  </div>
                ))}
                {addingEmployee && (
                  <div style={{ padding: 16, borderTop: employees.length > 0 ? "1px solid rgba(26,95,191,0.06)" : "none" }}>
                    <input placeholder="Employee name" value={newEmployee.name} onChange={e => setNewEmployee(n => ({ ...n, name: e.target.value }))} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid rgba(26,95,191,0.15)", borderRadius: 10, fontFamily: font.body, fontSize: 13, color: "#0D1117", outline: "none", marginBottom: 10, background: "#F4F7FB" }} />
                    <input placeholder="Email address" value={newEmployee.email} onChange={e => setNewEmployee(n => ({ ...n, email: e.target.value }))} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid rgba(26,95,191,0.15)", borderRadius: 10, fontFamily: font.body, fontSize: 13, color: "#0D1117", outline: "none", marginBottom: 10, background: "#F4F7FB" }} />
                    <input type="password" placeholder="Create password for them" value={newEmployee.password} onChange={e => setNewEmployee(n => ({ ...n, password: e.target.value }))} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid rgba(26,95,191,0.15)", borderRadius: 10, fontFamily: font.body, fontSize: 13, color: "#0D1117", outline: "none", marginBottom: 12, background: "#F4F7FB" }} />
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={addEmployee} disabled={employeeSaving} style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff", border: "none", borderRadius: 10, fontFamily: font.body, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{employeeSaving ? "Adding…" : "Add Employee"}</button>
                      <button onClick={() => { setAddingEmployee(false); setNewEmployee({ name: "", email: "", password: "" }); }} style={{ flex: 1, padding: "11px", background: "#F4F7FB", color: "rgba(13,17,23,0.5)", border: "1.5px solid rgba(26,95,191,0.12)", borderRadius: 10, fontFamily: font.body, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Bubble */}
      <button onClick={() => { setChatOpen(true); markManagerMessagesRead(); }}
        style={{ position: "fixed", bottom: 90, right: 20, width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 24px rgba(26,95,191,0.5)", zIndex: 50, transition: "transform 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white"/></svg>
        {unreadFromManager > 0 && (
          <div style={{ position: "absolute", top: -4, right: -4, background: "#E85D04", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 11, fontWeight: "bold", border: "2px solid #F4F7FB" }}>
            {unreadFromManager > 9 ? "9+" : unreadFromManager}
          </div>
        )}
      </button>

      {/* Chat Modal */}
      {chatOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setChatOpen(false)} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column", maxHeight: "82vh", boxShadow: "0 -12px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(26,95,191,0.08)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: "#0D1117" }}>Your Account Manager</div>
                <div style={{ fontFamily: font.body, fontSize: 12, color: "#1A8C4E" }}>● Online</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "rgba(13,17,23,0.3)", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10, background: "#F4F7FB" }}>
              {chatMessages.length === 0 && <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(13,17,23,0.35)", fontFamily: font.body, fontSize: 14 }}>Send a message to your account manager!</div>}
              {chatMessages.map((msg, i) => {
                const isOwner = msg.sender_role === "owner";
                return (
                  <div key={i} style={{ display: "flex", justifyContent: isOwner ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "76%", padding: "10px 14px", borderRadius: isOwner ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isOwner ? "linear-gradient(135deg, #1A5FBF, #0d3d8a)" : "#fff", color: isOwner ? "#fff" : "#0D1117", fontFamily: font.body, fontSize: 14, lineHeight: 1.55, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                      {msg.message}
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: isOwner ? "right" : "left" }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "12px 16px 24px", borderTop: "1px solid rgba(26,95,191,0.08)", display: "flex", gap: 10, flexShrink: 0, background: "#fff" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChatMessage()} placeholder="Message your account manager..." style={{ flex: 1, padding: "12px 16px", border: "1.5px solid rgba(26,95,191,0.12)", borderRadius: 22, fontFamily: font.body, fontSize: 14, outline: "none", background: "#F4F7FB", color: "#0D1117" }} />
              <button onClick={sendChatMessage} disabled={chatSending || !chatInput.trim()} style={{ width: 44, height: 44, borderRadius: "50%", background: chatInput.trim() ? "linear-gradient(135deg, #1A5FBF, #0d3d8a)" : "#D6E2F0", border: "none", cursor: chatInput.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ background: "#fff", borderTop: "1px solid rgba(26,95,191,0.08)", display: "flex", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setTab(item.id); if (item.id === "photos" && !item.locked) loadPendingPhotos(); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer", gap: 3, position: "relative", opacity: item.locked ? 0.5 : 1, transition: "opacity 0.15s" }}>
            {item.locked && <span style={{ position: "absolute", top: 4, right: "20%", fontSize: 8 }}>🔒</span>}
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
              {item.id === "photos" && pendingPhotoCount > 0 && (
                <div style={{ position: "absolute", top: -5, right: -8, background: "#E85D04", color: "#fff", borderRadius: "50%", width: 17, height: 17, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 9, fontWeight: "bold", border: "2px solid #fff" }}>{pendingPhotoCount > 9 ? "9+" : pendingPhotoCount}</div>
              )}
            </div>
            <span style={{ fontFamily: font.body, fontSize: 10, fontWeight: tab === item.id ? 700 : 500, color: tab === item.id ? "#1A5FBF" : "rgba(13,17,23,0.35)", letterSpacing: 0.3 }}>{item.label}</span>
            {tab === item.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1A5FBF" }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
// ── CLIENT SETTINGS TAB ───────────────────────────────────────────────────────
function ClientSettingsTab({ business, onSave }) {
  const [links, setLinks] = useState({ google: business.social_links?.google || "", google_campaign: business.social_links?.google_campaign || "", instagram: business.social_links?.instagram || "", facebook: business.social_links?.facebook || "" });
  const [bizInfo, setBizInfo] = useState({ city: business.city || "", state: business.state || "", business_type: business.business_type || "", short_description: business.short_description || "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(links, bizInfo);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const fields = [
    { key: "google", label: "Google Business Profile", placeholder: "https://g.page/r/...", color: "#4A90D9", abbr: "GP" },
    { key: "google_campaign", label: "Google Photos Link", placeholder: "https://business.google.com/...", color: "#1A8C4E", abbr: "GP2" },
    { key: "instagram", label: "Instagram Page", placeholder: "https://instagram.com/yourbusiness", color: "#E1306C", abbr: "IG" },
    { key: "facebook", label: "Facebook Page", placeholder: "https://facebook.com/yourbusiness", color: "#1877F2", abbr: "FB" },
  ];
  const businessTypes = ["Restaurant / Food & Beverage","Salon / Spa / Beauty","Auto Shop / Dealership","Healthcare / Medical","Retail","Marketing Agency","Fitness / Gym","Legal / Law Firm","Real Estate","Other"];

  return (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>⚙️ Social Links</div>
        <p style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>Add links for {business.name}. These power the analytics dashboard clickable boxes.</p>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: f.color + "18", border: `1px solid ${f.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 11, fontWeight: 700, color: f.color, flexShrink: 0 }}>{f.abbr}</div>
              <Label>{f.label}</Label>
            </div>
            <input style={inputStyle} value={links[f.key]} onChange={e => setLinks(l => ({ ...l, [f.key]: e.target.value }))} placeholder={f.placeholder} />
          </div>
        ))}
      </div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 4 }}>🤖 Business Info</div>
        <p style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>Used to generate AI captions when photos are posted.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div><Label>City</Label><input style={inputStyle} value={bizInfo.city} onChange={e => setBizInfo(b => ({ ...b, city: e.target.value }))} placeholder="e.g. Coral Springs" /></div>
          <div><Label>State</Label><input style={inputStyle} value={bizInfo.state} onChange={e => setBizInfo(b => ({ ...b, state: e.target.value }))} placeholder="e.g. Florida" /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Label>Business Type</Label>
          <select style={inputStyle} value={bizInfo.business_type} onChange={e => setBizInfo(b => ({ ...b, business_type: e.target.value }))}>
            <option value="">Select one...</option>
            {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Label>Short Description</Label>
          <textarea rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }} value={bizInfo.short_description} onChange={e => setBizInfo(b => ({ ...b, short_description: e.target.value }))} placeholder="e.g. Family-owned Italian restaurant known for homemade pasta." />
        </div>
      </div>
      <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, width: "100%" }}>{saved ? "✅ Saved!" : saving ? "Saving…" : "Save All Changes"}</button>
    </div>
  );
}

// ── BULK SEND TAB (Feature 5: safeguards integrated) ──────────────────────────
function BulkSendTab({ business, onComplete }) {
  const [step, setStep] = useState("upload");
  const [contacts, setContacts] = useState([]);
  const [platform, setPlatform] = useState("google");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ sent: 0, failed: 0 });
  const [showConfirm, setShowConfirm] = useState(false); // Feature 5
  const fileInputRef = useRef(null);

  // Feature 5: daily cap tracking
  const storageKey = `bulk_sends_${business.id}_${new Date().toDateString()}`;
  const getTodayCount = () => { try { return parseInt(localStorage.getItem(storageKey) || "0", 10); } catch { return 0; } };
  const [todayCount, setTodayCount] = useState(getTodayCount);
  const DAILY_CAP = 200;
  const remaining = Math.max(0, DAILY_CAP - todayCount);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const parsed = [];
    lines.forEach((line, i) => {
      if (i === 0 && line.toLowerCase().includes("name")) return;
      const parts = line.split(",");
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const phone = parts[1].trim().replace(/\D/g, "");
        parsed.push({ name, phone, valid: phone.length >= 10, id: i });
      }
    });
    return parsed;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Feature 4: validate CSV file type
    if (!file.name.endsWith(".csv")) { alert("Please upload a .csv file."); e.target.value = ""; return; }

    const reader = new FileReader();
    reader.onload = (ev) => { setContacts(parseCSV(ev.target.result)); setStep("preview"); };
    reader.readAsText(file);
  };

  const removeContact = (id) => setContacts(c => c.filter(x => x.id !== id));

  const validContacts = contacts.filter(c => c.valid);
  // Feature 5: cap enforcement
  const cappedContacts = validContacts.slice(0, Math.min(BULK_SEND_HARD_CAP, remaining));
  const overHardCap = validContacts.length > BULK_SEND_HARD_CAP;
  const overDailyCap = validContacts.length > remaining && !overHardCap;
  const requiresTypedConfirm = cappedContacts.length >= 20;
  const [typedConfirm, setTypedConfirm] = useState("");

  const handleBulkSend = async () => {
    setSending(true);
    setStep("sending");
    setShowConfirm(false);
    const link = platform === "google" ? business.google_link : business.yelp_link;
    let sent = 0, failed = 0;

    for (let i = 0; i < cappedContacts.length; i++) {
      const contact = cappedContacts[i];
      const message = (business.message_template || "Hi {name}! Thanks for visiting {business}. Leave us a review here: {link} 🙏").replace("{name}", contact.name).replace("{business}", business.name).replace("{link}", link);
      const endpoint = business.logo_url ? "/send-mms" : "/send-sms";
      const bodyData = business.logo_url ? JSON.stringify({ to: "+1" + contact.phone, message, mediaUrl: business.logo_url }) : JSON.stringify({ to: "+1" + contact.phone, message });
      try {
        const response = await fetch(`${SERVER}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: bodyData });
        const result = await response.json();
        if (result.success) {
          await supabase.from("messages").insert([{ business_id: business.id, customer_name: contact.name, customer_phone: "+1" + contact.phone, platform: platform === "google" ? "Google" : "Yelp" }]);
          sent++;
        } else { failed++; }
      } catch { failed++; }
      setProgress(Math.round(((i + 1) / cappedContacts.length) * 100));
      await new Promise(r => setTimeout(r, 300));
    }

    await supabase.from("bulk_sends").insert([{ business_id: business.id, sent_by: "account_manager", total_contacts: cappedContacts.length, sent_count: sent, failed_count: failed, platform: platform === "google" ? "Google" : "Yelp" }]);
    // Feature 5: update daily count
    const newCount = getTodayCount() + sent;
    try { localStorage.setItem(storageKey, String(newCount)); } catch {}
    setTodayCount(newCount);
    setResults({ sent, failed });
    setSending(false);
    setStep("done");
    if (onComplete) onComplete();
  };

  const downloadTemplate = () => {
    const csv = "Name,Phone\nSarah Johnson,9545551234\nJohn Smith,3054449876";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "reviewsend-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Feature 5: Bulk send confirmation modal */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, margin: 0 }}>Confirm bulk send</h2>
              <button onClick={() => { setShowConfirm(false); setTypedConfirm(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 20 }}>×</button>
            </div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[{ label: "Selected", value: validContacts.length }, { label: "Will send", value: cappedContacts.length, highlight: true }, { label: "Remaining today", value: remaining, warn: remaining < 20 }].map((s, i) => (
                <div key={i} style={{ background: s.highlight ? "#ede9fe" : s.warn ? "#fffbeb" : "#f9fafb", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 700, color: s.highlight ? "#6366f1" : s.warn ? "#d97706" : C.text, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: font.body, fontSize: 10, color: C.textMuted, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Daily usage bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>Daily usage</span>
                <span style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>{todayCount + cappedContacts.length} / {DAILY_CAP}</span>
              </div>
              <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${Math.min(100, (todayCount / DAILY_CAP) * 100)}%`, background: C.gold }} />
                <div style={{ width: `${Math.min(100 - (todayCount / DAILY_CAP) * 100, (cappedContacts.length / DAILY_CAP) * 100)}%`, background: "#a5b4fc" }} />
              </div>
            </div>
            {/* Cap warnings */}
            {(overHardCap || overDailyCap) && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", marginBottom: 14, display: "flex", gap: 8 }}>
                <span>⚠️</span>
                <p style={{ fontFamily: font.body, fontSize: 12, color: "#92400e", margin: 0 }}>
                  {overHardCap ? `Selection trimmed to ${BULK_SEND_HARD_CAP} (single-send cap). Send the rest in another batch.` : `Selection trimmed to ${remaining} remaining for today. Daily cap resets at midnight.`}
                </p>
              </div>
            )}
            {/* Typed confirm for large sends */}
            {requiresTypedConfirm && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontFamily: font.body, fontSize: 13, color: C.text, margin: "0 0 6px" }}>Type <strong>SEND</strong> to confirm:</p>
                <input value={typedConfirm} onChange={e => setTypedConfirm(e.target.value)} placeholder="SEND" autoFocus style={{ ...inputStyle, letterSpacing: 2, fontWeight: 700 }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowConfirm(false); setTypedConfirm(""); }} style={{ flex: 1, padding: "11px", background: "#fff", color: C.textMuted, border: `1.5px solid ${C.border}`, borderRadius: 8, fontFamily: font.body, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleBulkSend}
                disabled={cappedContacts.length === 0 || (requiresTypedConfirm && typedConfirm.trim().toUpperCase() !== "SEND")}
                style={{ flex: 2, padding: "11px", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff", border: "none", borderRadius: 8, fontFamily: font.body, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: (cappedContacts.length === 0 || (requiresTypedConfirm && typedConfirm.trim().toUpperCase() !== "SEND")) ? 0.5 : 1 }}>
                Send {cappedContacts.length} texts
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>📤 Bulk Send Review Requests</div>
            <p style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>Upload a CSV file with customer names and phone numbers for {business.name}.</p>
            {/* Daily cap indicator */}
            <div style={{ background: "#f9fafb", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted }}>Today's usage</span>
              <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: remaining < 20 ? "#d97706" : C.green }}>{todayCount} / {DAILY_CAP} sent · {remaining} remaining</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Review Platform</Label>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, border: `1.5px solid ${platform === p.id ? p.color : C.border}`, background: platform === p.id ? p.color + "18" : C.bg, cursor: "pointer", fontFamily: font.body, fontSize: 15, color: platform === p.id ? p.color : C.textMuted, fontWeight: platform === p.id ? 600 : 400 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: p.color, color: "#fff", fontSize: 12, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btnStyle, marginBottom: 12 }}>📂 Upload CSV File</button>
          </div>
          <div style={{ ...card, background: C.surfaceHover }}>
            <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>CSV Format Required</div>
            <div style={{ border: `1px solid #C8D5E8`, borderRadius: 8, overflow: "hidden", marginBottom: 14, fontSize: 13, fontFamily: font.mono }}>
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", background: "#E2EBF5", borderBottom: "1px solid #C8D5E8" }}>
                <div style={{ padding: "7px 8px", borderRight: "1px solid #C8D5E8" }}></div>
                <div style={{ padding: "7px 12px", borderRight: "1px solid #C8D5E8", color: C.gold, fontWeight: 700 }}>A</div>
                <div style={{ padding: "7px 12px", color: C.gold, fontWeight: 700 }}>B</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", background: "#EEF3FA", borderBottom: "1px solid #C8D5E8" }}>
                <div style={{ padding: "7px 8px", borderRight: "1px solid #C8D5E8", background: "#E2EBF5", color: C.textSub, fontSize: 11, textAlign: "center" }}>1</div>
                <div style={{ padding: "7px 12px", borderRight: "1px solid #C8D5E8", color: C.gold, fontWeight: 700 }}>Name</div>
                <div style={{ padding: "7px 12px", color: C.gold, fontWeight: 700 }}>Phone</div>
              </div>
              {[["Sarah Johnson","9545551234"],["John Smith","3054449876"],["Maria Garcia","7865553210"]].map(([name, phone], i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", borderBottom: i < 2 ? "1px solid #C8D5E8" : "none", background: i % 2 === 0 ? "#fff" : "#F9FBFE" }}>
                  <div style={{ padding: "7px 8px", borderRight: "1px solid #C8D5E8", color: C.textSub, fontSize: 11, textAlign: "center", background: "#E2EBF5" }}>{i + 2}</div>
                  <div style={{ padding: "7px 12px", borderRight: "1px solid #C8D5E8", color: C.text }}>{name}</div>
                  <div style={{ padding: "7px 12px", color: C.text }}>{phone}</div>
                </div>
              ))}
            </div>
            <button onClick={downloadTemplate} style={{ ...ghostBtnStyle, fontSize: 13, padding: "8px 16px" }}>⬇️ Download Template</button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div>
          <div style={{ ...card, marginBottom: 16, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text }}>📋 Preview — {contacts.length} contacts</div>
              <button onClick={() => { setContacts([]); setStep("upload"); }} style={{ ...ghostBtnStyle, padding: "8px 16px", fontSize: 13 }}>← Re-upload</button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: C.green }}>{cappedContacts.length}</div>
                <div style={{ fontFamily: font.body, fontSize: 12, color: C.green }}>Ready to send</div>
              </div>
              {contacts.filter(c => !c.valid).length > 0 && (
                <div style={{ flex: 1, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: "#C2410C" }}>{contacts.filter(c => !c.valid).length}</div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: "#C2410C" }}>Will be skipped</div>
                </div>
              )}
            </div>
            <button onClick={() => setShowConfirm(true)} disabled={cappedContacts.length === 0} style={{ ...btnStyle, width: "100%" }}>
              🚀 Send to {cappedContacts.length} Contacts
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
            {contacts.map((c, i) => (
              <div key={i} style={{ ...card, padding: "12px 16px", opacity: c.valid ? 1 : 0.6, border: `1px solid ${c.valid ? C.border : "#FED7AA"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{c.valid ? "✅" : "⚠️"}</span>
                    <div>
                      <div style={{ fontFamily: font.display, fontSize: 14, color: C.text, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontFamily: font.mono, fontSize: 11, color: c.valid ? C.textMuted : "#C2410C" }}>{c.valid ? `+1${c.phone}` : "Invalid number — will be skipped"}</div>
                    </div>
                  </div>
                  <button onClick={() => removeContact(c.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "sending" && (
        <div style={{ ...card, textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>📤</div>
          <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 8 }}>Sending Messages...</div>
          <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, marginBottom: 28 }}>Please don't close this page</div>
          <div style={{ background: C.border, borderRadius: 99, height: 10, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${C.gold}, #0d3d8a)`, borderRadius: 99, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 14, color: C.textMuted }}>{progress}% complete</div>
        </div>
      )}

      {step === "done" && (
        <div style={{ ...card, textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontFamily: font.display, fontSize: 24, fontWeight: 600, color: C.text, marginBottom: 8 }}>Bulk Send Complete!</div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: "20px 0 28px" }}>
            <div style={{ background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 12, padding: "16px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: C.green }}>{results.sent}</div>
              <div style={{ fontFamily: font.body, fontSize: 13, color: C.green }}>Sent</div>
            </div>
            {results.failed > 0 && (
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: "16px 24px", textAlign: "center" }}>
                <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color: "#C2410C" }}>{results.failed}</div>
                <div style={{ fontFamily: font.body, fontSize: 13, color: "#C2410C" }}>Failed</div>
              </div>
            )}
          </div>
          <button onClick={() => { setStep("upload"); setContacts([]); setProgress(0); setTypedConfirm(""); }} style={{ ...ghostBtnStyle }}>Send Another Batch</button>
        </div>
      )}
    </div>
  );
}

// ── ANALYTICS TAB ─────────────────────────────────────────────────────────────
function AnalyticsTab({ log, businessName, photos = [], socialLinks = {}, onNavigate = null, embedded = false }) {
  const now = new Date();
  const thisMonth = log.filter(m => new Date(m.sent_at).getMonth() === now.getMonth() && new Date(m.sent_at).getFullYear() === now.getFullYear());
  const lastMonth = log.filter(m => { const d = new Date(m.sent_at); const lm = new Date(now.getFullYear(), now.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
  const googleCount = log.filter(m => m.platform === "Google").length;
  const yelpCount = log.filter(m => m.platform === "Yelp").length;
  const total = log.length;
  const growth = lastMonth.length > 0 ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100) : 0;
  const gpCount = photos.filter(p => p.posted_platforms?.includes("google")).length;
  const gcCount = photos.filter(p => p.posted_platforms?.includes("google_campaign")).length;
  const igCount = photos.filter(p => p.posted_platforms?.includes("instagram")).length;
  const fbCount = photos.filter(p => p.posted_platforms?.includes("facebook")).length;
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const count = log.filter(m => new Date(m.sent_at).toDateString() === d.toDateString()).length;
      days.push({ label: d.toLocaleDateString("en", { weekday: "short" }), count });
    }
    return days;
  };
  const days = getLast7Days();
  const maxCount = Math.max(...days.map(d => d.count), 1);
  const topCard = (value, label, sub, color) => (
    <div style={{ ...card, padding: "16px", textAlign: "center" }}>
      <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: font.body, fontSize: 12, fontWeight: 600, color: C.text, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontFamily: font.body, fontSize: 10, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const postCard = (value, label, abbr, color, link) => (
    <div onClick={() => link && window.open(link, "_blank")} style={{ ...card, padding: "16px", textAlign: "center", cursor: link ? "pointer" : "default", border: link ? `1px solid ${color}33` : `1px solid ${C.border}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "18", border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontFamily: font.mono, fontSize: 12, fontWeight: 700, color }}>{abbr}</div>
      <div style={{ fontFamily: font.display, fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: font.body, fontSize: 11, color: C.textMuted, marginTop: 5 }}>{label}</div>
      {link && <div style={{ fontFamily: font.body, fontSize: 10, color, marginTop: 4 }}>Tap to open →</div>}
    </div>
  );
  return (
    <div style={embedded ? { padding: "4px 0 20px" } : { position: "absolute", inset: 0, overflowY: "auto", padding: "20px 20px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text }}>Analytics</div>
        <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, marginTop: 4 }}>Your ReviewSend performance</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {topCard(total, "Total Sent", "All time", C.gold)}
        {topCard(thisMonth.length, "This Month", lastMonth.length > 0 ? `${growth >= 0 ? "+" : ""}${growth}% vs last` : "First month!", growth >= 0 ? C.green : "#e74c3c")}
        {topCard(googleCount, "Google Sent", `${total > 0 ? Math.round((googleCount/total)*100) : 0}%`, "#4A90D9")}
        {topCard(yelpCount, "Yelp Sent", `${total > 0 ? Math.round((yelpCount/total)*100) : 0}%`, "#C0392B")}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Posts Published</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {postCard(gpCount, "Google Posts", "GP", "#4A90D9", socialLinks?.google || null)}
          {postCard(gcCount, "Google Photos", "GP2", "#1A8C4E", socialLinks?.google_campaign || null)}
          {postCard(igCount, "Instagram", "IG", "#E1306C", socialLinks?.instagram || null)}
          {postCard(fbCount, "Facebook", "FB", "#1877F2", socialLinks?.facebook || null)}
        </div>
      </div>
      <div style={{ ...card, padding: "20px 16px", marginBottom: 12 }}>
        <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>Last 7 Days</div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: C.textMuted }}>{d.count > 0 ? d.count : ""}</div>
              <div style={{ width: "100%", background: d.count > 0 ? `linear-gradient(180deg, #1A5FBF, #0d3d8a)` : C.border, borderRadius: "4px 4px 2px 2px", height: `${Math.max((d.count / maxCount) * 56, d.count > 0 ? 8 : 4)}px`, transition: "height 0.3s" }} />
              <div style={{ fontFamily: font.body, fontSize: 10, color: C.textMuted }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>
      {total === 0 && <div style={{ textAlign: "center", padding: "20px 0", fontFamily: font.body, fontSize: 15, color: C.textMuted }}>No data yet. Start sending review requests to see your analytics!</div>}
    </div>
  );
}

// ── TIME AGO ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ── PHOTOS TAB (Feature 4: upload validation added) ───────────────────────────
function PhotosTab({ businessId, businessName, business = null, isAdmin = false, isMarketing = false, onStatusChange = null, features = null }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(""); // Feature 4
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef(null);
  const [captionModal, setCaptionModal] = useState(null);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [activePlatform, setActivePlatform] = useState(null);

  const PHOTO_PLATFORMS = [
    { id: "google", label: "GP", fullLabel: "Google", color: "#4A90D9" },
    { id: "google_campaign", label: "GP2", fullLabel: "Google Photos", color: "#1A8C4E" },
    { id: "instagram", label: "IG", fullLabel: "Instagram", color: "#E1306C" },
    { id: "facebook", label: "FB", fullLabel: "Facebook", color: "#1877F2" },
  ];

  const PLATFORM_PROMPTS = {
    google: "Write an SEO-optimized Google Business photo description. Use keywords naturally. No hashtags. 2-3 sentences max. Focus on location, business type, and what makes this business unique.",
    google_campaign: "Write an SEO-optimized Google Photos caption. Use keywords naturally including the city and state. No hashtags. 2-3 sentences describing what is shown and the business.",
    instagram: "Write an engaging Instagram caption. Conversational, warm tone. 2-3 sentences then a line break followed by 15 relevant hashtags including the city and business type.",
    facebook: "Write a warm Facebook post caption. Community-focused tone, no hashtags. 2-3 sentences. End with a soft call to action.",
  };

  const generateCaption = async (photo, platformId) => {
    setGenerating(true);
    setGeneratedCaption("");
    setActivePlatform(platformId);
    const biz = business || {};
    const context = [biz.name ? `Business: ${biz.name}` : `Business: ${businessName}`, biz.city && biz.state ? `Location: ${biz.city}, ${biz.state}` : "", biz.business_type ? `Type: ${biz.business_type}` : "", biz.short_description ? `Description: ${biz.short_description}` : "", photo.caption ? `Photo note: ${photo.caption}` : ""].filter(Boolean).join("\n");
    const prompt = `${PLATFORM_PROMPTS[platformId] || "Write a professional social media caption."}\n\nBusiness info:\n${context}`;
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) { setGeneratedCaption("API key not found. Make sure VITE_ANTHROPIC_API_KEY is set."); setGenerating(false); return; }
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await response.json();
      if (!response.ok) { setGeneratedCaption("API error " + response.status + ": " + (data.error?.message || "Unknown error")); setGenerating(false); return; }
      setGeneratedCaption(data.content?.[0]?.text || "Could not generate caption.");
    } catch (err) { setGeneratedCaption("Network error: " + err.message); }
    setGenerating(false);
  };

  const openCaptionModal = (photo, platformId) => { setCaptionModal({ photo, platformId }); setActivePlatform(platformId); setGeneratedCaption(""); setCaptionCopied(false); generateCaption(photo, platformId); };
  const closeCaptionModal = () => { setCaptionModal(null); setGeneratedCaption(""); setActivePlatform(null); setCaptionCopied(false); };
  const copyCaption = () => { navigator.clipboard.writeText(generatedCaption); setCaptionCopied(true); setTimeout(() => setCaptionCopied(false), 2000); };
  const confirmPosted = async () => { if (!captionModal) return; await togglePlatform(captionModal.photo, captionModal.platformId); closeCaptionModal(); };

  useEffect(() => { loadPhotos(); }, []);

  const loadPhotos = async () => {
    const query = isAdmin ? supabase.from("photos").select("*, businesses(name)").order("created_at", { ascending: false }) : supabase.from("photos").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    const { data } = await query;
    if (data) {
      // Attach public URL to each photo
      const photosWithUrls = data.map(p => ({
        ...p,
        publicUrl: supabase.storage.from("business-photos").getPublicUrl(p.file_path).data.publicUrl,
      }));
      setPhotos(photosWithUrls);
    }
  };

  // Feature 4: photo upload with validation
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    const validation = validateImageFile(file);
    if (!validation.ok) { setUploadError(validation.error); e.target.value = ""; return; }
    setUploading(true);
    const fileName = `${businessId}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("business-photos").upload(fileName, file);
    if (!uploadErr) {
      await supabase.from("photos").insert([{ business_id: businessId, file_path: fileName, file_name: file.name, caption, status: "pending", posted_platforms: [] }]);
      setCaption("");
      loadPhotos();
    }
    setUploading(false);
  };

  const togglePlatform = async (photo, platform) => {
    const current = photo.posted_platforms || [];
    const updated = current.includes(platform) ? current.filter(p => p !== platform) : [...current, platform];
    const newStatus = updated.length > 0 ? "posted" : (photo.status === "posted" ? "downloaded" : photo.status);
    await supabase.from("photos").update({ posted_platforms: updated, status: newStatus, ...(updated.length > 0 ? { posted_at: new Date().toISOString() } : {}) }).eq("id", photo.id);
    loadPhotos();
    if (onStatusChange) onStatusChange();
  };

  const downloadPhoto = async (photo) => {
    const { data } = await supabase.storage.from("business-photos").download(photo.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url; a.download = photo.file_name; a.click();
      URL.revokeObjectURL(url);
      if (photo.status === "pending") { await supabase.from("photos").update({ status: "downloaded", downloaded_at: new Date().toISOString() }).eq("id", photo.id); loadPhotos(); if (onStatusChange) onStatusChange(); }
    }
  };

  return (
    <div className="fade-up">
      <PageHeader title={isAdmin || isMarketing ? "Client Photos" : "Upload Photos"} sub={isAdmin || isMarketing ? `${photos.length} total photos` : "Upload photos for your Google Business listing"} />
      {!isAdmin && !isMarketing && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <Label>Caption (optional)</Label>
            <input style={inputStyle} value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. New menu item, team photo, storefront..." />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" style={{ display: "none" }} />
          <button onClick={() => { setUploadError(""); fileInputRef.current?.click(); }} disabled={uploading} style={{ ...btnStyle, width: "100%" }}>{uploading ? "Uploading…" : "📸 Upload Photo"}</button>
          {uploadError && <p style={{ color: "#ef4444", fontFamily: font.body, fontSize: 13, marginTop: 8 }}>{uploadError}</p>}
          <p style={{ fontFamily: font.body, fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 8 }}>Images only · Max 10 MB · JPG, PNG, WebP, GIF, AVIF</p>
          <p style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 4 }}>Photos will be reviewed and posted to your listings by your account manager.</p>
        </div>
      )}
      {(() => {
        const renderPhotoCard = (photo) => {
          const postedPlatforms = photo.posted_platforms || [];
          const isFullyPosted = postedPlatforms.length === PHOTO_PLATFORMS.length;
          const isPartiallyPosted = postedPlatforms.length > 0 && !isFullyPosted;
          return (
            <div key={photo.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: 2, background: isFullyPosted ? "#1A8C4E" : isPartiallyPosted ? "#F59E0B" : photo.status === "downloaded" ? "#3B82F6" : "#E5E7EB" }} />
              <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <div style={{ width: 140, height: 140, borderRadius: 10, background: "#F4F7FB", border: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {photo.publicUrl ? (
                      <img
                        src={photo.publicUrl}
                        alt={photo.file_name}
                        draggable="true"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.target.style.display = "none"; e.target.nextSibling && (e.target.nextSibling.style.display = "block"); }}
                      />
                    ) : null}
                    <span style={{ fontSize: 32, display: photo.publicUrl ? "none" : "block" }}>📷</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: font.display, fontSize: 13, color: C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.file_name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      {(isAdmin || isMarketing) && photo.businesses && <span style={{ fontFamily: font.body, fontSize: 11, color: C.gold, fontWeight: 600 }}>{photo.businesses.name}</span>}
                      {photo.caption && <span style={{ fontFamily: font.body, fontSize: 11, color: C.textMuted }}>"{photo.caption}"</span>}
                      <span style={{ fontFamily: font.mono, fontSize: 10, color: C.textSub }}>{timeAgo(photo.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isFullyPosted ? <span style={{ fontFamily: font.body, fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "#DCFCE7", color: "#166534", border: "1px solid #BBF7D0", fontWeight: 600 }}>All Posted</span>
                    : isPartiallyPosted ? <span style={{ fontFamily: font.body, fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "#FEF9C3", color: "#854D0E", border: "1px solid #FDE68A", fontWeight: 600 }}>In Progress</span>
                    : photo.status === "downloaded" ? <span style={{ fontFamily: font.body, fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "#DBEAFE", color: "#1E40AF", border: "1px solid #BFDBFE", fontWeight: 600 }}>Downloaded</span>
                    : <span style={{ fontFamily: font.body, fontSize: 10, padding: "3px 10px", borderRadius: 99, background: "#FFF7ED", color: "#9A3412", border: "1px solid #FED7AA", fontWeight: 600 }}>Pending</span>}
                  </div>
                </div>
                {(isAdmin || isMarketing) && (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: font.body, fontSize: 10, letterSpacing: 1.5, color: C.textSub, textTransform: "uppercase", fontWeight: 700, marginRight: 2 }}>Posted to</span>
                        {PHOTO_PLATFORMS.map(p => {
                          const isPosted = postedPlatforms.includes(p.id);
                          const isLocked = features && ((p.id === "google" && features.google_posts === false) || ((p.id === "instagram" || p.id === "facebook") && features.social === false));
                          if (isLocked) return <button key={p.id} disabled style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 99, border: `1.5px solid ${C.border}`, background: "transparent", color: C.textSub, fontFamily: font.body, fontSize: 11, fontWeight: 600, cursor: "not-allowed", opacity: 0.5 }}>🔒 {p.label}</button>;
                          return (
                            <button key={p.id} onClick={() => isPosted ? togglePlatform(photo, p.id) : p.id === "google_campaign" ? togglePlatform(photo, p.id) : openCaptionModal(photo, p.id)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 99, border: `1.5px solid ${isPosted ? p.color : C.border}`, background: isPosted ? p.color + "15" : "transparent", color: isPosted ? p.color : C.textMuted, fontFamily: font.body, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isPosted ? p.color : C.border, display: "inline-block" }} />
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={() => downloadPhoto(photo)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontFamily: font.body, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>⬇ Download</button>
                    </div>
                  </div>
                )}
                {!isAdmin && !isMarketing && postedPlatforms.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 2, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: font.body, fontSize: 10, color: C.textMuted, fontWeight: 600 }}>Posted to:</span>
                    {postedPlatforms.map(p => { const pl = PHOTO_PLATFORMS.find(x => x.id === p); return pl ? <span key={p} style={{ fontFamily: font.body, fontSize: 10, padding: "2px 8px", borderRadius: 99, background: pl.color + "15", color: pl.color, border: `1px solid ${pl.color}33`, fontWeight: 600 }}>{pl.fullLabel}</span> : null; })}
                  </div>
                )}
              </div>
            </div>
          );
        };

        return (
          <div style={{ maxHeight: 860, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 16 }}>
            {photos.map(renderPhotoCard)}
            {photos.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>{isAdmin || isMarketing ? "No photos from clients yet." : "No photos uploaded yet."}</div>}
          </div>
        );
      })()}

      {/* AI Caption Modal */}
      {captionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 0, maxWidth: 460, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: font.display, fontSize: 17, fontWeight: 700, color: C.text }}>Post to {PHOTO_PLATFORMS.find(p => p.id === activePlatform)?.fullLabel}</div>
                <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>{businessName} · AI generated caption</div>
              </div>
              <button onClick={closeCaptionModal} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textMuted, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ width: "100%", height: 180, background: "#F4F7FB", overflow: "hidden", position: "relative" }}>
              {captionModal.photo.publicUrl && (
                <img
                  src={captionModal.photo.publicUrl}
                  alt={captionModal.photo.file_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.5))", padding: "20px 14px 10px" }}>
                <div style={{ fontFamily: font.mono, fontSize: 11, color: "#fff" }}>{captionModal.photo.file_name}</div>
              </div>
            </div>
            <div style={{ padding: "12px 20px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PHOTO_PLATFORMS.map(p => (
                <button key={p.id} onClick={() => { setActivePlatform(p.id); generateCaption(captionModal.photo, p.id); }}
                  style={{ padding: "4px 12px", borderRadius: 99, border: `1.5px solid ${activePlatform === p.id ? p.color : C.border}`, background: activePlatform === p.id ? p.color + "15" : "transparent", color: activePlatform === p.id ? p.color : C.textMuted, fontFamily: font.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {p.fullLabel}
                </button>
              ))}
            </div>
            <div style={{ padding: "14px 20px" }}>
              <div style={{ fontFamily: font.body, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: C.textSub, marginBottom: 6 }}>Caption — tap to edit</div>
              {generating ? (
                <div style={{ background: "#F4F7FB", borderRadius: 10, padding: "20px", textAlign: "center", minHeight: 90 }}>
                  <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, animation: "pulse 1.5s infinite" }}>✨ Generating caption...</div>
                </div>
              ) : (
                <textarea value={generatedCaption} onChange={e => setGeneratedCaption(e.target.value)} rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, fontSize: 13 }} />
              )}
            </div>
            <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => generateCaption(captionModal.photo, activePlatform)} disabled={generating} style={{ flex: 1, ...ghostBtnStyle, padding: "9px", fontSize: 13, fontWeight: 600 }}>🔄 Regenerate</button>
                <button onClick={copyCaption} disabled={generating || !generatedCaption} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${C.blue}`, background: captionCopied ? "#DCFCE7" : "#EFF6FF", color: captionCopied ? "#166534" : C.blue, fontFamily: font.body, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{captionCopied ? "✅ Copied!" : "📋 Copy Caption"}</button>
              </div>
              <button onClick={confirmPosted} disabled={generating} style={{ ...btnStyle, width: "100%", padding: "11px" }}>✓ Mark as Posted to {PHOTO_PLATFORMS.find(p => p.id === activePlatform)?.fullLabel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SHARED STYLES & COMPONENTS ────────────────────────────────────────────────
const card = { background: "#FFFFFF", border: "1px solid #D6E2F0", borderRadius: 16, padding: 32, boxShadow: "0 2px 16px rgba(26,95,191,0.06)" };
const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #D6E2F0", background: "#F4F7FB", color: "#0D1117", fontSize: 15, fontFamily: "'Cormorant Garamond', Georgia, serif", boxSizing: "border-box", transition: "border 0.2s, box-shadow 0.2s" };
const btnStyle = { padding: "12px 24px", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff", border: "none", borderRadius: 10, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, fontWeight: 600, cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(26,95,191,0.25)" };
const ghostBtnStyle = { padding: "12px 24px", background: "none", color: "#6B7A99", border: "1px solid #D6E2F0", borderRadius: 10, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, cursor: "pointer" };

function Label({ children }) {
  return <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 11, letterSpacing: 3, color: "#1A3A6B", textTransform: "uppercase", marginBottom: 8, fontWeight: "700" }}>{children}</div>;
}

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 11, letterSpacing: 4, color: "#1A5FBF", marginBottom: 10 }}>✦ REVIEWSEND</div>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, fontWeight: 400, color: "#0D1117", letterSpacing: "-0.5px", margin: 0 }}>{title}</h1>
      <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, color: "#6B7A99", marginTop: 8 }}>{sub}</p>
      <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #1A5FBF, transparent)", marginTop: 18 }} />
    </div>
  );
}
