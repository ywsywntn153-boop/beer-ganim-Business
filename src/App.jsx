import { useState, useMemo, useEffect } from "react";
import Fuse from "fuse.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import ReactGA from "react-ga4";

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyDfo0w8gXhq1ndMuBY5xCQHDl_LUSU_v5Y",
  authDomain: "beer-ganim-app-8eee1.firebaseapp.com",
  projectId: "beer-ganim-app-8eee1",
  storageBucket: "beer-ganim-app-8eee1.firebasestorage.app",
  messagingSenderId: "667521262894",
  appId: "1:667521262894:web:0efa598ce92ffa945a46bf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Google Analytics ---
ReactGA.initialize("G-88P0P0JPWQ");

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

// ─────────────────────────────────────────────────────────────────────────────
// Business Components
// ─────────────────────────────────────────────────────────────────────────────
function BizCard({ biz, idx, expanded, onToggle, isOwner, onDelete }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };
  const track = (act) => ReactGA.event({ category: "Business", action: act, label: biz.name });

  return (
    <div className="card fa vis" style={{ transitionDelay: `${Math.min(idx * 30, 400)}ms`, borderTop: `3px solid ${cs.color}` }} onClick={onToggle}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <span className="badge" style={{ background: cs.bg, color: cs.color }}>{cs.emoji} {biz.cat}</span>
          <h3 style={{ fontSize: 15, fontWeight: 900, margin: "6px 0", color: "#1a0e06" }}>{biz.name}</h3>
        </div>
        <span style={{ transform: expanded ? "rotate(180deg)" : "none", transition: ".3s", color: "#c4a97d" }}>▾</span>
      </div>
      <p className="desc" style={{ WebkitLineClamp: expanded ? "unset" : 2 }}>{biz.desc}</p>
      
      {expanded && (
        <div className="expanded-content">
          <div className="info-row">📍 {biz.addr || "באר גנים"}</div>
          {biz.hours && <div className="info-row">🕐 {biz.hours}</div>}
          <div className="btn-group">
            <a href={`tel:${biz.tel}`} className="btn-action primary" onClick={(e) => { e.stopPropagation(); track("Call"); }}>📞 התקשר</a>
            <a href={`https://wa.me/972${biz.tel?.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="btn-action" onClick={(e) => { e.stopPropagation(); track("WhatsApp"); }}>💬 וואטסאפ</a>
            {biz.tiktok && <a href={biz.tiktok} target="_blank" rel="noreferrer" className="btn-action" onClick={(e) => { e.stopPropagation(); track("TikTok"); }}>🎵 טיקטוק</a>}
            {biz.site && <a href={biz.site} target="_blank" rel="noreferrer" className="btn-action" onClick={(e) => { e.stopPropagation(); track("Website"); }}>🌐 אתר</a>}
          </div>
          {isOwner && <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }}>🗑️ מחק עסק</button>}
        </div>
      )}
    </div>
  );
}

function BusinessesView({ onBack, deviceId }) {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("הכל");
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newBiz, setNewBiz] = useState({ name: "", cat: "מזון ואוכל", tel: "", desc: "", tiktok: "", addr: "" });

  useEffect(() => {
    return onSnapshot(query(collection(db, "businesses"), orderBy("createdAt", "desc")), (s) => 
      setBusinesses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const filtered = useMemo(() => {
    let list = activeCat === "הכל" ? businesses : businesses.filter(b => b.cat === activeCat);
    if (!search.trim()) return list;
    return new Fuse(list, { keys: ["name", "desc"], threshold: 0.4 }).search(search).map(r => r.item);
  }, [search, activeCat, businesses]);

  return (
    <div className="view-container">
      <button className="back-btn" onClick={onBack}>➔ חזרה</button>
      <header className="header businesses-bg">
        <h1>עסקים בבאר גנים</h1>
        <p>{businesses.length} נותני שירות בקהילה</p>
      </header>

      <div className="sticky-nav">
        <input className="search-input" placeholder="חפש עסק או שירות..." onChange={e => setSearch(e.target.value)} />
        <div className="cat-scroll">
          <button className={`cat-pill ${activeCat === "הכל" ? "active" : ""}`} onClick={() => setActiveCat("הכל")}>🏘️ הכל</button>
          {Object.keys(CATEGORIES).map(c => <button key={c} className={`cat-pill ${activeCat === c ? "active" : ""}`} onClick={() => setActiveCat(c)}>{CATEGORIES[c].emoji} {c}</button>)}
        </div>
      </div>

      <main className="content">
        <button className="add-main-btn" onClick={() => setShowForm(true)}>+ הוסף עסק למדריך (חינם)</button>
        <div className="responsive-grid">
          {filtered.map((biz, i) => (
            <BizCard key={biz.id} biz={biz} idx={i} expanded={expandedId === biz.id} onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)} isOwner={biz.authorId === deviceId} onDelete={() => deleteDoc(doc(db, "businesses", biz.id))} />
          ))}
        </div>
      </main>

      {showForm && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={async (e) => {
            e.preventDefault();
            await addDoc(collection(db, "businesses"), { ...newBiz, authorId: deviceId, createdAt: serverTimestamp() });
            setShowForm(false);
          }}>
            <h2>רישום עסק חדש</h2>
            <input placeholder="שם העסק *" required onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
            <select onChange={e => setNewBiz({...newBiz, cat: e.target.value})}>
              {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea placeholder="תיאור קצר (מה אתם מציעים?) *" required onChange={e => setNewBiz({...newBiz, desc: e.target.value})} />
            <input placeholder="טלפון ליצירת קשר *" required onChange={e => setNewBiz({...newBiz, tel: e.target.value})} />
            <input placeholder="לינק לטיקטוק (אופציונלי)" onChange={e => setNewBiz({...newBiz, tiktok: e.target.value})} />
            <button type="submit" className="submit-btn">שלח עסק לפרסום</button>
            <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>ביטול</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Components
// ─────────────────────────────────────────────────────────────────────────────
function MarketView({ onBack, deviceId }) {
  const [ads, setAds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newAd, setNewAd] = useState({ title: "", price: "", desc: "", tel: "", image: "" });

  useEffect(() => {
    return onSnapshot(query(collection(db, "ads"), orderBy("createdAt", "desc")), (s) => 
      setAds(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleImage = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => setNewAd({...newAd, image: ev.target.result});
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
  };

  return (
    <div className="view-container market-bg-light">
      <button className="back-btn dark" onClick={onBack}>➔ חזרה</button>
      <header className="header market-bg">
        <h1>שוק באר גנים</h1>
        <p>יד שנייה ומסירה בקהילה</p>
      </header>

      <main className="content">
        <button className="add-main-btn market" onClick={() => setShowForm(true)}>+ פרסם מודעה חדשה</button>
        <div className="responsive-grid">
          {ads.map(ad => (
            <div key={ad.id} className="card market-card">
              {ad.image && <img src={ad.image} alt="" className="ad-img" />}
              <div style={{ padding: 12 }}>
                <h3 style={{ margin: 0 }}>{ad.title}</h3>
                <p className="price">₪{ad.price}</p>
                <p className="desc" style={{ WebkitLineClamp: 3 }}>{ad.desc}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <a href={`https://wa.me/972${ad.tel?.replace(/^0/, "")}`} className="btn-action wa-btn" target="_blank" rel="noreferrer">💬 הודעה</a>
                  {ad.authorId === deviceId && <button className="delete-btn-small" onClick={() => deleteDoc(doc(db, "ads", ad.id))}>🗑️</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showForm && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={async (e) => {
            e.preventDefault();
            await addDoc(collection(db, "ads"), { ...newAd, authorId: deviceId, createdAt: serverTimestamp() });
            setShowForm(false);
          }}>
            <h2>פרסום מודעה</h2>
            <input placeholder="מה המוצר? *" required onChange={e => setNewAd({...newAd, title: e.target.value})} />
            <input placeholder="מחיר (₪) *" type="number" required onChange={e => setNewAd({...newAd, price: e.target.value})} />
            <textarea placeholder="תיאור המוצר ומצבו..." onChange={e => setNewAd({...newAd, desc: e.target.value})} />
            <input placeholder="טלפון לוואטסאפ *" required onChange={e => setNewAd({...newAd, tel: e.target.value})} />
            <input type="file" accept="image/*" onChange={handleImage} style={{ fontSize: 12 }} />
            <button type="submit" className="submit-btn market">פרסם עכשיו</button>
            <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>ביטול</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App & Home
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const deviceId = useMemo(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) { id = Math.random().toString(36).substr(2, 9); localStorage.setItem("deviceId", id); }
    return id;
  }, []);

  const navigate = (v) => { 
    setView(v); 
    ReactGA.send({ hitType: "pageview", page: "/" + v }); 
  };

  useEffect(() => { ReactGA.send({ hitType: "pageview", page: "/" }); }, []);

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Heebo', sans-serif; }
        .app-root { direction: rtl; }
        .view-container { min-height: 100vh; }
        .header { padding: 40px 20px; text-align: center; color: white; }
        .businesses-bg { background: linear-gradient(135deg, #1a0d04, #573015); }
        .market-bg { background: linear-gradient(135deg, #0f172a, #334155); }
        .market-bg-light { background: #f8fafc; }
        
        .sticky-nav { position: sticky; top: 0; z-index: 100; background: rgba(247, 243, 237, 0.95); padding: 10px; border-bottom: 1px solid #ddd; backdrop-filter: blur(10px); }
        .search-input { width: 100%; padding: 12px 20px; border-radius: 50px; border: 2px solid #e8d5b7; outline: none; margin-bottom: 10px; }
        .cat-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; flex-wrap: nowrap; }
        .cat-pill { padding: 6px 14px; border-radius: 50px; border: 1px solid #e8d5b7; background: white; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .cat-pill.active { background: #c4651a; color: white; border-color: #c4651a; }
        
        .content { maxWidth: 1200px; margin: auto; padding-bottom: 50px; }
        .responsive-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 15px; }
        @media(max-width: 950px){ .responsive-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 600px){ .responsive-grid { grid-template-columns: 1fr; } }
        
        .card { background: white; border-radius: 15px; padding: 15px; border: 1px solid #ecdfc8; cursor: pointer; transition: transform .2s; overflow: hidden; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .badge { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; }
        .desc { font-size: 13px; color: #666; margin: 8px 0; display: -webkit-box; -webkit-box-orient: vertical; line-height: 1.4; }
        
        .btn-action { padding: 8px 12px; border-radius: 50px; border: 1px solid #ddd; text-decoration: none; color: #333; font-size: 12px; font-weight: bold; flex: 1; text-align: center; }
        .btn-action.primary { background: #c4651a; color: white; border: none; }
        .btn-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 15px; }
        .delete-btn { width: 100%; margin-top: 12px; border: none; background: #fff5f5; color: #e53e3e; padding: 6px; border-radius: 8px; cursor: pointer; font-size: 11px; }
        
        .add-main-btn { width: 92%; margin: 15px auto; display: block; padding: 16px; border-radius: 12px; background: #c4651a; color: white; border: none; font-weight: bold; font-size: 16px; cursor: pointer; }
        .add-main-btn.market { background: #2563eb; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; alignItems: center; justifyContent: center; padding: 20px; }
        .modal-card { background: white; padding: 25px; border-radius: 20px; width: 100%; maxWidth: 500px; maxHeight: 90vh; overflow-y: auto; }
        .modal-card input, .modal-card select, .modal-card textarea { width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; }
        .submit-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; color: white; font-weight: bold; font-size: 16px; cursor: pointer; background: #c4651a; }
        .submit-btn.market { background: #2563eb; }
        .cancel-btn { width: 100%; margin-top: 10px; background: none; border: none; color: #999; cursor: pointer; }
        
        .market-card { padding: 0; }
        .ad-img { width: 100%; height: 160px; object-fit: cover; }
        .price { color: #2563eb; font-weight: bold; font-size: 18px; }
        .wa-btn { background: #25d366; color: white; border: none; }
        
        .home-view { min-height: 100vh; background: linear-gradient(135deg, #fdfbf7, #f4eee3); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
        .home-title { font-size: 40px; font-weight: 900; color: #1a0d04; margin-bottom: 40px; text-align: center; }
        .nav-card { width: 100%; maxWidth: 350px; padding: 30px; border-radius: 25px; border: none; margin-bottom: 20px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; transition: transform .2s; text-decoration: none; }
        .nav-card:hover { transform: scale(1.03); }
        .nav-card.biz { background: #1a0d04; color: #f5e6cc; }
        .nav-card.market { background: #0f172a; color: #f8fafc; }
        .back-btn { position: fixed; top: 15px; right: 15px; z-index: 1000; padding: 8px 16px; border-radius: 50px; border: none; background: rgba(255,255,255,0.2); color: white; cursor: pointer; font-weight: bold; backdrop-filter: blur(5px); }
        .back-btn.dark { color: #0f172a; background: rgba(0,0,0,0.05); }
        
        .fa { opacity: 0; transform: translateY(10px); transition: .4s; }
        .fa.vis { opacity: 1; transform: translateY(0); }
      `}</style>

      {view === "home" && (
        <div className="home-view">
          <h1 className="home-title">הפורטל של באר גנים</h1>
          <button className="nav-card biz" onClick={() => navigate("businesses")}>
            <span style={{ fontSize: 50 }}>🌿</span>
            <span style={{ fontSize: 24, fontWeight: "bold" }}>עסקים מקומיים</span>
          </button>
          <button className="nav-card market" onClick={() => navigate("market")}>
            <span style={{ fontSize: 50 }}>🛒</span>
            <span style={{ fontSize: 24, fontWeight: "bold" }}>השוק היישובי</span>
          </button>
          <p style={{ marginTop: 40, color: "#a89a8a", fontSize: 14 }}>פותח ע"י יונתן יוסף</p>
        </div>
      )}

      {view === "businesses" && <BusinessesView onBack={() => navigate("home")} deviceId={deviceId} />}
      {view === "market" && <MarketView onBack={() => navigate("home")} deviceId={deviceId} />}
    </div>
  );
}
