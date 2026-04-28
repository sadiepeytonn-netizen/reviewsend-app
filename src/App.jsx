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

  const [accountManagerData, setAccountManagerData] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserRole(session.user.email);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserRole(session.user.email);
      else { setLoading(false); setUserRole(null); setBusinessData(null); setMarketingData(null); setAccountManagerData(null); }
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
    const { data: am } = await supabase.from("account_managers").select("*, marketing_companies(*)").eq("email", email).single();
    if (am) { setUserRole("accountmanager"); setAccountManagerData(am); setLoading(false); return; }
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
  if (userRole === "accountmanager") return <AccountManagerDashboard data={accountManagerData} onSignOut={handleSignOut} />;
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
                {[["companies","◈","Marketing Companies"],["businesses","◉","All Businesses"],["photos","📸","All Photos"],["analytics","📊","Analytics"]].map(([id,ico,label]) => (
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

        {tab === "photos" && (
          <PhotosTab isAdmin={true} />
        )}

        {tab === "analytics" && (
          <div className="fade-up">
            <PageHeader title="Analytics" sub="Performance across all companies and businesses" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { value: companies.length, label: "Marketing Companies", color: C.gold },
                { value: businesses.length, label: "Total Businesses", color: "#4A90D9" },
                { value: businesses.filter(b => { const now = new Date(); return true; }).length, label: "Active This Month", color: C.green },
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
function MarketingDashboard({ data, onSignOut }) {
  const [businesses, setBusinesses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [accountManagers, setAccountManagers] = useState([]);
  const [tab, setTab] = useState("clients");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddAM, setShowAddAM] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBizTab, setSelectedBizTab] = useState("analytics");
  const [newBiz, setNewBiz] = useState({ name: "", email: "", google_link: "", yelp_link: "" });
  const [newAM, setNewAM] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingPhotosByBiz, setPendingPhotosByBiz] = useState({});
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
        const { data: photos } = await supabase.from("photos").select("business_id, status").in("business_id", ids).eq("status", "pending");
        if (photos) {
          const counts = {};
          photos.forEach(p => { counts[p.business_id] = (counts[p.business_id] || 0) + 1; });
          setPendingPhotosByBiz(counts);
        }
      }
    }
    const { data: ams } = await supabase.from("account_managers").select("*").eq("marketing_company_id", data.id);
    if (ams) setAccountManagers(ams);
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

  const addAccountManager = async () => {
    setSaving(true);
    const { error } = await supabase.from("account_managers").insert([{
      name: newAM.name, email: newAM.email, marketing_company_id: data.id,
    }]);
    if (!error) { setShowAddAM(false); setNewAM({ name: "", email: "" }); loadData(); }
    setSaving(false);
  };

  const assignToManager = async (bizId, amId) => {
    await supabase.from("businesses").update({ account_manager_id: amId || null }).eq("id", bizId);
    loadData();
    setSelectedBusiness(b => b ? { ...b, account_manager_id: amId || null } : null);
  };

  const removeAccountManager = async (id) => {
    await supabase.from("account_managers").delete().eq("id", id);
    loadData();
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
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, minWidth: 230, overflow: "hidden", boxShadow: "0 12px 40px rgba(13,17,23,0.12)" }}>
                <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: font.display, fontSize: 14, color: C.text }}>{data.name}</div>
                  <div style={{ fontFamily: font.body, fontSize: 11, color: C.gold, marginTop: 2, letterSpacing: 2 }}>MARKETING PARTNER</div>
                </div>
                {[["clients","◈","My Clients"],["managers","👥","Account Managers"],["analytics","📊","Analytics"]].map(([id,ico,label]) => (
                  <button key={id} onClick={() => { setTab(id); setMenuOpen(false); setSelectedBusiness(null); }}
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

        {/* CLIENT DETAIL VIEW */}
        {selectedBusiness && (
          <div className="fade-up">
            <button onClick={() => { setSelectedBusiness(null); setSelectedBizTab("analytics"); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: C.gold, cursor: "pointer", fontFamily: font.body, fontSize: 15, marginBottom: 24, padding: 0 }}>
              ← Back to Clients
            </button>
            <div style={{ ...card, marginBottom: 24, padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 22, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{selectedBusiness.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font.display, fontSize: 22, color: C.text, fontWeight: 600 }}>{selectedBusiness.name}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted, marginTop: 4 }}>{selectedBusiness.email}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: C.gold }}>{messages.filter(m => m.business_id === selectedBusiness.id).length}</div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>total texts sent</div>
                </div>
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                <Label>Assigned Account Manager</Label>
                <select style={{ ...inputStyle, marginTop: 4 }}
                  value={selectedBusiness.account_manager_id || ""}
                  onChange={e => assignToManager(selectedBusiness.id, e.target.value)}>
                  <option value="">Unassigned</option>
                  {accountManagers.map(am => <option key={am.id} value={am.id}>{am.name}</option>)}
                </select>
              </div>

              {/* Feature toggles */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <Label>Enabled Features</Label>
                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  {[["photos","📸 Photos"],["analytics","📊 Analytics"]].map(([key, label]) => {
                    const isOn = (selectedBusiness.features || {})[key] || false;
                    return (
                      <button key={key} onClick={async () => {
                        const currentFeatures = selectedBusiness.features || { reviews: true, photos: false, analytics: false };
                        const newFeatures = { ...currentFeatures, [key]: !isOn };
                        await supabase.from("businesses").update({ features: newFeatures }).eq("id", selectedBusiness.id);
                        setSelectedBusiness(b => ({ ...b, features: newFeatures }));
                        loadData();
                      }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, border: `1.5px solid ${isOn ? C.green : C.border}`, background: isOn ? C.greenBg : C.bg, color: isOn ? C.green : C.textMuted, fontFamily: font.body, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                        <span>{isOn ? "✅" : "🔒"}</span> {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 2, marginBottom: 24, background: C.surface, borderRadius: 10, padding: 4, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              {[["analytics","📊 Analytics"],["photos","📸 Photos"],["bulk","📤 Bulk Send"],["history","📋 History"]].map(([id, label]) => (
                <button key={id} onClick={() => setSelectedBizTab(id)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: selectedBizTab === id ? C.gold : "none", color: selectedBizTab === id ? "#fff" : C.textMuted, fontFamily: font.body, fontSize: 13, fontWeight: selectedBizTab === id ? 600 : 400, cursor: "pointer", minWidth: 80 }}>
                  {label}
                </button>
              ))}
            </div>

            {selectedBizTab === "analytics" && (() => {
              const bizMsgs = messages.filter(m => m.business_id === selectedBusiness.id);
              const now = new Date();
              const thisMonth = bizMsgs.filter(m => { const d = new Date(m.sent_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
              const lastMonth = bizMsgs.filter(m => { const d = new Date(m.sent_at); const lm = new Date(now.getFullYear(), now.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
              const googleCount = bizMsgs.filter(m => m.platform === "Google").length;
              const yelpCount = bizMsgs.filter(m => m.platform === "Yelp").length;
              const total = bizMsgs.length;
              const growth = lastMonth.length > 0 ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100) : 0;
              return (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                    {[
                      { value: total, label: "Total Sent", color: C.gold },
                      { value: thisMonth.length, label: "This Month", sub: lastMonth.length > 0 ? `${growth >= 0 ? "+" : ""}${growth}% vs last month` : "", color: growth >= 0 ? C.green : "#e74c3c" },
                      { value: googleCount, label: "Google Sent", color: "#4A90D9" },
                    ].map((s, i) => (
                      <div key={i} style={{ ...card, padding: "16px", textAlign: "center" }}>
                        <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginTop: 6 }}>{s.label}</div>
                        {s.sub && <div style={{ fontFamily: font.body, fontSize: 11, color: s.color, marginTop: 3 }}>{s.sub}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>Platform Split</div>
                    {[{ label: "Google", count: googleCount, color: "#4A90D9" }, { label: "Yelp", count: yelpCount, color: "#C0392B" }].map(p => (
                      <div key={p.label} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontFamily: font.body, fontSize: 14, color: C.text }}>{p.label}</span>
                          <span style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted }}>{p.count} ({total > 0 ? Math.round((p.count / total) * 100) : 0}%)</span>
                        </div>
                        <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${total > 0 ? Math.round((p.count / total) * 100) : 0}%`, background: p.color, borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                    {total === 0 && <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, textAlign: "center", padding: 20 }}>No messages sent yet.</div>}
                  </div>
                </div>
              );
            })()}

            {selectedBizTab === "photos" && (
              <PhotosTab businessId={selectedBusiness.id} businessName={selectedBusiness.name} isMarketing={true} onStatusChange={loadData} />
            )}

            {selectedBizTab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.filter(m => m.business_id === selectedBusiness.id).map((msg, i) => (
                  <div key={i} style={{ ...card, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{msg.customer_name.charAt(0)}</div>
                        <div>
                          <div style={{ fontFamily: font.display, fontSize: 15, color: C.text, fontWeight: 600 }}>{msg.customer_name}</div>
                          <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{msg.customer_phone}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: font.body, fontSize: 11, padding: "3px 10px", borderRadius: 99, background: C.greenBg, color: C.green, border: `1px solid ${C.green}33`, fontWeight: 600 }}>Delivered</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: font.body, fontSize: 12, padding: "3px 10px", borderRadius: 99, background: msg.platform === "Google" ? "#4A90D918" : "#C0392B18", color: msg.platform === "Google" ? "#4A90D9" : "#e74c3c", border: `1px solid ${msg.platform === "Google" ? "#4A90D933" : "#C0392B33"}`, fontWeight: 600 }}>{msg.platform}</span>
                      <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>{new Date(msg.sent_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {messages.filter(m => m.business_id === selectedBusiness.id).length === 0 && (
                  <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No messages sent yet.</div>
                )}
              </div>
            )}

            {selectedBizTab === "bulk" && (
              <BulkSendTab business={selectedBusiness} onComplete={loadData} />
            )}
          </div>
        )}

        {/* CLIENTS LIST */}
        {!selectedBusiness && tab === "clients" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <PageHeader title="My Clients" sub={`${businesses.length} businesses`} />
              <button onClick={() => setShowAdd(true)} style={{ ...btnStyle, marginTop: 8 }}>+ Add Client</button>
            </div>

            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 20 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: C.textMuted }}>🔍</span>
              <input
                style={{ ...inputStyle, paddingLeft: 42 }}
                placeholder="Search by business name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
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
              {businesses.filter(b =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.email.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(b => {
                const bizMsgs = messages.filter(m => m.business_id === b.id);
                const thisMonth = bizMsgs.filter(m => { const d = new Date(m.sent_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
                const isActive = thisMonth.length > 0;
                const assignedAM = accountManagers.find(am => am.id === b.account_manager_id);
                return (
                  <div key={b.id} onClick={() => { setSelectedBusiness(b); setSelectedBizTab("analytics"); }}
                    style={{ ...card, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ position: "relative" }}>
                          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 18, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{b.name.charAt(0)}</div>
                          {pendingPhotosByBiz[b.id] > 0 && (
                            <div style={{ position: "absolute", top: -4, right: -4, background: "#E85D04", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 10, fontWeight: "bold", border: "2px solid #0D1117" }}>
                              {pendingPhotosByBiz[b.id] > 9 ? "9+" : pendingPhotosByBiz[b.id]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontFamily: font.display, fontSize: 16, color: C.text, fontWeight: 600 }}>{b.name}</div>
                          <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted, marginTop: 3 }}>{b.email}</div>
                          {assignedAM && <div style={{ fontFamily: font.body, fontSize: 12, color: C.gold, marginTop: 3 }}>👤 {assignedAM.name}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontFamily: font.body, fontSize: 11, padding: "3px 10px", borderRadius: 99, background: isActive ? C.greenBg : "#FFF3CD", color: isActive ? C.green : "#856404", border: `1px solid ${isActive ? C.green + "33" : "#FFC10733"}`, fontWeight: 600 }}>{isActive ? "Active" : "Inactive"}</span>
                          <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginTop: 6 }}>{bizMsgs.length} texts · {thisMonth.length} this month</div>
                        </div>
                        <span style={{ color: C.textMuted, fontSize: 20 }}>›</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {businesses.filter(b =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.email.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>{searchQuery ? `No clients found for "${searchQuery}"` : "No clients yet. Add one above!"}</div>}
            </div>
          </div>
        )}

        {/* ACCOUNT MANAGERS */}
        {!selectedBusiness && tab === "managers" && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
              <PageHeader title="Account Managers" sub={`${accountManagers.length} managers`} />
              <button onClick={() => setShowAddAM(true)} style={{ ...btnStyle, marginTop: 8 }}>+ Add Manager</button>
            </div>
            {showAddAM && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontFamily: font.display, fontSize: 18, marginBottom: 20, color: C.text }}>New Account Manager</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div><Label>Full Name</Label><input style={inputStyle} value={newAM.name} onChange={e => setNewAM(d => ({...d, name: e.target.value}))} placeholder="John Smith" /></div>
                  <div><Label>Email</Label><input style={inputStyle} value={newAM.email} onChange={e => setNewAM(d => ({...d, email: e.target.value}))} placeholder="john@yourcompany.com" /></div>
                </div>
                <p style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, marginBottom: 16 }}>⚠️ After adding, create their login password in Supabase Authentication.</p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={addAccountManager} disabled={saving} style={{ ...btnStyle }}>{saving ? "Saving…" : "Add Manager"}</button>
                  <button onClick={() => setShowAddAM(false)} style={{ ...ghostBtnStyle }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {accountManagers.map(am => {
                const assignedClients = businesses.filter(b => b.account_manager_id === am.id);
                return (
                  <div key={am.id} style={{ ...card, padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 18, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{am.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontFamily: font.display, fontSize: 16, color: C.text, fontWeight: 600 }}>{am.name}</div>
                          <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted, marginTop: 3 }}>{am.email}</div>
                          <div style={{ fontFamily: font.body, fontSize: 12, color: C.gold, marginTop: 3 }}>{assignedClients.length} clients assigned</div>
                        </div>
                      </div>
                      <button onClick={() => removeAccountManager(am.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontFamily: font.body, fontSize: 13 }}>Remove</button>
                    </div>
                    {assignedClients.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 2, color: C.textSub, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>Assigned Clients</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {assignedClients.map(b => (
                            <span key={b.id} style={{ fontFamily: font.body, fontSize: 13, padding: "4px 12px", borderRadius: 99, background: C.surfaceHover, border: `1px solid ${C.border}`, color: C.text }}>{b.name}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {accountManagers.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No account managers yet. Add one above!</div>}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {!selectedBusiness && tab === "analytics" && (
          <div className="fade-up">
            <PageHeader title="Analytics" sub="Performance across all your clients" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { value: messages.length, label: "Total Texts Sent", color: C.gold },
                { value: businesses.length, label: "Total Clients", color: C.green },
                { value: messages.filter(m => { const d = new Date(m.sent_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length, label: "Sent This Month", color: "#4A90D9" },
              ].map((s, i) => (
                <div key={i} style={{ ...card, padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>Client Activity</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {businesses.map(biz => {
                  const bizMessages = messages.filter(m => m.business_id === biz.id);
                  const thisMonth = bizMessages.filter(m => { const d = new Date(m.sent_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
                  const isActive = thisMonth.length > 0;
                  const maxMsgs = Math.max(...businesses.map(b => messages.filter(m => m.business_id === b.id).length), 1);
                  return (
                    <div key={biz.id} onClick={() => { setSelectedBusiness(biz); setSelectedBizTab("analytics"); setTab("clients"); }} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontFamily: font.display, fontSize: 14, color: C.text, fontWeight: 600 }}>{biz.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: font.body, fontSize: 12, fontWeight: 600, color: C.text }}>{bizMessages.length} total</span>
                          <span style={{ fontFamily: font.body, fontSize: 11, padding: "3px 10px", borderRadius: 99, background: isActive ? C.greenBg : "#FFF3CD", color: isActive ? C.green : "#856404", border: `1px solid ${isActive ? C.green + "33" : "#FFC10733"}`, fontWeight: 600 }}>{isActive ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round((bizMessages.length / maxMsgs) * 100)}%`, background: `linear-gradient(90deg, ${C.gold}, #0d3d8a)`, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
                {businesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 20 }}>No clients yet.</div>}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}


// ── ACCOUNT MANAGER DASHBOARD ─────────────────────────────────────────────────
function AccountManagerDashboard({ data, onSignOut }) {
  const [businesses, setBusinesses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pendingPhotosByBiz, setPendingPhotosByBiz] = useState({});
  const [tab, setTab] = useState("clients");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedBizTab, setSelectedBizTab] = useState("analytics");
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    loadData();
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadData = async () => {
    const { data: biz } = await supabase.from("businesses").select("*").eq("account_manager_id", data.id).order("created_at", { ascending: false });
    if (biz) {
      setBusinesses(biz);
      const ids = biz.map(b => b.id);
      if (ids.length > 0) {
        const { data: msgs } = await supabase.from("messages").select("*").in("business_id", ids).order("sent_at", { ascending: false });
        if (msgs) setMessages(msgs);
        const { data: photos } = await supabase.from("photos").select("business_id, status").in("business_id", ids).eq("status", "pending");
        if (photos) {
          const counts = {};
          photos.forEach(p => { counts[p.business_id] = (counts[p.business_id] || 0) + 1; });
          setPendingPhotosByBiz(counts);
        }
      }
    }
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
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, minWidth: 230, overflow: "hidden", boxShadow: "0 12px 40px rgba(13,17,23,0.12)" }}>
                <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: font.display, fontSize: 14, color: C.text }}>{data.name}</div>
                  <div style={{ fontFamily: font.body, fontSize: 11, color: C.gold, marginTop: 3, letterSpacing: 2 }}>ACCOUNT MANAGER</div>
                </div>
                {[["clients","◈","My Clients"],["analytics","📊","Analytics"]].map(([id,ico,label]) => (
                  <button key={id} onClick={() => { setTab(id); setMenuOpen(false); setSelectedBusiness(null); }}
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

        {/* CLIENT DETAIL VIEW */}
        {selectedBusiness && (
          <div className="fade-up">
            <button onClick={() => { setSelectedBusiness(null); setSelectedBizTab("analytics"); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: C.gold, cursor: "pointer", fontFamily: font.body, fontSize: 15, marginBottom: 24, padding: 0 }}>
              ← Back to Clients
            </button>
            <div style={{ ...card, marginBottom: 24, padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 22, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{selectedBusiness.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font.display, fontSize: 22, color: C.text, fontWeight: 600 }}>{selectedBusiness.name}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted, marginTop: 4 }}>{selectedBusiness.email}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: C.gold }}>{messages.filter(m => m.business_id === selectedBusiness.id).length}</div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>total texts sent</div>
                </div>
              </div>

              {/* Feature toggles */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <Label>Enabled Features</Label>
                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  {[["photos","📸 Photos"],["analytics","📊 Analytics"]].map(([key, label]) => {
                    const isOn = (selectedBusiness.features || {})[key] || false;
                    return (
                      <button key={key} onClick={async () => {
                        const currentFeatures = selectedBusiness.features || { reviews: true, photos: false, analytics: false };
                        const newFeatures = { ...currentFeatures, [key]: !isOn };
                        await supabase.from("businesses").update({ features: newFeatures }).eq("id", selectedBusiness.id);
                        setSelectedBusiness(b => ({ ...b, features: newFeatures }));
                        loadData();
                      }}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, border: `1.5px solid ${isOn ? C.green : C.border}`, background: isOn ? C.greenBg : C.bg, color: isOn ? C.green : C.textMuted, fontFamily: font.body, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                        <span>{isOn ? "✅" : "🔒"}</span> {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 2, marginBottom: 24, background: C.surface, borderRadius: 10, padding: 4, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
              {[["analytics","📊 Analytics"],["photos","📸 Photos"],["bulk","📤 Bulk Send"],["history","📋 History"]].map(([id, label]) => {
                const pendingCount = id === "photos" ? (pendingPhotosByBiz[selectedBusiness.id] || 0) : 0;
                return (
                  <button key={id} onClick={() => setSelectedBizTab(id)}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: selectedBizTab === id ? C.gold : "none", color: selectedBizTab === id ? "#fff" : C.textMuted, fontFamily: font.body, fontSize: 13, fontWeight: selectedBizTab === id ? 600 : 400, cursor: "pointer", position: "relative", minWidth: 80 }}>
                    {label}
                    {pendingCount > 0 && (
                      <span style={{ position: "absolute", top: 4, right: 8, background: "#E85D04", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 9, fontWeight: "bold", border: "2px solid #0D1117" }}>
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedBizTab === "analytics" && (() => {
              const bizMsgs = messages.filter(m => m.business_id === selectedBusiness.id);
              const now = new Date();
              const thisMonth = bizMsgs.filter(m => { const d = new Date(m.sent_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
              const lastMonth = bizMsgs.filter(m => { const d = new Date(m.sent_at); const lm = new Date(now.getFullYear(), now.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
              const googleCount = bizMsgs.filter(m => m.platform === "Google").length;
              const yelpCount = bizMsgs.filter(m => m.platform === "Yelp").length;
              const total = bizMsgs.length;
              const growth = lastMonth.length > 0 ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100) : 0;
              return (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                    {[
                      { value: total, label: "Total Sent", color: C.gold },
                      { value: thisMonth.length, label: "This Month", sub: lastMonth.length > 0 ? `${growth >= 0 ? "+" : ""}${growth}% vs last month` : "", color: growth >= 0 ? C.green : "#e74c3c" },
                      { value: googleCount, label: "Google Sent", color: "#4A90D9" },
                    ].map((s, i) => (
                      <div key={i} style={{ ...card, padding: "16px", textAlign: "center" }}>
                        <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginTop: 6 }}>{s.label}</div>
                        {s.sub && <div style={{ fontFamily: font.body, fontSize: 11, color: s.color, marginTop: 3 }}>{s.sub}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>Platform Split</div>
                    {[{ label: "Google", count: googleCount, color: "#4A90D9" }, { label: "Yelp", count: yelpCount, color: "#C0392B" }].map(p => (
                      <div key={p.label} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontFamily: font.body, fontSize: 14, color: C.text }}>{p.label}</span>
                          <span style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted }}>{p.count} ({total > 0 ? Math.round((p.count / total) * 100) : 0}%)</span>
                        </div>
                        <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${total > 0 ? Math.round((p.count / total) * 100) : 0}%`, background: p.color, borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                    {total === 0 && <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, textAlign: "center", padding: 20 }}>No messages sent yet.</div>}
                  </div>
                </div>
              );
            })()}

            {selectedBizTab === "photos" && (
              <PhotosTab businessId={selectedBusiness.id} businessName={selectedBusiness.name} isMarketing={true} onStatusChange={loadData} />
            )}

            {selectedBizTab === "history" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.filter(m => m.business_id === selectedBusiness.id).map((msg, i) => (
                  <div key={i} style={{ ...card, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{msg.customer_name.charAt(0)}</div>
                        <div>
                          <div style={{ fontFamily: font.display, fontSize: 15, color: C.text, fontWeight: 600 }}>{msg.customer_name}</div>
                          <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{msg.customer_phone}</div>
                        </div>
                      </div>
                      <span style={{ fontFamily: font.body, fontSize: 11, padding: "3px 10px", borderRadius: 99, background: C.greenBg, color: C.green, border: `1px solid ${C.green}33`, fontWeight: 600 }}>Delivered</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: font.body, fontSize: 12, padding: "3px 10px", borderRadius: 99, background: msg.platform === "Google" ? "#4A90D918" : "#C0392B18", color: msg.platform === "Google" ? "#4A90D9" : "#e74c3c", border: `1px solid ${msg.platform === "Google" ? "#4A90D933" : "#C0392B33"}`, fontWeight: 600 }}>{msg.platform}</span>
                      <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>{new Date(msg.sent_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
                {messages.filter(m => m.business_id === selectedBusiness.id).length === 0 && (
                  <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No messages yet.</div>
                )}
              </div>
            )}

            {selectedBizTab === "bulk" && (
              <BulkSendTab business={selectedBusiness} onComplete={loadData} />
            )}
          </div>
        )}

        {/* CLIENTS LIST */}
        {!selectedBusiness && tab === "clients" && (
          <div className="fade-up">
            <PageHeader title="My Clients" sub={`${businesses.length} businesses assigned to you`} />

            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 20 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: C.textMuted }}>🔍</span>
              <input
                style={{ ...inputStyle, paddingLeft: 42 }}
                placeholder="Search by business name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {businesses.filter(b =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.email.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(b => {
                const bizMsgs = messages.filter(m => m.business_id === b.id);
                const thisMonth = bizMsgs.filter(m => { const d = new Date(m.sent_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
                const isActive = thisMonth.length > 0;
                return (
                  <div key={b.id} onClick={() => { setSelectedBusiness(b); setSelectedBizTab("analytics"); }}
                    style={{ ...card, padding: "20px 24px", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ position: "relative" }}>
                          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>{b.name.charAt(0)}</div>
                          {pendingPhotosByBiz[b.id] > 0 && (
                            <div style={{ position: "absolute", top: -4, right: -4, background: "#E85D04", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 10, fontWeight: "bold", border: "2px solid #0D1117" }}>
                              {pendingPhotosByBiz[b.id] > 9 ? "9+" : pendingPhotosByBiz[b.id]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontFamily: font.display, fontSize: 16, color: C.text, fontWeight: 600 }}>{b.name}</div>
                          <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted, marginTop: 3 }}>{b.email}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontFamily: font.body, fontSize: 11, padding: "3px 10px", borderRadius: 99, background: isActive ? C.greenBg : "#FFF3CD", color: isActive ? C.green : "#856404", border: `1px solid ${isActive ? C.green + "33" : "#FFC10733"}`, fontWeight: 600 }}>{isActive ? "Active" : "Inactive"}</span>
                          <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginTop: 6 }}>{bizMsgs.length} texts · {thisMonth.length} this month</div>
                        </div>
                        <span style={{ color: C.textMuted, fontSize: 20 }}>›</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {businesses.filter(b =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.email.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>{searchQuery ? `No clients found for "${searchQuery}"` : "No clients assigned yet. Contact your manager to get clients assigned."}</div>}
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {!selectedBusiness && tab === "analytics" && (
          <div className="fade-up">
            <PageHeader title="Analytics" sub="Performance across your assigned clients" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { value: messages.length, label: "Total Texts Sent", color: C.gold },
                { value: businesses.length, label: "Assigned Clients", color: "#4A90D9" },
                { value: messages.filter(m => { const d = new Date(m.sent_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length, label: "Sent This Month", color: C.green },
              ].map((s, i) => (
                <div key={i} style={{ ...card, padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, marginTop: 8 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 20, fontWeight: 700 }}>Client Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {businesses.map(biz => {
                  const bizMessages = messages.filter(m => m.business_id === biz.id);
                  const thisMonth = bizMessages.filter(m => { const d = new Date(m.sent_at); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
                  const isActive = thisMonth.length > 0;
                  const maxMsgs = Math.max(...businesses.map(b => messages.filter(m => m.business_id === b.id).length), 1);
                  return (
                    <div key={biz.id} onClick={() => { setSelectedBusiness(biz); setSelectedBizTab("analytics"); setTab("clients"); }} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontFamily: font.display, fontSize: 14, color: C.text, fontWeight: 600 }}>{biz.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontFamily: font.body, fontSize: 12, fontWeight: 600, color: C.text }}>{bizMessages.length} total</span>
                          <span style={{ fontFamily: font.body, fontSize: 11, padding: "3px 10px", borderRadius: 99, background: isActive ? C.greenBg : "#FFF3CD", color: isActive ? C.green : "#856404", border: `1px solid ${isActive ? C.green + "33" : "#FFC10733"}`, fontWeight: 600 }}>{isActive ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round((bizMessages.length / maxMsgs) * 100)}%`, background: `linear-gradient(90deg, ${C.gold}, #0d3d8a)`, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
                {businesses.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 20 }}>No clients assigned yet.</div>}
              </div>
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
  const [settings, setSettings] = useState(data);
  const [editingSettings, setEditingSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState(data);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("google");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [log, setLog] = useState([]);
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);

  useEffect(() => { loadMessages(); loadPendingPhotos(); }, []);

  const loadMessages = async () => {
    const { data: msgs } = await supabase.from("messages").select("*").eq("business_id", data.id).order("sent_at", { ascending: false });
    if (msgs) setLog(msgs);
  };

  const loadPendingPhotos = async () => {
    const { data: photos } = await supabase.from("photos").select("id").eq("business_id", data.id).eq("status", "pending");
    if (photos) setPendingPhotoCount(photos.length);
  };

  const formatPhone = (raw) => "+1" + raw.replace(/\D/g, "");

  const handleSend = async () => {
    if (!phone || !customerName) return;
    setSending(true);
    const link = platform === "google" ? settings.google_link : settings.yelp_link;
    const message = (settings.message_template || "")
      .replace("{name}", customerName)
      .replace("{business}", settings.name)
      .replace("{link}", link);
    try {
      const endpoint = settings.logo_url ? "/send-mms" : "/send-sms";
      const body = settings.logo_url
        ? JSON.stringify({ to: formatPhone(phone), message, mediaUrl: settings.logo_url })
        : JSON.stringify({ to: formatPhone(phone), message });
      const response = await fetch(`https://reviewsend-server-production.up.railway.app${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
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
      } else { alert("Failed to send: " + result.error); }
    } catch (err) { alert("Could not reach the server."); }
    setSending(false);
  };

  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    const fileName = `${data.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from("business-logos").upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(fileName);
      const logoUrl = urlData.publicUrl;
      await supabase.from("businesses").update({ logo_url: logoUrl }).eq("id", data.id);
      setSettings(s => ({ ...s, logo_url: logoUrl }));
    }
    setLogoUploading(false);
  };

  const removeLogo = async () => {
    await supabase.from("businesses").update({ logo_url: null }).eq("id", data.id);
    setSettings(s => ({ ...s, logo_url: null }));
  };
    await supabase.from("businesses").update({
      name: draftSettings.name, google_link: draftSettings.google_link,
      yelp_link: draftSettings.yelp_link, message_template: draftSettings.message_template,
    }).eq("id", data.id);
    setSettings({ ...draftSettings });
    setEditingSettings(false);
  };

  const features = settings.features || { reviews: true, photos: false, analytics: false };

  const navItems = [
    { id: "send", icon: "✉", label: "Send" },
    { id: "photos", icon: "📸", label: "Photos", locked: !features.photos },
    { id: "log", icon: "📋", label: "History" },
    { id: "analytics", icon: "📊", label: "Analytics", locked: !features.analytics },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{globalCSS}</style>

      {/* Top bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontFamily: font.body, fontSize: 12, letterSpacing: 5, color: C.gold }}>★ REVIEWSEND</div>
        <div style={{ fontFamily: font.display, fontSize: 14, color: C.text, fontWeight: 600 }}>{settings.name}</div>
        <button onClick={onSignOut} style={{ background: "none", border: "none", fontFamily: font.body, fontSize: 13, color: C.textMuted, cursor: "pointer" }}>Sign out</button>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {/* SEND */}
        {tab === "send" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 24px", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text }}>Send a Review Request</div>
              <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, marginTop: 4 }}>Text a customer a direct link</div>
            </div>
            <div style={card}>
              <div style={{ marginBottom: 16 }}>
                <Label>Customer Name</Label>
                <input style={inputStyle} placeholder="e.g. Sarah" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Label>Phone Number</Label>
                <input style={inputStyle} placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
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

            {/* Locked features widget */}
            {(!features.photos || !features.analytics) && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.surfaceHover, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🔒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: font.display, fontSize: 13, fontWeight: 600, color: C.text }}>Features Locked</div>
                  <div style={{ fontFamily: font.body, fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                    {[!features.photos && "Photos", !features.analytics && "Analytics"].filter(Boolean).join(" & ")} not enabled on your plan
                  </div>
                </div>
                <div style={{ fontFamily: font.body, fontSize: 11, color: C.gold, fontWeight: 600, background: C.surfaceHover, border: `1px solid ${C.border}`, borderRadius: 99, padding: "5px 10px", whiteSpace: "nowrap", cursor: "pointer" }}>Contact Manager</div>
              </div>
            )}
          </div>
        )}

        {/* PHOTOS */}
        {tab === "photos" && (
          <div style={{ position: "absolute", inset: 0, overflowY: features.photos ? "auto" : "hidden", padding: "20px 24px 20px" }}>
            {features.photos ? (
              <PhotosTab businessId={data.id} businessName={settings.name} />
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📸</div>
                <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 8 }}>Photos Not Enabled</div>
                <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>Photo uploads are not included in your current plan. Contact your account manager to unlock this feature.</div>
                <button style={{ ...btnStyle, width: "auto", padding: "12px 28px" }}>Contact Your Manager</button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === "log" && (
          <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text }}>Message History</div>
              <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, marginTop: 4 }}>{log.length} messages sent</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {log.map((row, i) => (
                <div key={i} style={{ ...card, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, color: C.gold, fontFamily: font.display, fontSize: 15, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{row.customer_name.charAt(0)}</div>
                      <div>
                        <div style={{ fontFamily: font.display, fontSize: 15, color: C.text, fontWeight: 600 }}>{row.customer_name}</div>
                        <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textMuted }}>{row.customer_phone}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: font.body, fontSize: 11, padding: "3px 10px", borderRadius: 99, background: C.greenBg, color: C.green, border: `1px solid ${C.green}33`, fontWeight: 600 }}>Delivered</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: font.body, fontSize: 12, padding: "3px 10px", borderRadius: 99, background: row.platform === "Google" ? "#4A90D918" : "#C0392B18", color: row.platform === "Google" ? "#4A90D9" : "#e74c3c", border: `1px solid ${row.platform === "Google" ? "#4A90D933" : "#C0392B33"}`, fontWeight: 600 }}>{row.platform}</span>
                    <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted }}>{new Date(row.sent_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {log.length === 0 && <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>No messages sent yet.</div>}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "20px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text }}>Settings</div>
              <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, marginTop: 4 }}>Manage your business profile</div>
            </div>
            <div style={{ ...card, maxWidth: 520, margin: "0 auto" }}>
              {[
                { label: "Business Name", key: "name", placeholder: "Your Business Name" },
                { label: "Google Review Link", key: "google_link", placeholder: "https://g.page/r/..." },
                { label: "Yelp Review Link", key: "yelp_link", placeholder: "https://www.yelp.com/biz/..." },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <Label>{f.label}</Label>
                  <input style={{ ...inputStyle, ...(editingSettings ? {} : { opacity: 0.5 }) }}
                    value={editingSettings ? draftSettings[f.key] : settings[f.key]}
                    placeholder={f.placeholder} disabled={!editingSettings}
                    onChange={e => setDraftSettings(d => ({ ...d, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <Label>Message Template</Label>
                <textarea rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.6, ...(editingSettings ? {} : { opacity: 0.5 }) }}
                  value={editingSettings ? draftSettings.message_template : settings.message_template}
                  disabled={!editingSettings}
                  onChange={e => setDraftSettings(d => ({ ...d, message_template: e.target.value }))} />
              </div>

              {/* Logo upload */}
              <div style={{ marginBottom: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <Label>Business Logo</Label>
                <p style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                  Your logo will automatically be sent with every review request as an image message.
                </p>
                {settings.logo_url ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: C.surfaceHover, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <img src={settings.logo_url} alt="Logo" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "contain", background: "#fff", border: `1px solid ${C.border}` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.display, fontSize: 14, color: C.text, fontWeight: 600 }}>Logo uploaded ✅</div>
                      <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginTop: 2 }}>Sent with every review request</div>
                    </div>
                    <button onClick={removeLogo} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontFamily: font.body, fontSize: 13 }}>Remove</button>
                  </div>
                ) : (
                  <div>
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" style={{ display: "none" }} />
                    <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                      style={{ ...ghostBtnStyle, width: "100%", textAlign: "center" }}>
                      {logoUploading ? "Uploading…" : "🖼️ Upload Business Logo"}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {editingSettings ? (
                  <>
                    <button onClick={saveSettings} style={{ ...btnStyle, flex: 1 }}>Save</button>
                    <button onClick={() => { setDraftSettings({ ...settings }); setEditingSettings(false); }} style={{ ...ghostBtnStyle, flex: 1 }}>Cancel</button>
                  </>
                ) : (
                  <button onClick={() => { setDraftSettings({ ...settings }); setEditingSettings(true); }}
                    style={{ flex: 1, padding: "13px", background: "none", border: `1px solid #1A5FBF88`, borderRadius: 10, color: "#1A5FBF", cursor: "pointer", fontFamily: font.body, fontSize: 15 }}>
                    Edit Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          features.analytics ? (
            <AnalyticsTab log={log} businessName={settings.name} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📊</div>
              <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 8 }}>Analytics Not Enabled</div>
              <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, lineHeight: 1.6, marginBottom: 24 }}>The analytics dashboard is not included in your current plan. Contact your account manager to unlock this feature.</div>
              <button style={{ ...btnStyle, width: "auto", padding: "12px 28px" }}>Contact Your Manager</button>
            </div>
          )
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => { setTab(item.id); if (item.id === "photos") loadPendingPhotos(); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer", gap: 4, transition: "all 0.15s", position: "relative", opacity: item.locked ? 0.4 : 1 }}>
            {item.locked && <span style={{ position: "absolute", top: 4, right: "18%", fontSize: 8, color: C.textMuted }}>🔒</span>}
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              {item.id === "photos" && pendingPhotoCount > 0 && (
                <div style={{ position: "absolute", top: -6, right: -8, background: "#E85D04", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 10, fontWeight: "bold", border: "2px solid #0D1117" }}>
                  {pendingPhotoCount > 9 ? "9+" : pendingPhotoCount}
                </div>
              )}
            </div>
            <span style={{ fontFamily: font.body, fontSize: 11, fontWeight: tab === item.id ? 700 : 400, color: tab === item.id ? C.gold : C.textMuted, letterSpacing: 0.5 }}>{item.label}</span>
            {tab === item.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.gold, marginTop: 2 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── BULK SEND TAB ─────────────────────────────────────────────────────────────
function BulkSendTab({ business, onComplete }) {
  const [step, setStep] = useState("upload"); // upload | preview | sending | done
  const [contacts, setContacts] = useState([]);
  const [platform, setPlatform] = useState("google");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ sent: 0, failed: 0 });
  const fileInputRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const parsed = [];
    lines.forEach((line, i) => {
      if (i === 0 && line.toLowerCase().includes("name")) return; // skip header
      const parts = line.split(",");
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const phone = parts[1].trim().replace(/\D/g, "");
        const valid = phone.length >= 10;
        parsed.push({ name, phone, valid, id: i });
      }
    });
    return parsed;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setContacts(parsed);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const removeContact = (id) => {
    setContacts(c => c.filter(x => x.id !== id));
  };

  const handleBulkSend = async () => {
    setSending(true);
    setStep("sending");
    const validContacts = contacts.filter(c => c.valid);
    let sent = 0, failed = 0;
    const link = platform === "google" ? business.google_link : business.yelp_link;

    for (let i = 0; i < validContacts.length; i++) {
      const contact = validContacts[i];
      const message = (business.message_template || "Hi {name}! Thanks for visiting {business}. Leave us a review here: {link} 🙏")
        .replace("{name}", contact.name)
        .replace("{business}", business.name)
        .replace("{link}", link);
      const endpoint = business.logo_url ? "/send-mms" : "/send-sms";
      const bodyData = business.logo_url
        ? JSON.stringify({ to: "+1" + contact.phone, message, mediaUrl: business.logo_url })
        : JSON.stringify({ to: "+1" + contact.phone, message });
      try {
        const response = await fetch(`https://reviewsend-server-production.up.railway.app${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyData,
        });
        const result = await response.json();
        if (result.success) {
          await supabase.from("messages").insert([{
            business_id: business.id,
            customer_name: contact.name,
            customer_phone: "+1" + contact.phone,
            platform: platform === "google" ? "Google" : "Yelp",
          }]);
          sent++;
        } else { failed++; }
      } catch { failed++; }
      setProgress(Math.round(((i + 1) / validContacts.length) * 100));
      await new Promise(r => setTimeout(r, 300)); // small delay between sends
    }

    await supabase.from("bulk_sends").insert([{
      business_id: business.id,
      sent_by: "account_manager",
      total_contacts: validContacts.length,
      sent_count: sent,
      failed_count: failed,
      platform: platform === "google" ? "Google" : "Yelp",
    }]);

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

  const validCount = contacts.filter(c => c.valid).length;
  const invalidCount = contacts.filter(c => !c.valid).length;

  return (
    <div>
      {/* UPLOAD STEP */}
      {step === "upload" && (
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>📤 Bulk Send Review Requests</div>
            <p style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
              Upload a CSV file with customer names and phone numbers. Everyone on the list will automatically receive a review request text for {business.name}.
            </p>

            <div style={{ marginBottom: 16 }}>
              <Label>Review Platform</Label>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, border: `1.5px solid ${platform === p.id ? p.color : C.border}`, background: platform === p.id ? p.color + "18" : C.bg, cursor: "pointer", fontFamily: font.body, fontSize: 15, color: platform === p.id ? p.color : C.textMuted, fontWeight: platform === p.id ? 600 : 400 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: p.color, color: "#fff", fontSize: 12, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btnStyle, marginBottom: 12 }}>
              📂 Upload CSV File
            </button>
          </div>

          <div style={{ ...card, background: C.surfaceHover }}>
            <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>CSV Format Required</div>
            
            {/* Spreadsheet mockup */}
            <div style={{ border: `1px solid #C8D5E8`, borderRadius: 8, overflow: "hidden", marginBottom: 14, fontSize: 13, fontFamily: font.mono }}>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", background: "#E2EBF5", borderBottom: "1px solid #C8D5E8" }}>
                <div style={{ padding: "7px 8px", borderRight: "1px solid #C8D5E8", color: C.textSub, fontSize: 11, textAlign: "center" }}></div>
                <div style={{ padding: "7px 12px", borderRight: "1px solid #C8D5E8", color: C.gold, fontWeight: 700, letterSpacing: 1 }}>A</div>
                <div style={{ padding: "7px 12px", color: C.gold, fontWeight: 700, letterSpacing: 1 }}>B</div>
              </div>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", background: "#EEF3FA", borderBottom: "1px solid #C8D5E8" }}>
                <div style={{ padding: "7px 8px", borderRight: "1px solid #C8D5E8", color: C.textSub, fontSize: 11, textAlign: "center", background: "#E2EBF5" }}>1</div>
                <div style={{ padding: "7px 12px", borderRight: "1px solid #C8D5E8", color: C.gold, fontWeight: 700 }}>Name</div>
                <div style={{ padding: "7px 12px", color: C.gold, fontWeight: 700 }}>Phone</div>
              </div>
              {/* Data rows */}
              {[["Sarah Johnson","9545551234"],["John Smith","3054449876"],["Maria Garcia","7865553210"]].map(([name, phone], i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr", borderBottom: i < 2 ? "1px solid #C8D5E8" : "none", background: i % 2 === 0 ? "#fff" : "#F9FBFE" }}>
                  <div style={{ padding: "7px 8px", borderRight: "1px solid #C8D5E8", color: C.textSub, fontSize: 11, textAlign: "center", background: "#E2EBF5" }}>{i + 2}</div>
                  <div style={{ padding: "7px 12px", borderRight: "1px solid #C8D5E8", color: C.text }}>{name}</div>
                  <div style={{ padding: "7px 12px", color: C.text }}>{phone}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: font.body, fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
              ⚠️ Column A must be <strong>Name</strong>, Column B must be <strong>Phone</strong> (10 digits, no dashes or spaces). First row is the header and will be skipped automatically.
            </div>

            <button onClick={downloadTemplate} style={{ ...ghostBtnStyle, fontSize: 13, padding: "8px 16px" }}>
              ⬇️ Download Template
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW STEP */}
      {step === "preview" && (
        <div>
          <div style={{ ...card, marginBottom: 16, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: C.text }}>📋 Preview — {contacts.length} contacts</div>
              <button onClick={() => { setContacts([]); setStep("upload"); }} style={{ ...ghostBtnStyle, padding: "8px 16px", fontSize: 13 }}>← Re-upload</button>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: C.green }}>{validCount}</div>
                <div style={{ fontFamily: font.body, fontSize: 12, color: C.green }}>Ready to send</div>
              </div>
              {invalidCount > 0 && (
                <div style={{ flex: 1, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: "#C2410C" }}>{invalidCount}</div>
                  <div style={{ fontFamily: font.body, fontSize: 12, color: "#C2410C" }}>Will be skipped</div>
                </div>
              )}
            </div>
            <button onClick={handleBulkSend} disabled={validCount === 0} style={{ ...btnStyle, width: "100%" }}>
              🚀 Send to {validCount} Contacts
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
                      <div style={{ fontFamily: font.mono, fontSize: 11, color: c.valid ? C.textMuted : "#C2410C" }}>
                        {c.valid ? `+1${c.phone}` : "Invalid number — will be skipped"}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeContact(c.id)} style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SENDING STEP */}
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

      {/* DONE STEP */}
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
          <button onClick={() => { setStep("upload"); setContacts([]); setProgress(0); }} style={{ ...ghostBtnStyle }}>Send Another Batch</button>
        </div>
      )}
    </div>
  );
}

// ── ANALYTICS TAB ─────────────────────────────────────────────────────────────
function AnalyticsTab({ log, businessName }) {
  const now = new Date();
  const thisMonth = log.filter(m => new Date(m.sent_at).getMonth() === now.getMonth() && new Date(m.sent_at).getFullYear() === now.getFullYear());
  const lastMonth = log.filter(m => { const d = new Date(m.sent_at); const lm = new Date(now.getFullYear(), now.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
  const googleCount = log.filter(m => m.platform === "Google").length;
  const yelpCount = log.filter(m => m.platform === "Yelp").length;
  const total = log.length;
  const googlePct = total > 0 ? Math.round((googleCount / total) * 100) : 0;
  const yelpPct = total > 0 ? Math.round((yelpCount / total) * 100) : 0;
  const growth = lastMonth.length > 0 ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100) : 0;

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const count = log.filter(m => {
        const md = new Date(m.sent_at);
        return md.toDateString() === d.toDateString();
      }).length;
      days.push({ label: d.toLocaleDateString("en", { weekday: "short" }), count });
    }
    return days;
  };

  const days = getLast7Days();
  const maxCount = Math.max(...days.map(d => d.count), 1);

  const statCard = (value, label, sub, color = C.gold) => (
    <div style={{ ...card, padding: "16px 18px", textAlign: "center" }}>
      <div style={{ fontFamily: font.display, fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: C.text, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontFamily: font.body, fontSize: 11, color: C.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "20px 20px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: font.display, fontSize: 22, fontWeight: 600, color: C.text }}>Analytics</div>
        <div style={{ fontFamily: font.body, fontSize: 14, color: C.textMuted, marginTop: 4 }}>Your ReviewSend performance</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {statCard(total, "Total Sent", "All time")}
        {statCard(thisMonth.length, "This Month", lastMonth.length > 0 ? `${growth > 0 ? "+" : ""}${growth}% vs last month` : "First month!", growth >= 0 ? C.green : "#e74c3c")}
        {statCard(googleCount, "Google", `${googlePct}%`, "#4A90D9")}
        {statCard(yelpCount, "Yelp", `${yelpPct}%`, "#C0392B")}
      </div>

      {/* 7-day bar chart */}
      <div style={{ ...card, padding: "20px 16px" }}>
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

      {/* Platform breakdown */}
      <div style={{ ...card, padding: "20px 16px", marginTop: 12 }}>
        <div style={{ fontFamily: font.body, fontSize: 11, letterSpacing: 3, color: C.textSub, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>Platform Breakdown</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: "#4A90D9", color: "#fff", fontSize: 11, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>G</span>
              <span style={{ fontFamily: font.body, fontSize: 14, color: C.text }}>Google</span>
            </div>
            <span style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted }}>{googleCount} ({googlePct}%)</span>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${googlePct}%`, background: "linear-gradient(90deg, #4A90D9, #2D7DD2)", borderRadius: 99, transition: "width 0.5s" }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: "#C0392B", color: "#fff", fontSize: 11, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>Y</span>
              <span style={{ fontFamily: font.body, fontSize: 14, color: C.text }}>Yelp</span>
            </div>
            <span style={{ fontFamily: font.mono, fontSize: 13, color: C.textMuted }}>{yelpCount} ({yelpPct}%)</span>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${yelpPct}%`, background: "linear-gradient(90deg, #C0392B, #962d22)", borderRadius: 99, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      {total === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", fontFamily: font.body, fontSize: 15, color: C.textMuted }}>
          No data yet. Start sending review requests to see your analytics!
        </div>
      )}
    </div>
  );
}

// ── TIME AGO HELPER ───────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── PHOTOS TAB ────────────────────────────────────────────────────────────────
function PhotosTab({ businessId, businessName, isAdmin = false, isMarketing = false, onStatusChange = null }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => { loadPhotos(); }, []);

  const loadPhotos = async () => {
    const query = isAdmin
      ? supabase.from("photos").select("*, businesses(name)").order("created_at", { ascending: false })
      : supabase.from("photos").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    const { data } = await query;
    if (data) setPhotos(data);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${businessId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("business-photos").upload(fileName, file);
    if (!uploadError) {
      await supabase.from("photos").insert([{
        business_id: businessId,
        file_path: fileName,
        file_name: file.name,
        caption: caption,
        status: "pending",
      }]);
      setCaption("");
      loadPhotos();
    }
    setUploading(false);
  };

  const updateStatus = async (id, status) => {
    const updates = { status };
    if (status === "downloaded") updates.downloaded_at = new Date().toISOString();
    if (status === "posted") updates.posted_at = new Date().toISOString();
    await supabase.from("photos").update(updates).eq("id", id);
    loadPhotos();
    if (onStatusChange) onStatusChange();
  };

  const downloadPhoto = async (photo) => {
    const { data } = await supabase.storage.from("business-photos").download(photo.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.file_name;
      a.click();
      URL.revokeObjectURL(url);
      if (photo.status === "pending") updateStatus(photo.id, "downloaded");
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
      downloaded: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
      posted: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
    };
    const labels = { pending: "⬜ Pending", downloaded: "⬇️ Downloaded", posted: "✅ Posted to Google" };
    const st = styles[status] || styles.pending;
    return (
      <span style={{ fontFamily: font.body, fontSize: 12, padding: "4px 12px", borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 600 }}>
        {labels[status] || "⬜ Pending"}
      </span>
    );
  };

  return (
    <div className="fade-up">
      <PageHeader 
        title={isAdmin || isMarketing ? "Client Photos" : "Upload Photos"} 
        sub={isAdmin || isMarketing ? `${photos.length} total photos` : "Upload photos for your Google Business listing"} 
      />

      {!isAdmin && !isMarketing && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <Label>Caption (optional)</Label>
            <input style={inputStyle} value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. New menu item, team photo, storefront..." />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ ...btnStyle, width: "100%" }}>
            {uploading ? "Uploading…" : "📸 Upload Photo"}
          </button>
          <p style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: 12 }}>
            Photos will be reviewed and posted to your Google Business listing by your account manager.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {photos.map((photo, i) => (
          <div key={i} style={{ ...card, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📸</div>
                <div>
                  <div style={{ fontFamily: font.display, fontSize: 15, color: C.text, fontWeight: 600 }}>{photo.file_name}</div>
                  {(isAdmin || isMarketing) && photo.businesses && <div style={{ fontFamily: font.body, fontSize: 12, color: C.gold, marginTop: 2 }}>{photo.businesses.name}</div>}
                  {photo.caption && <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted, marginTop: 2 }}>{photo.caption}</div>}
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: C.textSub, marginTop: 4 }}>{timeAgo(photo.created_at)}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {statusBadge(photo.status)}
                {(isAdmin || isMarketing) && (
                  <>
                    <button onClick={() => downloadPhoto(photo)} style={{ ...ghostBtnStyle, padding: "8px 16px", fontSize: 13 }}>⬇️ Download</button>
                    {photo.status !== "posted" && (
                      <button onClick={() => updateStatus(photo.id, "posted")} style={{ ...btnStyle, padding: "8px 16px", fontSize: 13 }}>✅ Mark as Posted</button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <div style={{ fontFamily: font.body, fontSize: 15, color: C.textMuted, textAlign: "center", padding: 40 }}>
            {isAdmin || isMarketing ? "No photos from clients yet." : "No photos uploaded yet. Upload your first photo above!"}
          </div>
        )}
      </div>
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
