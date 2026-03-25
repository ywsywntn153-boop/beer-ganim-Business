import { useState, useMemo, useEffect } from "react";
import Fuse from "fuse.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import ReactGA from "react-ga4";

// ─────────────────────────────────────────────────────────────────────────────
// 1. הגדרות וחיבורים (Firebase & Analytics)
// ─────────────────────────────────────────────────────────────────────────────
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

// הגדרת האנליטיקס שלך
ReactGA.initialize("G-88P0P0JPWQ");

// ─────────────────────────────────────────────────────────────────────────────
// 2. קבועים וקטגוריות
// ─────────────────────────────────────────────────────────────────────────────
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

const MARKET_CATEGORIES = [
  "ריהוט לבית ולגינה", "חשמל ואלקטרוניקה", "ספרים ולימודים", 
  "ספורט ופנאי", "לתינוק ולילד", "ביגוד ואקססוריז", "מסירה בחינם", "שונות"
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. פונקציות עזר (Helper Functions)
// ─────────────────────────────────────────────────────────────────────────────
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

function OpenBadge({ hours }) {
  const s = getOpenStatus(hours);
  if (!s) return null;
  return (
    <span className={`open-badge-tag ${s}`}>
      <span className="dot" />
      {s === "open" ? "פתוח" : "סגור"}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. רכיב כרטיס עסק (Business Card)
// ─────────────────────────────────────────────────────────────────────────────
function BizCard({ biz, idx, expanded, onToggle, mounted, isOwner, onDelete }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };
  
  const track = (action) => {
    ReactGA.event({ category: "Business", action: action, label: biz.name });
  };

  return (
    <div className={`card fa ${mounted ? "vis" : ""}`} 
         style={{ transitionDelay: `${Math.min(idx * 30, 450)}ms`, borderTop: `3px solid ${cs.color}` }} 
         onClick={onToggle}>
      
      <div className="card-header">
        <div style={{ flex: 1 }}>
          <span className="cat-badge" style={{ background: cs.bg, color: cs.color }}>
            {cs.emoji} {biz.cat}
          </span>
          <h3 className="biz-name">{biz.name}</h3>
        </div>
        <span className={`arrow ${expanded ? 'up' : ''}`}>▾</span>
      </div>

      <p className="biz-desc" style={{ WebkitLineClamp: expanded ? 'unset' : 2 }}>
        {biz.desc}
      </p>

      <div style={{ marginBottom: 10 }}>
        <OpenBadge hours={biz.hours} />
      </div>

      <div className="card-footer-phone">
        <span>📞</span>
        {biz.tel ? (
          <a href={`tel:${biz.tel}`} onClick={e => { e.stopPropagation(); track("Call Direct"); }}>{biz.tel}</a>
        ) : <span className="no-tel">פרטים בפנים</span>}
      </div>

      {expanded && (
        <div className="expanded-zone">
          <div className="detail-row">📍 <span>{biz.addr || "באר גנים"}</span></div>
          {biz.hours && <div className="detail-row">🕐 <span>{biz.hours}</span></div>}
          
          <div className="action-buttons">
            <a href={`tel:${biz.tel}`} className="act-btn tel-bg" onClick={e => { e.stopPropagation(); track("Call Button"); }}>📞 התקשר</a>
            <a href={`https://wa.me/972${biz.tel?.replace(/\D/g, "").replace(/^0/, "")}`} 
               target="_blank" rel="noreferrer" className="act-btn wa-bg" 
               onClick={e => { e.stopPropagation(); track("WhatsApp"); }}>💬 וואטסאפ</a>
            
            {biz.tiktok && (
              <a href={biz.tiktok} target="_blank" rel="noreferrer" className="act-btn tiktok-bg" 
                 onClick={e => { e.stopPropagation(); track("TikTok"); }}>🎵 טיקטוק</a>
            )}
            {biz.site && (
              <a href={biz.site} target="_blank" rel="noreferrer" className="act-btn site-bg" 
                 onClick={e => { e.stopPropagation(); track("Website"); }}>🌐 אתר</a>
            )}
          </div>

          {isOwner && (
            <button className="del-btn-biz" onClick={e => { e.stopPropagation(); onDelete(); }}>
              🗑️ מחק את העסק שלי
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. מסך העסקים (Businesses View)
// ─────────────────────────────────────────────────────────────────────────────
function BusinessesView({ onBack, deviceId }) {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("הכל");
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [newBiz, setNewBiz] = useState({ name: "", cat: "מזון ואוכל", tel: "", hours: "", addr: "", site: "", tiktok: "", desc: "" });

  useEffect(() => {
    const q = query(collection(db, "businesses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setBusinesses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMounted(true);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let list = activeCat === "הכל" ? businesses : businesses.filter(b => b.cat === activeCat);
    if (!search.trim()) return list;
    const fuse = new Fuse(list, { keys: ["name", "desc", "cat", "addr"], threshold: 0.4 });
    return fuse.search(search).map(r => r.item);
  }, [search, activeCat, businesses]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newBiz.name || !newBiz.desc || !newBiz.tel) return alert("מלא שדות חובה");
    setLoading(true);
    try {
      await addDoc(collection(db, "businesses"), { ...newBiz, authorId: deviceId, createdAt: serverTimestamp() });
      ReactGA.event({ category: "Engagement", action: "Add Business", label: newBiz.cat });
      setShowForm(false);
      setNewBiz({ name: "", cat: "מזון ואוכל", tel: "", hours: "", addr: "", site: "", tiktok: "", desc: "" });
    } catch (err) { alert("שגיאה!"); }
    setLoading(false);
  };

  return (
    <div className="view-frame">
      <button className="fixed-back" onClick={onBack}>➔ חזרה</button>
      
      <header className="page-header biz-gradient">
        <div className="icon-main">🌿</div>
        <h1>עסקים בבאר גנים</h1>
        <p>{businesses.length} עסקים ושירותים בקהילה</p>
      </header>

      <div className="sticky-bar">
        <div className="search-box">
          <input type="text" placeholder="חפש לפי שם, תחום או שירות..." onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="cat-nav">
          <button className={`pill ${activeCat === "הכל" ? "act" : ""}`} onClick={() => setActiveCat("הכל")}>🏘️ הכל</button>
          {Object.keys(CATEGORIES).map(c => (
            <button key={c} className={`pill ${activeCat === c ? "act" : ""}`} onClick={() => setActiveCat(c)}>
              {CATEGORIES[c].emoji} {c}
            </button>
          ))}
        </div>
      </div>

      <main className="main-content">
        <button className="add-trigger-btn biz-color" onClick={() => setShowForm(true)}>+ הוסף את העסק שלך למדריך</button>
        
        <div className="biz-grid">
          {filtered.map((biz, i) => (
            <BizCard 
              key={biz.id} biz={biz} idx={i} 
              expanded={expandedId === biz.id} 
              onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)}
              mounted={mounted} isOwner={biz.authorId === deviceId}
              onDelete={() => deleteDoc(doc(db, "businesses", biz.id))}
            />
          ))}
        </div>
      </main>

      {showForm && (
        <div className="overlay">
          <form className="form-modal" onSubmit={handleAdd}>
            <h2>רישום עסק חדש</h2>
            <div className="input-group">
              <label>שם העסק *</label>
              <input required onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
            </div>
            <div className="input-group">
              <label>קטגוריה *</label>
              <select onChange={e => setNewBiz({...newBiz, cat: e.target.value})}>
                {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>תיאור השירות (מה אתם עושים?) *</label>
              <textarea required onChange={e => setNewBiz({...newBiz, desc: e.target.value})} />
            </div>
            <div className="grid-inputs">
              <div className="input-group">
                <label>טלפון *</label>
                <input required type="tel" onChange={e => setNewBiz({...newBiz, tel: e.target.value})} />
              </div>
              <div className="input-group">
                <label>כתובת (רחוב ומספר)</label>
                <input onChange={e => setNewBiz({...newBiz, addr: e.target.value})} />
              </div>
            </div>
            <div className="input-group">
              <label>שעות פתיחה</label>
              <input placeholder="למשל: א-ה 08:00-17:00" onChange={e => setNewBiz({...newBiz, hours: e.target.value})} />
            </div>
            <div className="links-section">
              <p>קישורים חברתיים (אופציונלי):</p>
              <input placeholder="🌐 לינק לאתר" onChange={e => setNewBiz({...newBiz, site: e.target.value})} />
              <input placeholder="🎵 לינק לטיקטוק" onChange={e => setNewBiz({...newBiz, tiktok: e.target.value})} />
            </div>
            <button type="submit" className="save-btn" disabled={loading}>{loading ? "שומר..." : "פרסם במדריך"}</button>
            <button type="button" className="close-btn" onClick={() => setShowForm(false)}>ביטול</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. מסך השוק (Market View)
// ─────────────────────────────────────────────────────────────────────────────
function MarketView({ onBack, deviceId }) {
  const [ads, setAds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newAd, setNewAd] = useState({ title: "", price: "", desc: "", tel: "", category: "שונות", image: "" });

  useEffect(() => {
    const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (s) => setAds(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > h && w > MAX) { h *= MAX/w; w = MAX; }
        else if (h > MAX) { w *= MAX/h; h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        setNewAd({...newAd, image: canvas.toDataURL("image/jpeg", 0.7)});
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const postAd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "ads"), { ...newAd, authorId: deviceId, createdAt: serverTimestamp(), date: new Date().toLocaleDateString("he-IL") });
      setShowForm(false);
      setNewAd({ title: "", price: "", desc: "", tel: "", category: "שונות", image: "" });
    } catch(err) { alert("שגיאה"); }
    setLoading(false);
  };

  return (
    <div className="view-frame market-bg-soft">
      <button className="fixed-back dark" onClick={onBack}>➔ חזרה</button>
      
      <header className="page-header market-gradient">
        <div className="icon-main">🛒</div>
        <h1>שוק באר גנים</h1>
        <p>קונים, מוכרים ומוסרים בתוך היישוב</p>
      </header>

      <main className="main-content">
        <button className="add-trigger-btn market-color" onClick={() => setShowForm(true)}>+ פרסם מודעה חדשה</button>
        
        <div className="market-grid">
          {ads.map(ad => (
            <div key={ad.id} className="ad-card" onClick={() => setSelectedAd(ad)}>
              {ad.image && <img src={ad.image} alt="" className="ad-thumb" />}
              <div className="ad-body">
                <span className="ad-cat">{ad.category}</span>
                <h3 className="ad-title">{ad.title}</h3>
                <p className="ad-price">₪{ad.price}</p>
                <div className="ad-actions">
                  <a href={`https://wa.me/972${ad.tel?.replace(/\D/g, "").replace(/^0/, "")}`} 
                     target="_blank" rel="noreferrer" className="wa-link" onClick={e => e.stopPropagation()}>💬 הודעה</a>
                  {ad.authorId === deviceId && (
                    <button className="del-btn-icon" onClick={e => { e.stopPropagation(); deleteDoc(doc(db, "ads", ad.id)); }}>🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* מודל הצגת מודעה */}
      {selectedAd && (
        <div className="overlay" onClick={() => setSelectedAd(null)}>
          <div className="full-ad-modal" onClick={e => e.stopPropagation()}>
            <button className="close-x" onClick={() => setSelectedAd(null)}>✕</button>
            {selectedAd.image && <img src={selectedAd.image} alt="" className="full-img" />}
            <div className="full-body">
               <h2>{selectedAd.title}</h2>
               <div className="full-price">₪{selectedAd.price}</div>
               <p className="full-desc">{selectedAd.desc}</p>
               <div className="full-contact">
                 <a href={`https://wa.me/972${selectedAd.tel?.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="big-wa-btn">שלח וואטסאפ למוכר</a>
                 <a href={`tel:${selectedAd.tel}`} className="big-tel-btn">התקשר למוכר</a>
               </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="overlay">
          <form className="form-modal" onSubmit={postAd}>
            <h2>פרסום מודעה</h2>
            <input placeholder="מה המוצר? *" required onChange={e => setNewAd({...newAd, title: e.target.value})} />
            <div className="grid-inputs">
              <input placeholder="מחיר (₪) *" type="number" required onChange={e => setNewAd({...newAd, price: e.target.value})} />
              <select onChange={e => setNewAd({...newAd, category: e.target.value})}>
                {MARKET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <textarea placeholder="תיאור המוצר, מצבו וכו'..." onChange={e => setNewAd({...newAd, desc: e.target.value})} />
            <input placeholder="טלפון ליצירת קשר *" required onChange={e => setNewAd({...newAd, tel: e.target.value})} />
            <div className="file-box">
              <label>הוסף תמונה (מומלץ):</label>
              <input type="file" accept="image/*" onChange={handleImg} />
            </div>
            <button type="submit" className="save-btn market-bg" disabled={loading}>{loading ? "מפרסם..." : "פרסם בשוק"}</button>
            <button type="button" className="close-btn" onClick={() => setShowForm(false)}>ביטול</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. מסך הבית וניתוב ראשי (Home & App)
// ─────────────────────────────────────────────────────────────────────────────
function HomeView({ onNavigate }) {
  useEffect(() => { ReactGA.send({ hitType: "pageview", page: "/", title: "Home" }); }, []);
  return (
    <div className="home-screen">
      <div className="hero-text">
        <div className="main-logo">🏡</div>
        <h1>הפורטל של באר גנים</h1>
        <p>כל מה שקורה ביישוב במקום אחד</p>
      </div>
      
      <div className="nav-cards-grid">
        <div className="nav-card biz-card-style" onClick={() => onNavigate("businesses")}>
          <span className="nav-icon">🌿</span>
          <h3>עסקים מקומיים</h3>
          <p>מדריך העסקים והשירותים המלא</p>
        </div>
        
        <div className="nav-card market-card-style" onClick={() => onNavigate("market")}>
          <span className="nav-icon">🛒</span>
          <h3>השוק היישובי</h3>
          <p>לוח יד שנייה, מסירה ומכירה</p>
        </div>
      </div>
      
      <footer className="home-footer">
        <p>פותח באהבה ע"י יונתן יוסף</p>
      </footer>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  
  const deviceId = useMemo(() => {
    let id = localStorage.getItem("beerDeviceId");
    if (!id) { id = Math.random().toString(36).substr(2, 9); localStorage.setItem("beerDeviceId", id); }
    return id;
  }, []);

  const navigate = (v) => {
    setView(v);
    ReactGA.send({ hitType: "pageview", page: "/" + v, title: v });
  };

  return (
    <div className="app-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Heebo', sans-serif; }
        body { background: #f7f3ed; color: #1a0e06; direction: rtl; }
        
        /* Header Styles */
        .page-header { padding: 50px 20px; text-align: center; color: white; position: relative; }
        .biz-gradient { background: linear-gradient(135deg, #1a0d04, #573015); }
        .market-gradient { background: linear-gradient(135deg, #0f172a, #334155); }
        .icon-main { font-size: 50px; margin-bottom: 10px; }
        .page-header h1 { font-size: 36px; font-weight: 900; }
        
        /* Navigation & Search */
        .sticky-bar { position: sticky; top: 0; z-index: 100; background: rgba(247, 243, 237, 0.96); backdrop-filter: blur(10px); padding: 12px; border-bottom: 1px solid #ecdfc8; }
        .search-box input { width: 100%; padding: 14px 22px; border-radius: 50px; border: 2px solid #e8d5b7; outline: none; font-size: 16px; }
        .cat-nav { display: flex; gap: 8px; overflow-x: auto; padding: 12px 0 5px; scrollbar-width: none; flex-wrap: nowrap; }
        .pill { padding: 7px 16px; border-radius: 50px; border: 2px solid #e8d5b7; background: white; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: .2s; }
        .pill.act { background: #c4651a; color: white; border-color: #c4651a; box-shadow: 0 4px 10px rgba(196,101,26,0.25); }
        
        /* Grid Layouts */
        .main-content { max-width: 1200px; margin: auto; padding: 20px; }
        .biz-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .market-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media(max-width: 950px){ .biz-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 600px){ .biz-grid, .market-grid { grid-template-columns: 1fr; } }
        
        /* Business Card Styles */
        .card { background: white; border-radius: 18px; padding: 18px; border: 1.5px solid #ecdfc8; cursor: pointer; transition: transform .25s, box-shadow .25s; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
        .cat-badge { font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 12px; margin-bottom: 8px; display: inline-block; }
        .biz-name { font-size: 16px; font-weight: 900; margin-bottom: 6px; }
        .biz-desc { font-size: 13px; color: #6b5030; line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
        .open-badge-tag { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; }
        .open-badge-tag.open { background: #dcfce7; color: #16a34a; }
        .open-badge-tag.closed { background: #fee2e2; color: #dc2626; }
        .open-badge-tag .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .card-footer-phone { border-top: 1px solid #f5ede0; padding-top: 10px; font-size: 14px; font-weight: 700; color: #1d4ed8; display: flex; align-items: center; gap: 6px; }
        .card-footer-phone a { text-decoration: none; color: inherit; }
        
        /* Action Buttons */
        .action-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 15px; }
        .act-btn { flex: 1; min-width: 80px; text-align: center; padding: 8px; border-radius: 50px; text-decoration: none; font-size: 12px; font-weight: bold; border: 1.5px solid #ddd; color: #333; }
        .tel-bg { background: #c4651a; color: white; border: none; }
        .wa-bg { border-color: #25d366; color: #16a34a; }
        .tiktok-bg { background: #000; color: white; border: none; }
        .site-bg { border-color: #7c3aed; color: #7c3aed; }
        
        /* Market Styles */
        .market-bg-soft { background: #f8fafc; }
        .ad-card { background: white; border-radius: 15px; overflow: hidden; border: 1px solid #e2e8f0; cursor: pointer; transition: .2s; }
        .ad-thumb { width: 100%; height: 150px; object-fit: cover; border-bottom: 1px solid #eee; }
        .ad-body { padding: 12px; }
        .ad-cat { font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #64748b; font-weight: bold; }
        .ad-title { font-size: 15px; font-weight: 800; margin: 5px 0; }
        .ad-price { font-size: 18px; color: #2563eb; font-weight: 900; }
        .wa-link { background: #25d366; color: white; padding: 6px 12px; border-radius: 50px; text-decoration: none; font-size: 12px; font-weight: bold; }
        
        /* Modal & Forms */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justifyContent: center; padding: 20px; }
        .form-modal { background: white; padding: 25px; border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
        .form-modal h2 { margin-bottom: 20px; font-weight: 900; }
        .input-group { margin-bottom: 12px; }
        .input-group label { display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px; color: #6b5030; }
        .input-group input, .input-group select, .input-group textarea { width: 100%; padding: 12px; border: 1px solid #e8d5b7; border-radius: 10px; outline: none; font-size: 14px; }
        .grid-inputs { display: flex; gap: 10px; }
        .save-btn { width: 100%; padding: 15px; border-radius: 12px; background: #c4651a; color: white; border: none; font-weight: 900; font-size: 16px; cursor: pointer; margin-top: 10px; }
        .save-btn.market-bg { background: #2563eb; }
        
        /* Home Screen */
        .home-screen { min-height: 100vh; background: linear-gradient(135deg, #fdfbf7, #f4eee3); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; }
        .hero-text { text-align: center; margin-bottom: 40px; }
        .main-logo { font-size: 70px; }
        .hero-text h1 { font-size: 40px; font-weight: 900; }
        .nav-cards-grid { display: grid; gap: 20px; width: 100%; max-width: 400px; }
        .nav-card { padding: 30px; border-radius: 25px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; transition: .2s; text-align: center; }
        .nav-card:hover { transform: scale(1.04); }
        .biz-card-style { background: #1a0d04; color: #f5e6cc; box-shadow: 0 10px 30px rgba(87,48,21,0.2); }
        .market-card-style { background: #0f172a; color: #f8fafc; box-shadow: 0 10px 30px rgba(15,23,42,0.2); }
        .nav-icon { font-size: 45px; }
        
        /* Utils */
        .fixed-back { position: fixed; top: 15px; right: 15px; z-index: 1000; padding: 8px 18px; border-radius: 50px; border: none; background: rgba(255,255,255,0.15); color: white; cursor: pointer; font-weight: bold; backdrop-filter: blur(5px); }
        .fixed-back.dark { background: rgba(0,0,0,0.05); color: #0f172a; }
        .add-trigger-btn { width: 100%; padding: 16px; border-radius: 15px; border: none; color: white; font-weight: 900; font-size: 16px; cursor: pointer; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .biz-color { background: #c4651a; }
        .market-color { background: #2563eb; }
        .fa { opacity: 0; transform: translateY(15px); transition: all .4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .fa.vis { opacity: 1; transform: translateY(0); }
      `}</style>

      {view === "home" && <HomeView onNavigate={navigate} />}
      {view === "businesses" && <BusinessesView onBack={() => navigate("home")} deviceId={deviceId} />}
      {view === "market" && <MarketView onBack={() => navigate("home")} deviceId={deviceId} />}
    </div>
  );
}
