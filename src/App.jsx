import { useState, useMemo, useEffect } from "react";

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
  // ═══ קהילה ═══
  { id: 1,  name: "דואר בבאר גנים",          cat: "קהילה",            tel: "",              hours: "ראשון ורביעי 17:00–19:00", addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "סניף דואר ישראל ביישוב" },
  { id: 2,  name: "המכולת היישובית",          cat: "מזון ואוכל",       tel: "",              hours: "א׳–ה׳ 06:30–21:00 | שישי 06:30–15:30 | שבת סגור", addr: "סביון 20, באר גנים", site: "", ig: "", fb: "", desc: "מכולת שכונתית – מוצרי יומיום טריים" },
  { id: 3,  name: "ספריה ניצן",                cat: "קהילה",            tel: "",              hours: "א,ב,ד 15:00–18:30 | ב,ד 09:00–12:30", addr: "באר גנים", site: "", ig: "", fb: "", desc: "ספרייה ציבורית ביישוב" },

  // ═══ מזון ═══
  { id: 4,  name: "פיצה פארטי",                cat: "מזון ואוכל",       tel: "052-689-9733",  hours: "א׳–ה׳ 15:30–23:00 | שבת 17:30–23:00 | שישי סגור", addr: "באר גנים 1", site: "", ig: "", fb: "", desc: "פיצריה מקומית – משלוחים ואיסוף עצמי" },
  { id: 5,  name: "הסלטים של ציפי",            cat: "מזון ואוכל",       tel: "054-6671707",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "סלטים ביתיים לשבת" },
  { id: 6,  name: "קובי אירועי בוטיק – שף פרטי", cat: "מזון ואוכל",  tel: "054-7372734",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שף פרטי בשרי לאירועים ובוטיק" },

  // ═══ יופי וטיפוח ═══
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

  // ═══ בריאות ורפואה ═══
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

  // ═══ כושר ופנאי ═══
  { id: 34, name: "סטודיו שלו יפרח – כושר ופילאטיס", cat: "כושר ופנאי", tel: "050-444-2871", hours: "א׳–ה׳ 06:00–21:00 | שישי 08:00–13:00 | שבת סגור", addr: "דרך הים 21, באר גנים", site: "", ig: "", fb: "", desc: "מגוון אימונים, שיעורי סטודיו ופילאטיס" },
  { id: 35, name: "סיס פילאטיס – Lee Pilates",    cat: "כושר ופנאי",    tel: "",              hours: "",               addr: "אדווה 43, באר גנים",       site: "", ig: "", fb: "", desc: "סטודיו לפילאטיס מכשירים – אימונים אישיים וזוגיים" },
  { id: 36, name: "מועדון הטניס ״עולם הטניס״",    cat: "כושר ופנאי",    tel: "058-5826577",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/tennisworld_il", fb: "", desc: "אימוני טניס לילדים, נוער ובוגרים – מיכה גולנדר" },
  { id: 37, name: "\"איזהו גיבור\" – אמנויות לחימה", cat: "כושר ופנאי", tel: "",              hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "קראטה, קרב מגע והגנה עצמית לכל הגילאים" },
  { id: 38, name: "זהבה בוהדנה – אימון לחיים",    cat: "כושר ופנאי",    tel: "",              hours: "",               addr: "חבצלת החוף 6, באר גנים",   site: "", ig: "", fb: "", desc: "קואצ'ינג, הכוונה ואימון משפחתי" },

  // ═══ בניה ותחזוקה ═══
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

  // ═══ מקצועות חופשיים ═══
  { id: 52, name: "עדי תנעמי – עו\"ד ומגשרת",    cat: "מקצועות חופשיים", tel: "054-2131926",   hours: "",               addr: "באר גנים",                  site: "https://get-marketing.co.il/adi-tanami", ig: "", fb: "", desc: "דיני משפחה, מקרקעין, מעמד אישי, צוואות, גישור וייפוי כוח" },
  { id: 53, name: "עו\"ד אביתר בן נעים",          cat: "מקצועות חופשיים", tel: "050-6920926",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "ליטיגציה וחדלות פירעון" },
  { id: 54, name: "נסים מרדכי – שמאות מקרקעין",  cat: "מקצועות חופשיים", tel: "054-5236488",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שמאי מקרקעין" },
  { id: 55, name: "מור בטיחות",                  cat: "מקצועות חופשיים", tel: "054-7775612",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "הדרכות בטיחות – עזרא" },

  // ═══ אירועים וצילום ═══
  { id: 56, name: "מעין תשובה – סטודיו לצילום",  cat: "אירועים וצילום",  tel: "050-3311841",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/maayan.tshuva.photographer", fb: "", desc: "צלמת משפחות, בוק מצווה, גיל שנה, חאלקה, תדמית" },
  { id: 57, name: "הפקות יגל&שהם",                cat: "אירועים וצילום",  tel: "052-4225365",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/yagel.photographer", fb: "", desc: "צילומי סטילס, מגנטים, אינסטבלוקים ועמדת צילום לאירועים" },
  { id: 58, name: "שלום תשובה הפקות",             cat: "אירועים וצילום",  tel: "052-4449898",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "הגברה, תאורה ואולפן הקלטות" },
  { id: 59, name: "מתנפחים ונהנים",              cat: "אירועים וצילום",  tel: "054-5236505",   hours: "",               addr: "באר גנים",                  site: "https://afriatmichi.github.io/Cohen/", ig: "", fb: "", desc: "השכרת מתנפחים ומכונות מזון לאירועים" },
  { id: 60, name: "מור עושה דרמה",                cat: "אירועים וצילום",  tel: "054-6867726",   hours: "",               addr: "באר גנים",                  site: "https://moryefet.mozello.co.il/", ig: "", fb: "", desc: "תיאטרון, סדנאות, כתיבה ובימוי – מור יפת" },

  // ═══ חינוך ═══
  { id: 61, name: "ברוריה נעמי – אנגלית",         cat: "חינוך",            tel: "052-8709406",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שיעורים פרטיים באנגלית לכל הגילאים" },
  { id: 62, name: "סניף בני עקיבא",               cat: "חינוך",            tel: "",              hours: "",               addr: "רימון 34, באר גנים",       site: "", ig: "", fb: "", desc: "תנועת נוער – פעילות שוטפת לכל הגילאים" },
  { id: 63, name: "בי\"ס באר גנים – דרך הצלילים", cat: "חינוך",           tel: "",              hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "בית ספר יסודי ביישוב" },
  { id: 74, name: "תימור נחמני – ללמוד אנגלית בכיף", cat: "חינוך",        tel: "053-420-5110",  hours: "",               addr: "רימון 27, באר גנים",       site: "", ig: "", fb: "", desc: "מורה לאנגלית לכל הגילאים - מהקניית שפה ועד הגשה לבגרות." },

  // ═══ טכנולוגיה ועסקים ═══
  { id: 64, name: "ביננו – Bnano מחשבים",        cat: "טכנולוגיה ועסקים", tel: "058-625-0506",  hours: "א׳–ה׳ 09:00–17:00 | שישי ושבת סגור", addr: "בשביל התקווה, באר גנים", site: "http://www.bnano.co.il/", ig: "", fb: "", desc: "תיקון ומכירת מחשבים, סלולר, אלקטרוניקה – משלוח לכל הארץ" },
  { id: 65, name: "kprint – קייפרינט",            cat: "טכנולוגיה ועסקים", tel: "054-4946300",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "https://www.facebook.com/share/1BPPWfdWLw/", desc: "הדפסה, מיתוג ומתנות על מוצרים – דביר מעוז" },
  { id: 66, name: "3DT – הדפסה בתלת מימד",      cat: "טכנולוגיה ועסקים", tel: "054-5684370",   hours: "",               addr: "באר גנים",                  site: "https://3DT.pro", ig: "lid_or_design", fb: "", desc: "הנדסה, עיצוב מוצר, הדפסה בתלת מימד ומוצרי הום דקור – דביר" },

  // ═══ קניות ושירותים ═══
  { id: 68, name: "אילניטוס – סוכנות נסיעות",    cat: "קניות ושירותים",  tel: "054-3532637",   hours: "",               addr: "באר גנים",                  site: "https://did.li/elanitus", ig: "", fb: "", desc: "חופשות ונופש בארץ ובעולם – אילנית בוקרה" },
  { id: 69, name: "מתן שפע רכב ואנרגיה",                  cat: "קניות ושירותים",  tel: "050-4708069",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: " שרותי רכב קניה ומכירה ומימון + מכירת רכב תפעולי חדש" },
  { id: 70, name: "אודיס פלייס – חיות מחמד",     cat: "קניות ושירותים",  tel: "054-3133996",   hours: "",               addr: "באר גנים",                  site: "", ig: "https://www.instagram.com/udis_place", fb: "", desc: "מזון וציוד לכלבים, חתולים וכל בעלי החיים" },
  { id: 71, name: "סטלינקה בוטיק בגדים", cat: "קניות ושירותים", tel: "050-6525573", hours: "", addr: "באר גנים", site: "https://talinka.shop/collections/new-in", ig: "", fb: "", desc: " בוטיק בגדים יבוא מכל מיני מעצבים בעולם" },
  { id: 72, name: "נסים מרדכי – שמאות",          cat: "קניות ושירותים",  tel: "054-5236488",   hours: "",               addr: "באר גנים",                  site: "", ig: "", fb: "", desc: "שמאי מקרקעין" },
];

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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s === "open" ? "#dcfce7" : "#fee2e2", color: s === "open" ? "#16a34a" : "#dc2626", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s === "open" ? "#16a34a" : "#dc2626", display: "inline-block" }} />
      {s === "open" ? "פתוח" : "סגור"}
    </span>
  );
}

function Card({ biz, idx, expanded, onToggle, mounted }) {
  const cs = CATEGORIES[biz.cat] || { emoji: "🏢", color: "#c4651a", bg: "#fdf0e0" };

  return (
    <div className={`card fa ${mounted ? "vis" : ""}`} style={{ transitionDelay: `${idx * 35}ms`, borderTop: `3px solid ${cs.color}` }} onClick={onToggle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cs.bg, color: cs.color, padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, marginBottom: 5 }}>
            {cs.emoji} {biz.cat}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a0e06", lineHeight: 1.3 }}>{biz.name}</h3>
        </div>
        <span style={{ fontSize: 16, color: "#c4a97d", transition: "transform .28s", transform: expanded ? "rotate(180deg)" : "rotate(0)", flexShrink: 0, marginTop: 2 }}>▾</span>
      </div>

      <p style={{ fontSize: 13, color: "#6b5030", marginBottom: 9, lineHeight: 1.55 }}>{biz.desc}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <OpenBadge hours={biz.hours} />
      </div>

      <div className="dr" style={{ borderTop: "1px solid #f0e8d8" }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>📞</span>
        {biz.tel
          ? <a href={`tel:${biz.tel}`} onClick={e => e.stopPropagation()} style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 700, fontSize: 15 }}>{biz.tel}</a>
          : <span style={{ color: "#b09070", fontSize: 13, fontStyle: "italic" }}>לחץ לפרטים</span>
        }
      </div>

      {expanded && (
        <div className="ex">
          {biz.addr && biz.addr !== "באר גנים" && (
            <div className="dr"><span style={{ fontSize: 15 }}>📍</span><span style={{ color: "#4a3218" }}>{biz.addr}</span></div>
          )}
          {biz.hours && (
            <div className="dr"><span style={{ fontSize: 15 }}>🕐</span><span style={{ color: "#4a3218", lineHeight: 1.55 }}>{biz.hours}</span></div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 13 }}>
            {biz.tel && (
              <>
                <a href={`tel:${biz.tel}`} className="ab p" onClick={e => e.stopPropagation()}>📞 התקשר</a>
                <a href={`https://wa.me/972${biz.tel.replace(/[^0-9]/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="ab o" onClick={e => e.stopPropagation()} style={{ color: "#16a34a", borderColor: "#bbf7d0" }}>💬 וואטסאפ</a>
              </>
            )}
            {biz.site && <a href={biz.site.startsWith("http") ? biz.site : "https://" + biz.site} target="_blank" rel="noreferrer" className="ab o" onClick={e => e.stopPropagation()} style={{ color: "#7c3aed", borderColor: "#ddd6fe" }}>🌐 אתר</a>}
            {biz.ig && (
              <a href={biz.ig} target="_blank" rel="noreferrer" className="ab o" onClick={e => e.stopPropagation()} style={{ color: "#e1306c", borderColor: "#fbcfe8" }}>📷 אינסטגרם</a>
            )}
            {biz.fb && biz.fb.startsWith("http") && (
              <a href={biz.fb} target="_blank" rel="noreferrer" className="ab o" onClick={e => e.stopPropagation()} style={{ color: "#1877f2", borderColor: "#bfdbfe" }}>📘 פייסבוק</a>
            )}
            {biz.tiktok && biz.tiktok.startsWith("http") && (
              <a href={biz.tiktok} target="_blank" rel="noreferrer" className="ab o" onClick={e => e.stopPropagation()} style={{ color: "#000", borderColor: "#ccc" }}>🎵 טיקטוק</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("הכל");
  const [expandedId, setExpandedId] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BUSINESSES.filter(b => {
      const m = !q || b.name.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q) || b.addr.toLowerCase().includes(q) || b.cat.toLowerCase().includes(q);
      if (!m) return false;

      if (activeCat === "הכל") return true;
      if (activeCat === "פתוח עכשיו") return getOpenStatus(b.hours) === "open";
      return b.cat === activeCat;
    });
  }, [search, activeCat]);

  const counts = useMemo(() => {
    const c = {};
    BUSINESSES.forEach(b => { c[b.cat] = (c[b.cat] || 0) + 1; });
    return c;
  }, []);

  const waFloat = "0559139013";

  return (
    <div style={{ fontFamily: "'Heebo',sans-serif", direction: "rtl", minHeight: "100vh", background: "#f7f3ed", color: "#1e140a" }}>
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
        .cc.open-now.act { background: #16a34a; color: #fff; box-shadow: 0 4px 12px rgba(22,163,74,.32); }
        .card{background:#fff;border-radius:18px;padding:18px;border:1.5px solid #ecdfc8;transition:transform .22s,box-shadow .22s;cursor:pointer;position:relative;overflow:hidden}
        .card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.09)}
        .ab{display:inline-flex;align-items:center;gap:5px;padding:8px 15px;border-radius:50px;font-family:'Heebo',sans-serif;font-size:13px;font-weight:600;text-decoration:none;transition:all .2s;cursor:pointer;border:none}
        .ab.p{background:linear-gradient(135deg,#c4651a,#e8a24e);color:#fff;box-shadow:0 3px 10px rgba(196,101,26,.28)}
        .ab.p:hover{box-shadow:0 6px 16px rgba(196,101,26,.45);transform:translateY(-1px)}
        .ab.o{background:#fff;border:2px solid #e8d5b7;color:#555}
        .ab.o:hover{border-color:#c4651a;background:#fff9f4}
        .dr{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-top:1px solid #f5ede0;font-size:13px}
        .fa{opacity:0;transform:translateY(12px);transition:opacity .32s ease,transform .32s ease}
        .fa.vis{opacity:1;transform:translateY(0)}
        @keyframes fu{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        .ex{animation:fu .22s ease}
        .wa{position:fixed;bottom:22px;left:22px;z-index:999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#25d366,#128c7e);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(37,211,102,.5);text-decoration:none;font-size:25px;transition:transform .2s,box-shadow .2s}
        .wa:hover{transform:scale(1.12);box-shadow:0 6px 24px rgba(37,211,102,.65)}
        @media(max-width:600px){.grid{grid-template-columns:1fr!important}}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#c4a97d;border-radius:3px}
      `}</style>

      <header style={{ background: "linear-gradient(135deg,#1a0d04 0%,#3a2008 55%,#573015 100%)", padding: "32px 20px 42px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 15% 60%,rgba(196,101,26,.22) 0%,transparent 55%),radial-gradient(ellipse at 85% 20%,rgba(232,162,78,.13) 0%,transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 38, marginBottom: 7 }}>🌿</div>
          <h1 style={{ fontSize: "clamp(28px,8vw,50px)", fontWeight: 900, color: "#f5e6cc", lineHeight: 1.05, letterSpacing: "-1px" }}>עסקים בבאר גנים</h1>
          <p style={{ color: "#c4a97d", fontSize: 14, marginTop: 9, fontWeight: 300 }}>{BUSINESSES.length} עסקים ושירותים מקומיים</p>
        </div>
      </header>

      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(247,243,237,.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #ecdfc8", padding: "13px 16px 9px" }}>
        <div style={{ position: "relative", maxWidth: 520, margin: "0 auto 10px" }}>
          <span style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", fontSize: 17, pointerEvents: "none" }}>🔍</span>
          <input className="si" type="text" placeholder="חפש עסק, שירות, שם..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          <button className={`cc ${activeCat === "הכל" ? "act" : ""}`} onClick={() => setActiveCat("הכל")}>🏘️ הכל ({BUSINESSES.length})</button>
          
          <button className={`cc open-now ${activeCat === "פתוח עכשיו" ? "act" : ""}`} onClick={() => setActiveCat("פתוח עכשיו")}>
            🟢 פתוח עכשיו
          </button>

          {Object.entries(CATEGORIES).map(([c, { emoji }]) => counts[c] ? (
            <button key={c} className={`cc ${activeCat === c ? "act" : ""}`} onClick={() => setActiveCat(c)}>{emoji} {c} ({counts[c]})</button>
          ) : null)}
        </div>
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "15px 14px 80px" }}>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", padding: "64px 20px", color: "#b09070" }}><div style={{ fontSize: 48 }}>🔍</div><p style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>לא נמצאו תוצאות לפילטר שבחרת</p></div>
          : <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(285px,1fr))", gap: 13 }}>
            {filtered.map((biz, i) => (
              <Card key={biz.id} biz={biz} idx={i} expanded={expandedId === biz.id} onToggle={() => setExpandedId(expandedId === biz.id ? null : biz.id)} mounted={mounted} />
            ))}
          </div>
        }
      </main>

      <footer style={{ textAlign: "center", padding: "20px", color: "#b09070", fontSize: 14, borderTop: "1px solid #ecdfc8", background: "#ede7da" }}>
        <p style={{ fontWeight: 700, color: "#6b4c2a", fontSize: 16 }}>עסקים בבאר גנים</p>
        
        <p style={{ marginTop: 10, color: "#4a3218", fontWeight: 500 }}>
          בעל עסק? רוצה שנבנה לך אתר?{" "}
          <a href="https://wa.me/9720559139013?text=שלום, ראיתי את האתר של באר גנים ואשמח לקבל פרטים על בניית אתר לעסק שלי!" target="_blank" rel="noreferrer" style={{ color: "#c4651a", fontWeight: 800, textDecoration: "underline" }}>לחץ כאן</a>
        </p>

        <div style={{ marginTop: 12, fontSize: 13, color: "#8a6a4a" }}>
          🏪 מעוניין להוסיף, לעדכן פרטים או להסיר עסק מהרשימה?{" "}
          <a href="https://wa.me/9720559139013?text=שלום, אשמח לעדכן פרטים של עסק באתר באר גנים" target="_blank" rel="noreferrer" style={{ color: "#c4651a", fontWeight: 700, textDecoration: "underline" }}>שלח הודעה</a>
        </div>
        
        <div style={{ marginTop: 14, fontSize: 11, color: "#aaa", maxWidth: 480, margin: "14px auto 0", lineHeight: 1.6, padding: "10px 14px", background: "#f5ede0", borderRadius: 10 }}>
          המידע באתר נאסף ממקורות גלויים ומוצג כשירות לציבור.
        </div>
      </footer>

      <a href={`https://wa.me/972${waFloat.replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="wa">💬</a>
    </div>
  );
}
