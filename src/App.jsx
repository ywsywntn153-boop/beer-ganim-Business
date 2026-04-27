import { useState, useMemo, useEffect } from "react";
import Fuse from "fuse.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";

// --- החיבור שלך לפיירבייס ---
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

// --- פונקציית מעקב בטוחה ---
const trackEvent = (action, category, label) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", action, {
      event_category: category,
      event_label: label
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. הגדרות וקטגוריות
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s === "open" ? "#dcfce7" : "#fee2e2", color: s === "open" ? "#16a34a" : "#dc2626", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s === "open" ? "#16a34a" : "#dc2626", display: "inline-block" }} />
      {s === "open" ? "פתוח" : "סגור"}
    </span>
  );
}

function Card({ biz, idx, expanded, onToggle, mounted, isOwner, onDelete, onEdit, isFavorite, onToggleFav }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };
  
  const track = (actionName) => {
    trackEvent(actionName, "Business", biz.name);
  };

  return (
    <div className={`card fa ${mounted ? "vis" : ""}`} style={{ transitionDelay: `${Math.min(idx * 35, 500)}ms`, borderTop: `3px solid ${cs.color}` }} onClick={() => { onToggle(); if (!expanded) track("Expand Card"); }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cs.bg, color: cs.color, padding: "2px 6px", borderRadius: 20, fontSize: 10, fontWeight: 700, marginBottom: 5 }}>
            {cs.emoji} {biz.cat}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a0e06", lineHeight: 1.2, margin: 0 }}>{biz.name}</h3>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }} 
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: 0, transition: "transform 0.2s", transform: isFavorite ? "scale(1.1)" : "scale(1)" }}
            title="שמור במועדפים"
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
          <span style={{ fontSize: 16, color: "#c4a97d", transition: "transform .28s", transform: expanded ? "rotate(180deg)" : "rotate(0)", flexShrink: 0 }}>▾</span>
        </div>
      </div>
      
      <p style={{ fontSize: 13, color: "#6b5030", marginTop: 4, marginBottom: 8, lineHeight: 1.4, display: expanded ? "block" : "-webkit-box", WebkitLineClamp: expanded ? "none" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{biz.desc}</p>
      
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><OpenBadge hours={biz.hours} /></div>
      
      <div className="dr" style={{ borderTop: "1px solid #f0e8d8", paddingTop: 8, paddingBottom: 0 }}>
        <span style={{ fontSize: 13, flexShrink: 0 }}>📞</span>
        {biz.tel ? <a href={`tel:${biz.tel}`} onClick={e => { e.stopPropagation(); track("Call Link"); }} style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>{biz.tel}</a> : <span style={{ color: "#b09070", fontSize: 12, fontStyle: "italic" }}>פרטים בפנים</span>}
      </div>

      {expanded && (
        <div className="ex" style={{ marginTop: 10 }}>
          {biz.addr && biz.addr !== "באר גנים" && <div className="dr" style={{ padding: "4px 0" }}><span style={{ fontSize: 13 }}>📍</span><span style={{ color: "#4a3218", fontSize: 12 }}>{biz.addr}</span></div>}
          {biz.hours && <div className="dr" style={{ padding: "4px 0" }}><span style={{ fontSize: 13 }}>🕐</span><span style={{ color: "#4a3218", lineHeight: 1.4, fontSize: 12 }}>{biz.hours}</span></div>}
          
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {biz.tel && (
              <>
                <a href={`tel:${biz.tel}`} className="ab p" onClick={e => { e.stopPropagation(); track("Call Button"); }}>📞 התקשר</a>
                <a href={`https://wa.me/972${biz.tel.replace(/[^0-9]/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="ab o" onClick={e => { e.stopPropagation(); track("WhatsApp"); }} style={{ color: "#16a34a", borderColor: "#bbf7d0" }}>💬 וואטסאפ</a>
              </>
            )}
            {biz.site && <a href={biz.site.startsWith("http") ? biz.site : "https://" + biz.site} target="_blank" rel="noreferrer" className="ab o" onClick={e => { e.stopPropagation(); track("Website"); }} style={{ color: "#7c3aed", borderColor: "#ddd6fe" }}>🌐 אתר</a>}
            {biz.ig && <a href={biz.ig} target="_blank" rel="noreferrer" className="ab o" onClick={e => { e.stopPropagation(); track("Instagram"); }} style={{ color: "#e1306c", borderColor: "#fbcfe8" }}>📷 אינסטגרם</a>}
            {biz.fb && biz.fb.startsWith("http") && <a href={biz.fb} target="_blank" rel="noreferrer" className="ab o" onClick={e => { e.stopPropagation(); track("Facebook"); }} style={{ color: "#1877f2", borderColor: "#bfdbfe" }}>📘 פייסבוק</a>}
            {biz.tiktok && biz.tiktok.startsWith("http") && <a href={biz.tiktok} target="_blank" rel="noreferrer" className="ab o" onClick={e => { e.stopPropagation(); track("TikTok"); }} style={{ color: "#000", borderColor: "#ccc" }}>🎵 טיקטוק</a>}
          </div>

          {isOwner && (
            <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed #ecdfc8", textAlign: "left", display: "flex", gap: "8px" }}>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ background: "#e0f2fe", border: "none", color: "#0284c7", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                ✏️ ערוך עסק
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: "#fee2e2", border: "none", color: "#dc2626", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                🗑️ מחק עסק
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. מסך העסקים - BusinessesView
// ─────────────────────────────────────────────────────────────────────────────
function BusinessesView({ onBack, isAdmin }) {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("הכל");
  const [expandedId, setExpandedId] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingBizId, setEditingBizId] = useState(null); 
  const [newBiz, setNewBiz] = useState({ name: "", cat: "מקצועות חופשיים", tel: "", hours: "", addr: "באר גנים", site: "", ig: "", fb: "", tiktok: "", desc: "" });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("beerGanimFavs");
    return saved ? JSON.parse(saved) : [];
  });

  const [deviceId] = useState(() => {
    let id = localStorage.getItem("beerGanimDeviceId");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("beerGanimDeviceId", id);
    }
    return id;
  });

  useEffect(() => {
    trackEvent("page_view", "Navigation", "Businesses View");
  }, []);

  useEffect(() => {
    localStorage.setItem("beerGanimFavs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const q = query(collection(db, "businesses"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bizData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBusinesses(bizData);
      setTimeout(() => setMounted(true), 60);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleFav = (id, name) => {
    setFavorites(prev => {
      if (prev.includes(id)) {
        trackEvent("Remove Favorite", "Engagement", name);
        return prev.filter(fId => fId !== id);
      } else {
        trackEvent("Add Favorite", "Engagement", name);
        return [...prev, id];
      }
    });
  };

  const filtered = useMemo(() => {
    let baseList = businesses;
    if (activeCat === "פתוח עכשיו") baseList = baseList.filter(b => getOpenStatus(b.hours) === "open");
    else if (activeCat === "מועדפים") baseList = baseList.filter(b => favorites.includes(b.id));
    else if (activeCat === "שלי") baseList = baseList.filter(b => b.authorId === deviceId);
    else if (activeCat !== "הכל") baseList = baseList.filter(b => b.cat === activeCat);
    
    const q = search.trim();
    if (!q) return baseList;
    const fuse = new Fuse(baseList, { keys: ["name", "desc", "addr", "cat"], threshold: 0.4, distance: 100 });
    return fuse.search(q).map(result => result.item);
  }, [search, activeCat, businesses, favorites, deviceId]);

  const counts = useMemo(() => {
    const c = {};
    businesses.forEach(b => { c[b.cat] = (c[b.cat] || 0) + 1; });
    return c;
  }, [businesses]);

  const openEditForm = (biz) => {
    setNewBiz(biz);
    setEditingBizId(biz.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBizId(null);
    setNewBiz({ name: "", cat: "מקצועות חופשיים", tel: "", hours: "", addr: "באר גנים", site: "", ig: "", fb: "", tiktok: "", desc: "" });
  };

  const handleAddBiz = async (e) => {
    e.preventDefault();
    if (!newBiz.name || !newBiz.cat || !newBiz.desc) {
      alert("נא למלא לפחות שם עסק, קטגוריה ופירוט");
      return;
    }

    setLoading(true);
    try {
      if (editingBizId) {
        await updateDoc(doc(db, "businesses", editingBizId), {
          name: newBiz.name, cat: newBiz.cat, desc: newBiz.desc, tel: newBiz.tel, addr: newBiz.addr,
          hours: newBiz.hours, site: newBiz.site, ig: newBiz.ig, fb: newBiz.fb, tiktok: newBiz.tiktok
        });
        trackEvent("Edit Business", "Engagement", newBiz.cat);
      } else {
        await addDoc(collection(db, "businesses"), {
          ...newBiz, authorId: deviceId, createdAt: serverTimestamp()
        });
        trackEvent("Add Business", "Engagement", newBiz.cat);
      }
      closeForm();
    } catch (error) {
      console.error("Error adding/updating doc:", error);
      alert("שגיאה! הפעולה נכשלה.");
    }
    setLoading(false);
  };

  const handleDeleteBiz = async (id) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק עסק זה?")) {
      try {
        await deleteDoc(doc(db, "businesses", id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  return (
    <div style={{ fontFamily: "'Heebo',sans-serif", direction: "rtl", minHeight: "100vh", background: "#f7f3ed", color: "#1e140a", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .si{width:100%;padding:13px 18px 13px 46px;border:2px solid #e8d5b7;border-radius:50px;font-size:16px;font-family:'Heebo',sans-serif;background:#fff;outline:none;transition:all .25s;color:#1e140a;direction:rtl}
        .si:focus{border-color:#c4651a;box-shadow:0 0 0 3px rgba(196,101,26,.13)}
        .si::placeholder{color:#b09070}
        .cc{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:50px;border:2px solid #e8d5b7;background:#fff;font-family:'Heebo',sans-serif;font-size:12px;font-weight:500;color:#7a5c3a;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .cc:hover{border-color:#c4651a;color:#c4651a}
        .cc.act{background:linear-gradient(135deg,#c4651a,#e8a24e);border-color:transparent;color:#fff;box-shadow:0 4px 12px rgba(196,101,26,.32)}
        .cc.open-now { border-color: #16a34a; color: #16a34a; }
        .cc.open-now.act { background: #16a34a; color: #fff; box-shadow: 0 4px 12px rgba(22,163,74,.32); border-color: transparent;}
        .cc.fav-btn { border-color: #ef4444; color: #ef4444; }
        .cc.fav-btn.act { background: #ef4444; color: #fff; box-shadow: 0 4px 12px rgba(239,68,68,.32); border-color: transparent;}
        .cc.my-ads-btn { border-color: #8b5cf6; color: #8b5cf6; }
        .cc.my-ads-btn.act { background: #8b5cf6; color: #fff; box-shadow: 0 4px 12px rgba(139,92,246,.32); border-color: transparent;}
        .card{background:#fff;border-radius:14px;padding:14px; border:1.5px solid #ecdfc8;transition:transform .22s,box-shadow .22s;cursor:pointer;position:relative;overflow:hidden;display:flex;flex-direction:column;}
        .card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.09)}
        .ab{display:inline-flex;align-items:center;justify-content:center; gap:4px;padding:6px 12px;border-radius:50px;font-family:'Heebo',sans-serif;font-size:11px;font-weight:600;text-decoration:none;transition:all .2s;cursor:pointer;border:none; flex: 1 1 auto; text-align:center;}
        .ab.p{background:linear-gradient(135deg,#c4651a,#e8a24e);color:#fff;box-shadow:0 3px 10px rgba(196,101,26,.28)}
        .ab.o{background:#fff;border:1.5px solid #e8d5b7;color:#555}
        .dr{display:flex;align-items:flex-start;gap:6px;padding:4px 0;font-size:12px}
        .fa{opacity:0;transform:translateY(12px);transition:opacity .32s ease,transform .32s ease}
        .fa.vis{opacity:1;transform:translateY(0)}
        @keyframes fu{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        .ex{animation:fu .22s ease}
        .biz-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        @media(max-width: 950px){ .biz-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width: 600px){ .biz-grid { grid-template-columns: 1fr; } }
      `}</style>

      <button onClick={onBack} style={{ position: "fixed", top: 15, right: 15, zIndex: 1000, background: "rgba(26, 13, 4, 0.7)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontFamily: "Heebo", fontWeight: "bold", backdropFilter: "blur(8px)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        ➔ למסך הראשי
      </button>

      <header style={{ background: "linear-gradient(135deg,#1a0d04 0%,#3a2008 55%,#573015 100%)", padding: "42px 20px 42px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 15% 60%,rgba(196,101,26,.22) 0%,transparent 55%),radial-gradient(ellipse at 85% 20%,rgba(232,162,78,.13) 0%,transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 38, marginBottom: 7 }}>🌿</div>
          <h1 style={{ fontSize: "clamp(28px,8vw,50px)", fontWeight: 900, color: "#f5e6cc", lineHeight: 1.05, letterSpacing: "-1px" }}>עסקים בבאר גנים</h1>
          <p style={{ color: "#c4a97d", fontSize: 14, marginTop: 9, fontWeight: 300 }}>{businesses.length} עסקים ושירותים מקומיים</p>
        </div>
      </header>

      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(247,243,237,.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #ecdfc8", padding: "13px 16px 9px" }}>
        <div style={{ position: "relative", maxWidth: 520, margin: "0 auto 10px" }}>
          <span style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", fontSize: 17, pointerEvents: "none" }}>🔍</span>
          <input className="si" type="text" placeholder="חפש עסק, שירות, שם..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 5, scrollbarWidth: "none", flexWrap: "nowrap" }}>
          <button className={`cc ${activeCat === "הכל" ? "act" : ""}`} onClick={() => setActiveCat("הכל")}>🏘️ הכל ({businesses.length})</button>
          
          <button className={`cc fav-btn ${activeCat === "מועדפים" ? "act" : ""}`} onClick={() => setActiveCat("מועדפים")}>
            ❤️ מועדפים ({favorites.length})
          </button>

          <button className={`cc my-ads-btn ${activeCat === "שלי" ? "act" : ""}`} onClick={() => setActiveCat("שלי")}>
            👤 העסקים שלי
          </button>
          
          <button className={`cc open-now ${activeCat === "פתוח עכשיו" ? "act" : ""}`} onClick={() => setActiveCat("פתוח עכשיו")}>🟢 פתוח עכשיו</button>
          {Object.entries(CATEGORIES).map(([c, { emoji }]) => counts[c] ? (
            <button key={c} className={`cc ${activeCat === c ? "act" : ""}`} onClick={() => { setActiveCat(c); trackEvent("Category Click", "Filter", c); }}>{emoji} {c} ({counts[c]})</button>
          ) : null)}
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 14px 80px", flex: 1, width: "100%" }}>
        <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: "15px", marginBottom: "20px", background: "linear-gradient(135deg,#c4651a,#e8a24e)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 12px rgba(196,101,26,.3)" }}>
          + הוסף את העסק שלך (חינם)
        </button>

        {businesses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#b09070" }}>טוען עסקים... ⏳</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "#b09070" }}>
            <div style={{ fontSize: 48 }}>{activeCat === "מועדפים" ? "🤍" : activeCat === "שלי" ? "👤" : "🔍"}</div>
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>
              {activeCat === "מועדפים" ? "עוד לא שמרת עסקים במועדפים" : activeCat === "שלי" ? "עוד לא פרסמת אף עסק" : "לא נמצאו תוצאות לפילטר שבחרת"}
            </p>
          </div>
        ) : (
          <div className="biz-grid">
            {filtered.map((biz, i) => (
              <Card 
                key={biz.id} 
                biz={biz} 
                idx={i} 
                expanded={expandedId === biz.id} 
                onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)} 
                mounted={mounted} 
                isOwner={biz.authorId === deviceId || isAdmin} 
                onDelete={() => handleDeleteBiz(biz.id)}
                onEdit={() => openEditForm(biz)}
                isFavorite={favorites.includes(biz.id)}
                onToggleFav={() => handleToggleFav(biz.id, biz.name)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(30,20,10,0.85)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
          <form onSubmit={handleAddBiz} style={{ background: "#fff", padding: "24px", borderRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", border: "2px solid #ecdfc8" }}>
            <h2 style={{ marginBottom: "20px", textAlign: "center", color: "#1a0e06", fontWeight: "900" }}>{editingBizId ? "עריכת עסק" : "רישום עסק חדש"}</h2>
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#6b5030" }}>שם העסק / נותן השירות *</label>
              <input placeholder="למשל: דני שיפוצים" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} style={{ width: "100%", padding: "12px", border: "1px solid #e8d5b7", borderRadius: "8px", fontFamily: "Heebo", color: "#1a0e06", fontSize: "14px" }} />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#6b5030" }}>קטגוריה *</label>
              <select value={newBiz.cat} onChange={e => setNewBiz({...newBiz, cat: e.target.value})} style={{ width: "100%", padding: "12px", border: "1px solid #e8d5b7", borderRadius: "8px", fontFamily: "Heebo", backgroundColor: "#fff", color: "#1a0e06", fontSize: "14px" }}>
                {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat} style={{ color: "#1a0e06" }}>{CATEGORIES[cat].emoji} {cat}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#6b5030" }}>תיאור קצר של השירות *</label>
              <textarea placeholder="מה העסק מציע ב-2-3 משפטים..." value={newBiz.desc} onChange={e => setNewBiz({...newBiz, desc: e.target.value})} style={{ width: "100%", padding: "12px", border: "1px solid #e8d5b7", borderRadius: "8px", fontFamily: "Heebo", color: "#1a0e06", fontSize: "14px", minHeight: "70px" }} />
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#6b5030" }}>טלפון</label>
                <input placeholder="05XXXXXXXX" type="tel" value={newBiz.tel} onChange={e => setNewBiz({...newBiz, tel: e.target.value})} style={{ width: "100%", padding: "12px", border: "1px solid #e8d5b7", borderRadius: "8px", fontFamily: "Heebo", color: "#1a0e06", fontSize: "14px", direction: "ltr", textAlign: "right" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#6b5030" }}>כתובת ביישוב</label>
                <input placeholder="למשל: רימון 11" value={newBiz.addr} onChange={e => setNewBiz({...newBiz, addr: e.target.value})} style={{ width: "100%", padding: "12px", border: "1px solid #e8d5b7", borderRadius: "8px", fontFamily: "Heebo", color: "#1a0e06", fontSize: "14px" }} />
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#6b5030" }}>שעות פתיחה</label>
              <input placeholder="למשל: א׳-ה׳ 08:00–17:00" value={newBiz.hours} onChange={e => setNewBiz({...newBiz, hours: e.target.value})} style={{ width: "100%", padding: "12px", border: "1px solid #e8d5b7", borderRadius: "8px", fontFamily: "Heebo", color: "#1a0e06", fontSize: "14px" }} />
            </div>

            <div style={{ marginBottom: "20px", padding: "14px", background: "#fdfbf7", borderRadius: "8px", border: "1px dashed #e8d5b7" }}>
              <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "10px", color: "#c4651a" }}>קישורים (לא חובה):</p>
              <input placeholder="🌐 קישור לאתר" value={newBiz.site} onChange={e => setNewBiz({...newBiz, site: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "8px", border: "1px solid #e8d5b7", borderRadius: "6px", fontSize: "13px", direction: "ltr", color: "#1a0e06" }} />
              <input placeholder="📘 קישור לפייסבוק" value={newBiz.fb} onChange={e => setNewBiz({...newBiz, fb: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "8px", border: "1px solid #e8d5b7", borderRadius: "6px", fontSize: "13px", direction: "ltr", color: "#1a0e06" }} />
              <input placeholder="📷 קישור לאינסטגרם" value={newBiz.ig} onChange={e => setNewBiz({...newBiz, ig: e.target.value})} style={{ width: "100%", padding: "10px", marginBottom: "8px", border: "1px solid #e8d5b7", borderRadius: "6px", fontSize: "13px", direction: "ltr", color: "#1a0e06" }} />
              <input placeholder="🎵 קישור לטיקטוק" value={newBiz.tiktok} onChange={e => setNewBiz({...newBiz, tiktok: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #e8d5b7", borderRadius: "6px", fontSize: "13px", direction: "ltr", color: "#1a0e06" }} />
            </div>
            
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#c4651a,#e8a24e)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "900", fontSize: "16px", cursor: "pointer", marginBottom: "10px", boxShadow: "0 4px 12px rgba(196,101,26,.3)" }}>
              {loading ? "שומר..." : editingBizId ? "שמור שינויים" : "הוסף עסק למדריך!"}
            </button>
            
            <button type="button" onClick={closeForm} style={{ width: "100%", padding: "12px", background: "transparent", color: "#b09070", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
              ביטול וחזרה
            </button>
          </form>
        </div>
      )}

      <footer style={{ textAlign: "center", padding: "20px", color: "#b09070", fontSize: 14, borderTop: "1px solid #ecdfc8", background: "#ede7da", marginTop: "auto" }}>
        <p style={{ fontWeight: 700, color: "#6b4c2a", fontSize: 16 }}>עסקים בבאר גנים</p>
        <p style={{ marginTop: 10, color: "#4a3218", fontWeight: 500 }}>בעל עסק? רוצה שנבנה לך אתר? <a href="https://wa.me/9720559139013?text=שלום, ראיתי את האתר של באר גנים ואשמח לקבל פרטים על בניית אתר לעסק שלי!" target="_blank" rel="noreferrer" style={{ color: "#c4651a", fontWeight: 800, textDecoration: "underline" }}>לחץ כאן</a></p>
        <div style={{ marginTop: 12, fontSize: 13, color: "#8a6a4a" }}>🏪 מצאתם באג? תרצו לעדכן פרטים? <a href="https://wa.me/9720559139013?text=שלום יונתן, ראיתי תקלה/אשמח לעדכן פרטים בעסקים:" target="_blank" rel="noreferrer" style={{ color: "#c4651a", fontWeight: 700, textDecoration: "underline" }}>שלחו לי הודעה</a></div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. מסך הבית - HomeView (כולל דלת סתרים למנהל)
// ─────────────────────────────────────────────────────────────────────────────
function HomeView({ onNavigate, isAdmin, setIsAdmin }) {
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    trackEvent("page_view", "Navigation", "Home View");
  }, []);

  const handleAdminClick = () => {
    if (isAdmin) {
      if (window.confirm("לצאת ממצב מנהל?")) {
        localStorage.removeItem("beerGanimAdmin");
        setIsAdmin(false);
      }
      return;
    }
    
    const newClicks = clicks + 1;
    setClicks(newClicks);
    
    if (newClicks >= 5) {
      const pwd = prompt("הכנס קוד מנהל סודי:");
      if (pwd === "2010") {
        localStorage.setItem("beerGanimAdmin", "true");
        setIsAdmin(true);
        alert("ברוך הבא! הוגדרת כמנהל המערכת. כעת תוכל למחוק ולערוך הכל.");
      } else if (pwd !== null) {
        alert("קוד שגוי.");
      }
      setClicks(0);
    }
  };

  return (
    <div style={{ fontFamily: "'Heebo',sans-serif", direction: "rtl", minHeight: "100vh", background: "linear-gradient(135deg, #fdfbf7 0%, #f4eee3 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <style>{`
        .home-btn {
          width: 100%;
          max-width: 320px;
          padding: 24px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          font-family: 'Heebo', sans-serif;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .home-btn:hover {
          transform: translateY(-5px);
        }
        .btn-biz {
          background: linear-gradient(135deg, #1a0d04 0%, #573015 100%);
          color: #f5e6cc;
          box-shadow: 0 10px 25px rgba(87, 48, 21, 0.2);
        }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "60px", marginBottom: "10px" }}>🏡</div>
        <h1 style={{ fontSize: "36px", fontWeight: "900", color: "#1e140a" }}>הפורטל של באר גנים</h1>
        <p style={{ fontSize: "16px", color: "#6b5030", marginTop: "5px" }}>לאן תרצה להיכנס?</p>
      </div>

      <button className="home-btn btn-biz" onClick={() => onNavigate("businesses")}>
        <span style={{ fontSize: "40px" }}>🌿</span>
        <span style={{ fontSize: "22px", fontWeight: "800" }}>עסקים בבאר גנים</span>
      </button>

      <p onClick={handleAdminClick} style={{ marginTop: "40px", fontSize: "13px", color: "#a89a8a", cursor: "pointer", userSelect: "none" }}>
        פותח ע"י יונתן יוסף {isAdmin ? "👑" : ""}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ניתוב ראשי - App Component
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentView, setCurrentView] = useState("home"); 
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("beerGanimAdmin") === "true");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {currentView === "home" && <HomeView onNavigate={setCurrentView} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />}
      {currentView === "businesses" && <BusinessesView onBack={() => setCurrentView("home")} isAdmin={isAdmin} />}
    </>
  );
}
