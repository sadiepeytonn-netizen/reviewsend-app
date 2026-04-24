import { useState, useEffect, useRef } from "react";

const PLATFORMS = [
  { id: "google", label: "Google", color: "#4A90D9", icon: "G" },
  { id: "yelp", label: "Yelp", color: "#C0392B", icon: "Y" },
];

const defaultSettings = {
  businessName: "Maison Café",
  googleLink: "https://g.page/r/your-google-review-link",
  yelpLink: "https://www.yelp.com/biz/your-business",
  messageTemplate: "Hi {name}! Thank you for visiting {business}. We'd love to hear your thoughts — leave us a quick review: {link} ✨",
};

const mockLog = [
  { name: "Isabelle M.", phone: "+1 (212) 555-0147", platform: "Google", time: "Today, 11:04 AM", status: "Delivered" },
  { name: "Thomas R.", phone: "+1 (310) 555-0293", platform: "Yelp", time: "Today, 9:31 AM", status: "Delivered" },
  { name: "Celine V.", phone: "+1 (646) 555-0182", platform: "Google", time: "Yesterday", status: "Delivered" },
  { name: "André K.", phone: "+1 (917) 555-0374", platform: "Google", time: "Yesterday", status: "Delivered" },
];

const C = {
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceHover: "#EEF3FA",
  border: "#D6E2F0",
  gold: "#1A5FBF",
  text: "#0D1117",
  textMuted: "#6B7A99",
  textSub: "#9DADC4",
  green: "#1A8C4E",
  greenBg: "#E8F7EF",
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

export default function App() {
  const [tab, setTab] = useState("send");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [editingSettings, setEditingSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState(defaultSettings);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("google");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [log, setLog] = useState(mockLog);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const reviewLink = platform === "google" ? settings.googleLink : settings.yelpLink;
  const previewMessage = settings.messageTemplate
    .replace("{name}", customerName || "Customer")
    .replace("{business}", settings.businessName)
    .replace("{link}", reviewLink);

  const handleSend = async () => {
    if (!phone || !customerName) return;
    setSending(true);
    const link = platform === "google" ? settings.googleLink : settings.yelpLink;
    const message = settings.messageTemplate
      .replace("{name}", customerName)
      .replace("{business}", settings.businessName)
      .replace("{link}", link);
    try {
      const response = await fetch("https://reviewsend-server-production.up.railway.app/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: formatPhone(phone), message }),
      });
      const data = await response.json();
      if (data.success) {
        setSent(true);
        setLog(prev => [{ name: customerName, phone, platform: platform === "google" ? "Google" : "Yelp", time: "Just now", status: "Delivered" }, ...prev]);
        setTimeout(() => { setSent(false); setCustomerName(""); setPhone(""); }, 2800);
      } else {
        alert("Failed to send: " + data.error);
      }
    } catch (err) {
      alert("Could not reach the server. Make sure your Render server is running.");
    }
    setSending(false);
  };

  const [country, setCountry] = useState("US");

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, "");
    return "+1" + digits;
  };

  const saveSettings = () => { setSettings({ ...draftSettings }); setEditingSettings(false); };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{globalCSS}</style>

      {/* ── HEADER ── */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 5, color: C.gold }}>★ REVIEWSEND</div>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4.5 }}>
              {[0,1,2].map(i => <span key={i} style={{ display: "block", width: 18, height: 1.5, background: C.text, borderRadius: 2 }} />)}
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, minWidth: 230, overflow: "hidden", boxShadow: "0 12px 40px rgba(13,17,23,0.12)" }}>
                <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: font.display, fontSize: 14, color: C.text }}>{settings.businessName}</div>
                  <div style={{ fontFamily: font.body, fontSize: 11, color: C.gold, marginTop: 3, letterSpacing: 2 }}>PRO PLAN</div>
                </div>
                {[["send","✦","Send Review Request"],["log","◈","Message History"],["settings","◉","Settings"]].map(([id, ico, label]) => (
                  <button key={id} onClick={() => { setTab(id); setMenuOpen(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 18px", background: tab === id ? C.surfaceHover : "none", border: "none", color: tab === id ? C.gold : C.textMuted, cursor: "pointer", fontFamily: font.body, fontSize: 14, textAlign: "left", letterSpacing: 0.3 }}>
                    <span style={{ fontSize: 10, color: C.gold }}>{ico}</span>{label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 780, margin: "0 auto", padding: "52px 28px 80px" }}>

        {/* SEND */}
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

            {/* Phone preview — centered below */}
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

        {/* LOG */}
        {tab === "log" && (
          <div className="fade-up">
            <PageHeader title="Message History" sub={`${log.length} messages sent`} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {log.map((row, i) => (
                <div key={i} style={{ ...card, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #D6E2F0, #EEF3FA)", border: "1px solid #D6E2F0", color: "#1A5FBF", fontFamily: font.display, fontSize: 16, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{row.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontFamily: font.display, fontSize: 16, color: C.text, fontWeight: "600" }}>{row.name}</div>
                        <div style={{ fontFamily: font.mono, fontSize: 12, color: C.textMuted, marginTop: 2 }}>{row.phone}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: font.body, fontSize: 12, letterSpacing: 1, padding: "4px 12px", borderRadius: 99, background: C.greenBg, color: C.green, border: `1px solid ${C.green}33`, fontWeight: "600" }}>{row.status}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: font.body, fontSize: 13, letterSpacing: 1, padding: "4px 12px", borderRadius: 99, background: row.platform === "Google" ? "#4A90D918" : "#C0392B18", color: row.platform === "Google" ? "#4A90D9" : "#e74c3c", border: `1px solid ${row.platform === "Google" ? "#4A90D933" : "#C0392B33"}`, fontWeight: "600" }}>{row.platform}</span>
                    <div style={{ fontFamily: font.body, fontSize: 13, color: C.textMuted }}>{row.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="fade-up">
            <PageHeader title="Business Settings" sub="Manage your profile and review destinations" />
            <div style={{ ...card, maxWidth: 520, margin: "0 auto" }}>
              {[
                { label: "Business Name", key: "businessName", placeholder: "Your Business Name" },
                { label: "Google Review Link", key: "googleLink", placeholder: "https://g.page/r/..." },
                { label: "Yelp Review Link", key: "yelpLink", placeholder: "https://www.yelp.com/biz/..." },
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
                  value={editingSettings ? draftSettings.messageTemplate : settings.messageTemplate}
                  disabled={!editingSettings}
                  onChange={e => setDraftSettings(d => ({ ...d, messageTemplate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {editingSettings ? (
                  <>
                    <button onClick={saveSettings}
                      style={{ flex: 1, padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1A5FBF, #0d3d8a)", color: "#ffffff", fontFamily: font.body, fontSize: 16, fontWeight: 600, cursor: "pointer", letterSpacing: 0.5 }}>
                      Save Changes
                    </button>
                    <button onClick={() => { setDraftSettings({ ...settings }); setEditingSettings(false); }}
                      style={{ flex: 1, padding: "13px", background: "none", border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, cursor: "pointer", fontFamily: font.body, fontSize: 15 }}>
                      Cancel
                    </button>
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
