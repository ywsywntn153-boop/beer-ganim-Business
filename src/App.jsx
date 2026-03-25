import { useState, useMemo, useEffect } from "react";
import Fuse from "fuse.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import ReactGA from "react-ga4";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. הגדרות וחיבורים (Firebase & Analytics)
 * ─────────────────────────────────────────────────────────────────────────────
 */
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

// המזהה האישי שלך יונתן
ReactGA.initialize("G-88P0P0JPWQ");

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. קבועים וקטגוריות
 * ─────────────────────────────────────────────────────────────────────────────
 */
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. פונקציות עזר (Helper Functions)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function getOpenStatus(h) {
  if (!h) return null;
  if (h.includes("24 שעות")) return "open";
  const now = new Date();
  const day = now.getDay();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  
  // בדיקת ימי מנוחה
  if ((h.includes("שישי סגור") || h.includes("שישי ושבת סגור")) && day === 5) return "closed";
  if ((h.includes("שבת סגור") || h.includes("שישי ושבת סגור")) && day === 6) return "closed";
  
  // חילוץ שעות מפורמט 00:00-00:00
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
      {s === "open" ? "פתוח עכשיו" : "סגור כרגע"}
    </span>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. רכיב כרטיס עסק (Business Card)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function BizCard({ biz, idx, expanded, onToggle, mounted, isOwner, onDelete }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };
  
  const track = (action) => {
    ReactGA.event({ category: "Business", action: action, label: biz.name });
  };

  return (
    <div className={`card fa ${mounted ? "vis" : ""}`} 
         style={{ transitionDelay: `${Math.min(idx * 35, 500)}ms`, borderTop: `4px solid ${cs.color}` }} 
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

      <div style={{ marginBottom: 12 }}>
        <OpenBadge hours={biz.hours} />
      </div>

      <div className="card-footer-phone">
        <span style={{fontSize: 18}}>📞</span>
        {biz.tel ? (
          <a href={`tel:${biz.tel}`} onClick={e => { e.stopPropagation(); track("Call Direct"); }}>{biz.tel}</a>
        ) : <span className="no-tel">לחץ לפרטי התקשרות</span>}
      </div>

      {expanded && (
        <div className="expanded-zone">
          <div className="detail-row">
            <span className="icon">📍</span> 
            <span className="val">{biz.addr || "באר גנים"}</span>
          </div>
          {biz.hours && (
            <div className="detail-row">
              <span className="icon">🕐</span> 
              <span className="val">{biz.hours}</span>
            </div>
          )}
          
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
              <a href={biz.site.startsWith("http") ? biz.site : `https://${biz.site}`} 
                 target="_blank" rel="noreferrer" className="act-btn site-bg" 
                 onClick={e => { e.stopPropagation(); track("Website"); }}>🌐 אתר</a>
            )}
          </div>

          {isOwner && (
            <div className="owner-actions">
              <button className="del-btn-biz" onClick={e => { e.stopPropagation(); if(window.confirm("למחוק את העסק?")) onDelete(); }}>
                🗑️ מחק את העסק שלי מהמדריך
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. מסך העסקים (Businesses View)
 * ─────────────────────────────────────────────────────────────────────────────
 */
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
      setTimeout(() => setMounted(true), 50);
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
    if (!newBiz.name || !newBiz.desc || !newBiz.tel) return alert("נא למלא את כל שדות החובה (*)");
    setLoading(true);
    try {
      await addDoc(collection(db, "businesses"), { 
        ...newBiz, 
        authorId: deviceId, 
        createdAt: serverTimestamp() 
      });
      ReactGA.event({ category: "Engagement", action: "Add Business", label: newBiz.cat });
      setShowForm(false);
      setNewBiz({ name: "", cat: "מזון ואוכל", tel: "", hours: "", addr: "", site: "", tiktok: "", desc: "" });
    } catch (err) { 
      console.error(err);
      alert("שגיאה בשמירת הנתונים."); 
    }
    setLoading(false);
  };

  return (
    <div className="view-frame">
      <button className="fixed-back" onClick={onBack}>➔ חזרה למסך הבית</button>
      
      <header className="page-header biz-gradient">
        <div className="header-content">
          <div className="icon-main">🌿</div>
          <h1>עסקים בבאר גנים</h1>
          <p>האינדקס הקהילתי של בעלי העסקים ונותני השירות</p>
          <div className="stats-pill">{businesses.length} עסקים רשומים</div>
        </div>
      </header>

      <div className="sticky-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="חפש לפי שם, תחום או מילות מפתח..." onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="cat-nav">
          <button className={`pill ${activeCat === "הכל" ? "act" : ""}`} onClick={() => setActiveCat("הכל")}>🏘️ הכל</button>
          {Object.keys(CATEGORIES).map(c => (
            <button key={c} className={`pill ${activeCat === c ? "act" : ""}`} onClick={() => {
              setActiveCat(c);
              ReactGA.event({ category: "Filter", action: "Category Select", label: c });
            }}>
              {CATEGORIES[c].emoji} {c}
            </button>
          ))}
        </div>
      </div>

      <main className="main-content">
        <button className="add-trigger-btn biz-color" onClick={() => setShowForm(true)}>
          <span className="plus-icon">+</span> הוסף את העסק שלך למדריך בחינם
        </button>
        
        <div className="biz-grid">
          {filtered.length > 0 ? (
            filtered.map((biz, i) => (
              <BizCard 
                key={biz.id} biz={biz} idx={i} 
                expanded={expandedId === biz.id} 
                onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)}
                mounted={mounted} isOwner={biz.authorId === deviceId}
                onDelete={() => deleteDoc(doc(db, "businesses", biz.id))}
              />
            ))
          ) : (
            <div className="no-results">לא נמצאו עסקים התואמים את החיפוש...</div>
          )}
        </div>
      </main>

      {showForm && (
        <div className="overlay">
          <form className="form-modal animate-pop" onSubmit={handleAdd}>
            <div className="modal-header">
              <h2>רישום עסק חדש</h2>
              <button type="button" className="close-x" onClick={() => setShowForm(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="input-group">
                <label>שם העסק / נותן השירות *</label>
                <input required placeholder="למשל: יונתן פיתוח אתרים" onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
              </div>
              
              <div className="input-group">
                <label>בחר קטגוריה *</label>
                <select value={newBiz.cat} onChange={e => setNewBiz({...newBiz, cat: e.target.value})}>
                  {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{CATEGORIES[c].emoji} {c}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>תיאור השירות (מה אתם מציעים?) *</label>
                <textarea required placeholder="ספר קצת על העסק שלך..." onChange={e => setNewBiz({...newBiz, desc: e.target.value})} />
              </div>

              <div className="grid-inputs">
                <div className="input-group">
                  <label>טלפון ליצירת קשר *</label>
                  <input required type="tel" placeholder="05XXXXXXXX" onChange={e => setNewBiz({...newBiz, tel: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>כתובת ביישוב</label>
                  <input placeholder="למשל: הרימון 5" onChange={e => setNewBiz({...newBiz, addr: e.target.value})} />
                </div>
              </div>

              <div className="input-group">
                <label>שעות פתיחה</label>
                <input placeholder="למשל: א-ה 08:00-17:00, ו' סגור" onChange={e => setNewBiz({...newBiz, hours: e.target.value})} />
              </div>

              <div className="links-section">
                <p className="section-title">קישורים ורשתות חברתיות:</p>
                <div className="link-input">
                  <span>🌐</span>
                  <input placeholder="לינק לאתר העסק" onChange={e => setNewBiz({...newBiz, site: e.target.value})} />
                </div>
                <div className="link-input">
                  <span>🎵</span>
                  <input placeholder="לינק לעמוד הטיקטוק" onChange={e => setNewBiz({...newBiz, tiktok: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? "מעלה נתונים..." : "פרסם במדריך העסקים"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. מסך השוק (Market View)
 * ─────────────────────────────────────────────────────────────────────────────
 */
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
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > h && w > MAX) { h *= MAX/w; w = MAX; }
        else if (h > MAX) { w *= MAX/h; h = MAX; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        setNewAd({...newAd, image: canvas.toDataURL("image/jpeg", 0.7)});
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const postAd = async (e) => {
    e.preventDefault();
    if(!newAd.title || !newAd.price || !newAd.tel) return alert("מלא שדות חובה");
    setLoading(true);
    try {
      await addDoc(collection(db, "ads"), { 
        ...newAd, 
        authorId: deviceId, 
        createdAt: serverTimestamp(), 
        date: new Date().toLocaleDateString("he-IL") 
      });
      setShowForm(false);
      setNewAd({ title: "", price: "", desc: "", tel: "", category: "שונות", image: "" });
    } catch(err) { alert("שגיאה בפרסום."); }
    setLoading(false);
  };

  return (
    <div className="view-frame market-bg-soft">
      <button className="fixed-back dark" onClick={onBack}>➔ חזרה למסך הבית</button>
      
      <header className="page-header market-gradient">
        <div className="header-content">
          <div className="icon-main">🛒</div>
          <h1>שוק באר גנים</h1>
          <p>לוח המודעות של הקהילה - קנייה, מכירה ומסירה בחינם</p>
        </div>
      </header>

      <main className="main-content">
        <button className="add-trigger-btn market-color" onClick={() => setShowForm(true)}>
          <span className="plus-icon">+</span> פרסם מודעה חדשה בלוח
        </button>
        
        <div className="market-grid">
          {ads.length > 0 ? (
            ads.map(ad => (
              <div key={ad.id} className="ad-card" onClick={() => setSelectedAd(ad)}>
                <div className="ad-img-container">
                  {ad.image ? (
                    <img src={ad.image} alt="" className="ad-thumb" />
                  ) : (
                    <div className="no-img-placeholder">📦 אין תמונה</div>
                  )}
                </div>
                <div className="ad-body">
                  <span className="ad-cat">{ad.category}</span>
                  <h3 className="ad-title">{ad.title}</h3>
                  <p className="ad-price">₪{ad.price}</p>
                  <div className="ad-actions">
                    <a href={`https://wa.me/972${ad.tel?.replace(/\D/g, "").replace(/^0/, "")}`} 
                       target="_blank" rel="noreferrer" className="wa-link" onClick={e => e.stopPropagation()}>💬 שלח הודעה</a>
                    {ad.authorId === deviceId && (
                      <button className="del-btn-icon" onClick={e => { e.stopPropagation(); if(window.confirm("למחוק את המודעה?")) deleteDoc(doc(db, "ads", ad.id)); }}>🗑️</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
             <div className="no-results" style={{gridColumn: "1/-1"}}>הלוח ריק כרגע... תהיו הראשונים לפרסם!</div>
          )}
        </div>
      </main>

      {/* פופ-אפ להצגת מודעה מלאה */}
      {selectedAd && (
        <div className="overlay" onClick={() => setSelectedAd(null)}>
          <div className="full-ad-modal" onClick={e => e.stopPropagation()}>
            <button className="close-x-big" onClick={() => setSelectedAd(null)}>✕</button>
            <div className="modal-scroll-area">
              {selectedAd.image && <img src={selectedAd.image} alt="" className="full-img" />}
              <div className="full-body">
                 <div className="full-header">
                   <span className="full-cat">{selectedAd.category}</span>
                   <h2>{selectedAd.title}</h2>
                   <div className="full-price-tag">₪{selectedAd.price}</div>
                 </div>
                 <div className="full-desc-box">
                   <p>{selectedAd.desc}</p>
                 </div>
                 <div className="full-meta">פורסם בתאריך: {selectedAd.date}</div>
                 <div className="full-contact-btns">
                   <a href={`https://wa.me/972${selectedAd.tel?.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="big-btn wa">💬 שלח הודעת וואטסאפ</a>
                   <a href={`tel:${selectedAd.tel}`} className="big-btn tel">📞 התקשר למוכר</a>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="overlay">
          <form className="form-modal animate-pop" onSubmit={postAd}>
            <div className="modal-header">
              <h2>פרסום מודעה חדשה</h2>
              <button type="button" className="close-x" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>מה המוצר או החפץ? *</label>
                <input required placeholder="כותרת קצרה למודעה" onChange={e => setNewAd({...newAd, title: e.target.value})} />
              </div>
              <div className="grid-inputs">
                <div className="input-group">
                  <label>מחיר (₪) *</label>
                  <input placeholder="0 (למסירה חינם)" type="number" required onChange={e => setNewAd({...newAd, price: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>קטגוריה *</label>
                  <select onChange={e => setNewAd({...newAd, category: e.target.value})}>
                    {MARKET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>תיאור המוצר ומצבו</label>
                <textarea placeholder="פרט על המוצר..." onChange={e => setNewAd({...newAd, desc: e.target.value})} />
              </div>
              <div className="input-group">
                <label>טלפון ליצירת קשר *</label>
                <input required placeholder="05XXXXXXXX" onChange={e => setNewAd({...newAd, tel: e.target.value})} />
              </div>
              <div className="file-upload-zone">
                <label>הוספת תמונה (מומלץ מאוד):</label>
                <input type="file" accept="image/*" onChange={handleImg} />
                {newAd.image && <img src={newAd.image} className="preview-img-small" alt="preview" />}
              </div>
            </div>
            <div className="modal-footer">
              <button type="submit" className="save-btn market-bg" disabled={loading}>
                {loading ? "מעלה מודעה..." : "פרסם עכשיו בשוק"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. מסך הבית וניתוב ראשי (Home & App)
 * ─────────────────────────────────────────────────────────────────────────────
 */
function HomeView({ onNavigate }) {
  useEffect(() => { 
    ReactGA.send({ hitType: "pageview", page: "/", title: "Home Screen" }); 
  }, []);

  return (
    <div className="home-screen">
      <div className="home-container">
        <header className="home-hero">
          <div className="hero-logo">🏡</div>
          <h1 className="home-title">הפורטל של באר גנים</h1>
          <p className="home-subtitle">הכל קורה כאן - בתוך הקהילה שלנו</p>
        </header>
        
        <div className="nav-menu">
          <div className="nav-item biz-card-style" onClick={() => onNavigate("businesses")}>
            <div className="nav-icon-box">🌿</div>
            <div className="nav-text">
              <h3>עסקים מקומיים</h3>
              <p>מצא נותני שירות בתוך היישוב</p>
            </div>
            <div className="nav-arrow">➔</div>
          </div>
          
          <div className="nav-item market-card-style" onClick={() => onNavigate("market")}>
            <div className="nav-icon-box">🛒</div>
            <div className="nav-text">
              <h3>השוק היישובי</h3>
              <p>לוח יד שנייה ומסירה בחינם</p>
            </div>
            <div className="nav-arrow">➔</div>
          </div>
        </div>
        
        <footer className="home-footer">
          <div className="footer-line"></div>
          <p>פותח ע"י <strong>יונתן יוסף</strong> | 2026</p>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  
  // מזהה מכשיר ייחודי למחיקת תוכן אישי
  const deviceId = useMemo(() => {
    let id = localStorage.getItem("beerGanimId_v2");
    if (!id) { 
      id = "user_" + Math.random().toString(36).substr(2, 9); 
      localStorage.setItem("beerGanimId_v2", id); 
    }
    return id;
  }, []);

  const navigate = (v) => {
    setView(v);
    window.scrollTo(0, 0);
    ReactGA.send({ hitType: "pageview", page: "/" + v, title: v });
  };

  return (
    <div className="app-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&display=swap');
        
        :root {
          --biz-dark: #1a0d04;
          --biz-primary: #c4651a;
          --biz-light: #f7f3ed;
          --market-dark: #0f172a;
          --market-primary: #2563eb;
          --market-light: #f8fafc;
          --text-main: #1a0e06;
          --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Heebo', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: var(--biz-light); color: var(--text-main); direction: rtl; overflow-x: hidden; }

        /* General Layout */
        .view-frame { min-height: 100vh; display: flex; flex-direction: column; }
        .page-header { padding: 60px 20px; text-align: center; color: white; position: relative; overflow: hidden; }
        .biz-gradient { background: linear-gradient(145deg, var(--biz-dark), #573015); }
        .market-gradient { background: linear-gradient(145deg, var(--market-dark), #334155); }
        .header-content { position: relative; z-index: 2; }
        .icon-main { font-size: 55px; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2)); }
        .page-header h1 { font-size: 40px; font-weight: 900; letter-spacing: -1px; }
        .stats-pill { display: inline-block; margin-top: 15px; background: rgba(255,255,255,0.15); padding: 5px 15px; border-radius: 50px; font-size: 14px; backdrop-filter: blur(5px); }

        /* Sticky Navigation */
        .sticky-bar { position: sticky; top: 0; z-index: 100; background: rgba(247, 243, 237, 0.96); backdrop-filter: blur(12px); padding: 12px; border-bottom: 1px solid #ecdfc8; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .search-box { position: relative; max-width: 600px; margin: 0 auto; }
        .search-box input { width: 100%; padding: 14px 45px 14px 20px; border-radius: 50px; border: 2px solid #e8d5b7; outline: none; font-size: 16px; transition: var(--transition); }
        .search-box input:focus { border-color: var(--biz-primary); box-shadow: 0 0 0 4px rgba(196,101,26,0.1); }
        .search-icon { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); color: #b09070; font-size: 18px; }
        
        .cat-nav { display: flex; gap: 8px; overflow-x: auto; padding: 12px 0 5px; scrollbar-width: none; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
        .cat-nav::-webkit-scrollbar { display: none; }
        .pill { padding: 8px 18px; border-radius: 50px; border: 2px solid #e8d5b7; background: white; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: var(--transition); color: #7a5c3a; }
        .pill.act { background: var(--biz-primary); color: white; border-color: var(--biz-primary); box-shadow: 0 6px 12px rgba(196,101,26,0.25); transform: translateY(-1px); }

        /* Grid System (3 Columns on Desktop!) */
        .main-content { max-width: 1200px; margin: 0 auto; padding: 25px 15px; width: 100%; }
        .biz-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .market-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        @media(max-width: 1000px){ .biz-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 650px){ .biz-grid, .market-grid { grid-template-columns: 1fr; } }

        /* Business Card Details */
        .card { background: white; border-radius: 20px; padding: 20px; border: 1.5px solid #ecdfc8; cursor: pointer; transition: var(--transition); position: relative; display: flex; flex-direction: column; height: fit-content; }
        .card:hover { transform: translateY(-5px); box-shadow: 0 12px 30px rgba(0,0,0,0.07); }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .cat-badge { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 12px; display: inline-block; margin-bottom: 10px; }
        .biz-name { font-size: 18px; font-weight: 900; color: #1a0d04; }
        .arrow { font-size: 20px; color: #c4a97d; transition: transform 0.3s; }
        .arrow.up { transform: rotate(180deg); }
        .biz-desc { font-size: 14px; color: #6b5030; line-height: 1.6; margin-bottom: 15px; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
        
        .open-badge-tag { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; }
        .open-badge-tag.open { background: #dcfce7; color: #16a34a; }
        .open-badge-tag.closed { background: #fee2e2; color: #dc2626; }
        .open-badge-tag .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        
        .card-footer-phone { border-top: 1px solid #f5ede0; padding-top: 15px; font-size: 16px; font-weight: 800; color: #1d4ed8; display: flex; align-items: center; gap: 8px; }
        .card-footer-phone a { text-decoration: none; color: inherit; }
        .no-tel { color: #b09070; font-style: italic; font-size: 14px; }

        /* Expanded Zone */
        .expanded-zone { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e8d5b7; animation: slideDown 0.3s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .detail-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 14px; color: #4a3218; }
        .action-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
        .act-btn { flex: 1; min-width: 100px; text-align: center; padding: 10px; border-radius: 50px; text-decoration: none; font-size: 13px; font-weight: bold; border: 2px solid #e8d5b7; color: #555; transition: var(--transition); }
        .tel-bg { background: var(--biz-primary); color: white; border: none; box-shadow: 0 4px 12px rgba(196,101,26,0.2); }
        .wa-bg { border-color: #25d366; color: #16a34a; }
        .tiktok-bg { background: #000; color: white; border: none; }
        .site-bg { border-color: #7c3aed; color: #7c3aed; }
        .owner-actions { margin-top: 20px; text-align: center; }
        .del-btn-biz { background: #fff5f5; color: #e53e3e; border: none; padding: 8px 15px; border-radius: 10px; font-size: 12px; font-weight: bold; cursor: pointer; }

        /* Market Styles */
        .market-bg-soft { background: var(--market-light); }
        .ad-card { background: white; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; cursor: pointer; transition: var(--transition); }
        .ad-card:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.05); transform: translateY(-3px); }
        .ad-img-container { width: 100%; height: 180px; background: #f1f5f9; position: relative; }
        .ad-thumb { width: 100%; height: 100%; object-fit: cover; }
        .no-img-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-weight: bold; }
        .ad-body { padding: 15px; }
        .ad-cat { font-size: 11px; background: #eff6ff; color: #2563eb; padding: 3px 8px; border-radius: 6px; font-weight: 800; }
        .ad-title { font-size: 17px; font-weight: 900; margin: 8px 0 4px; color: #0f172a; }
        .ad-price { font-size: 20px; color: var(--market-primary); font-weight: 900; margin-bottom: 12px; }
        .wa-link { display: inline-block; background: #25d366; color: white; padding: 8px 16px; border-radius: 50px; text-decoration: none; font-size: 13px; font-weight: bold; box-shadow: 0 4px 10px rgba(37,211,102,0.3); }
        .del-btn-icon { float: left; border: none; background: #fee2e2; color: #dc2626; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; }

        /* Market Modal */
        .full-ad-modal { background: white; border-radius: 25px; width: 100%; max-width: 600px; max-height: 90vh; position: relative; overflow: hidden; animation: popUp 0.3s ease; }
        @keyframes popUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .modal-scroll-area { max-height: 90vh; overflow-y: auto; padding-bottom: 30px; }
        .full-img { width: 100%; maxHeight: 400px; object-fit: contain; background: #000; }
        .full-body { padding: 25px; }
        .full-header { margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 15px; }
        .full-price-tag { font-size: 28px; color: var(--market-primary); font-weight: 900; margin-top: 10px; }
        .full-desc-box { background: #f8fafc; padding: 15px; border-radius: 15px; color: #334155; line-height: 1.7; margin-bottom: 20px; white-space: pre-wrap; }
        .full-contact-btns { display: grid; gap: 10px; }
        .big-btn { padding: 15px; border-radius: 15px; text-align: center; text-decoration: none; font-weight: 800; font-size: 16px; }
        .big-btn.wa { background: #25d366; color: white; box-shadow: 0 4px 15px rgba(37,211,102,0.3); }
        .big-btn.tel { background: #f1f5f9; color: #0f172a; }

        /* Home Screen */
        .home-screen { min-height: 100vh; background: linear-gradient(135deg, #fdfbf7, #f4eee3); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .home-container { width: 100%; max-width: 500px; text-align: center; }
        .home-hero { margin-bottom: 50px; }
        .hero-logo { font-size: 85px; margin-bottom: 15px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
        .home-title { font-size: 44px; font-weight: 900; color: var(--biz-dark); letter-spacing: -1.5px; }
        .home-subtitle { color: #8a6a4a; font-size: 18px; font-weight: 400; }
        
        .nav-menu { display: grid; gap: 15px; }
        .nav-item { background: white; padding: 25px; border-radius: 25px; display: flex; align-items: center; gap: 20px; cursor: pointer; transition: var(--transition); border: 2px solid transparent; text-align: right; }
        .nav-item:hover { transform: translateX(-10px); border-color: #ecdfc8; }
        .nav-icon-box { width: 65px; height: 65px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; }
        .biz-card-style .nav-icon-box { background: #1a0d04; }
        .market-card-style .nav-icon-box { background: #0f172a; }
        .nav-text { flex: 1; }
        .nav-text h3 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
        .nav-text p { font-size: 14px; color: #8a6a4a; }
        .nav-arrow { font-size: 24px; color: #ecdfc8; }

        /* Forms & Modals */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 15px; }
        .form-modal { background: white; border-radius: 25px; width: 100%; max-width: 520px; max-height: 95vh; overflow-y: auto; display: flex; flex-direction: column; }
        .modal-header { padding: 20px 25px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 25px; }
        .input-group { margin-bottom: 15px; }
        .input-group label { display: block; font-size: 13px; font-weight: 800; margin-bottom: 6px; color: #6b5030; }
        .input-group input, .input-group select, .input-group textarea { width: 100%; padding: 14px; border: 2px solid #f1f5f9; border-radius: 12px; font-size: 15px; outline: none; transition: 0.2s; background: #f8fafc; }
        .input-group input:focus { border-color: var(--biz-primary); background: white; }
        .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .save-btn { width: 100%; padding: 16px; border-radius: 15px; border: none; color: white; font-weight: 900; font-size: 18px; cursor: pointer; transition: 0.2s; }
        .save-btn.market-bg { background: var(--market-primary); }
        .save-btn:not(.market-bg) { background: var(--biz-primary); }
        
        /* Utils */
        .fixed-back { position: fixed; top: 15px; right: 15px; z-index: 1000; padding: 10px 20px; border-radius: 50px; border: none; background: rgba(0,0,0,0.7); color: white; cursor: pointer; font-weight: 800; backdrop-filter: blur(10px); }
        .fixed-back.dark { background: rgba(0,0,0,0.05); color: #0f172a; }
        .add-trigger-btn { width: 100%; padding: 18px; border-radius: 20px; border: none; color: white; font-weight: 900; font-size: 18px; cursor: pointer; margin-bottom: 25px; transition: var(--transition); display: flex; align-items: center; justify-content: center; gap: 10px; }
        .add-trigger-btn:hover { filter: brightness(1.1); transform: scale(1.02); }
        .biz-color { background: var(--biz-primary); box-shadow: 0 8px 20px rgba(196,101,26,0.3); }
        .market-color { background: var(--market-primary); box-shadow: 0 8px 20px rgba(37,99,235,0.3); }
        
        .no-results { text-align: center; padding: 60px 20px; color: #b09070; font-weight: 800; font-size: 18px; }
        .fa { opacity: 0; transform: translateY(20px); transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .fa.vis { opacity: 1; transform: translateY(0); }
        
        @media(max-width: 500px){
           .page-header { padding: 40px 15px; }
           .home-title { font-size: 34px; }
           .biz-grid { gap: 12px; }
        }
      `}</style>

      {view === "home" && <HomeView onNavigate={navigate} />}
      {view === "businesses" && <BusinessesView onBack={() => navigate("home")} deviceId={deviceId} />}
      {view === "market" && <MarketView onBack={() => navigate("home")} deviceId={deviceId} />}
    </div>
  );
}
