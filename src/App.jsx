import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyByyoKHKkkW5M1FanRqH0IsYIbqheE92mU",
  authDomain: "beer-ganim-app.firebaseapp.com",
  projectId: "beer-ganim-app",
  storageBucket: "beer-ganim-app.firebasestorage.app",
  messagingSenderId: "22315161123",
  appId: "1:22315161123:web:50259a17d045d210c34396",
  measurementId: "G-SJXS2LGVH0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CATEGORIES = {
  "יופי וטיפוח": { emoji: "💅", color: "#c4479e", bg: "#fdf0f9" },
  "בריאות ורפואה": { emoji: "🩺", color: "#059669", bg: "#ecfdf5" },
  "כושר ופנאי": { emoji: "🏋️", color: "#2563eb", bg: "#eff6ff" },
  "בניה ותחזוקה": { emoji: "🔧", color: "#d97706", bg: "#fffbeb" },
  "מקצועות חופשיים": { emoji: "⚖️", color: "#7c3aed", bg: "#f5f3ff" },
  "מזון ואוכל": { emoji: "🍕", color: "#dc2626", bg: "#fff1f2" },
  "אירועים וצילום": { emoji: "📸", color: "#0891b2", bg: "#ecfeff" },
  "חינוך": { emoji: "📚", color: "#b45309", bg: "#fef3c7" },
  "טכנולוגיה ועסקים": { emoji: "💻", color: "#4f46e5", bg: "#eef2ff" },
  "קניות ושירותים": { emoji: "🛍️", color: "#be185d", bg: "#fdf2f8" },
  "קהילה": { emoji: "🏘️", color: "#475569", bg: "#f1f5f9" },
};

const MARKET_CATS = ["ריהוט ובית", "אלקטרוניקה", "ביגוד והנעלה", "צעצועים וילדים", "רכב", "ספורט", "מטבח", "שונות"];

const TYPE_STYLE = {
  "מכירה": { bg: "#eff6ff", color: "#1d4ed8", label: "🏷️ למכירה" },
  "מתנה בחינם": { bg: "#f0fdf4", color: "#16a34a", label: "🎁 בחינם" },
  "מחפש/ת": { bg: "#fef9c3", color: "#92400e", label: "🔍 מחפש/ת" },
};

const BUSINESSES = [
  { id: 1, name: "דואר בבאר גנים", cat: "קהילה", tel: "", hours: "ראשון ורביעי 17:00–19:00", addr: "באר גנים", desc: "סניף דואר ישראל ביישוב" },
  { id: 2, name: "המכולת היישובית", cat: "מזון ואוכל", tel: "", hours: "א׳–ה׳ 06:30–21:00 | שישי 06:30–15:30", addr: "סביון 20, באר גנים", desc: "מכולת שכונתית" },
  { id: 3, name: "ספריה ניצן", cat: "קהילה", tel: "", hours: "א,ב,ד 15:00–18:30", addr: "באר גנים", desc: "ספרייה ציבורית" },
  { id: 4, name: "פיצה פארטי", cat: "מזון ואוכל", tel: "052-689-9733", hours: "א׳–ה׳ 15:30–23:00", addr: "באר גנים 1", desc: "פיצריה מקומית" },
  { id: 5, name: "הסלטים של ציפי", cat: "מזון ואוכל", tel: "054-6671707", addr: "באר גנים", desc: "סלטים ביתיים לשבת" },
  { id: 6, name: "קובי אירועי בוטיק", cat: "מזון ואוכל", tel: "054-7372734", addr: "באר גנים", desc: "שף פרטי בשרי" },
  { id: 7, name: "נלו דה לאון – מספרת גברים", cat: "יופי וטיפוח", tel: "053-2838100", addr: "רימון 11", desc: "מספרת גברים וילדים" },
  { id: 8, name: "גלית עיצוב שיער", cat: "יופי וטיפוח", tel: "054-7755845", addr: "מלכית 70", desc: "מספרה לנשים" },
  { id: 9, name: "חיה – החלקות שיער", cat: "יופי וטיפוח", tel: "052-5253772", addr: "באר גנים", desc: "החלקת שיער מינרלי" },
  { id: 10, name: "LIOR HODAYA", cat: "יופי וטיפוח", tel: "050-6705122", addr: "באר גנים", desc: "עיצוב גבות וטיפוח" },
  { id: 11, name: "נטע יצחק – פדיקור", cat: "יופי וטיפוח", tel: "053-5236763", addr: "גפן 7", desc: "פדיקור רפואי ולק ג'ל" },
  { id: 73, name: "Rotem Tsaidi - Beauty clinic", cat: "יופי וטיפוח", tel: "054-236-9892", addr: "רותם המדבר 11", desc: "החלקות שיער וגבות" },
  { id: 22, name: "ד\"ר ריי ביטון", cat: "בריאות ורפואה", tel: "058-789-6543", addr: "רימון 34", desc: "מרפאה – רפואה כללית" },
  { id: 28, name: "סטודיו ME – בריאות ויופי", cat: "בריאות ורפואה", tel: "055-9893297", addr: "מלכית 46", desc: "פילאטיס ותזונה" },
  { id: 75, name: "אביב רפאלי נחמני – מטפל", cat: "בריאות ורפואה", tel: "053-420-5110", addr: "רימון 27", desc: "טיפול בחרדות ובטראומה" },
  { id: 34, name: "סטודיו שלו יפרח", cat: "כושר ופנאי", tel: "050-444-2871", addr: "דרך הים 21", desc: "כושר ופילאטיס" },
  { id: 36, name: "עולם הטניס", cat: "כושר ופנאי", tel: "058-5826577", addr: "באר גנים", desc: "אימוני טניס" },
  { id: 37, name: "איזהו גיבור", cat: "כושר ופנאי", tel: "", addr: "באר גנים", desc: "אמנויות לחימה" },
  { id: 39, name: "אלומיניום אבירם", cat: "בניה ותחזוקה", tel: "054-7600172", addr: "אפיקי מים", desc: "עבודות אלומיניום" },
  { id: 74, name: "תימור נחמני – אנגלית", cat: "חינוך", tel: "053-420-5110", addr: "רימון 27", desc: "מורה לאנגלית" },
  { id: 64, name: "ביננו – Bnano מחשבים", cat: "טכנולוגיה ועסקים", tel: "058-625-0506", addr: "בשביל התקווה", desc: "תיקון ומכירת מחשבים" },
  { id: 72, name: "נסים מרדכי – שמאות", cat: "קניות ושירותים", tel: "054-5236488", addr: "באר גנים", desc: "שמאי מקרקעין" }
];

function BizCard({ biz, idx, expanded, onToggle, mounted }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };
  return (
    <div className={`card fa ${mounted ? "vis" : ""}`} style={{ transitionDelay: `${idx * 30}ms`, borderTop: `3px solid ${cs.color}` }} onClick={onToggle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cs.bg, color: cs.color, padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, marginBottom: 5 }}>{cs.emoji} {biz.cat}</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a0e06" }}>{biz.name}</h3>
        </div>
        <span style={{ fontSize: 16, color: "#c4a97d", transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>
      <p style={{ fontSize: 13, color: "#6b5030", marginBottom: 9 }}>{biz.desc}</p>
      <div className="dr" style={{ borderTop: "1px solid #f0e8d8" }}>
        <span style={{ fontSize: 15 }}>📞</span>
        {biz.tel ? <a href={`tel:${biz.tel}`} onClick={e => e.stopPropagation()} style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 700 }}>{biz.tel}</a> : <span style={{ color: "#b09070", fontStyle: "italic" }}>לחץ לפרטים</span>}
      </div>
      {expanded && (
        <div className="ex" style={{ marginTop: 10 }}>
          {biz.addr && <div className="dr">📍 {biz.addr}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            {biz.tel && <a href={`https://wa.me/972${biz.tel.replace(/[^0-9]/g, "")}`} target="_blank" className="ab o" style={{ color: "#16a34a", borderColor: "#bbf7d0" }}>💬 וואטסאפ</a>}
            {biz.site && <a href={biz.site} target="_blank" className="ab o" style={{ color: "#7c3aed", borderColor: "#ddd6fe" }}>🌐 אתר</a>}
          </div>
        </div>
      )}
    </div>
  );
}

function MarketCard({ item, onDelete }) {
  const ts = TYPE_STYLE[item.type] || TYPE_STYLE["מכירה"];
  return (
    <div className="card fa vis" style={{ borderTop: `3px solid ${ts.color}` }}>
      {item.images?.[0] && <img src={item.images[0]} style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 12, marginBottom: 12 }} />}
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <span style={{ background: ts.bg, color: ts.color, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{ts.label}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800 }}>{item.title}</h3>
        {item.price && <span style={{ fontWeight: 900, color: "#c4651a" }}>₪{item.price}</span>}
      </div>
      <p style={{ fontSize: 13, color: "#6b5030", margin: "8px 0" }}>{item.desc}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f0e8d8", paddingTop: 8 }}>
        <span style={{ fontSize: 11, color: "#b09070" }}>{item.date}</span>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer" }}>מחק</button>
          <a href={`https://wa.me/972${item.tel}`} target="_blank" className="ab o" style={{ color: "#16a34a", padding: "5px 12px", fontSize: 12 }}>💬 וואטסאפ</a>
        </div>
      </div>
    </div>
  );
}

function AddListingForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ title: "", cat: "ריהוט ובית", price: "", tel: "", desc: "", type: "מכירה" });
  const [img, setImg] = useState("");

  const handleImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imgObj = new Image();
      imgObj.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 400;
        let w = imgObj.width, h = imgObj.height;
        if (w > h) { h = (h * size) / w; w = size; } else { w = (w * size) / h; h = size; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(imgObj, 0, 0, w, h);
        setImg(canvas.toDataURL("image/jpeg", 0.5));
      };
      imgObj.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!form.title || form.tel.length !== 10) return alert("מלא כותרת וטלפון תקין (10 ספרות)");
    onAdd({ ...form, images: img ? [img] : [], timestamp: Date.now(), date: new Date().toLocaleDateString("he-IL") });
    onClose();
  };

  const inp = { width: "100%", padding: "12px", border: "2px solid #e8d5b7", borderRadius: 12, marginBottom: 10, outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 15 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 22, padding: 25, maxWidth: 400, width: "100%", direction: "rtl" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: 15 }}>➕ מודעה חדשה</h2>
        <input style={inp} placeholder="כותרת *" onChange={e => setForm({ ...form, title: e.target.value })} />
        <select style={inp} onChange={e => setForm({ ...form, cat: e.target.value })}>
          {MARKET_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <input style={inp} placeholder="מחיר" type="number" onChange={e => setForm({ ...form, price: e.target.value })} />
        <input style={inp} placeholder="טלפון (10 ספרות) *" maxLength="10" onChange={e => setForm({ ...form, tel: e.target.value.replace(/[^0-9]/g, "") })} />
        <textarea style={{ ...inp, height: 70 }} placeholder="תיאור..." onChange={e => setForm({ ...form, desc: e.target.value })} />
        <input type="file" accept="image/*" onChange={handleImg} style={{ marginBottom: 15 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} style={{ flex: 1, padding: 12, background: "#c4651a", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700 }}>פרסם</button>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: "#f5ede0", border: "none", borderRadius: 12 }}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("businesses");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("הכל");
  const [expandedId, setExpandedId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "listings"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setListings(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    return unsub;
  }, []);

  const addListing = async (item) => {
    try { await addDoc(collection(db, "listings"), item); } catch (e) { alert("שגיאה בפרסום!"); }
  };

  const deleteListing = async (id) => {
    if (window.confirm("למחוק?")) await deleteDoc(doc(db, "listings", id));
  };

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BUSINESSES.filter(b => (!q || b.name.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q)) && (activeCat === "הכל" || b.cat === activeCat));
  }, [search, activeCat]);

  return (
    <div style={{ fontFamily: "Heebo, sans-serif", direction: "rtl", minHeight: "100vh", background: "#f7f3ed" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .si{width:100%;padding:13px;border:2px solid #e8d5b7;border-radius:50px;background:#fff;outline:none}
        .cc{display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:50px;border:2px solid #e8d5b7;background:#fff;font-size:12px;cursor:pointer;white-space:nowrap}
        .cc.act{background:#c4651a;color:#fff;border-color:transparent}
        .card{background:#fff;border-radius:18px;padding:18px;border:1.5px solid #ecdfc8;cursor:pointer}
        .ab{display:inline-flex;align-items:center;padding:8px 15px;border-radius:50px;font-size:13px;text-decoration:none;border:none}
        .ab.o{background:#fff;border:2px solid #e8d5b7}
        .dr{display:flex;align-items:center;gap:8px;padding:7px 0;font-size:13px}
        .fa{opacity:0;transform:translateY(12px);transition:all .3s}
        .fa.vis{opacity:1;transform:translateY(0)}
        .top-tab{flex:1;padding:15px;font-weight:800;border:none;background:transparent;color:#9a7a55;cursor:pointer;border-bottom:3px solid transparent}
        .top-tab.active{color:#1a0e06;border-bottom-color:#c4651a}
      `}</style>

      <header style={{ background: "linear-gradient(135deg,#1a0d04 0%,#3a2008 100%)", padding: "35px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: "#f5e6cc" }}>🌿 באר גנים</h1>
      </header>

      <div style={{ display: "flex", background: "#f7f3ed", borderBottom: "1px solid #ecdfc8" }}>
         <button className={`top-tab ${tab === 'businesses' ? 'active' : ''}`} onClick={() => setTab('businesses')}>🏪 עסקים</button>
         <button className={`top-tab ${tab === 'market' ? 'active' : ''}`} onClick={() => setTab('market')}>🛒 שוק יישובי</button>
      </div>

      {tab === 'businesses' ? (
        <>
          <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(247,243,237,0.95)", padding: 15 }}>
            <input className="si" placeholder="חפש עסק..." onChange={e => setSearch(e.target.value)} />
            <div style={{ display: "flex", gap: 7, overflowX: "auto", marginTop: 10 }} className="hide-scroll">
               <button className={`cc ${activeCat === "הכל" ? "act" : ""}`} onClick={() => setActiveCat("הכל")}>🏘️ הכל</button>
               {Object.keys(CATEGORIES).map(c => <button key={c} className={`cc ${activeCat === c ? "act" : ""}`} onClick={() => setActiveCat(c)}>{CATEGORIES[c].emoji} {c}</button>)}
            </div>
          </div>
          <main style={{ maxWidth: 960, margin: "0 auto", padding: 15, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(285px,1fr))", gap: 13 }}>
            {filtered.map((biz, i) => <BizCard key={biz.id} biz={biz} idx={i} expanded={expandedId === biz.id} onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)} mounted={mounted} />)}
          </main>
        </>
      ) : (
        <main style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <h2 style={{ fontWeight: 900 }}>לוח יד שנייה</h2>
                <button onClick={() => setShowForm(true)} style={{ padding: "10px 20px", background: "#c4651a", color: "#fff", border: "none", borderRadius: 50, fontWeight: 700 }}>➕ פרסם</button>
             </div>
             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 13 }}>
               {listings.map(item => <MarketCard key={item.id} item={item} onDelete={deleteListing} />)}
             </div>
        </main>
      )}

      {showForm && <AddListingForm onAdd={addListing} onClose={() => setShowForm(false)} />}
    </div>
  );
}
