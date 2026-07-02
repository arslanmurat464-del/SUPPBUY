
import { useState, useEffect, useMemo } from "react";
import { Plus, Building2, MapPin, Calendar, Trash2, Lock, Eye, EyeOff, X,
  Users, LayoutGrid, CheckSquare, BarChart3, Search, Tag, Clock, ChevronLeft,
  Menu, LogOut, AlertCircle, TrendingUp, TrendingDown, MinusCircle, Download, Video, Briefcase, Wallet, Bell } from "lucide-react";

// --- Kalıcı depolama (bu cihazın tarayıcısında saklar) ---
// Not: localStorage bu tarayıcıya/cihaza özeldir; farklı cihazlardan
// giren kişiler birbirinin verisini görmez. Ekip içinde ortak veri için
// ileride gerçek bir veritabanı (örn. Supabase) bağlanabilir.
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        return { key, value: raw };
      } catch (e) {
        return null;
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return { key, value };
      } catch (e) {
        return null;
      }
    },
    async delete(key) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true };
      } catch (e) {
        return null;
      }
    },
    async list(prefix) {
      try {
        const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
        return { keys };
      } catch (e) {
        return null;
      }
    },
  };
}

const NAVY = "#1B3A66";
const NAVY_DARK = "#132C4F";
const ORANGE = "#F2A12E";
const BG = "#F5F6F8";

const ADMIN_PIN = "3256"; // Yönetici (sen) — bunu değiştir

const FIRMA_TIPI = ["Alıcı Firma", "Ürün Tedarikçisi", "Hizmet Tedarikçisi"];
const KAYNAK_SECENEKLERI = ["Saha Ziyareti", "LinkedIn", "Instagram", "İş İlanı Sitesi"];
const SONUC_SECENEKLERI = ["Beklemede", "Tekrar Görüşülecek", "Olumsuz", "Satış Yapıldı"];
const OLUMSUZLUK_NEDENLERI = ["Fiyat", "Kullandıkları Program Var", "İhtiyaç Yok", "Rakip Kullanıyor", "Karar Vermedi", "Diğer"];
const ETIKET_SECENEKLERI = ["Acil", "Büyük Potansiyel", "Referans Firma", "VIP"];

// Buraya istediğiniz ilçe/bölge isimlerini ekleyebilir, çıkarabilir veya sıralamasını değiştirebilirsiniz.
// İstanbul, ilçe detayı olmadan Anadolu/Avrupa yakası olarak iki ayrı seçenektir.
// Diğer tüm iller tek tek listelenir. İstediğiniz ili ekleyip çıkarabilirsiniz.
const BOLGE_SECENEKLERI = [
  "İstanbul (Anadolu Yakası)", "İstanbul (Avrupa Yakası)",
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
  "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir",
  "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis",
  "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
  "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Iğdır", "Isparta", "İzmir", "Kahramanmaraş", "Karabük",
  "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale",
  "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya",
  "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun",
  "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ",
  "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova",
  "Yozgat", "Zonguldak",
];
const ILAN_SITELERI = ["Kariyer.net", "Eleman.net", "LinkedIn", "Indeed", "Diğer"];
const HARCAMA_KATEGORILERI = ["Muhasebe", "Araç", "Personel", "İletişim", "Yemek"];

const KDV_ORANI = 0.20;
const PAKETLER = {
  "Başlangıç": 25000,
  "Profesyonel": 35000,
  "Kurumsal": 50000,
};
const TEDARIKCI_PAKETI = { ad: "Tedarikçi Paketi (Yıllık)", fiyat: 10000 };
function paketKdvli(fiyat) { return Math.round(fiyat * (1 + KDV_ORANI)); }
function fmtTL(n) { return n.toLocaleString("tr-TR") + " ₺"; }
function paketFiyatListesi(firmaTipi) {
  if (firmaTipi === "Alıcı Firma") return PAKETLER;
  return { [TEDARIKCI_PAKETI.ad]: TEDARIKCI_PAKETI.fiyat };
}
function paketFiyatBul(paketAdi) {
  if (PAKETLER[paketAdi] !== undefined) return PAKETLER[paketAdi];
  if (paketAdi === TEDARIKCI_PAKETI.ad) return TEDARIKCI_PAKETI.fiyat;
  return 0;
}

const SONUC_RENK = {
  "Beklemede": { bg: "#FFF4E0", text: "#9A6B00", dot: "#F2A12E" },
  "Tekrar Görüşülecek": { bg: "#E8EEF7", text: NAVY, dot: NAVY },
  "Olumsuz": { bg: "#FBEAEA", text: "#B23B3B", dot: "#B23B3B" },
  "Satış Yapıldı": { bg: "#E5F3EA", text: "#2E7D4F", dot: "#2E7D4F" },
};

const ETIKET_RENK = {
  "Acil": { bg: "#FBEAEA", text: "#B23B3B" },
  "Büyük Potansiyel": { bg: "#E5F3EA", text: "#2E7D4F" },
  "Referans Firma": { bg: "#EFE7F7", text: "#6B3FA0" },
  "VIP": { bg: "#FFF4E0", text: "#9A6B00" },
};

function todayKey() { return new Date().toISOString().slice(0, 10); }
function nowISO() { return new Date().toISOString(); }
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) + " · " +
    d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDayLabel(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", weekday: "long" });
}
function fmtAyLabel(ayKey) {
  const d = new Date(ayKey + "-01T00:00:00");
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}
// Bir tarihi (YYYY-MM-DD), seçilen periyoda göre bir grup anahtarına çevirir.
// aylik: "2026-07", 3aylik: "2026-Q3", 6aylik: "2026-H2", yillik: "2026"
function periyotAnahtari(tarih, periyot) {
  const [yil, ay] = tarih.split("-").map(Number);
  if (periyot === "aylik") return tarih.slice(0, 7);
  if (periyot === "3aylik") return `${yil}-Ç${Math.ceil(ay / 3)}`;
  if (periyot === "6aylik") return `${yil}-${ay <= 6 ? "1. Yarı" : "2. Yarı"}`;
  if (periyot === "yillik") return `${yil}`;
  return tarih.slice(0, 7);
}
function periyotEtiket(anahtar, periyot) {
  if (periyot === "aylik") return fmtAyLabel(anahtar);
  return anahtar; // 3aylik / 6aylik / yillik zaten okunur formatta üretiliyor
}
// Bölge <select> içeriğini üretir.
function BolgeOptions() {
  return BOLGE_SECENEKLERI.map(b => <option key={b} value={b}>{b}</option>);
}

function downloadICS(lead) {
  const dateStr = lead.ziyaretTarihi.replace(/-/g, "");
  const timeStr = (lead.ziyaretSaati || "09:00").replace(":", "") + "00";
  const dtStart = `${dateStr}T${timeStr}`;
  // default 30 min duration
  const [h, m] = (lead.ziyaretSaati || "09:00").split(":").map(Number);
  const endDate = new Date(2000, 0, 1, h, m + 30);
  const endTimeStr = String(endDate.getHours()).padStart(2, "0") + String(endDate.getMinutes()).padStart(2, "0") + "00";
  const dtEnd = `${dateStr}T${endTimeStr}`;

  const escapeICS = (str) => (str || "").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Suppbuy CRM//TR",
    "BEGIN:VEVENT",
    `UID:${lead.id}@suppbuy-crm`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(lead.firmaAdi + " ziyareti")}`,
    `DESCRIPTION:${escapeICS([lead.firmaTipi, lead.talepDetayi, lead.ziyaretEden && `Ziyaret eden: ${lead.ziyaretEden}`].filter(Boolean).join(" — "))}`,
    `LOCATION:${escapeICS(lead.adres || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${lead.firmaAdi.replace(/[^a-zA-Z0-9]/g, "_")}_randevu.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const EMPTY_LEAD_FORM = {
  firmaAdi: "", firmaTipi: "Alıcı Firma", sektor: "", bolge: "", kaynak: "Saha Ziyareti", adres: "", ziyaretTarihi: todayKey(),
  ziyaretSaati: "", ilanKaynagi: "", ziyaretEden: "", atananPersonel: "", sonuc: "Beklemede", olumsuzlukNedeni: "", kullandigiProgram: "",
  paket: "", satisTarihi: "", talepDetayi: "", notlar: "", etiketler: [],
  yetkiliAdi: "", yetkiliTelefon: "", yetkiliEmail: "", yetkiliUnvan: "",
};

const EMPTY_TASK_FORM = { baslik: "", tarih: todayKey(), leadId: "", tamamlandi: false };
const EMPTY_MEETING_FORM = { baslik: "", tarih: todayKey(), saat: "10:00", katilimcilar: [], notlar: "" };
const EMPTY_ILAN_FORM = { firmaAdi: "", sektor: "", ilanSitesi: "Kariyer.net", ilanDetayi: "", ilanTarihi: todayKey() };
const EMPTY_HARCAMA_FORM = { kategori: "Muhasebe", tutar: "", tarih: todayKey(), aciklama: "" };

export default function SuppbuyCRM() {
  const [view, setView] = useState("login");
  const [currentPersonel, setCurrentPersonel] = useState(null); // { id, ad } veya null (admin ise)
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [toplantilar, setToplantilar] = useState([]);
  const [ilanlar, setIlanlar] = useState([]);
  const [harcamalar, setHarcamalar] = useState([]);
  const [bildirimler, setBildirimler] = useState([]);
  const [bildirimlerAcik, setBildirimlerAcik] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [page, setPage] = useState("firmalar");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD_FORM);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState(EMPTY_MEETING_FORM);
  const [showIlanForm, setShowIlanForm] = useState(false);
  const [ilanForm, setIlanForm] = useState(EMPTY_ILAN_FORM);
  const [aktarilanIlan, setAktarilanIlan] = useState(null);
  const [showHarcamaForm, setShowHarcamaForm] = useState(false);
  const [harcamaForm, setHarcamaForm] = useState(EMPTY_HARCAMA_FORM);
  const [harcamaPeriyot, setHarcamaPeriyot] = useState("aylik"); // aylik | 3aylik | 6aylik | yillik

  const [selectedLead, setSelectedLead] = useState(null);
  const [filterTipi, setFilterTipi] = useState("Hepsi");
  const [filterBolge, setFilterBolge] = useState("Hepsi");
  const [activeTab, setActiveTab] = useState("ziyaretEdilecek"); // ziyaretEdilecek | ziyaretEdildi | demoTalepleri | isIlanlari
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r1 = await window.storage.get("crm-leads", true);
        if (r1 && r1.value) setLeads(JSON.parse(r1.value));
      } catch (e) {}
      try {
        const r2 = await window.storage.get("crm-tasks", true);
        if (r2 && r2.value) setTasks(JSON.parse(r2.value));
      } catch (e) {}
      try {
        const r3 = await window.storage.get("crm-personeller", true);
        if (r3 && r3.value) setPersoneller(JSON.parse(r3.value));
      } catch (e) {}
      try {
        const r4 = await window.storage.get("crm-toplantilar", true);
        if (r4 && r4.value) setToplantilar(JSON.parse(r4.value));
      } catch (e) {}
      try {
        const r5 = await window.storage.get("crm-ilanlar", true);
        if (r5 && r5.value) setIlanlar(JSON.parse(r5.value));
      } catch (e) {}
      try {
        const r6 = await window.storage.get("crm-harcamalar", true);
        if (r6 && r6.value) setHarcamalar(JSON.parse(r6.value));
      } catch (e) {}
      try {
        const r7 = await window.storage.get("crm-bildirimler", true);
        if (r7 && r7.value) setBildirimler(JSON.parse(r7.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  async function persistLeads(next) {
    setLeads(next);
    try { await window.storage.set("crm-leads", JSON.stringify(next), true); }
    catch (e) { showToast("Kaydedilemedi"); }
  }
  async function persistTasks(next) {
    setTasks(next);
    try { await window.storage.set("crm-tasks", JSON.stringify(next), true); }
    catch (e) { showToast("Kaydedilemedi"); }
  }
  async function persistPersoneller(next) {
    setPersoneller(next);
    try { await window.storage.set("crm-personeller", JSON.stringify(next), true); }
    catch (e) { showToast("Kaydedilemedi"); }
  }
  async function persistToplantilar(next) {
    setToplantilar(next);
    try { await window.storage.set("crm-toplantilar", JSON.stringify(next), true); }
    catch (e) { showToast("Kaydedilemedi"); }
  }
  async function persistIlanlar(next) {
    setIlanlar(next);
    try { await window.storage.set("crm-ilanlar", JSON.stringify(next), true); }
    catch (e) { showToast("Kaydedilemedi"); }
  }
  async function persistHarcamalar(next) {
    setHarcamalar(next);
    try { await window.storage.set("crm-harcamalar", JSON.stringify(next), true); }
    catch (e) { showToast("Kaydedilemedi"); }
  }
  async function persistBildirimler(next) {
    setBildirimler(next);
    try { await window.storage.set("crm-bildirimler", JSON.stringify(next), true); }
    catch (e) { showToast("Kaydedilemedi"); }
  }

  async function handleAddPersonel(ad, pin) {
    if (!ad.trim()) return;
    const personel = { id: `${Date.now()}`, ad: ad.trim(), pin };
    await persistPersoneller([...personeller, personel]);
    showToast("Personel eklendi");
  }

  async function handleUpdatePersonelPin(id, yeniPin) {
    await persistPersoneller(personeller.map(p => p.id === id ? { ...p, pin: yeniPin } : p));
    showToast("PIN güncellendi");
  }

  async function handleDeletePersonel(id) {
    await persistPersoneller(personeller.filter(p => p.id !== id));
    showToast("Personel silindi");
  }

  async function handleAddToplanti(toplanti) {
    const meetLink = `https://meet.google.com/new`;
    const yeni = { id: `${Date.now()}`, ...toplanti, meetLink, createdAt: nowISO() };
    await persistToplantilar([...toplantilar, yeni]);
    showToast("Toplantı oluşturuldu");
  }

  async function handleDeleteToplanti(id) {
    await persistToplantilar(toplantilar.filter(t => t.id !== id));
    showToast("Toplantı silindi");
  }

  async function handleAddIlan(ilan) {
    const yeni = { id: `${Date.now()}`, ...ilan, aktarildi: false, createdAt: nowISO() };
    await persistIlanlar([...ilanlar, yeni]);
    showToast("İlan eklendi");
  }

  async function handleDeleteIlan(id) {
    await persistIlanlar(ilanlar.filter(i => i.id !== id));
    showToast("İlan silindi");
  }

  async function handleAktarIlan(ilan, bolge, atananPersonel) {
    const lead = {
      id: `${Date.now()}`,
      firmaAdi: ilan.firmaAdi, firmaTipi: "Alıcı Firma", sektor: ilan.sektor || "", bolge: bolge || "",
      kaynak: "İş İlanı Sitesi", adres: "", ziyaretTarihi: "", ziyaretSaati: "",
      ilanKaynagi: ilan.ilanSitesi, ziyaretEden: "", atananPersonel: atananPersonel || "",
      girenPersonel: currentPersonel ? currentPersonel.ad : null,
      sonuc: "Beklemede", olumsuzlukNedeni: "", paket: "", satisTarihi: "",
      talepDetayi: ilan.ilanDetayi || "", notlar: "", etiketler: [],
      yetkiliAdi: "", yetkiliTelefon: "", yetkiliEmail: "", yetkiliUnvan: "",
      createdAt: nowISO(),
      activities: [{ id: `${Date.now()}`, text: "İş ilanından ziyaret listesine aktarıldı", at: nowISO() }],
    };
    await persistLeads([...leads, lead]);
    await persistIlanlar(ilanlar.map(i => i.id === ilan.id ? { ...i, aktarildi: true } : i));
    showToast("Firma ziyaret listesine eklendi");
  }

  async function handleAddHarcama(harcama) {
    const yeni = { id: `${Date.now()}`, ...harcama, tutar: Number(harcama.tutar) || 0, createdAt: nowISO() };
    await persistHarcamalar([...harcamalar, yeni]);
    showToast("Harcama eklendi");
  }

  async function handleDeleteHarcama(id) {
    await persistHarcamalar(harcamalar.filter(h => h.id !== id));
    showToast("Harcama silindi");
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function handlePinSubmit(e) {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setView("admin"); setCurrentPersonel(null); setPinInput(""); setPinError("");
      return;
    }
    const eslesen = personeller.find(p => p.pin === pinInput);
    if (eslesen) {
      setView("staff"); setCurrentPersonel(eslesen); setPinInput(""); setPinError("");
    } else {
      setPinError("Kod hatalı, tekrar deneyin");
    }
  }

  function handleLogout() {
    setView("login"); setCurrentPersonel(null); setSelectedLead(null); setShowLeadForm(false); setPage("firmalar");
  }

  function addActivity(lead, text) {
    const activities = lead.activities || [];
    return [...activities, { id: `${Date.now()}`, text, at: nowISO() }];
  }

  async function handleAddLead(e) {
    e.preventDefault();
    if (!leadForm.firmaAdi.trim()) { showToast("Firma adı gerekli"); return; }
    if (!leadForm.bolge) { showToast("Bölge / İlçe seçimi gerekli"); return; }
    setSaving(true);
    const otomatikAtama = !isAdmin && currentPersonel ? currentPersonel.ad : leadForm.atananPersonel;
    const lead = {
      id: `${Date.now()}`, ...leadForm, firmaAdi: leadForm.firmaAdi.trim(), atananPersonel: otomatikAtama,
      girenPersonel: currentPersonel ? currentPersonel.ad : null,
      createdAt: nowISO(),
      activities: [{ id: `${Date.now()}`, text: "Firma eklendi", at: nowISO() }],
    };
    await persistLeads([...leads, lead]);
    setSaving(false);
    setLeadForm(EMPTY_LEAD_FORM);
    setShowLeadForm(false);
    showToast("Firma eklendi");

    if (!isAdmin && currentPersonel) {
      const bildirim = {
        id: `${Date.now()}`,
        personel: currentPersonel.ad,
        firmaAdi: lead.firmaAdi,
        leadId: lead.id,
        mesaj: `${currentPersonel.ad}, "${lead.firmaAdi}" firmasını ekledi`,
        okundu: false,
        createdAt: nowISO(),
      };
      await persistBildirimler([bildirim, ...bildirimler]);
    }
  }

  async function handleUpdateLead(id, updates, activityText) {
    const lead = leads.find(l => l.id === id);
    const next = leads.map(l => {
      if (l.id !== id) return l;
      const merged = { ...l, ...updates };
      if (activityText) merged.activities = addActivity(l, activityText);
      return merged;
    });
    await persistLeads(next);
    const updated = next.find(l => l.id === id);
    setSelectedLead(updated);
    showToast("Güncellendi");

    // Personel bir değişiklik yaptıysa, admin için bildirim oluştur
    if (!isAdmin && currentPersonel && lead) {
      const parcalar = [];
      if (updates.sonuc && updates.sonuc !== lead.sonuc) {
        parcalar.push(`sonucu "${updates.sonuc}" olarak güncelledi`);
      }
      if (updates.notlar && updates.notlar !== (lead.notlar || "")) {
        parcalar.push("not ekledi/güncelledi");
      }
      if (parcalar.length > 0) {
        const bildirim = {
          id: `${Date.now()}`,
          personel: currentPersonel.ad,
          firmaAdi: lead.firmaAdi,
          leadId: lead.id,
          mesaj: `${currentPersonel.ad}, ${lead.firmaAdi} firmasının ${parcalar.join(", ")}`,
          okundu: false,
          createdAt: nowISO(),
        };
        await persistBildirimler([bildirim, ...bildirimler]);
      }
    }
  }

  async function handleDeleteLead(id) {
    await persistLeads(leads.filter(l => l.id !== id));
    await persistTasks(tasks.filter(t => t.leadId !== id));
    setSelectedLead(null);
    showToast("Silindi");
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!taskForm.baslik.trim()) { showToast("Görev başlığı gerekli"); return; }
    const task = { id: `${Date.now()}`, ...taskForm, createdAt: nowISO() };
    await persistTasks([...tasks, task]);
    setTaskForm(EMPTY_TASK_FORM);
    setShowTaskForm(false);
    showToast("Görev eklendi");
  }

  async function toggleTask(id) {
    await persistTasks(tasks.map(t => t.id === id ? { ...t, tamamlandi: !t.tamamlandi } : t));
  }

  async function deleteTask(id) {
    await persistTasks(tasks.filter(t => t.id !== id));
    showToast("Görev silindi");
  }

  const isAdmin = view === "admin";

  const visibleLeads = useMemo(() => {
    let list = leads;
    if (view === "staff") {
      list = list.filter(l => l.sonuc !== "Satış Yapıldı");
      // Personel sadece kendine atanan firmaları görür
      if (currentPersonel) list = list.filter(l => l.atananPersonel === currentPersonel.ad);
    }

    // Tab-based split: Demo Talepleri = kaynak is LinkedIn/Instagram
    // Ziyaret Edildi = Saha Ziyareti AND ziyaretTarihi <= today
    // Ziyaret Edilecek = Saha Ziyareti AND ziyaretTarihi > today (or no result yet)
    const today = todayKey();
    if (activeTab === "demoTalepleri") {
      list = list.filter(l => l.kaynak === "LinkedIn" || l.kaynak === "Instagram");
    } else if (activeTab === "isIlanlari") {
      list = list.filter(l => l.kaynak === "İş İlanı Sitesi");
    } else if (activeTab === "ziyaretEdildi") {
      list = list.filter(l => l.kaynak === "Saha Ziyareti" && l.ziyaretTarihi && l.ziyaretTarihi <= today);
    } else if (activeTab === "ziyaretEdilecek") {
      list = list.filter(l => l.kaynak === "Saha Ziyareti" && (!l.ziyaretTarihi || l.ziyaretTarihi > today));
    }

    if (filterTipi !== "Hepsi") list = list.filter(l => l.firmaTipi === filterTipi);
    if (filterBolge !== "Hepsi") list = list.filter(l => l.bolge === filterBolge);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(l =>
        l.firmaAdi.toLowerCase().includes(q) ||
        (l.adres || "").toLowerCase().includes(q) ||
        (l.sektor || "").toLowerCase().includes(q) ||
        (l.bolge || "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.ziyaretTarihi || "").localeCompare(a.ziyaretTarihi || ""));
  }, [leads, view, filterTipi, filterBolge, searchQuery, activeTab, currentPersonel]);

  const tabCounts = useMemo(() => {
    let base = leads;
    if (view === "staff") {
      base = base.filter(l => l.sonuc !== "Satış Yapıldı");
      if (currentPersonel) base = base.filter(l => l.atananPersonel === currentPersonel.ad);
    }
    const today = todayKey();
    return {
      ziyaretEdilecek: base.filter(l => l.kaynak === "Saha Ziyareti" && (!l.ziyaretTarihi || l.ziyaretTarihi > today)).length,
      ziyaretEdildi: base.filter(l => l.kaynak === "Saha Ziyareti" && l.ziyaretTarihi && l.ziyaretTarihi <= today).length,
      demoTalepleri: base.filter(l => l.kaynak === "LinkedIn" || l.kaynak === "Instagram").length,
      isIlanlari: base.filter(l => l.kaynak === "İş İlanı Sitesi").length,
    };
  }, [leads, view, currentPersonel]);

  const stats = useMemo(() => {
    const total = leads.length;
    const satis = leads.filter(l => l.sonuc === "Satış Yapıldı").length;
    const olumsuz = leads.filter(l => l.sonuc === "Olumsuz").length;
    const beklemede = leads.filter(l => l.sonuc === "Beklemede" || l.sonuc === "Tekrar Görüşülecek").length;
    const oran = total > 0 ? Math.round((satis / total) * 100) : 0;
    const nedenSayim = {};
    leads.filter(l => l.sonuc === "Olumsuz" && l.olumsuzlukNedeni).forEach(l => {
      nedenSayim[l.olumsuzlukNedeni] = (nedenSayim[l.olumsuzlukNedeni] || 0) + 1;
    });

    // Aylık satış ve ciro
    const satisYapilanlar = leads.filter(l => l.sonuc === "Satış Yapıldı" && l.paket && l.satisTarihi);
    const aylikVeri = {};
    satisYapilanlar.forEach(l => {
      const ay = l.satisTarihi.slice(0, 7); // YYYY-MM
      if (!aylikVeri[ay]) aylikVeri[ay] = { adet: 0, ciroHaric: 0, ciroDahil: 0, paketler: {} };
      const fiyat = paketFiyatBul(l.paket);
      aylikVeri[ay].adet += 1;
      aylikVeri[ay].ciroHaric += fiyat;
      aylikVeri[ay].ciroDahil += paketKdvli(fiyat);
      aylikVeri[ay].paketler[l.paket] = (aylikVeri[ay].paketler[l.paket] || 0) + 1;
    });
    const aylikListe = Object.entries(aylikVeri).sort((a, b) => b[0].localeCompare(a[0]));

    const buAy = todayKey().slice(0, 7);
    const buAyVeri = aylikVeri[buAy] || { adet: 0, ciroHaric: 0, ciroDahil: 0, paketler: {} };

    const paketDagilimi = {};
    satisYapilanlar.forEach(l => { paketDagilimi[l.paket] = (paketDagilimi[l.paket] || 0) + 1; });

    // Personel bazlı performans
    const personelPerformans = personeller.map(p => {
      const buPersonelinFirmalari = leads.filter(l => l.atananPersonel === p.ad);
      const ziyaretEdilen = buPersonelinFirmalari.filter(l => l.kaynak === "Saha Ziyareti" && l.ziyaretTarihi && l.ziyaretTarihi <= todayKey());
      const satisYapilan = buPersonelinFirmalari.filter(l => l.sonuc === "Satış Yapıldı" && l.paket);
      const ciroDahil = satisYapilan.reduce((sum, l) => sum + paketKdvli(paketFiyatBul(l.paket)), 0);
      const ciroHaric = satisYapilan.reduce((sum, l) => sum + paketFiyatBul(l.paket), 0);
      const paketSayim = {};
      satisYapilan.forEach(l => { paketSayim[l.paket] = (paketSayim[l.paket] || 0) + 1; });
      return {
        personel: p,
        toplamFirma: buPersonelinFirmalari.length,
        ziyaretSayisi: ziyaretEdilen.length,
        satisSayisi: satisYapilan.length,
        olumsuzSayisi: buPersonelinFirmalari.filter(l => l.sonuc === "Olumsuz").length,
        beklemedeSayisi: buPersonelinFirmalari.filter(l => l.sonuc === "Beklemede" || l.sonuc === "Tekrar Görüşülecek").length,
        ciroDahil, ciroHaric, paketSayim,
      };
    }).sort((a, b) => b.ciroDahil - a.ciroDahil);

    return { total, satis, olumsuz, beklemede, oran, nedenSayim, aylikListe, buAyVeri, paketDagilimi, personelPerformans };
  }, [leads, personeller]);

  // KDV Raporu: satılan paketlerden toplanan KDV, seçilen periyoda göre gruplanır.
  const kdvRaporu = useMemo(() => {
    const satisYapilanlar = leads.filter(l => l.sonuc === "Satış Yapıldı" && l.paket && l.satisTarihi);
    const gruplar = {};
    satisYapilanlar.forEach(l => {
      const anahtar = periyotAnahtari(l.satisTarihi, harcamaPeriyot);
      if (!gruplar[anahtar]) gruplar[anahtar] = { ciroHaric: 0, ciroDahil: 0, kdv: 0, adet: 0 };
      const fiyat = paketFiyatBul(l.paket);
      const dahil = paketKdvli(fiyat);
      gruplar[anahtar].ciroHaric += fiyat;
      gruplar[anahtar].ciroDahil += dahil;
      gruplar[anahtar].kdv += (dahil - fiyat);
      gruplar[anahtar].adet += 1;
    });
    const liste = Object.entries(gruplar).sort((a, b) => b[0].localeCompare(a[0]));
    const toplamKdv = satisYapilanlar.reduce((sum, l) => {
      const fiyat = paketFiyatBul(l.paket);
      return sum + (paketKdvli(fiyat) - fiyat);
    }, 0);
    return { liste, toplamKdv };
  }, [leads, harcamaPeriyot]);

  // Harcama Raporu: kategoriye göre, seçilen periyoda göre gruplanır.
  const harcamaRaporu = useMemo(() => {
    const gruplar = {};
    harcamalar.forEach(h => {
      const anahtar = periyotAnahtari(h.tarih, harcamaPeriyot);
      if (!gruplar[anahtar]) gruplar[anahtar] = { toplam: 0, kategoriler: {} };
      gruplar[anahtar].toplam += h.tutar;
      gruplar[anahtar].kategoriler[h.kategori] = (gruplar[anahtar].kategoriler[h.kategori] || 0) + h.tutar;
    });
    const liste = Object.entries(gruplar).sort((a, b) => b[0].localeCompare(a[0]));
    const kategoriToplam = {};
    harcamalar.forEach(h => { kategoriToplam[h.kategori] = (kategoriToplam[h.kategori] || 0) + h.tutar; });
    const genelToplam = harcamalar.reduce((sum, h) => sum + h.tutar, 0);
    // En çok harcama yapılan kategori
    let enCokKategori = null, enCokTutar = 0;
    Object.entries(kategoriToplam).forEach(([k, t]) => {
      if (t > enCokTutar) { enCokKategori = k; enCokTutar = t; }
    });
    return { liste, kategoriToplam, genelToplam, enCokKategori, enCokTutar };
  }, [harcamalar, harcamaPeriyot]);

  // Kâr/Zarar Raporu: seçilen periyotta gelir (KDV hariç ciro) - gider (harcamalar)
  const karZararRaporu = useMemo(() => {
    const satisYapilanlar = leads.filter(l => l.sonuc === "Satış Yapıldı" && l.paket && l.satisTarihi);
    const gelirGruplar = {};
    satisYapilanlar.forEach(l => {
      const anahtar = periyotAnahtari(l.satisTarihi, harcamaPeriyot);
      gelirGruplar[anahtar] = (gelirGruplar[anahtar] || 0) + paketFiyatBul(l.paket);
    });
    const giderGruplar = {};
    harcamalar.forEach(h => {
      const anahtar = periyotAnahtari(h.tarih, harcamaPeriyot);
      giderGruplar[anahtar] = (giderGruplar[anahtar] || 0) + h.tutar;
    });
    const tumAnahtarlar = new Set([...Object.keys(gelirGruplar), ...Object.keys(giderGruplar)]);
    const liste = [...tumAnahtarlar].sort((a, b) => b.localeCompare(a)).map(anahtar => {
      const gelir = gelirGruplar[anahtar] || 0;
      const gider = giderGruplar[anahtar] || 0;
      return { anahtar, gelir, gider, karZarar: gelir - gider };
    });
    const toplamGelir = Object.values(gelirGruplar).reduce((a, b) => a + b, 0);
    const toplamGider = Object.values(giderGruplar).reduce((a, b) => a + b, 0);
    return { liste, toplamGelir, toplamGider, toplamKarZarar: toplamGelir - toplamGider };
  }, [leads, harcamalar, harcamaPeriyot]);

  const pendingTasks = useMemo(() => {
    const visibleIds = new Set(visibleLeads.map(l => l.id));
    return tasks.filter(t => !t.tamamlandi && (view === "admin" || visibleIds.has(t.leadId) || !t.leadId))
      .sort((a, b) => a.tarih.localeCompare(b.tarih));
  }, [tasks, visibleLeads, view]);

  const overdueTasks = pendingTasks.filter(t => t.tarih < todayKey());
  const todayTasks = pendingTasks.filter(t => t.tarih === todayKey());

  // Ajanda: leads with a scheduled visit date (Saha Ziyareti), grouped by date, sorted by time
  const randevular = useMemo(() => {
    let base = leads.filter(l => l.kaynak === "Saha Ziyareti" && l.ziyaretTarihi);
    if (view === "staff") {
      base = base.filter(l => l.sonuc !== "Satış Yapıldı");
      if (currentPersonel) base = base.filter(l => l.atananPersonel === currentPersonel.ad);
    }
    const grouped = {};
    base.forEach(l => {
      if (!grouped[l.ziyaretTarihi]) grouped[l.ziyaretTarihi] = [];
      grouped[l.ziyaretTarihi].push(l);
    });
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => (a.ziyaretSaati || "99:99").localeCompare(b.ziyaretSaati || "99:99"));
    });
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads, view, currentPersonel]);

  // Günlük Ziyaret Takibi: sadece admin görür, hangi personel hangi tarihte nereye gitti
  const gunlukZiyaretler = useMemo(() => {
    const base = leads.filter(l => l.kaynak === "Saha Ziyareti" && l.ziyaretTarihi && l.atananPersonel);
    const grouped = {};
    base.forEach(l => {
      if (!grouped[l.ziyaretTarihi]) grouped[l.ziyaretTarihi] = [];
      grouped[l.ziyaretTarihi].push(l);
    });
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => (a.ziyaretSaati || "99:99").localeCompare(b.ziyaretSaati || "99:99"));
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [leads]);

  const gorunurToplantilar = useMemo(() => {
    let list = toplantilar;
    if (view === "staff" && currentPersonel) {
      list = list.filter(t => (t.katilimcilar || []).includes(currentPersonel.ad));
    }
    return [...list].sort((a, b) => `${a.tarih}${a.saat}`.localeCompare(`${b.tarih}${b.saat}`));
  }, [toplantilar, view, currentPersonel]);

  if (view === "login") {
    const eslesenPersonel = pinInput.length >= 4 ? personeller.find(p => p.pin === pinInput) : null;
    const adminEslesme = pinInput === ADMIN_PIN;
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${NAVY_DARK}, ${NAVY})`, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif", padding: "20px 16px", boxSizing: "border-box", width: "100%" }}>
        <div style={{ width: "100%", maxWidth: 380, boxSizing: "border-box" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: ORANGE, margin: "0 auto 18px",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26, color: NAVY }}>S</div>
            <div style={{ color: "white", fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Suppbuy CRM</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 6 }}>Erişim kodunuzu girin</div>
          </div>
          <form onSubmit={handlePinSubmit} style={{ background: "white", borderRadius: 18, padding: "24px 20px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", boxSizing: "border-box" }}>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <Lock size={18} color="#9AA0AC" style={{ position: "absolute", left: 14, top: 15 }} />
              <input type={showPin ? "text" : "password"} value={pinInput} onChange={e => setPinInput(e.target.value)}
                placeholder="Kod" inputMode="numeric" autoFocus
                style={{ width: "100%", padding: "13px 44px", borderRadius: 10, border: "1.5px solid #E4E7EC",
                  fontSize: 16, outline: "none", boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowPin(!showPin)}
                style={{ position: "absolute", right: 10, top: 11, background: "none", border: "none", cursor: "pointer", color: "#9AA0AC" }}>
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {(eslesenPersonel || adminEslesme) && (
              <div style={{ background: "#E5F3EA", borderRadius: 8, padding: "8px 12px", marginBottom: 12,
                fontSize: 13, color: "#2E7D4F", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckSquare size={14} /> {adminEslesme ? "Yönetici" : eslesenPersonel.ad} olarak giriş yapıyorsunuz
              </div>
            )}
            {pinError && <div style={{ color: "#C0392B", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{pinError}</div>}
            <button type="submit" style={{ width: "100%", background: NAVY, color: "white", border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", overflowX: "hidden", width: "100%", boxSizing: "border-box" }}>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} className="mobile-overlay" />
      )}

      <div style={{
        width: 240, background: NAVY_DARK, color: "white", display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: sidebarOpen ? 0 : -240, height: "100vh", zIndex: 50,
        transition: "left 0.2s ease",
      }} className="sidebar-responsive">
        <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: ORANGE,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: NAVY, flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Suppbuy CRM</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>{isAdmin ? "Yönetici" : currentPersonel ? currentPersonel.ad : "Saha Ekibi"}</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 12px" }}>
          <NavItem icon={<LayoutGrid size={18} />} label="Firmalar" active={page === "firmalar"}
            onClick={() => { setPage("firmalar"); setSidebarOpen(false); }} />
          <NavItem icon={<Calendar size={18} />} label="Ajanda" active={page === "ajanda"}
            onClick={() => { setPage("ajanda"); setSidebarOpen(false); }} />
          <NavItem icon={<Video size={18} />} label="Toplantılar" active={page === "toplantilar"}
            badge={gorunurToplantilar.length > 0 ? gorunurToplantilar.length : null}
            onClick={() => { setPage("toplantilar"); setSidebarOpen(false); }} />
          <NavItem icon={<CheckSquare size={18} />} label="Görevler" active={page === "gorevler"}
            badge={pendingTasks.length > 0 ? pendingTasks.length : null}
            onClick={() => { setPage("gorevler"); setSidebarOpen(false); }} />
          {isAdmin && (
            <NavItem icon={<MapPin size={18} />} label="Günlük Ziyaretler" active={page === "gunlukZiyaretler"}
              onClick={() => { setPage("gunlukZiyaretler"); setSidebarOpen(false); }} />
          )}
          {isAdmin && (
            <NavItem icon={<Briefcase size={18} />} label="Güncel İlanlar" active={page === "ilanlar"}
              badge={ilanlar.filter(i => !i.aktarildi).length > 0 ? ilanlar.filter(i => !i.aktarildi).length : null}
              onClick={() => { setPage("ilanlar"); setSidebarOpen(false); }} />
          )}
          {isAdmin && (
            <NavItem icon={<Wallet size={18} />} label="Harcamalar" active={page === "harcamalar"}
              onClick={() => { setPage("harcamalar"); setSidebarOpen(false); }} />
          )}
          {isAdmin && (
            <NavItem icon={<BarChart3 size={18} />} label="Rapor" active={page === "rapor"}
              onClick={() => { setPage("rapor"); setSidebarOpen(false); }} />
          )}
          {isAdmin && (
            <NavItem icon={<Users size={18} />} label="Personel" active={page === "personel"}
              onClick={() => { setPage("personel"); setSidebarOpen(false); }} />
          )}
        </nav>

        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={handleLogout} style={{
            width: "100%", background: "rgba(255,255,255,0.08)", border: "none", color: "white", borderRadius: 8,
            padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex",
            alignItems: "center", gap: 8
          }}>
            <LogOut size={15} /> Çıkış Yap
          </button>
        </div>
      </div>

      <div style={{ flex: 1, marginLeft: 0 }} className="main-responsive">
        <div style={{ background: "white", borderBottom: "1px solid #E9EBEF", padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 20 }}>
          <button onClick={() => setSidebarOpen(true)} className="menu-toggle" style={{
            background: "none", border: "none", cursor: "pointer", color: NAVY
          }}>
            <Menu size={22} />
          </button>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1D24", flex: 1 }}>
            {page === "firmalar" && "Firmalar"}
            {page === "ajanda" && "Ajanda"}
            {page === "toplantilar" && "Toplantılar"}
            {page === "gorevler" && "Görevler"}
            {page === "gunlukZiyaretler" && "Günlük Ziyaretler"}
            {page === "ilanlar" && "Güncel İlanlar"}
            {page === "harcamalar" && "Harcamalar"}
            {page === "rapor" && "Rapor"}
            {page === "personel" && "Personel"}
          </div>
          {isAdmin && (
            <button onClick={() => setBildirimlerAcik(true)} style={{
              background: "none", border: "none", cursor: "pointer", color: NAVY, position: "relative"
            }}>
              <Bell size={21} />
              {bildirimler.filter(b => !b.okundu).length > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4, background: "#C0392B", color: "white",
                  borderRadius: 8, fontSize: 10, fontWeight: 800, padding: "1px 5px", minWidth: 14, textAlign: "center"
                }}>{bildirimler.filter(b => !b.okundu).length}</span>
              )}
            </button>
          )}
        </div>

        <div style={{ padding: "12px 12px", maxWidth: 900, margin: "0 auto" }}>

          {!isAdmin && page === "firmalar" && (
            <div style={{ background: "#E8EEF7", borderRadius: 12, padding: "12px 16px", marginBottom: 18,
              fontSize: 13, color: NAVY, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} /> Sadece size atanan firmalar ve tamamlanmamış süreçler görünür.
            </div>
          )}

          {page === "firmalar" && (
            <>
              {isAdmin && (
                <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
                  <StatCard label="Toplam" value={stats.total} color={NAVY} />
                  <StatCard label="Satış" value={stats.satis} color="#2E7D4F" />
                  <StatCard label="Olumsuz" value={stats.olumsuz} color="#B23B3B" />
                  <StatCard label="Beklemede" value={stats.beklemede} color={ORANGE} />
                </div>
              )}

              <div className="tab-grid" style={{ display: "flex", gap: 6, marginBottom: 14, background: "#EDEFF2", borderRadius: 12, padding: 4, flexWrap: "wrap" }}>
                <TabButton label="Ziyaret Edilecek" count={tabCounts.ziyaretEdilecek} active={activeTab === "ziyaretEdilecek"}
                  onClick={() => setActiveTab("ziyaretEdilecek")} />
                <TabButton label="Ziyaret Edildi" count={tabCounts.ziyaretEdildi} active={activeTab === "ziyaretEdildi"}
                  onClick={() => setActiveTab("ziyaretEdildi")} />
                <TabButton label="Demo Talepleri" count={tabCounts.demoTalepleri} active={activeTab === "demoTalepleri"}
                  onClick={() => setActiveTab("demoTalepleri")} />
                <TabButton label="İş İlanları" count={tabCounts.isIlanlari} active={activeTab === "isIlanlari"}
                  onClick={() => setActiveTab("isIlanlari")} />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "1 1 140px", minWidth: 0 }}>
                  <Search size={14} color="#9AA0AC" style={{ position: "absolute", left: 10, top: 9 }} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Firma, sektör, bölge veya adres ara..."
                    style={{ width: "100%", padding: "7px 10px 7px 30px", borderRadius: 8, border: "1px solid #E4E7EC",
                      fontSize: 13, outline: "none", boxSizing: "border-box", background: "white" }} />
                </div>
                <button onClick={() => setShowLeadForm(true)} style={{
                  background: NAVY, color: "white", border: "none", borderRadius: 8, padding: "7px 14px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap"
                }}>
                  <Plus size={14} /> Yeni Firma
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
                {["Hepsi", ...FIRMA_TIPI].map(t => (
                  <button key={t} onClick={() => setFilterTipi(t)} style={{
                    padding: "6px 12px", borderRadius: 16, border: "none", cursor: "pointer",
                    fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
                    background: filterTipi === t ? NAVY : "white", color: filterTipi === t ? "white" : "#5A6072",
                    boxShadow: filterTipi === t ? "none" : "0 1px 2px rgba(0,0,0,0.06)"
                  }}>{t}</button>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <select value={filterBolge} onChange={e => setFilterBolge(e.target.value)} style={{
                  ...inputStyle, fontSize: 12.5, padding: "7px 10px", width: "auto", minWidth: 160
                }}>
                  <option value="Hepsi">Tüm Bölgeler</option>
                  <BolgeOptions />
                </select>
              </div>

              {!loaded ? (
                <div style={{ textAlign: "center", padding: 40, color: "#9AA0AC" }}>Yükleniyor...</div>
              ) : visibleLeads.length === 0 ? (
                <EmptyState text="Henüz firma eklenmemiş." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {visibleLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                  ))}
                </div>
              )}
            </>
          )}

          {page === "ajanda" && (
            <>
              {!isAdmin && (
                <div style={{ background: "#E8EEF7", borderRadius: 12, padding: "12px 16px", marginBottom: 18,
                  fontSize: 13, color: NAVY, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={16} /> Sadece size atanan randevular görünür.
                </div>
              )}
              {randevular.length === 0 ? (
                <EmptyState text="Henüz planlanmış randevu yok. Firma eklerken tarih ve saat girerseniz burada görünür." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {randevular.map(([date, items]) => (
                    <div key={date}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 0.3,
                        color: date < todayKey() ? "#B23B3B" : date === todayKey() ? ORANGE : NAVY
                      }}>
                        {fmtDayLabel(date)} {date === todayKey() && "· BUGÜN"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {items.map(lead => (
                          <div key={lead.id} style={{
                            background: "white", borderRadius: 10, padding: "12px 14px", border: "1px solid #ECEDF0",
                            display: "flex", alignItems: "center", gap: 12
                          }}>
                            <button onClick={() => setSelectedLead(lead)} style={{
                              display: "flex", alignItems: "center", gap: 12, flex: 1, textAlign: "left",
                              cursor: "pointer", background: "none", border: "none", padding: 0, minWidth: 0
                            }}>
                              <div style={{
                                minWidth: 52, fontSize: 13, fontWeight: 800, color: lead.ziyaretSaati ? NAVY : "#C0C4CC",
                                textAlign: "center"
                              }}>
                                {lead.ziyaretSaati || "—"}
                              </div>
                              <div style={{ width: 1, background: "#ECEDF0", height: 28, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1D24" }}>{lead.firmaAdi}</div>
                                <div style={{ fontSize: 12, color: "#8A8F98" }}>{lead.firmaTipi}{lead.adres && ` · ${lead.adres}`}</div>
                              </div>
                            </button>
                            <button onClick={() => downloadICS(lead)} title="Takvime ekle" style={{
                              background: "#F0F1F3", border: "none", borderRadius: 8, width: 32, height: 32,
                              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                              color: NAVY, flexShrink: 0
                            }}>
                              <Download size={15} />
                            </button>
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6, flexShrink: 0,
                              background: (SONUC_RENK[lead.sonuc] || SONUC_RENK["Beklemede"]).bg,
                              color: (SONUC_RENK[lead.sonuc] || SONUC_RENK["Beklemede"]).text }}>{lead.sonuc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {page === "toplantilar" && (
            <>
              {isAdmin && (
                <button onClick={() => setShowMeetingForm(true)} style={{
                  background: NAVY, color: "white", border: "none", borderRadius: 10, padding: "9px 18px",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 18
                }}>
                  <Plus size={16} /> Yeni Toplantı
                </button>
              )}
              {gorunurToplantilar.length === 0 ? (
                <EmptyState text="Henüz planlanmış toplantı yok." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {gorunurToplantilar.map(t => (
                    <div key={t.id} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #ECEDF0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1A1D24" }}>{t.baslik}</div>
                          <div style={{ fontSize: 12.5, color: "#8A8F98", marginTop: 2 }}>
                            <Calendar size={12} style={{ verticalAlign: -1 }} /> {fmtDayLabel(t.tarih)} · {t.saat}
                          </div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleDeleteToplanti(t.id)} style={{
                            background: "none", border: "none", cursor: "pointer", color: "#C0C4CC", flexShrink: 0
                          }}><Trash2 size={15} /></button>
                        )}
                      </div>
                      {t.katilimcilar && t.katilimcilar.length > 0 && (
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                          {t.katilimcilar.map(k => (
                            <span key={k} style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 12,
                              background: "#E8EEF7", color: NAVY }}>{k}</span>
                          ))}
                        </div>
                      )}
                      {t.notlar && <div style={{ fontSize: 12.5, color: "#5A6072", marginBottom: 10 }}>{t.notlar}</div>}
                      <a href={t.meetLink} target="_blank" rel="noopener noreferrer" style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        background: "#1A73E8", color: "white", borderRadius: 8, padding: "10px 0",
                        fontSize: 13.5, fontWeight: 700, textDecoration: "none"
                      }}>
                        <Video size={16} /> Google Meet'e Katıl
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {page === "gunlukZiyaretler" && isAdmin && (
            <>
              {gunlukZiyaretler.length === 0 ? (
                <EmptyState text="Henüz personel atanmış saha ziyareti yok." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {gunlukZiyaretler.map(([date, items]) => (
                    <div key={date}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: 0.3,
                        color: date === todayKey() ? ORANGE : NAVY
                      }}>
                        {fmtDayLabel(date)} {date === todayKey() && "· BUGÜN"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {items.map(lead => (
                          <button key={lead.id} onClick={() => setSelectedLead(lead)} style={{
                            background: "white", borderRadius: 10, padding: "12px 14px", border: "1px solid #ECEDF0",
                            display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", width: "100%"
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", background: "#E8EEF7", color: NAVY,
                              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0
                            }}>{lead.atananPersonel.charAt(0).toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1A1D24" }}>{lead.atananPersonel}</div>
                              <div style={{ fontSize: 12, color: "#8A8F98" }}>
                                {lead.ziyaretSaati && `${lead.ziyaretSaati} · `}{lead.firmaAdi}{lead.adres && ` · ${lead.adres}`}
                              </div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, flexShrink: 0,
                              background: (SONUC_RENK[lead.sonuc] || SONUC_RENK["Beklemede"]).bg,
                              color: (SONUC_RENK[lead.sonuc] || SONUC_RENK["Beklemede"]).text }}>{lead.sonuc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {page === "ilanlar" && isAdmin && (
            <>
              <button onClick={() => setShowIlanForm(true)} style={{
                background: NAVY, color: "white", border: "none", borderRadius: 10, padding: "9px 18px",
                fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 18
              }}>
                <Plus size={16} /> Yeni İlan Ekle
              </button>

              {ilanlar.length === 0 ? (
                <EmptyState text="Henüz ilan eklenmemiş. Kariyer.net, Eleman.net gibi sitelerde gördüğünüz satınalmacı ilanlarını buraya ekleyin." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...ilanlar].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(ilan => (
                    <IlanCard key={ilan.id} ilan={ilan} personeller={personeller}
                      onDelete={() => handleDeleteIlan(ilan.id)}
                      onAktar={() => setAktarilanIlan(ilan)} />
                  ))}
                </div>
              )}
            </>
          )}

          {page === "harcamalar" && isAdmin && (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#EDEFF2", borderRadius: 12, padding: 4, flexWrap: "wrap" }}>
                {[["aylik", "Aylık"], ["3aylik", "3 Aylık"], ["6aylik", "6 Aylık"], ["yillik", "Yıllık"]].map(([val, label]) => (
                  <button key={val} onClick={() => setHarcamaPeriyot(val)} style={{
                    flex: "1 1 auto", minWidth: 0, padding: "8px 6px", borderRadius: 9, border: "none", cursor: "pointer",
                    fontSize: 12.5, fontWeight: 700,
                    background: harcamaPeriyot === val ? "white" : "transparent",
                    color: harcamaPeriyot === val ? NAVY : "#8A8F98",
                    boxShadow: harcamaPeriyot === val ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <ReportCard icon={<Wallet size={20} />} label="Toplam Gelir" value={fmtTL(karZararRaporu.toplamGelir)} color="#2E7D4F" />
                <ReportCard icon={<TrendingDown size={20} />} label="Toplam Gider" value={fmtTL(karZararRaporu.toplamGider)} color="#B23B3B" />
              </div>

              <div style={{
                background: karZararRaporu.toplamKarZarar >= 0 ? "#E5F3EA" : "#FBEAEA", borderRadius: 14, padding: 18,
                marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: karZararRaporu.toplamKarZarar >= 0 ? "#2E7D4F" : "#B23B3B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {karZararRaporu.toplamKarZarar >= 0 ? "Net Kâr" : "Net Zarar"}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: karZararRaporu.toplamKarZarar >= 0 ? "#2E7D4F" : "#B23B3B" }}>
                    {fmtTL(Math.abs(karZararRaporu.toplamKarZarar))}
                  </div>
                </div>
                {karZararRaporu.toplamKarZarar >= 0 ? <TrendingUp size={28} color="#2E7D4F" /> : <TrendingDown size={28} color="#B23B3B" />}
              </div>

              {harcamaRaporu.enCokKategori && (
                <div style={{ background: "#FFF4E0", borderRadius: 12, padding: "12px 16px", marginBottom: 16,
                  fontSize: 13, color: "#9A6B00", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={16} /> En çok harcama yapılan alan: <b>{harcamaRaporu.enCokKategori}</b> ({fmtTL(harcamaRaporu.enCokTutar)})
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <ReportCard icon={<Wallet size={20} />} label="Toplam Harcama" value={fmtTL(harcamaRaporu.genelToplam)} color="#B23B3B" />
                <ReportCard icon={<TrendingUp size={20} />} label="Toplam KDV (Satışlardan)" value={fmtTL(kdvRaporu.toplamKdv)} color="#2E7D4F" />
              </div>

              <button onClick={() => setShowHarcamaForm(true)} style={{
                background: NAVY, color: "white", border: "none", borderRadius: 10, padding: "9px 18px",
                fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 18
              }}>
                <Plus size={16} /> Yeni Harcama Ekle
              </button>

              {/* Gelir/Gider/Kâr-Zarar dönemsel geçmiş */}
              {karZararRaporu.liste.length > 0 && (
                <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Dönemsel Gelir / Gider / Kâr-Zarar</div>
                  {karZararRaporu.liste.map(({ anahtar, gelir, gider, karZarar }) => (
                    <div key={anahtar} style={{ padding: "10px 0", borderBottom: "1px solid #F5F6F8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#42485A" }}>{periyotEtiket(anahtar, harcamaPeriyot)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: karZarar >= 0 ? "#2E7D4F" : "#B23B3B" }}>
                          {karZarar >= 0 ? "+" : "-"}{fmtTL(Math.abs(karZarar))}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#9AA0AC" }}>
                        Gelir: {fmtTL(gelir)} · Gider: {fmtTL(gider)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Kategori bazlı toplam */}
              <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Kategori Bazlı Toplam</div>
                {HARCAMA_KATEGORILERI.map(k => {
                  const tutar = harcamaRaporu.kategoriToplam[k] || 0;
                  const maxTutar = Math.max(...Object.values(harcamaRaporu.kategoriToplam), 1);
                  const pct = (tutar / maxTutar) * 100;
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: "#42485A", fontWeight: 600 }}>{k}</span>
                        <span style={{ color: "#B23B3B", fontWeight: 700 }}>{fmtTL(tutar)}</span>
                      </div>
                      <div style={{ height: 8, background: "#F0F1F3", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#B23B3B", borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Periyot bazlı harcama geçmişi */}
              {harcamaRaporu.liste.length > 0 && (
                <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Dönemsel Harcama Geçmişi</div>
                  {harcamaRaporu.liste.map(([anahtar, veri]) => (
                    <div key={anahtar} style={{ padding: "10px 0", borderBottom: "1px solid #F5F6F8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#42485A" }}>{periyotEtiket(anahtar, harcamaPeriyot)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#B23B3B" }}>{fmtTL(veri.toplam)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#9AA0AC" }}>
                        {Object.entries(veri.kategoriler).map(([k, t]) => `${k}: ${fmtTL(t)}`).join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* KDV Raporu */}
              <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>KDV Raporu (Paket Satışlarından)</div>
                {kdvRaporu.liste.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#9AA0AC" }}>Bu dönemde satış kaydı yok.</div>
                ) : (
                  kdvRaporu.liste.map(([anahtar, veri]) => (
                    <div key={anahtar} style={{ padding: "10px 0", borderBottom: "1px solid #F5F6F8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#42485A" }}>{periyotEtiket(anahtar, harcamaPeriyot)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D4F" }}>{fmtTL(veri.kdv)} KDV</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#9AA0AC" }}>
                        {veri.adet} satış · KDV hariç {fmtTL(veri.ciroHaric)} · KDV dahil {fmtTL(veri.ciroDahil)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Harcama listesi */}
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8A8F98", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
                Tüm Harcamalar ({harcamalar.length})
              </div>
              {harcamalar.length === 0 ? (
                <EmptyState text="Henüz harcama eklenmemiş." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...harcamalar].sort((a, b) => b.tarih.localeCompare(a.tarih)).map(h => (
                    <div key={h.id} style={{ background: "white", borderRadius: 10, padding: "12px 14px", border: "1px solid #ECEDF0",
                      display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1A1D24" }}>
                          {h.kategori} · <span style={{ color: "#B23B3B" }}>{fmtTL
