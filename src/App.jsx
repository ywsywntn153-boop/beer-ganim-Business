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
  "מזון ואוכל": { emoji: "🍕", color: "#dc2626", bg: "#fff1f2" },
  "חינוך": { emoji: "📚", color: "#b45309", bg: "#fef3c7" },
  "טכנולוגיה": { emoji: "💻", color: "#4f46e5", bg: "#eef2ff" },
  "קהילה": { emoji: "🏘️", color: "#475569", bg: "#f1f5f9" },
};

const MARKET_CATS = ["ריהוט","אלקטרוניקה","ביגוד","ילדים","רכב","ספורט","מטבח","שונות"];

const TYPE_STYLE = {
  "מכירה": { bg: "#eff6ff", color: "#1d4ed8", label: "🏷️ למכירה" },
  "מתנה בחינם": { bg: "#f0fdf4", color: "#16a34a", label: "🎁 בחינם" },
  "מחפש/ת": { bg: "#fef9c3", color: "#92400e", label: "🔍 מחפש/ת" },
};

const BUSINESSES = [
  { id: 1, name: "דואר בבאר גנים", cat: "קהילה", tel: "", hours: "17:00–19:00", addr: "באר גנים", desc: "סניף דואר ישראל" },
  { id: 2, name: "המכולת היישובית", cat: "מזון ואוכל", tel: "", hours: "06:30–21:00", addr: "סביון 20", desc: "מכולת שכונתית טרייה" },
  { id: 4, name: "פיצה פארטי", cat: "מזון ואוכל", tel: "052-689-9733", hours: "15:30–23:00", addr: "באר גנים 1", desc: "פיצריה מקומית" },
  { id: 7, name: "נלו דה לאון", cat: "יופי וטיפוח", tel: "053-2838100", addr: "רימון 11", desc: "מספרת גברים וילדים" },
  { id: 73, name: "Rotem Tsaidi", cat: "יופי וטיפוח", tel: "054-236-9892", addr: "רותם המדבר 11", desc: "החלקות שיער וגבות" },
  { id: 28, name: "סטודיו ME", cat: "בריאות ורפואה", tel: "055-9893297", addr: "מלכית 46", desc: "פילאטיס ותזונה" },
  { id: 34, name: "סטודיו שלו יפרח", cat: "כושר ופנאי", tel: "050-444-2871", addr: "דרך הים 21", desc: "כושר ופילאטיס" },
  { id: 37, name: "איזהו גיבור", cat: "כושר ופנאי", tel: "", addr: "באר גנים", desc: "אמנויות לחימה" },
  { id: 64, name: "ביננו - מחשבים", cat: "טכנולוגיה", tel: "058-625-0506", addr: "בשביל התקווה", desc: "תיקון ומכירת מחשבים" }
];

function BizCard({ biz, idx, expanded, onToggle, mounted }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };
  return (
    <div className={`card fa ${mounted ? "vis" : ""}`} style={{ transitionDelay: `${idx * 25}ms`, borderTop: `3px solid ${cs.color}` }} onClick={onToggle}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <div>
          <div style={{ background: cs.bg, color: cs.color, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{cs.emoji} {biz.cat}</div>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{biz.name}</h3>
        </div>
        <span style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>
      <p style={{ fontSize: 13, color: "#6b5030" }}>{biz.desc}</p>
      {expanded && <div style={{ marginTop: 10, fontSize: 13 }}>📍 {biz.addr} <br/> 📞 {biz.tel}</div>}
    </div>
  );
}

function MarketCard({ item, onDelete }) {
  const ts = TYPE_STYLE[item.type] || TYPE_STYLE["מכירה"];
  return (
    <div className="card fa vis" style={{ borderTop: `3px solid ${ts.color}` }}>
      {item.images?.[0] && <img src={item.images[0]} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} />}
      <h3 style={{ fontSize: 14 }}>{item.title}</h3>
      <div style={{ color: "#c4651a", fontWeight: 800 }}>₪{item.price}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
         <button onClick={() => onDelete(item.id)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>מחק</button>
         <a href={`https://wa.me/972${item.tel}`} style={{ textDecoration: "none", color: "green" }}>💬 וואטסאפ</a>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("businesses");
  const [mounted, setMounted] = useState(false);
  const [listings, setListings] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "listings"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => setListings(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const addListing = async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const item = {
      title: data.get("title"),
      price: data.get("price"),
      tel: data.get("tel"),
      type: "מכירה",
      timestamp: Date.now(),
      date: new Date().toLocaleDateString()
    };
    await addDoc(collection(db, "listings"), item);
    setShowForm(false);
  };

  return (
    <div style={{ fontFamily: "Heebo, sans-serif", direction: "rtl", background: "#f7f3ed", minHeight: "100vh" }}>
      <style>{`.card{background:#fff;border-radius:15px;padding:15px;border:1px solid #ecdfc8;margin-bottom:10px}.vis{opacity:1}.fa{opacity:0;transition:0.3s}.top-tab{flex:1;padding:15px;border:none;background:none;font-weight:800;cursor:pointer}.active{border-bottom:3px solid #c4651a}`}</style>
      <header style={{ background: "#1a0d04", padding: 30, textAlign: "center", color: "#f5e6cc" }}><h1>🌿 באר גנים</h1></header>
      <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
        <button className={`top-tab ${tab==="businesses"?"active":""}`} onClick={()=>setTab("businesses")}>עסקים</button>
        <button className={`top-tab ${tab==="market"?"active":""}`} onClick={()=>setTab("market")}>שוק</button>
      </div>
      <main style={{ padding: 20 }}>
        {tab === "businesses" ? (
          BUSINESSES.map((b, i) => <BizCard key={b.id} biz={b} idx={i} mounted={mounted} />)
        ) : (
          <>
            <button onClick={()=>setShowForm(true)} style={{ width: "100%", padding: 10, marginBottom: 15, background: "#c4651a", color: "#fff", border: "none", borderRadius: 10 }}>+ הוסף מודעה</button>
            {listings.map(l => <MarketCard key={l.id} item={l} onDelete={(id)=>deleteDoc(doc(db,"listings",id))} />)}
          </>
        )}
      </main>
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form onSubmit={addListing} style={{ background: "#fff", padding: 20, borderRadius: 15, width: 300 }}>
            <input name="title" placeholder="מה מוכרים?" style={{ width: "100%", marginBottom: 10 }} required />
            <input name="price" placeholder="מחיר" type="number" style={{ width: "100%", marginBottom: 10 }} />
            <input name="tel" placeholder="טלפון" style={{ width: "100%", marginBottom: 10 }} required />
            <button type="submit" style={{ width: "100%", background: "green", color: "#fff" }}>פרסם</button>
            <button type="button" onClick={()=>setShowForm(false)} style={{ width: "100%", marginTop: 5 }}>ביטול</button>
          </form>
        </div>
      )}
    </div>
  );
}
