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

// --- Google Analytics (יונתן, השתמשתי בקוד ששלחת) ---
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

const MARKET_CATEGORIES = ["ריהוט לבית ולגינה", "חשמל ואלקטרוניקה", "ספרים ולימודים", "ספורט ופנאי", "לתינוק ולילד", "ביגוד ואקססוריז", "מסירה בחינם", "שונות"];

// --- Helper Functions ---
function getOpenStatus(h) {
  if (!h) return null;
  if (h.includes("24 שעות")) return "open";
  const now = new Date();
  const day = now.getDay();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  if ((h.includes("שישי סגור") || h.includes("שישי ושבת סגור")) && day === 5) return "closed";
  if ((h.includes("שבת סגור") || h.includes("שישי ושבת סגור")) && day === 6) return "closed";
  const ranges = [...h.matchAll(/(\d{1,2}):(\d{2})[–\-](\d{1,2}):(\d{2})/g)];
  for (const m of ranges) {
    const s = +m[1] * 60 + +m[2], e = +m[3] * 60 + +m[4];
    if (hhmm >= s && hhmm <= e) return "open";
  }
  return ranges.length > 0 ? "closed" : null;
}

// --- Components ---
function BizCard({ biz, idx, expanded, onToggle, isOwner, onDelete }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };
  const s = getOpenStatus(biz.hours);
  
  const track = (act) => ReactGA.event({ category: "Business", action: act, label: biz.name });

  return (
    <div className="card-item fa-anim" style={{ borderTop: `4px solid ${cs.color}` }} onClick={onToggle}>
      <div className="card-top">
        <span className="card-badge" style={{ background: cs.bg, color: cs.color }}>{cs.emoji} {biz.cat}</span>
        <h3 className="card-title">{biz.name}</h3>
        <span className={`arrow-icon ${expanded ? 'rotated' : ''}`}>▾</span>
      </div>
      <p className="card-desc" style={{ WebkitLineClamp: expanded ? 'unset' : 2 }}>{biz.desc}</p>
      {s && (
        <div className={`status-pill ${s}`}>
          <span className="status-dot" /> {s === "open" ? "פתוח עכשיו" : "סגור כרגע"}
        </div>
      )}
      <div className="card-phone-footer">📞 {biz.tel || "פרטים בפנים"}</div>
      
      {expanded && (
        <div className="card-expanded">
          <div className="expanded-info">📍 {biz.addr || "באר גנים"}</div>
          {biz.hours && <div className="expanded-info">🕐 {biz.hours}</div>}
          <div className="btn-row">
            <a href={`tel:${biz.tel}`} className="action-btn call" onClick={(e) => { e.stopPropagation(); track("Call"); }}>📞 התקשר</a>
            <a href={`https://wa.me/972${biz.tel?.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="action-btn wa" onClick={(e) => { e.stopPropagation(); track("WhatsApp"); }}>💬 וואטסאפ</a>
            {biz.tiktok && <a href={biz.tiktok} target="_blank" rel="noreferrer" className="action-btn tiktok" onClick={(e) => { e.stopPropagation(); track("TikTok"); }}>🎵 טיקטוק</a>}
            {biz.site && <a href={biz.site} target="_blank" rel="noreferrer" className="action-btn site" onClick={(e) => { e.stopPropagation(); track("Website"); }}>🌐 אתר</a>}
          </div>
          {isOwner && <button className="delete-owner-btn" onClick={(e) => { e.stopPropagation(); if(window.confirm("למחוק?")) onDelete(); }}>🗑️ מחק עסק</button>}
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
  const [newBiz, setNewBiz] = useState({ name: "", cat: "מזון ואוכל", tel: "", desc: "", tiktok: "", addr: "", site: "", hours: "" });

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
    <div className="page-container">
      <button className="nav-back-fixed" onClick={onBack}>➔ חזרה</button>
      <header className="page-hero biz-theme">
        <div className="hero-emoji">🌿</div>
        <h1>עסקים בבאר גנים</h1>
        <p>{businesses.length} עסקים רשומים ביישוב</p>
      </header>

      <div className="sticky-search-nav">
        <input className="main-search" placeholder="חפש עסק או שירות..." onChange={e => setSearch(e.target.value)} />
        <div className="category-scroll">
          <button className={`pill ${activeCat === "הכל" ? "active" : ""}`} onClick={() => setActiveCat("הכל")}>🏘️ הכל</button>
          {Object.keys(CATEGORIES).map(c => <button key={c} className={`pill ${activeCat === c ? "active" : ""}`} onClick={() => setActiveCat(c)}>{CATEGORIES[c].emoji} {c}</button>)}
        </div>
      </div>

      <main className="main-content-area">
        <button className="primary-add-btn biz-btn" onClick={() => setShowForm(true)}>+ הוסף עסק למדריך</button>
        {filtered.length > 0 ? (
          <div className="grid-3-col">
            {filtered.map((biz, i) => (
              <BizCard key={biz.id} biz={biz} idx={i} expanded={expandedId === biz.id} onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)} isOwner={biz.authorId === deviceId} onDelete={() => deleteDoc(doc(db, "businesses", biz.id))} />
            ))}
          </div>
        ) : (
          <div className="empty-msg">לא נמצאו עסקים תואמים...</div>
        )}
      </main>

      {showForm && (
        <div className="modal-bg">
          <form className="modal-box" onSubmit={async (e) => {
            e.preventDefault();
            await addDoc(collection(db, "businesses"), { ...newBiz, authorId: deviceId, createdAt: serverTimestamp() });
            setShowForm(false);
          }}>
            <h2>הוספת עסק</h2>
            <input placeholder="שם העסק *" required onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
            <select onChange={e => setNewBiz({...newBiz, cat: e.target.value})}>
              {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea placeholder="תיאור העסק *" required onChange={e => setNewBiz({...newBiz, desc: e.target.value})} />
            <input placeholder="טלפון *" required onChange={e => setNewBiz({...newBiz, tel: e.target.value})} />
            <input placeholder="לינק לטיקטוק (אופציונלי)" onChange={e => setNewBiz({...newBiz, tiktok: e.target.value})} />
            <input placeholder="כתובת" onChange={e => setNewBiz({...newBiz, addr: e.target.value})} />
            <button type="submit" className="modal-submit-btn biz-btn">פרסם במדריך</button>
            <button type="button" className="modal-cancel-btn" onClick={() => setShowForm(false)}>ביטול</button>
          </form>
        </div>
      )}
    </div>
  );
}

function MarketView({ onBack, deviceId }) {
  const [ads, setAds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newAd, setNewAd] = useState({ title: "", price: "", desc: "", tel: "", image: "", category: "שונות" });

  useEffect(() => {
    return onSnapshot(query(collection(db, "ads"), orderBy("createdAt", "desc")), (s) => 
      setAds(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleImg = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const max = 600;
        let w = img.width, h = img.height;
        if(w > h && w > max) { h *= max/w; w = max; } else if(h > max) { w *= max/h; h = max; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        setNewAd({...newAd, image: canvas.toDataURL("image/jpeg", 0.7)});
      };
      img.src = ev.target.result;
    };
    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
  };

  return (
    <div className="page-container market-bg-light">
      <button className="nav-back-fixed dark" onClick={onBack}>➔ חזרה</button>
      <header className="page-hero market-theme">
        <div className="hero-emoji">🛒</div>
        <h1>שוק באר גנים</h1>
        <p>לוח יד שנייה ומסירה קהילתי</p>
      </header>
      <main className="main-content-area">
        <button className="primary-add-btn market-btn" onClick={() => setShowForm(true)}>+ פרסם מודעה</button>
        <div className="grid-2-col">
          {ads.map(ad => (
            <div key={ad.id} className="market-card">
              {ad.image && <img src={ad.image} alt="" className="ad-image" />}
              <div className="ad-content">
                <span className="ad-cat-badge">{ad.category}</span>
                <h3 className="ad-title">{ad.title}</h3>
                <p className="ad-price">₪{ad.price}</p>
                <p className="ad-desc">{ad.desc}</p>
                <div className="ad-footer">
                  <a href={`https://wa.me/972${ad.tel?.replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="ad-wa-link">💬 וואטסאפ</a>
                  {ad.authorId === deviceId && <button className="ad-del-btn" onClick={() => deleteDoc(doc(db, "ads", ad.id))}>🗑️</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      {showForm && (
        <div className="modal-bg">
          <form className="modal-box" onSubmit={async (e) => {
            e.preventDefault();
            await addDoc(collection(db, "ads"), { ...newAd, authorId: deviceId, createdAt: serverTimestamp() });
            setShowForm(false);
          }}>
            <h2>מודעה חדשה</h2>
            <input placeholder="מה המוצר? *" required onChange={e => setNewAd({...newAd, title: e.target.value})} />
            <input placeholder="מחיר *" type="number" required onChange={e => setNewAd({...newAd, price: e.target.value})} />
            <textarea placeholder="תיאור..." onChange={e => setNewAd({...newAd, desc: e.target.value})} />
            <input placeholder="טלפון לוואטסאפ *" required onChange={e => setNewAd({...newAd, tel: e.target.value})} />
            <input type="file" accept="image/*" onChange={handleImg} />
            <button type="submit" className="modal-submit-btn market-btn">פרסם בלוח</button>
            <button type="button" onClick={() => setShowForm(false)} className="modal-cancel-btn">ביטול</button>
          </form>
        </div>
      )}
    </div>
  );
}

function HomeView({ onNavigate }) {
  useEffect(() => { ReactGA.send({ hitType: "pageview", page: "/" }); }, []);
  return (
    <div className="home-screen">
      <div className="home-hero-text">
        <div className="home-logo-large">🏡</div>
        <h1>הפורטל של באר גנים</h1>
        <p>הכל קורה כאן - בתוך הקהילה</p>
      </div>
      <div className="home-nav-grid">
        <button className="home-nav-btn biz" onClick={() => onNavigate("businesses")}>
          <span className="nav-emoji">🌿</span>
          <div className="nav-txt">
            <h3>עסקים מקומיים</h3>
            <p>מצא נותני שירות ביישוב</p>
          </div>
        </button>
        <button className="home-nav-btn mkt" onClick={() => onNavigate("market")}>
          <span className="nav-emoji">🛒</span>
          <div className="nav-txt">
            <h3>שוק באר גנים</h3>
            <p>לוח יד שנייה ומסירה</p>
          </div>
        </button>
      </div>
      <footer className="home-footer">פותח ע"י יונתן יוסף</footer>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const deviceId = useMemo(() => {
    let id = localStorage.getItem("beerGanimId_v3");
    if (!id) { id = "user_" + Math.random().toString(36).substr(2, 9); localStorage.setItem("beerGanimId_v3", id); }
    return id;
  }, []);

  const navigate = (v) => { setView(v); ReactGA.send({ hitType: "pageview", page: "/"+v }); };

  return (
    <div className="app-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Heebo', sans-serif; }
        .app-wrapper { direction: rtl; }
        
        .page-hero { padding: 50px 20px; text-align: center; color: white; }
        .biz-theme { background: linear-gradient(135deg, #1a0d04, #573015); }
        .market-theme { background: linear-gradient(135deg, #0f172a, #334155); }
        .hero-emoji { font-size: 50px; margin-bottom: 10px; }
        
        .sticky-search-nav { position: sticky; top: 0; z-index: 100; background: #f7f3ed; padding: 12px; border-bottom: 1px solid #ecdfc8; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .main-search { width: 100%; padding: 12px 20px; border-radius: 50px; border: 2px solid #e8d5b7; outline: none; margin-bottom: 10px; font-size: 16px; }
        .category-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; flex-wrap: nowrap; }
        .pill { padding: 6px 14px; border-radius: 50px; border: 1px solid #e8d5b7; background: white; font-size: 13px; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .pill.active { background: #c4651a; color: white; border-color: #c4651a; }
        
        .main-content-area { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .grid-3-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .grid-2-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        @media(max-width: 950px){ .grid-3-col { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 600px){ .grid-3-col, .grid-2-col { grid-template-columns: 1fr; } }
        
        .card-item { background: white; padding: 15px; border-radius: 15px; border: 1px solid #ecdfc8; cursor: pointer; transition: 0.2s; position: relative; }
        .card-item:hover { transform: translateY(-3px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .card-badge { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; }
        .card-title { font-size: 16px; font-weight: 900; margin: 4px 0; }
        .card-desc { font-size: 13px; color: #666; margin-bottom: 12px; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
        
        .status-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; margin-bottom: 10px; }
        .status-pill.open { background: #dcfce7; color: #16a34a; }
        .status-pill.closed { background: #fee2e2; color: #dc2626; }
        .status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        
        .card-phone-footer { border-top: 1px solid #eee; padding-top: 10px; font-size: 14px; font-weight: bold; color: #1d4ed8; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .action-btn { padding: 8px 12px; border-radius: 50px; text-decoration: none; font-size: 12px; font-weight: bold; border: 1px solid #ddd; color: #333; flex: 1; text-align: center; }
        .action-btn.call { background: #c4651a; color: white; border: none; }
        
        .primary-add-btn { width: 100%; padding: 16px; border-radius: 15px; border: none; color: white; font-weight: 900; font-size: 18px; cursor: pointer; margin-bottom: 20px; }
        .biz-btn { background: #c4651a; }
        .market-btn { background: #2563eb; }
        
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box { background: white; padding: 25px; border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .modal-box h2 { margin-bottom: 15px; }
        .modal-box input, .modal-box select, .modal-box textarea { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 10px; }
        .modal-submit-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; color: white; font-weight: bold; }
        .modal-cancel-btn { width: 100%; background: none; border: none; color: #999; margin-top: 10px; cursor: pointer; }
        
        .market-card { background: white; border-radius: 15px; overflow: hidden; border: 1px solid #e2e8f0; }
        .ad-image { width: 100%; height: 160px; object-fit: cover; }
        .ad-content { padding: 15px; }
        .ad-price { font-size: 20px; color: #2563eb; font-weight: 900; }
        .ad-wa-link { background: #25d366; color: white; padding: 8px 16px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 13px; }
        
        .home-screen { min-height: 100vh; background: #fdfbf7; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
        .home-hero-text { text-align: center; margin-bottom: 40px; }
        .home-logo-large { font-size: 80px; }
        .home-nav-grid { width: 100%; max-width: 400px; display: grid; gap: 15px; }
        .home-nav-btn { background: white; padding: 20px; border-radius: 25px; border: 2px solid #ecdfc8; cursor: pointer; display: flex; align-items: center; gap: 15px; text-align: right; transition: 0.2s; }
        .home-nav-btn:hover { transform: scale(1.02); }
        .nav-emoji { font-size: 40px; }
        .home-footer { margin-top: 50px; font-size: 12px; color: #a89a8a; }
        
        .nav-back-fixed { position: fixed; top: 15px; right: 15px; z-index: 1000; padding: 8px 16px; border-radius: 50px; border: none; background: rgba(0,0,0,0.7); color: white; cursor: pointer; font-weight: bold; }
        .nav-back-fixed.dark { background: rgba(0,0,0,0.05); color: #333; }
        
        .fa-anim { opacity: 0; transform: translateY(10px); animation: fadeInUp 0.4s forwards; }
        @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {view === "home" && <HomeView onNavigate={navigate} />}
      {view === "businesses" && <BusinessesView onBack={() => navigate("home")} deviceId={deviceId} />}
      {view === "market" && <MarketView onBack={() => navigate("home")} deviceId={deviceId} />}
    </div>
  );
}
