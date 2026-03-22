import { useState, useMemo, useEffect } from "react";
// חיבור ל-Firebase
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

const MARKET_CATS = ["ריהוט ובית","אלקטרוניקה","ביגוד והנעלה","צעצועים וילדים","רכב","ספורט","מטבח","שונות"];

const TYPE_STYLE = {
  "מכירה":      { bg: "#eff6ff", color: "#1d4ed8", label: "🏷️ למכירה" },
  "מתנה בחינם":  { bg: "#f0fdf4", color: "#16a34a", label: "🎁 בחינם" },
  "מחפש/ת":      { bg: "#fef9c3", color: "#92400e", label: "🔍 מחפש/ת" },
};

const BUSINESSES = [
  { id: 1,  name: "דואר בבאר גנים",          cat: "קהילה",            tel: "",              hours: "ראשון ורביעי 17:00–19:00", addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "סניף דואר ישראל ביישוב" },
  { id: 2,  name: "המכולת היישובית",          cat: "מזון ואוכל",       tel: "",              hours: "א׳–ה׳ 06:30–21:00 | שישי 06:30–15:30 | שבת סגור", addr: "סביון 20, באר גנים", site: "", ig: "", fb: "", desc: "מכולת שכונתית – מוצרי יומיום טריים" },
  { id: 3,  name: "ספריה ניצן",                cat: "קהילה",            tel: "",              hours: "א,ב,ד 15:00–18:30 | ב,ד 09:00–12:30", addr: "באר גנים", site: "", ig: "", fb: "", desc: "ספרייה ציבורית ביישוב" },
  { id: 4,  name: "פיצה פארטי",                cat: "מזון ואוכל",       tel: "052-689-9733",  hours: "א׳–ה׳ 15:30–23:00 | שבת 17:30–23:00 | שישי סגור", addr: "באר גנים 1", site: "", ig: "", fb: "", desc: "פיצריה מקומית – משלוחים ואיסוף עצמי" },
  { id: 5,  name: "הסלטים של ציפי",            cat: "מזון ואוכל",       tel: "054-6671707",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "סלטים ביתיים לשבת" },
  { id: 6,  name: "קובי אירועי בוטיק – שף פרטי", cat: "מזון ואוכל",  tel: "054-7372734",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שף פרטי בשרי לאירועים ובוטיק" },
  { id: 7,  name: "נלו דה לאון – מספרת גברים", cat: "יופי וטיפוח",     tel: "053-2838100",   hours: "",               addr: "רימון 11, באר גנים",       site: "", ig: "https://www.instagram.com/barber_nelo", fb: "", desc: "מספרת גברים וילדים" },
  { id: 8,  name: "גלית עיצוב שיער",            cat: "יופי וטיפוח",     tel: "054-7755845",   hours: "",               addr: "מלכית 70, באר גנים",       site: "", ig: "", fb: "", desc: "מספרה לנשים – עיצוב שיער וצבע" },
  { id: 9,  name: "חיה – החלקות שיער עד הבית", cat: "יופי וטיפוח",   tel: "052-5253772",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "החלקת שיער מינרלי עד בית הלקוחה" },
  { id: 10, name: "LIOR HODAYA – עיצוב גבות",  cat: "יופי וטיפוח",    tel: "050-6705122",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "https://wa.me/972506705122", desc: "עיצוב גבות טבעיות, הרמת ריסים, מיקרובליידינג, שעוות גוף" },
  { id: 11, name: "נטע יצחק – פדיקור ומניקור", cat: "יופי וטיפוח",    tel: "053-5236763",   hours: "",               addr: "גפן 7, באר גנים",          site: "https://cal.mk/f3NfAj", ig: "", fb: "https://www.facebook.com/share/1PZR24QEwT/", desc: "פדיקור רפואי, פדיקור טיפולי, ציפורן חודרנית, לק ג'ל" },
  { id: 12, name: "נוי אמר – ציפורניים",        cat: "יופי וטיפוח",    tel: "",              hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "בניית ציפורניים ולק ג'ל" },
  { id: 13, name: "ליאת – בניית ציפורניים",     cat: "יופי וטיפוח",    tel: "",              hours: "",               addr: "החריש 15, באר גנים",       site: "", ig: "", fb: "", desc: "בניית ציפורניים ולק ג'ל" },
  { id: 14, name: "ליטל בן חמו קוסמטיקה",      cat: "יופי וטיפוח",    tel: "",              hours: "",               addr: "אדוה, באר גנים",            site: "", ig: "", fb: "", desc: "קליניקה לטיפולי יופי, אקנה ואנטי-אייג'ינג" },
  { id: 15, name: "אמילי – טיפולי פנים",        cat: "יופי וטיפוח",    tel: "050-635-5660",  hours: "",               addr: "באר גנים",                  site: "", ig: "Emily_atia", fb: "", desc: "טיפולי פנים וקוסמטיקה" },
  { id: 16, name: "נעורים – רויטל עוז",         cat: "יופי וטיפוח",    tel: "076-816-2799",  hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "קוסמטיקה פרא-רפואית ורפואה משלימה" },
  { id: 17, name: "Beauty Riahm",               cat: "יופי וטיפוח",    tel: "076-860-8732",  hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "קוסמטיקה פרא-רפואית לנשים ונערות בלבד" },
  { id: 18, name: "אורנית – איפור כלות וערב",   cat: "יופי וטיפוח",    tel: "054-5236804",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://instagram.com/oranit.tastas", fb: "", desc: "מאפרת כלות ואירועי ערב" },
  { id: 19, name: "טלינקה – איפור ושיער כלות",  cat: "יופי וטיפוח",    tel: "050-6525573",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "איפור ועיצוב שיער לכלות ואירועי ערב" },
  { id: 20, name: "סטיילינג טיפולי – אורית ברגר", cat: "יופי וטיפוח", tel: "054-5953953",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "סטיילינג וטיפולי סנדאות" },
  { id: 73, name: "Rotem Tsaidi - Beauty clinic", cat: "יופי וטיפוח", tel: "054-236-9892", hours: "א׳–ו׳ בתיאום מראש | שבת סגור", addr: "רותם המדבר 11, באר גנים", site: "", ig: "https://www.instagram.com/rotem_beauty_clinic?igsh=aDFleTNycW1vc29u", fb: "", desc: "החלקות שיער אורגניות | עיצוב ושיקום גבות טבעיות | הרמת גבות" },
  { id: 21, name: "פרחי אושר",                  cat: "קניות ושירותים", tel: "054-6671953",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "חנות פרחים – זרים, עיצובים ומתנות" },
  { id: 22, name: "ד\"ר ריי ביטון",              cat: "בריאות ורפואה",  tel: "058-789-6543",  hours: "פתוח 24 שעות (מומלץ לתאם מראש)", addr: "רימון 34, באר גנים", site: "", ig: "", fb: "", desc: "מרפאה / קליניקה – רפואה כללית" },
  { id: 23, name: "מיכל מרים – איזון גוף ונפש", cat: "בריאות ורפואה",  tel: "054-2191590",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/michaldamri/", fb: "", desc: "מסאז', עיסוי, רפלקסולוגיה וטיפול במגע" },
  { id: 24, name: "הודיה ז'ורנו – ריפוי בעיסוק", cat: "בריאות ורפואה", tel: "052-3377110",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "ריפוי בעיסוק" },
  { id: 25, name: "אלי דוקרביץ' – פיזיותרפיה",  cat: "בריאות ורפואה",  tel: "054-5545675",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "פיזיותרפיה" },
  { id: 26, name: "עידית טיפולים הוליסטיים – ד\"ר דוד עמיחי", cat: "בריאות ורפואה", tel: "053-7668959", hours: "", addr: "נוף ים 46, באר גנים", site: "", ig: "", fb: "", desc: "יוגה, התעמלות מתקנת, טיפולי מגע ורפואה משלימה" },
  { id: 27, name: "fitK – מתן פלודה",             cat: "בריאות ורפואה",  tel: "054-5519008",   hours: "",               addr: "באר גנים",                  site: "https://landing.fitk.co.il/review_feliz/?pid=485209", ig: "", fb: "", desc: "ליווי בריאות וכושר" },
  { id: 28, name: "סטודיו ME – סטודיו לבריאות ויופי", cat: "בריאות ורפואה", tel: "055-9893297", hours: "", addr: "מלכית 46, באר גנים", site: "", ig: "https://www.instagram.com/p/DA23tNfKy6F/?igsh=dDZvcnJseHR4aXF0", fb: "https://www.facebook.com/share/p/VL8xjWkavDRTE79Q/", tiktok: "https://www.tiktok.com/@me.meital?_r=1&_t=ZS-93VHxSiCSMZ", desc: "פילאטיס מכשירים | ליווי לתזונה בריאה | כושר | קוסמטיקה קוריאנית | קינוחים עם ערכים" },
  { id: 29, name: "איטח דבורה – פסיכותרפיסטית", cat: "בריאות ורפואה",  tel: "054-4544009",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "מטפלת פרטנית, זוגית ומשפחתית" },
  { id: 30, name: "יוני יושע – פסיכותרפיה לילדים", cat: "בריאות ורפואה", tel: "052-3838436", hours: "",               addr: "מלכית 17, באר גנים",       site: "", ig: "", fb: "", desc: "טיפול רגשי וסדנאות לילדים" },
  { id: 31, name: "סאלי יהבי איתן – טיפול משפחתי", cat: "בריאות ורפואה", tel: "",            hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "טיפול משפחתי וזוגי" },
  { id: 32, name: "אלונה בורלא – יועצת הנקה IBCLC", cat: "בריאות ורפואה", tel: "050-3010497", hours: "",              addr: "באר גנים",                  site: "http://www.imanika.co.il", ig: "", fb: "", desc: "ייעוץ הנקה מוסמך IBCLC" },
  { id: 33, name: "עדן מויאל – מרפאה בעיסוק",    cat: "בריאות ורפואה",  tel: "",              hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "ריפוי בעיסוק" },
  { id: 75, name: "אביב רפאלי נחמני – מטפל בחרדות ובטראומה", cat: "בריאות ורפואה", tel: "053-420-5110", hours: "", addr: "רימון 27, באר גנים", site: "https://rafaelnlp.com", ig: "https://www.instagram.com/avivnahmani?igsh=ajFoYXdueXV5aTln", fb: "", tiktok: "https://www.tiktok.com/@avivrefaelinahmani?_r=1&_t=ZS-94uNNR0hTPA", desc: "מטפל בחרדות ובטראומה" },
  { id: 34, name: "סטודיו שלו יפרח – כושר ופילאטיס", cat: "כושר ופנאי", tel: "050-444-2871", hours: "א׳–ה׳ 06:00–21:00 | שישי 08:00–13:00 | שבת סגור", addr: "דרך הים 21, באר גנים", site: "", ig: "", fb: "", desc: "מגוון אימונים, שיעורי סטודיו ופילאטיס" },
  { id: 35, name: "סיס פילאטיס – Lee Pilates",    cat: "כושר ופנאי",    tel: "",              hours: "",               addr: "אדווה 43, באר גנים",       site: "", ig: "", fb: "", desc: "סטודיו לפילאטיס מכשירים – אימונים אישיים וזוגיים" },
  { id: 36, name: "מועדון הטניס ״עולם הטניס״",    cat: "כושר ופנאי",    tel: "058-5826577",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/tennisworld_il", fb: "", desc: "אימוני טניס לילדים, נוער ובוגרים – מיכה גולנדר" },
  { id: 37, name: "\"איזהו גיבור\" – אמנויות לחימה", cat: "כושר ופנאי", tel: "",              hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "קראטה, קרב מגע והגנה עצמית לכל הגילאים" },
  { id: 38, name: "זהבה בוהדנה – אימון לחיים",    cat: "כושר ופנאי",    tel: "",              hours: "",               addr: "חבצלת החוף 6, באר גנים",   site: "", ig: "", fb: "", desc: "קואצ'ינג, הכוונה ואימון משפחתי" },
  { id: 39, name: "אלומיניום אבירם",              cat: "בניה ותחזוקה",   tel: "054-7600172",   hours: "",               addr: "אפיקי מים, באר גנים",      site: "", ig: "", fb: "https://www.facebook.com/share/1AtLyW6pM3/", desc: "עבודות אלומיניום וזכוכית – תריסים, רשתות, חלונות, מקלחונים" },
  { id: 40, name: "איליה הנדסה וייעוץ חשמל",      cat: "בניה ותחזוקה",   tel: "054-6543409",   hours: "",               addr: "באר גנים",                  site: "https://handasat-hashmal.com", ig: "", fb: "", desc: "תכנון וביצוע פרויקטים חשמל" },
  { id: 41, name: "דרור תנעמי – חשמל ומיזוג",     cat: "בניה ותחזוקה",   tel: "050-5502598",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "התקנות ותיקונים חשמל ומיזוג" },
  { id: 42, name: "שירה AIR – מזגנים",            cat: "בניה ותחזוקה",   tel: "050-4925595",   hours: "",               addr: "באר גנים",                  site: "http://shirair.co.il", ig: "", fb: "", desc: "התקנה, מכירה ותיקון מזגנים" },
  { id: 43, name: "ע.י אחזקות – אינסטלציה",       cat: "בניה ותחזוקה",   tel: "054-5865701",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "עבודות אינסטלציה" },
  { id: 44, name: "יגל חשמל ותקשורת",             cat: "בניה ותחזוקה",   tel: "050-2731140",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "חשמל ותקשורת – יוסי" },
  { id: 45, name: "ליאור פלוס – תחזוקה כללית",    cat: "בניה ותחזוקה",   tel: "050-6971216",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "תחזוקה, שיפוץ, מיזוג, מצלמות, חשמל – הנדימן" },
  { id: 46, name: "דקופייטינג – שיפוץ וצבע",      cat: "בניה ותחזוקה",   tel: "053-5001571",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "עבודות שיפוץ וצבע – מוטי בנטולילה" },
  { id: 47, name: "מונטיפיור – אחזקת מבנים",      cat: "בניה ותחזוקה",   tel: "054-7775752",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "אחזקת מבנים – מוטי אביטבול" },
  { id: 48, name: "עומרי שטרית – הנדסת קרקע",     cat: "בניה ותחזוקה",   tel: "054-7780576",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "הנדסת קרקע ובניין" },
  { id: 49, name: "גן הורד – גינון",               cat: "בניה ותחזוקה",   tel: "051-5474438",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שירותי גינון – דורון" },
  { id: 50, name: "בן שמעוני – ניקוי פנלים סולריים", cat: "בניה ותחזוקה", tel: "050-478-2884", hours: "",              addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "ניקוי לוחות סולאריים" },
  { id: 51, name: "נעמה הדר כהן – עיצוב פנים",    cat: "בניה ותחזוקה",   tel: "054-5236505",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/m_n_interiordesign/", fb: "", desc: "עיצוב פנים לבית" },
  { id: 52, name: "עדי תנעמי – עו\"ד ומגשרת",    cat: "מקצועות חופשיים", tel: "054-2131926",   hours: "",               addr: "באר גנים",                  site: "https://get-marketing.co.il/adi-tanami", ig: "", fb: "", desc: "דיני משפחה, מקרקעין, מעמד אישי, צוואות, גישור וייפוי כוח" },
  { id: 53, name: "עו\"ד אביתר בן נעים",          cat: "מקצועות חופשיים", tel: "050-6920926",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "ליטיגציה וחדלות פירעון" },
  { id: 54, name: "נסים מרדכי – שמאות מקרקעין",  cat: "מקצועות חופשיים", tel: "054-5236488",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שמאי מקרקעין" },
  { id: 55, name: "מור בטיחות",                  cat: "מקצועות חופשיים", tel: "054-7775612",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "הדרכות בטיחות – עזרא" },
  { id: 56, name: "מעין תשובה – סטודיו לצילום",  cat: "אירועים וצילום",  tel: "050-3311841",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/maayan.tshuva.photographer", fb: "", desc: "צלמת משפחות, בוק מצווה, גיל שנה, חאלקה, תדמית" },
  { id: 57, name: "הפקות יגל&שהם",                cat: "אירועים וצילום",  tel: "052-4225365",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/yagel.photographer", fb: "", desc: "צילומי סטילס, מגנטים, אינסטבלוקים ועמדת צילום לאירועים" },
  { id: 58, name: "שלום תשובה הפקות",             cat: "אירועים וצילום",  tel: "052-4449898",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "הגברה, תאורה ואולפן הקלטות" },
  { id: 59, name: "מתנפחים ונהנים",              cat: "אירועים וצילום",  tel: "054-5236505",   hours: "",               addr: "באר גנים",                  site: "https://afriatmichi.github.io/Cohen/", ig: "", fb: "", desc: "השכרת מתנפחים ומכונות מזון לאירועים" },
  { id: 60, name: "מור עושה דרמה",                cat: "אירועים וצילום",  tel: "054-6867726",   hours: "",               addr: "באר גנים",                  site: "https://moryefet.mozello.co.il/", ig: "", fb: "", desc: "תיאטרון, סדנאות, כתיבה ובימוי – מור יפת" },
  { id: 61, name: "ברוריה נעמי – אנגלית",         cat: "חינוך",            tel: "052-8709406",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שיעורים פרטיים באנגלית לכל הגילאים" },
  { id: 62, name: "סניף בני עקיבא",               cat: "חינוך",            tel: "",              hours: "",               addr: "רימון 34, באר גנים",       site: "", ig: "", fb: "", desc: "תנועת נוער – פעילות שוטפת לכל הגילאים" },
  { id: 63, name: "בי\"ס באר גנים – דרך הצלילים", cat: "חינוך",           tel: "",              hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "בית ספר יסודי ביישוב" },
  { id: 74, name: "תימור נחמני – ללמוד אנגלית בכיף", cat: "חינוך",        tel: "053-420-5110",  hours: "",               addr: "רימון 27, באר גנים",       site: "", ig: "", fb: "", desc: "מורה לאנגלית לכל הגילאים - מהקניית שפה ועד הגשה לבגרות." },
  { id: 64, name: "ביננו – Bnano מחשבים",        cat: "טכנולוגיה ועסקים", tel: "058-625-0506",  hours: "א׳–ה׳ 09:00–17:00 | שישי ושבת סגור", addr: "בשביל התקווה, באר גנים", site: "http://www.bnano.co.il/", ig: "", fb: "", desc: "תיקון ומכירת מחשבים, סלולר, אלקטרוניקה – משלוח לכל הארץ" },
  { id: 65, name: "kprint – קייפרינט",            cat: "טכנולוגיה ועסקים", tel: "054-4946300",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "https://www.facebook.com/share/1BPPWfdWLw/", desc: "הדפסה, מיתוג ומתנות על מוצרים – דביר מעוז" },
  { id: 66, name: "3DT – הדפסה בתלת מימד",      cat: "טכנולוגיה ועסקים", tel: "054-5684370",   hours: "",               addr: "באר גנים",                  site: "https://3DT.pro", ig: "lid_or_design", fb: "", desc: "הנדסה, עיצוב מוצר, הדפסה בתלת מימד ומוצרי הום דקור – דביר" },
  { id: 68, name: "אילניטוס – סוכנות נסיעות",    cat: "קניות ושירותים",  tel: "054-3532637",   hours: "",               addr: "באר גנים",                  site: "https://did.li/elanitus", ig: "", fb: "", desc: "חופשות ונופש בארץ ובעולם – אילנית בוקרה" },
  { id: 69, name: "מתן שפע רכב",                  cat: "קניות ושירותים",  tel: "050-4708069",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "קנייה, מכירה ומימון רכב – מתן ארזי" },
  { id: 70, name: "אודיס פלייס – חיות מחמד",     cat: "קניות ושירותים",  tel: "054-3133996",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/udis_place", fb: "", desc: "מזון וציוד לכלבים, חתולים וכל בעלי החיים" },
  { id: 71, name: "סטלינקה בוטיק בגדים",          cat: "קניות ושירותים",  tel: "050-6525573",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "אופנה, סטיילינג וביטוי – טליה אזולאי" },
  { id: 72, name: "נסים מרדכי – שמאות",          cat: "קניות ושירותים",  tel: "054-5236488",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שמאי מקרקעין" },
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
          <a href={`https://wa.me/972${item.tel}`} target="_blank" className="ab o" style={{ color: "#16a34a", padding: "5px 12px", fontSize: 12 }}>💬 שלח הודעה</a>
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
        const maxSize = 400; 
        let w = imgObj.width, h = imgObj.height;
        if (w > h) { h = (h * maxSize) / w; w = maxSize; } else { w = (w * maxSize) / h; h = maxSize; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(imgObj, 0, 0, w, h);
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
    try { await addDoc(collection(db, "listings"), item); } 
    catch (e) { alert("שגיאה! וודא שביצעת 'Start in test mode' ב-Firebase"); }
  };

  const deleteListing = async (id) => {
    if (window.confirm("למחוק את המודעה?")) await deleteDoc(doc(db, "listings", id));
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
             <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 13 }}>
               {listings.map(item => <MarketCard key={item.id} item={item} onDelete={deleteListing} />)}
             </div>
        </main>
      )}
      {showForm && <AddListingForm onAdd={addListing} onClose={() => setShowForm(false)} />}
    </div>
  );
}
