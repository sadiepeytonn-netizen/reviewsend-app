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

const SUPER_ADMIN_EMAIL = "bentonisaiah03@gmail.com";

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserRole(session.user.email);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserRole(session.user.email);
      else { setLoading(false); setUserRole(null); setBusinessData(null); setMarketingData(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async (email) => {
    setLoading(true);
    if (email === SUPER_ADMIN_EMAIL) {
      setUserRole("superadmin");
      setLoading(false);
      return;
    }
    const { data: mc } = await supabase.from("marketing_companies").select("*").eq("email", email).single();
    if (mc) { setUserRole("marketing"); setMarketingData(mc); setLoading(false); return; }
    const { data: biz } = await supabase.from("businesses").select("*").eq("email", email).single();
    if (biz) { setUserRole("business"); setBusinessData(biz); setLoading(false); return; }
    setUserRole("unknown");
    setLoading(false);
  };

  const handleLogin = async () => {
    setAuthError(""); setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{globalCSS}</style>
      <div style={{ fontFamily: font.body, fontSize: 16, color: C.textMuted, letterSpacing: 2 }}>Loading…</div>
    </div>
  );

  if (!session) return (
    <LoginScreen
      authMode={authMode} setAuthMode={setAuthMode}
      authEmail={authEmail} setAuthEmail={setAuthEmail}
      authPassword={authPassword} setAuthPassword={setAuthPassword}
      authError={authError} authLoading={authLoading}
      handleLogin={handleLogin}
    />
  );

  if (userRole === "superadmin") return <SuperAdminDashboard onSignOut={handleSignOut} />;
  if (userRole === "marketing") return <MarketingDashboard data={marketingData} onSignOut={handleSignOut} />;
  if (userRole === "business") return <BusinessApp data={businessData} onSignOut={handleSignOut} />;

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

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({ authEmail, setAuthEmail, authPassword, setAuthPassword, authError, authLoading, handleLogin }) {
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
          <div style={{ marginBottom: 24 }}>
            <Label>Password</Label>
            <input type="password" value={authPassword} placeholder="••••••••"
              onChange={e => setAuthPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={inputStyle} />
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
    const { error: authError } = await supabase.auth.admin?.createUser({ email: newCompany.email, password: newCompany.password });
    const { error } = await supabase.from("marketing_companies").insert([{ name: newCompany.name, email: newCompany.email, revenue_share: newCompany.revenue_share }]);
    if (!error) { setShowAddCompany(false); setNewCompany({ name: "", email: "", password: "", revenue_share: 20 }); loadData(); }
    setSaving(false);
  };

  const addBusiness = async () => {
    setSaving(true);
    const { error } = await supabase.from("businesses").insert([{
      name: newBusiness.name, email: newBusiness.email,
      google_link: newBusiness.google_link, yelp_link: newBusiness.yelp_link,
      marketing_company_id: newBusiness.marketing_company_id || null,
      message_template: "Hi {name}! Thanks for visiting {business}. Leave us a review here: {link} 🙏",
      follow_up_template: "Hi {name}! Just a reminder — we'd love your review: {link} ⭐",
    }]);
    if (!error) { setShowAddBusiness(false); setNewBusiness({ name: "", email: "", password: "", google_link: "", yelp_link: "", marketing_company_id: "" }); loadData(); }
    setSaving(false);
  };

  const deleteCompany = async (id) => {
    await supabase.from("marketing_companies").delete().eq("id", id);
    loadData();
  };

  const deleteBusiness = async (id) => {
    await supabase.from("businesses").delete().eq("id", id);
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
                {[["companies","◈","Marketing Companies"],["businesses","◉","All Businesses"]].map(([id,ico,label]) => (
                  <button key={id} onClick={() => { setTab(id); setMenuOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 18px", background: tab === id ? C.surfaceHover : "none", border: "none", color: tab === id ? C.gold : C.textMuted, cursor: "pointer", fontFamily: font.body, fontSize: 14, textAlign: "left" }}>
                    <span style={{ fontSize: 11, color: C.gold }}>{ico}</span>{label}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                  <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 18px", background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontFamily: font.body, fontSize: 14, textAlign: "left" }}>
                    → Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "44px 28px 80px" }}>

        {/* MARKETING COMPANIES */}
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

        {/* ALL BUSINESSES */}
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
                    <button onClick={() => deleteBusiness(b.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontFamily: font.body, fontSize: 13 }}>Remove</button>
                  </div>
                </div>
              ))}
              {businesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No businesses yet. Add one above!</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── MARKETING COMPANY DASHBOARD ───────────────────────────────────────────────
function MarketingDashboard({ data, onSignOut }) {
  const [businesses, setBusinesses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState("clients");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newBiz, setNewBiz] = useState({ name: "", email: "", google_link: "", yelp_link: "" });
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    loadData();
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadData = async () => {
    const { data: biz } = await supabase.from("businesses").select("*").eq("marketing_company_id", data.id).order("created_at", { ascending: false });
    if (biz) {
      setBusinesses(biz);
      const ids = biz.map(b => b.id);
      if (ids.length > 0) {
        const { data: msgs } = await supabase.from("messages").select("*").in("business_id", ids).order("sent_at", { ascending: false });
        if (msgs) setMessages(msgs);
      }
    }
  };

  const addBusiness = async () => {
    setSaving(true);
    const { error } = await supabase.from("businesses").insert([{
      name: newBiz.name, email: newBiz.email,
      google_link: newBiz.google_link, yelp_link: newBiz.yelp_link,
      marketing_company_id: data.id,
      message_template: "Hi {name}! Thanks for visiting {business}. Leave us a review here: {link} 🙏",
      follow_up_template: "Hi {name}! Just a reminder — we'd love your review: {link} ⭐",
    }]);
    if (!error) { setShowAdd(false); setNewBiz({ name: "", email: "", google_link: "", yelp_link: "" }); loadData(); }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{globalCSS}</style>
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 5, color: C.gold }}>★ REVIEWSEND</div>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4.5 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: "block", width: 18, height: 1.5, background: C.text, borderRadius: 2 }} />)}
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, minWidth: 220, overflow: "hidden", boxShadow: "0 12px 40px rgba(13,17,23,0.12)" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: font.display, fontSize: 14, color: C.text }}>{data.name}</div>
                  <div style={{ fontFamily: font.body, fontSize: 11, color: C.gold, marginTop: 2, letterSpacing: 2 }}>MARKETING PARTNER</div>
                </div>
                {[["clients","◈","My Clients"],["activity","◉","All Activity"]].map(([id,ico,label]) => (
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

        {tab === "clients" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
              <PageHeader title="My Clients" sub={`${businesses.length} businesses`} />
              <button onClick={() => setShowAdd(true)} style={{ ...btnStyle, marginTop: 8 }}>+ Add Client</button>
            </div>

            {showAdd && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontFamily: font.display, fontSize: 18, marginBottom: 20, color: C.text }}>New Client Business</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><Label>Business Name</Label><input style={inputStyle} value={newBiz.name} onChange={e => setNewBiz(d => ({...d, name: e.target.value}))} placeholder="Joe's Restaurant" /></div>
                  <div><Label>Login Email</Label><input style={inputStyle} value={newBiz.email} onChange={e => setNewBiz(d => ({...d, email: e.target.value}))} placeholder="joe@restaurant.com" /></div>
                  <div><Label>Google Review Link</Label><input style={inputStyle} value={newBiz.google_link} onChange={e => setNewBiz(d => ({...d, google_link: e.target.value}))} placeholder="https://g.page/r/..." /></div>
                  <div><Label>Yelp Review Link</Label><input style={inputStyle} value={newBiz.yelp_link} onChange={e => setNewBiz(d => ({...d, yelp_link: e.target.value}))} placeholder="https://www.yelp.com/biz/..." /></div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={addBusiness} disabled={saving} style={{ ...btnStyle }}>{saving ? "Saving…" : "Create Client"}</button>
                  <button onClick={() => setShowAdd(false)} style={{ ...ghostBtnStyle }}>Cancel</button>
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
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: font.body, fontSize: 13, color: C.gold, fontWeight: 600 }}>
                        {messages.filter(m => m.business_id === b.id).length} texts sent
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {businesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No clients yet. Add one above!</div>}
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="fade-up">
            <PageHeader title="All Activity" sub={`${messages.length} total messages sent`} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((msg, i) => {
                const biz = businesses.find(b => b.id === msg.business_id);
                return (
                  <div key={i} style={{ ...card, padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: "1px solid #D6E2F0", color: C.gold, fontFamily: font.display, fontSize: 15, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>{msg.customer_name.charAt(0)}</div>
                        <div>
                          <div style={{ fontFamily: font.display, fontSize: 15, color: C.text, fontWeight: 600 }}>{msg.customer_name}</div>
                          <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{msg.customer_phone}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: font.body, fontSize: 12, padding: "4px 12px", borderRadius: 99, background: C.greenBg, color: C.green, border: `1px solid ${C.green}33`, fontWeight: 600 }}>Delivered</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontFamily: font.body, fontSize: 12, color: C.gold }}>{biz?.name || "Unknown Business"}</div>
                      <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>{new Date(msg.sent_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No messages sent yet.</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── BUSINESS APP ──────────────────────────────────────────────────────────────
function BusinessApp({ data, onSignOut }) {
  const [tab, setTab] = useState("send");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(data);
  const [editingSettings, setEditingSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState(data);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("google");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [log, setLog] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    loadMessages();
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadMessages = async () => {
    const { data: msgs } = await supabase.from("messages").select("*").eq("business_id", data.id).order("sent_at", { ascending: false });
    if (msgs) setLog(msgs);
  };

  const formatPhone = (raw) => "+1" + raw.replace(/\D/g, "");

  const reviewLink = platform === "google" ? settings.google_link : settings.yelp_link;
  const previewMessage = (settings.message_template || "")
    .replace("{name}", customerName || "Customer")
    .replace("{business}", settings.name)
    .replace("{link}", reviewLink);

  const handleSend = async () => {
    if (!phone || !customerName) return;
    setSending(true);
    const link = platform === "google" ? settings.google_link : settings.yelp_link;
    const message = (settings.message_template || "")
      .replace("{name}", customerName)
      .replace("{business}", settings.name)
      .replace("{link}", link);
    try {
      const response = await fetch("https://reviewsend-server-production.up.railway.app/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: formatPhone(phone), message }),
      });
      const result = await response.json();
      if (result.success) {
        await supabase.from("messages").insert([{
          business_id: data.id, customer_name: customerName,
          customer_phone: formatPhone(phone), platform: platform === "google" ? "Google" : "Yelp",
        }]);
        setSent(true);
        loadMessages();
        setTimeout(() => { setSent(false); setCustomerName(""); setPhone(""); }, 2800);
      } else {
        alert("Failed to send: " + result.error);
      }
    } catch (err) {
      alert("Could not reach the server.");
    }
    setSending(false);
  };

  const saveSettings = async () => {
    await supabase.from("businesses").update({
      name: draftSettings.name, google_link: draftSettings.google_link,
      yelp_link: draftSettings.yelp_link, message_template: draftSettings.message_template,
    }).eq("id", data.id);
    setSettings({ ...draftSettings });
    setEditingSettings(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{globalCSS}</style>
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 5, color: C.gold }}>★ REVIEWSEND</div>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4.5 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: "block", width: 18, height: 1.5, background: C.text, borderRadius: 2 }} />)}
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, minWidth: 230, overflow: "hidden", boxShadow: "0 12px 40px rgba(13,17,23,0.12)" }}>
                <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: font.display, fontSize: 14, color: C.text }}>{settings.name}</div>
                  <div style={{ fontFamily: font.body, fontSize: 11, color: C.gold, marginTop: 3, letterSpacing: 2 }}>PRO PLAN</div>
                </div>
                {[["send","✦","Send Review Request"],["log","◈","Message History"],["settings","◉","Settings"]].map(([id,ico,label]) => (
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

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "52px 28px 80px" }}>

        {tab === "send" && (
          <div className="fade-up">
            <PageHeader title="Send a Review Request" sub="Deliver a personal text message with your review link" />
            <div style={card}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <Field label="Customer Name" value={customerName} onChange={setCustomerName} placeholder="e.g. Isabelle" />
                <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="(555) 000-0000" />
              </div>
              <div style={{ marginBottom: 26 }}>
                <Label><span style={{ display: "block", textAlign: "center" }}>Review Platform</span></Label>
                <div style={{ display: "flex", gap: 12 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, border: `1.5px solid ${platform === p.id ? p.color : C.border}`, background: platform === p.id ? p.color + "18" : C.bg, cursor: "pointer", fontFamily: font.body, fontSize: 15, color: platform === p.id ? p.color : C.textMuted, fontWeight: platform === p.id ? 600 : 400, transition: "all 0.2s" }}>
                      <span style={{ width: 26, height: 26, borderRadius: 7, background: p.color, color: "#fff", fontSize: 12, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <SendBtn onClick={handleSend} sending={sending} sent={sent} disabled={!phone || !customerName} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 52 }}>
              <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 4, color: "#1A3A6B", marginBottom: 20, fontWeight: "700" }}>MESSAGE PREVIEW</div>
              <div style={{ width: 250, background: "#0D1117", borderRadius: 38, padding: "20px 13px 26px", boxShadow: "0 20px 60px rgba(13,17,23,0.18), 0 0 0 1px #1a2a3a" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ width: 46, height: 6, borderRadius: 3, background: "#1a2a3a" }} />
                </div>
                <div style={{ background: "#F4F7FB", borderRadius: 24, minHeight: 230, padding: "22px 15px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#ffffff", borderRadius: "18px 18px 4px 18px", padding: "12px 15px", fontSize: 13, lineHeight: 1.55, maxWidth: "88%", fontFamily: font.body, fontWeight: 500 }}>
                      {previewMessage}
                    </div>
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 9.5, color: C.textSub, textAlign: "right", marginTop: 12 }}>
                    {platform === "google" ? "Google Review" : "Yelp Review"} · Just now
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "log" && (
          <div className="fade-up">
            <PageHeader title="Message History" sub={`${log.length} messages sent`} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {log.map((row, i) => (
                <div key={i} style={{ ...card, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: "1px solid #D6E2F0", color: "#1A5FBF", fontFamily: font.display, fontSize: 16, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{row.customer_name.charAt(0)}</div>
                      <div>
                        <div style={{ fontFamily: font.display, fontSize: 16, color: C.text, fontWeight: "600" }}>{row.customer_name}</div>
                        <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted, marginTop: 2 }}>{row.customer_phone}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: font.body, fontSize: 12, letterSpacing: 1, padding: "4px 12px", borderRadius: 99, background: C.greenBg, color: C.green, border: `1px solid ${C.green}33`, fontWeight: "600" }}>Delivered</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 1, padding: "4px 12px", borderRadius: 99, background: row.platform === "Google" ? "#4A90D918" : "#C0392B18", color: row.platform === "Google" ? "#4A90D9" : "#e74c3c", border: `1px solid ${row.platform === "Google" ? "#4A90D933" : "#C0392B33"}`, fontWeight: "600" }}>{row.platform}</span>
                    <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted }}>{new Date(row.sent_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {log.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No messages sent yet.</div>}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="fade-up">
            <PageHeader title="Business Settings" sub="Manage your profile and review destinations" />
            <div style={{ ...card, maxWidth: 520, margin: "0 auto" }}>
              {[
                { label: "Business Name", key: "name", placeholder: "Your Business Name" },
                { label: "Google Review Link", key: "google_link", placeholder: "https://g.page/r/..." },
                { label: "Yelp Review Link", key: "yelp_link", placeholder: "https://www.yelp.com/biz/..." },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 20 }}>
                  <Label>{f.label}</Label>
                  <input style={{ ...inputStyle, ...(editingSettings ? {} : { opacity: 0.5 }) }}
                    value={editingSettings ? draftSettings[f.key] : settings[f.key]}
                    placeholder={f.placeholder} disabled={!editingSettings}
                    onChange={e => setDraftSettings(d => ({ ...d, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ marginBottom: 26 }}>
                <Label>Message Template</Label>
                <p style={{ fontFamily: font.body, fontSize: 12, color: C.textSub, marginBottom: 8 }}>
                  Use <code style={{ color: C.gold, fontFamily: font.mono, fontSize: 11 }}>{"{name}"}</code> · <code style={{ color: C.gold, fontFamily: font.mono, fontSize: 11 }}>{"{business}"}</code> · <code style={{ color: C.gold, fontFamily: font.mono, fontSize: 11 }}>{"{link}"}</code>
                </p>
                <textarea rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 100, lineHeight: 1.65, ...(editingSettings ? {} : { opacity: 0.5 }) }}
                  value={editingSettings ? draftSettings.message_template : settings.message_template}
                  disabled={!editingSettings}
                  onChange={e => setDraftSettings(d => ({ ...d, message_template: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {editingSettings ? (
                  <>
                    <button onClick={saveSettings} style={{ ...btnStyle, flex: 1 }}>Save Changes</button>
                    <button onClick={() => { setDraftSettings({ ...settings }); setEditingSettings(false); }} style={{ ...ghostBtnStyle, flex: 1 }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => { setDraftSettings({ ...settings }); setEditingSettings(true); }}
                    style={{ flex: 1, padding: "13px", background: "none", border: `1px solid #1A5FBF88`, borderRadius: 10, color: "#1A5FBF", cursor: "pointer", fontFamily: font.body, fontSize: 15, letterSpacing: 0.5 }}>
                    Edit Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── SHARED ────────────────────────────────────────────────────────────────────
const card = { background: "#FFFFFF", border: "1px solid #D6E2F0", borderRadius: 16, padding: 32, boxShadow: "0 2px 16px rgba(26,95,191,0.06)" };

const inputStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid #D6E2F0",
  background: "#F4F7FB", color: "#0D1117", fontSize: 15,
  fontFamily: "'Cormorant Garamond', Georgia, serif", boxSizing: "border-box", transition: "border 0.2s, box-shadow 0.2s",
};

const btnStyle = {
  padding: "12px 24px", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#fff",
  border: "none", borderRadius: 10, fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: 15, fontWeight: 600, cursor: "pointer", letterSpacing: 0.5,
  boxShadow: "0 4px 20px rgba(26,95,191,0.25)",
};

const ghostBtnStyle = {
  padding: "12px 24px", background: "none", color: "#6B7A99",
  border: "1px solid #D6E2F0", borderRadius: 10, fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: 15, cursor: "pointer",
};

function Label({ children }) {
  return <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 11, letterSpacing: 3, color: "#1A3A6B", textTransform: "uppercase", marginBottom: 8, fontWeight: "700" }}>{children}</div>;
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function SendBtn({ onClick, sending, sent, disabled }) {
  const bg = sent ? "linear-gradient(135deg, #1A8C4E, #27ae60)" : disabled ? "#E8EEF7" : "linear-gradient(135deg, #1A5FBF, #0d3d8a)";
  const col = sent ? "#fff" : disabled ? "#9DADC4" : "#FFFFFF";
  return (
    <button onClick={onClick} disabled={disabled || sending}
      style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: bg, color: col, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 600, cursor: disabled || sending ? "not-allowed" : "pointer", letterSpacing: 1, transition: "all 0.2s", boxShadow: disabled ? "none" : "0 4px 20px rgba(26,95,191,0.25)" }}>
      {sending ? <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>Sending…</span> : sent ? "✓ Message Sent" : "Send Text Message"}
    </button>
  );
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
