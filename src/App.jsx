import { useState, useMemo, useEffect } from "react";
import ReactGA from "react-ga4";

// הגדרת קוד המעקב שלך
ReactGA.initialize("G-C627XK0Q14");

const CATEGORIES = {
  "יופי וטיפוח":        { emoji: "💅", color: "#c4479e", bg: "#fdf0f9" },
  "בריאות ורפואה":      { emoji: "🩺", color: "#059669", bg: "#ecfdf5" },
  "כושר ופנאי":         { emoji: "🏋️", color: "#2563eb", bg: "#eff6ff" },
  "בניה ותחזוקה":       { emoji: "🔧", color: "#d97706", bg: "#fffbeb" },
  "מקצועות חופשיים":   { emoji: "⚖️", color: "#7c3aed", bg: "#f5f3ff" },
  "מזון ואוכל":         { emoji: "🍕", color: "#dc2626", bg: "#fff1f2" },
  "אירועים וצילום":     { emoji: "📸", color: "#0891b2", bg: "#ecfeff" },
  "חינוך":              { emoji: "📚", color: "#b45309", bg: "#fef3c7" },
  "טכנולוגיה ועסקים":  { emoji: "💻", color: "#4f46e5", bg: "#eef2ff" },
  "קניות ושירותים":    { emoji: "🛍️", color: "#be185d", bg: "#fdf2f8" },
  "קהילה":              { emoji: "🏘️", color: "#475569", bg: "#f1f5f9" },
};

const BUSINESSES = [
  { id: 1,  name: "דואר בבאר גנים", cat: "קהילה", tel: "", hours: "ראשון ורביעי 17:00–19:00", addr: "באר גנים", desc: "סניף דואר ישראל ביישוב" },
  { id: 2,  name: "המכולת היישובית", cat: "מזון ואוכל", tel: "", hours: "א׳–ה׳ 06:30–21:00", addr: "סביון 20", desc: "מכולת שכונתית טרייה" },
  { id: 4,  name: "פיצה פארטי", cat: "מזון ואוכל", tel: "052-689-9733", hours: "15:30–23:00", addr: "באר גנים 1", desc: "פיצריה מקומית - משלוחים" },
  { id: 7,  name: "נלו דה לאון", cat: "יופי וטיפוח", tel: "053-2838100", addr: "רימון 11", desc: "מספרת גברים וילדים" },
  { id: 73, name: "Rotem Tsaidi", cat: "יופי וטיפוח", tel: "054-236-9892", addr: "רותם המדבר 11", desc: "החלקות שיער וגבות" },
  { id: 28, name: "סטודיו ME", cat: "בריאות ורפואה", tel: "055-9893297", addr: "מלכית 46", desc: "פילאטיס מכשירים ותזונה" },
  { id: 75, name: "אביב רפאלי נחמני", cat: "בריאות ורפואה", tel: "053-420-5110", addr: "רימון 27", desc: "מטפל בחרדות ובטראומה" },
  { id: 64, name: "ביננו - מחשבים", cat: "טכנולוגיה ועסקים", tel: "058-625-0506", addr: "בשביל התקווה", desc: "תיקון ומכירת מחשבים" },
  { id: 71, name: "סטלינקה בוטיק בגדים", cat: "קניות ושירותים", tel: "050-6525573", site: "https://talinka.shop/collections/new-in", desc: "בוטיק בגדי מעצבים" },
  { id: 74, name: "תימור נחמני", cat: "חינוך", tel: "053-420-5110", addr: "רימון 27", desc: "מורה לאנגלית לכל הגילאים" }
];

function Card({ biz, idx, expanded, onToggle, mounted }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };

  // פונקציה שמדווחת לגוגל על כל לחיצה
  const trackInteraction = (type) => {
    ReactGA.event({
      category: "Engagement",
      action: `${type}_Click`,
      label: biz.name
    });
  };

  return (
    <div className={`card fa ${mounted ? "vis" : ""}`} style={{ transitionDelay: `${idx * 35}ms`, borderTop: `3px solid ${cs.color}` }} onClick={onToggle}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: cs.bg, color: cs.color, padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{cs.emoji} {biz.cat}</div>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{biz.name}</h3>
        </div>
        <span style={{ transform: expanded ? "rotate(180deg)" : "" }}>▾</span>
      </div>
      <p style={{ fontSize: 13, color: "#6b5030" }}>{biz.desc}</p>
      <div className="dr" style={{ borderTop: "1px solid #f0e8d8", marginTop: 10 }}>
        <span>📞</span>
        {biz.tel ? <a href={`tel:${biz.tel}`} onClick={(e) => { e.stopPropagation(); trackInteraction("Call"); }} style={{ color: "#1d4ed8", fontWeight: 700 }}>{biz.tel}</a> : <span>לחץ לפרטים</span>}
      </div>
      {expanded && (
        <div style={{ marginTop: 10, display: "flex", gap: 7 }}>
           {biz.tel && <a href={`https://wa.me/972${biz.tel.replace(/[^0-9]/g, "")}`} onClick={() => trackInteraction("WhatsApp")} target="_blank" className="ab o" style={{ color: "#16a34a" }}>💬 וואטסאפ</a>}
           {biz.site && <a href={biz.site} onClick={() => trackInteraction("Website")} target="_blank" className="ab o" style={{ color: "#7c3aed" }}>🌐 אתר</a>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setMounted(true);
    // דיווח לגוגל על כניסה לאתר
    ReactGA.send({ hitType: "pageview", page: window.location.pathname });
  }, []);

  return (
    <div style={{ fontFamily: "Heebo, sans-serif", direction: "rtl", minHeight: "100vh", background: "#f7f3ed" }}>
      <style>{`.card{background:#fff;border-radius:18px;padding:18px;border:1.5px solid #ecdfc8;cursor:pointer}.fa{opacity:0;transform:translateY(12px);transition:0.4s}.vis{opacity:1;transform:translateY(0)}.ab{display:inline-flex;padding:8px 15px;border-radius:50px;font-size:13px;text-decoration:none;border:2px solid #e8d5b7}.dr{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px}`}</style>
      <header style={{ background: "#1a0d04", padding: 40, textAlign: "center", color: "#f5e6cc" }}><h1>🌿 באר גנים</h1></header>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 15, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(285px,1fr))", gap: 15 }}>
        {BUSINESSES.map((biz, i) => (
          <Card key={biz.id} biz={biz} idx={i} expanded={expandedId === biz.id} onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)} mounted={mounted} />
        ))}
      </main>
    </div>
  );
}
