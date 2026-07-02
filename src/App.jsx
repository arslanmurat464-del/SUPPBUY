
import { useState, useEffect, useMemo } from "react";
import { Plus, Building2, MapPin, Calendar, Trash2, Lock, Eye, EyeOff, X,
  Users, LayoutGrid, CheckSquare, BarChart3, Search, Tag, Clock, ChevronLeft,
  Menu, LogOut, AlertCircle, TrendingUp, TrendingDown, MinusCircle, Download, Video, Briefcase } from "lucide-react";

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
const OLUMSUZLUK_NEDENLERI = ["Fiyat", "Zamanlama Yanlış", "İhtiyaç Yok", "Rakip Kullanıyor", "Karar Vermedi", "Diğer"];
const ETIKET_SECENEKLERI = ["Acil", "Büyük Potansiyel", "Referans Firma", "VIP"];

// Buraya istediğiniz ilçe/bölge isimlerini ekleyebilir, çıkarabilir veya sıralamasını değiştirebilirsiniz.
const BOLGE_SECENEKLERI = [
  "Kadıköy", "Üsküdar", "Ataşehir", "Maltepe", "Kartal", "Pendik",
  "Şişli", "Beşiktaş", "Sarıyer", "Bağcılar", "Bahçelievler", "Güngören",
  "Başakşehir", "Esenyurt", "Beylikdüzü", "Avcılar", "Küçükçekmece",
  "Gaziosmanpaşa", "Sultangazi", "Sultanbeyli", "Ümraniye", "Tuzla",
];
const ILAN_SITELERI = ["Kariyer.net", "Eleman.net", "LinkedIn", "Indeed", "Diğer"];

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
  ziyaretSaati: "", ilanKaynagi: "", ziyaretEden: "", atananPersonel: "", sonuc: "Beklemede", olumsuzlukNedeni: "",
  paket: "", satisTarihi: "", talepDetayi: "", notlar: "", etiketler: [],
  yetkiliAdi: "", yetkiliTelefon: "", yetkiliEmail: "", yetkiliUnvan: "",
};

const EMPTY_TASK_FORM = { baslik: "", tarih: todayKey(), leadId: "", tamamlandi: false };
const EMPTY_MEETING_FORM = { baslik: "", tarih: todayKey(), saat: "10:00", katilimcilar: [], notlar: "" };
const EMPTY_ILAN_FORM = { firmaAdi: "", sektor: "", ilanSitesi: "Kariyer.net", ilanDetayi: "", ilanTarihi: todayKey() };

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
  }

  async function handleUpdateLead(id, updates, activityText) {
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
        alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: ORANGE, margin: "0 auto 18px",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26, color: NAVY }}>S</div>
            <div style={{ color: "white", fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>Suppbuy CRM</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 6 }}>Erişim kodunuzu girin</div>
          </div>
          <form onSubmit={handlePinSubmit} style={{ background: "white", borderRadius: 18, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
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
          display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 20 }}>
          <button onClick={() => setSidebarOpen(true)} className="menu-toggle" style={{
            background: "none", border: "none", cursor: "pointer", color: NAVY
          }}>
            <Menu size={22} />
          </button>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1D24" }}>
            {page === "firmalar" && "Firmalar"}
            {page === "ajanda" && "Ajanda"}
            {page === "toplantilar" && "Toplantılar"}
            {page === "gorevler" && "Görevler"}
            {page === "gunlukZiyaretler" && "Günlük Ziyaretler"}
            {page === "ilanlar" && "Güncel İlanlar"}
            {page === "rapor" && "Rapor"}
            {page === "personel" && "Personel"}
          </div>
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
                  {BOLGE_SECENEKLERI.map(b => <option key={b} value={b}>{b}</option>)}
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

          {page === "gorevler" && (
            <>
              <button onClick={() => setShowTaskForm(true)} style={{
                background: NAVY, color: "white", border: "none", borderRadius: 10, padding: "9px 18px",
                fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 18
              }}>
                <Plus size={16} /> Yeni Görev
              </button>

              {overdueTasks.length > 0 && (
                <TaskSection title="Gecikmiş" color="#B23B3B" tasks={overdueTasks} leads={leads} onToggle={toggleTask} onDelete={deleteTask} />
              )}
              {todayTasks.length > 0 && (
                <TaskSection title="Bugün" color={ORANGE} tasks={todayTasks} leads={leads} onToggle={toggleTask} onDelete={deleteTask} />
              )}
              <TaskSection title="Tümü" color={NAVY}
                tasks={pendingTasks.filter(t => t.tarih > todayKey())} leads={leads} onToggle={toggleTask} onDelete={deleteTask} />

              {pendingTasks.length === 0 && <EmptyState text="Bekleyen görev yok." />}
            </>
          )}

          {page === "personel" && isAdmin && (
            <PersonelSayfasi personeller={personeller} onAdd={handleAddPersonel} onDelete={handleDeletePersonel}
              onUpdatePin={handleUpdatePersonelPin} leads={leads} />
          )}

          {page === "rapor" && isAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <ReportCard icon={<TrendingUp size={20} />} label="Dönüşüm Oranı" value={`%${stats.oran}`} color="#2E7D4F" />
                <ReportCard icon={<Building2 size={20} />} label="Toplam Firma" value={stats.total} color={NAVY} />
              </div>

              <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Bu Ay — {fmtAyLabel(todayKey().slice(0, 7))}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>{stats.buAyVeri.adet}</div>
                    <div style={{ fontSize: 12, color: "#8A8F98", fontWeight: 600 }}>Satış Adedi</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#2E7D4F" }}>{fmtTL(stats.buAyVeri.ciroDahil)}</div>
                    <div style={{ fontSize: 12, color: "#8A8F98", fontWeight: 600 }}>Ciro (KDV Dahil)</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#9AA0AC", marginTop: 8 }}>KDV hariç: {fmtTL(stats.buAyVeri.ciroHaric)}</div>
              </div>

              {stats.aylikListe.length > 0 && (
                <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Aylık Satış & Ciro Geçmişi</div>
                  {stats.aylikListe.map(([ay, veri]) => (
                    <div key={ay} style={{ padding: "10px 0", borderBottom: "1px solid #F5F6F8" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#42485A" }}>{fmtAyLabel(ay)}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#2E7D4F" }}>{fmtTL(veri.ciroDahil)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#9AA0AC" }}>
                        {veri.adet} satış · KDV hariç {fmtTL(veri.ciroHaric)} ·{" "}
                        {Object.entries(veri.paketler).map(([p, c]) => `${p}: ${c}`).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(stats.paketDagilimi).length > 0 && (
                <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Paket Dağılımı (Toplam)</div>
                  {[...Object.keys(PAKETLER), TEDARIKCI_PAKETI.ad].map(p => {
                    const count = stats.paketDagilimi[p] || 0;
                    const maxCount = Math.max(...Object.values(stats.paketDagilimi), 1);
                    const pct = (count / maxCount) * 100;
                    return (
                      <div key={p} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ color: "#42485A", fontWeight: 600 }}>{p} <span style={{ color: "#B0B5BD" }}>({fmtTL(paketFiyatBul(p))}+KDV)</span></span>
                          <span style={{ color: "#8A8F98" }}>{count}</span>
                        </div>
                        <div style={{ height: 8, background: "#F0F1F3", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: ORANGE, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Sonuç Dağılımı</div>
                {SONUC_SECENEKLERI.map(s => {
                  const count = leads.filter(l => l.sonuc === s).length;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  const c = SONUC_RENK[s];
                  return (
                    <div key={s} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: "#42485A", fontWeight: 600 }}>{s}</span>
                        <span style={{ color: "#8A8F98" }}>{count}</span>
                      </div>
                      <div style={{ height: 8, background: "#F0F1F3", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: c.dot, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.keys(stats.nedenSayim).length > 0 && (
                <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Olumsuzluk Nedenleri</div>
                  {Object.entries(stats.nedenSayim).sort((a, b) => b[1] - a[1]).map(([neden, count]) => (
                    <div key={neden} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0",
                      borderBottom: "1px solid #F5F6F8", fontSize: 13 }}>
                      <span style={{ color: "#42485A" }}>{neden}</span>
                      <span style={{ color: "#B23B3B", fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {stats.personelPerformans.length > 0 && (
                <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Personel Performansı</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {stats.personelPerformans.map(pp => (
                      <div key={pp.personel.id} style={{ background: "#FAFAFB", borderRadius: 10, padding: "12px 14px", border: "1px solid #F0F1F3" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%", background: "#E8EEF7", color: NAVY,
                            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0
                          }}>{pp.personel.ad.charAt(0).toUpperCase()}</div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1A1D24", flex: 1 }}>{pp.personel.ad}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "#2E7D4F" }}>{fmtTL(pp.ciroDahil)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "#8A8F98" }}>
                          <span><b style={{ color: NAVY }}>{pp.toplamFirma}</b> firma</span>
                          <span><b style={{ color: NAVY }}>{pp.ziyaretSayisi}</b> ziyaret</span>
                          <span><b style={{ color: "#2E7D4F" }}>{pp.satisSayisi}</b> satış</span>
                          <span><b style={{ color: "#B23B3B" }}>{pp.olumsuzSayisi}</b> olumsuz</span>
                          <span><b style={{ color: ORANGE }}>{pp.beklemedeSayisi}</b> beklemede</span>
                        </div>
                        {Object.keys(pp.paketSayim).length > 0 && (
                          <div style={{ fontSize: 11, color: "#9AA0AC", marginTop: 6 }}>
                            {Object.entries(pp.paketSayim).map(([p, c]) => `${p}: ${c}`).join(" · ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: "white", borderRadius: 14, padding: 20, border: "1px solid #ECEDF0" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 14 }}>Kaynak Dağılımı</div>
                {KAYNAK_SECENEKLERI.map(k => {
                  const count = leads.filter(l => l.kaynak === k).length;
                  return (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0",
                      borderBottom: "1px solid #F5F6F8", fontSize: 13 }}>
                      <span style={{ color: "#42485A" }}>{k}</span>
                      <span style={{ color: NAVY, fontWeight: 700 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showLeadForm && (
        <Modal onClose={() => setShowLeadForm(false)}>
          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Yeni Firma Ekle</div>
          <form onSubmit={handleAddLead} style={{ width: "100%", boxSizing: "border-box" }}>
            <Field label="Firma Adı">
              <input value={leadForm.firmaAdi} onChange={e => setLeadForm({ ...leadForm, firmaAdi: e.target.value })}
                style={inputStyle} placeholder="Firma adı" autoFocus />
            </Field>
            <Field label="Firma Tipi">
              <select value={leadForm.firmaTipi} onChange={e => setLeadForm({ ...leadForm, firmaTipi: e.target.value })} style={inputStyle}>
                {FIRMA_TIPI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Sektör">
              <input value={leadForm.sektor} onChange={e => setLeadForm({ ...leadForm, sektor: e.target.value })}
                style={inputStyle} placeholder="Örn: Üretim, Perakende, İnşaat, Gıda..." />
            </Field>
            <Field label="Kaynak">
              <select value={leadForm.kaynak} onChange={e => setLeadForm({ ...leadForm, kaynak: e.target.value })} style={inputStyle}>
                {KAYNAK_SECENEKLERI.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Adres / Konum">
              <input value={leadForm.adres} onChange={e => setLeadForm({ ...leadForm, adres: e.target.value })}
                style={inputStyle} placeholder="Sokak, cadde, açık adres..." />
            </Field>
            <Field label="Bölge / İlçe *">
              <select value={leadForm.bolge} onChange={e => setLeadForm({ ...leadForm, bolge: e.target.value })} style={inputStyle} required>
                <option value="">Seçin</option>
                {BOLGE_SECENEKLERI.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label={leadForm.kaynak === "Saha Ziyareti" ? "Ziyaret Tarihi" : "Talep Tarihi"}>
              <input type="date" value={leadForm.ziyaretTarihi} onChange={e => setLeadForm({ ...leadForm, ziyaretTarihi: e.target.value })} style={inputStyle} />
            </Field>
            {leadForm.kaynak === "Saha Ziyareti" && (
              <Field label="Randevu Saati (opsiyonel)">
                <input type="time" value={leadForm.ziyaretSaati} onChange={e => setLeadForm({ ...leadForm, ziyaretSaati: e.target.value })} style={inputStyle} />
              </Field>
            )}
            {leadForm.kaynak === "İş İlanı Sitesi" && (
              <Field label="İlan Sitesi">
                <input value={leadForm.ilanKaynagi} onChange={e => setLeadForm({ ...leadForm, ilanKaynagi: e.target.value })}
                  style={inputStyle} placeholder="Örn: Kariyer.net, Eleman.net" />
              </Field>
            )}
            <Field label={leadForm.kaynak === "Saha Ziyareti" ? "Ziyaret Eden" : "İlgilenen Kişi"}>
              <input value={leadForm.ziyaretEden} onChange={e => setLeadForm({ ...leadForm, ziyaretEden: e.target.value })}
                style={inputStyle} placeholder="İsim" />
            </Field>
            {isAdmin && (
              <Field label="Atanan Personel">
                <select value={leadForm.atananPersonel} onChange={e => setLeadForm({ ...leadForm, atananPersonel: e.target.value })} style={inputStyle}>
                  <option value="">Atanmadı</option>
                  {personeller.map(p => <option key={p.id} value={p.ad}>{p.ad}</option>)}
                </select>
              </Field>
            )}
            <Field label="Sonuç">
              <select value={leadForm.sonuc} onChange={e => setLeadForm({ ...leadForm, sonuc: e.target.value })} style={inputStyle}>
                {SONUC_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {leadForm.sonuc === "Olumsuz" && (
              <Field label="Olumsuzluk Nedeni">
                <select value={leadForm.olumsuzlukNedeni} onChange={e => setLeadForm({ ...leadForm, olumsuzlukNedeni: e.target.value })} style={inputStyle}>
                  <option value="">Seçin</option>
                  {OLUMSUZLUK_NEDENLERI.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            )}
            {leadForm.sonuc === "Satış Yapıldı" && (
              <>
                <Field label="Paket">
                  <select value={leadForm.paket} onChange={e => setLeadForm({ ...leadForm, paket: e.target.value })} style={inputStyle}>
                    <option value="">Seçin</option>
                    {Object.keys(paketFiyatListesi(leadForm.firmaTipi)).map(p =>
                      <option key={p} value={p}>{p} — {fmtTL(paketFiyatListesi(leadForm.firmaTipi)[p])} +KDV</option>
                    )}
                  </select>
                </Field>
                <Field label="Satış Tarihi">
                  <input type="date" value={leadForm.satisTarihi || todayKey()} onChange={e => setLeadForm({ ...leadForm, satisTarihi: e.target.value })} style={inputStyle} />
                </Field>
                {leadForm.paket && (
                  <div style={{ background: "#E5F3EA", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#2E7D4F" }}>
                    KDV hariç: <b>{fmtTL(paketFiyatListesi(leadForm.firmaTipi)[leadForm.paket])}</b> · KDV dahil: <b>{fmtTL(paketKdvli(paketFiyatListesi(leadForm.firmaTipi)[leadForm.paket]))}</b>
                  </div>
                )}
              </>
            )}
            <Field label="Etiketler">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ETIKET_SECENEKLERI.map(et => {
                  const active = leadForm.etiketler.includes(et);
                  return (
                    <button key={et} type="button" onClick={() => {
                      setLeadForm({ ...leadForm, etiketler: active ? leadForm.etiketler.filter(x => x !== et) : [...leadForm.etiketler, et] });
                    }} style={{
                      padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: active ? "none" : "1px solid #DDE0E5",
                      background: active ? ETIKET_RENK[et].bg : "white",
                      color: active ? ETIKET_RENK[et].text : "#8A8F98"
                    }}>{et}</button>
                  );
                })}
              </div>
            </Field>
            <Field label="Talep Detayı">
              <textarea rows={2} value={leadForm.talepDetayi} onChange={e => setLeadForm({ ...leadForm, talepDetayi: e.target.value })}
                style={{ ...inputStyle, resize: "vertical" }} placeholder="Firmanın ihtiyacı..." />
            </Field>

            <div style={{ background: "#FFF4E0", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#9A6B00", fontWeight: 600 }}>
              🔒 Yetkili bilgileri sadece siz ve yönetici tarafından görülebilir.
            </div>
            <Field label="Yetkili Adı Soyadı">
              <input value={leadForm.yetkiliAdi} onChange={e => setLeadForm({ ...leadForm, yetkiliAdi: e.target.value })}
                style={inputStyle} placeholder="Görüşülen kişi" />
            </Field>
            <Field label="Yetkili Unvanı">
              <input value={leadForm.yetkiliUnvan} onChange={e => setLeadForm({ ...leadForm, yetkiliUnvan: e.target.value })}
                style={inputStyle} placeholder="Örn: Satınalma Müdürü" />
            </Field>
            <Field label="Yetkili Telefon">
              <input value={leadForm.yetkiliTelefon} onChange={e => setLeadForm({ ...leadForm, yetkiliTelefon: e.target.value })}
                style={inputStyle} placeholder="05xx xxx xx xx" />
            </Field>
            <Field label="Yetkili E-posta">
              <input value={leadForm.yetkiliEmail} onChange={e => setLeadForm({ ...leadForm, yetkiliEmail: e.target.value })}
                style={inputStyle} placeholder="ornek@firma.com" />
            </Field>

            <Field label="Notlar">
              <textarea rows={2} value={leadForm.notlar} onChange={e => setLeadForm({ ...leadForm, notlar: e.target.value })}
                style={{ ...inputStyle, resize: "vertical" }} placeholder="Görüşme notları..." />
            </Field>
            <button type="submit" disabled={saving} style={{
              width: "100%", background: NAVY, color: "white", border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8
            }}>{saving ? "Kaydediliyor..." : "Kaydet"}</button>
          </form>
        </Modal>
      )}

      {showTaskForm && (
        <Modal onClose={() => setShowTaskForm(false)}>
          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Yeni Görev</div>
          <form onSubmit={handleAddTask} style={{ width: "100%", boxSizing: "border-box" }}>
            <Field label="Görev">
              <input value={taskForm.baslik} onChange={e => setTaskForm({ ...taskForm, baslik: e.target.value })}
                style={inputStyle} placeholder="Örn: ABC Ltd'yi tekrar ara" autoFocus />
            </Field>
            <Field label="Tarih">
              <input type="date" value={taskForm.tarih} onChange={e => setTaskForm({ ...taskForm, tarih: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="İlgili Firma (opsiyonel)">
              <select value={taskForm.leadId} onChange={e => setTaskForm({ ...taskForm, leadId: e.target.value })} style={inputStyle}>
                <option value="">Seçilmedi</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.firmaAdi}</option>)}
              </select>
            </Field>
            <button type="submit" style={{
              width: "100%", background: NAVY, color: "white", border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8
            }}>Kaydet</button>
          </form>
        </Modal>
      )}

      {showMeetingForm && (
        <Modal onClose={() => setShowMeetingForm(false)}>
          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Yeni Toplantı</div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!meetingForm.baslik.trim()) { showToast("Toplantı başlığı gerekli"); return; }
            handleAddToplanti(meetingForm);
            setMeetingForm(EMPTY_MEETING_FORM);
            setShowMeetingForm(false);
          }} style={{ width: "100%", boxSizing: "border-box" }}>
            <Field label="Toplantı Başlığı">
              <input value={meetingForm.baslik} onChange={e => setMeetingForm({ ...meetingForm, baslik: e.target.value })}
                style={inputStyle} placeholder="Örn: Haftalık satış değerlendirmesi" autoFocus />
            </Field>
            <Field label="Tarih">
              <input type="date" value={meetingForm.tarih} onChange={e => setMeetingForm({ ...meetingForm, tarih: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Saat">
              <input type="time" value={meetingForm.saat} onChange={e => setMeetingForm({ ...meetingForm, saat: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Katılımcılar">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {personeller.map(p => {
                  const active = meetingForm.katilimcilar.includes(p.ad);
                  return (
                    <button key={p.id} type="button" onClick={() => {
                      setMeetingForm({
                        ...meetingForm,
                        katilimcilar: active ? meetingForm.katilimcilar.filter(x => x !== p.ad) : [...meetingForm.katilimcilar, p.ad]
                      });
                    }} style={{
                      padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: active ? "none" : "1px solid #DDE0E5",
                      background: active ? "#E8EEF7" : "white",
                      color: active ? NAVY : "#8A8F98"
                    }}>{p.ad}</button>
                  );
                })}
              </div>
            </Field>
            <Field label="Notlar (opsiyonel)">
              <textarea rows={2} value={meetingForm.notlar} onChange={e => setMeetingForm({ ...meetingForm, notlar: e.target.value })}
                style={{ ...inputStyle, resize: "vertical" }} placeholder="Toplantı gündemi..." />
            </Field>
            <div style={{ background: "#E8EEF7", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: NAVY }}>
              Kaydettiğinizde bir Google Meet linki oluşturulur ve seçtiğiniz katılımcıların "Toplantılar" sayfasında görünür.
            </div>
            <button type="submit" style={{
              width: "100%", background: NAVY, color: "white", border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8
            }}>Toplantıyı Oluştur</button>
          </form>
        </Modal>
      )}

      {showIlanForm && (
        <Modal onClose={() => setShowIlanForm(false)}>
          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 16 }}>Yeni İlan Ekle</div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!ilanForm.firmaAdi.trim()) { showToast("Firma adı gerekli"); return; }
            handleAddIlan(ilanForm);
            setIlanForm(EMPTY_ILAN_FORM);
            setShowIlanForm(false);
          }} style={{ width: "100%", boxSizing: "border-box" }}>
            <Field label="Firma Adı">
              <input value={ilanForm.firmaAdi} onChange={e => setIlanForm({ ...ilanForm, firmaAdi: e.target.value })}
                style={inputStyle} placeholder="İlanı veren firma" autoFocus />
            </Field>
            <Field label="Sektör">
              <input value={ilanForm.sektor} onChange={e => setIlanForm({ ...ilanForm, sektor: e.target.value })}
                style={inputStyle} placeholder="Örn: Üretim, Perakende..." />
            </Field>
            <Field label="İlan Sitesi">
              <select value={ilanForm.ilanSitesi} onChange={e => setIlanForm({ ...ilanForm, ilanSitesi: e.target.value })} style={inputStyle}>
                {ILAN_SITELERI.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="İlan Tarihi">
              <input type="date" value={ilanForm.ilanTarihi} onChange={e => setIlanForm({ ...ilanForm, ilanTarihi: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="İlan Detayı (opsiyonel)">
              <textarea rows={2} value={ilanForm.ilanDetayi} onChange={e => setIlanForm({ ...ilanForm, ilanDetayi: e.target.value })}
                style={{ ...inputStyle, resize: "vertical" }} placeholder="Pozisyon, aranan nitelikler..." />
            </Field>
            <button type="submit" style={{
              width: "100%", background: NAVY, color: "white", border: "none", borderRadius: 10,
              padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8
            }}>Kaydet</button>
          </form>
        </Modal>
      )}

      {aktarilanIlan && (
        <Modal onClose={() => setAktarilanIlan(null)}>
          <IlanAktarForm ilan={aktarilanIlan} personeller={personeller}
            onAktar={(bolge, personel) => {
              handleAktarIlan(aktarilanIlan, bolge, personel);
              setAktarilanIlan(null);
            }}
            onCancel={() => setAktarilanIlan(null)} />
        </Modal>
      )}

      {selectedLead && (
        <Modal onClose={() => setSelectedLead(null)}>
          <LeadDetail lead={selectedLead} isAdmin={isAdmin} personeller={personeller} currentPersonel={currentPersonel}
            onUpdate={(updates, activityText) => handleUpdateLead(selectedLead.id, updates, activityText)}
            onDelete={() => handleDeleteLead(selectedLead.id)} />
        </Modal>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: NAVY, color: "white", padding: "10px 20px", borderRadius: 10,
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 100 }}>
          {toast}
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100%; }
        @media (min-width: 900px) {
          .sidebar-responsive { left: 0 !important; }
          .main-responsive { margin-left: 240px !important; }
          .menu-toggle { display: none !important; }
          .mobile-overlay { display: none !important; }
        }
        @media (max-width: 899px) {
          .menu-toggle { display: block !important; }
        }
        @media (max-width: 480px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .tab-grid { flex-wrap: wrap !important; }
          .tab-grid > button { flex: 1 1 45% !important; }
        }
      `}</style>
    </div>
  );
}

function IlanCard({ ilan, onDelete, onAktar }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #ECEDF0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1A1D24" }}>{ilan.firmaAdi}</div>
          <div style={{ fontSize: 12, color: "#8A8F98", marginTop: 2 }}>
            {ilan.sektor && `${ilan.sektor} · `}{ilan.ilanSitesi} · {ilan.ilanTarihi}
          </div>
        </div>
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0C4CC", flexShrink: 0 }}>
          <Trash2 size={15} />
        </button>
      </div>
      {ilan.ilanDetayi && <div style={{ fontSize: 12.5, color: "#5A6072", marginBottom: 10 }}>{ilan.ilanDetayi}</div>}
      {ilan.aktarildi ? (
        <div style={{ fontSize: 12, fontWeight: 700, color: "#2E7D4F", display: "flex", alignItems: "center", gap: 5 }}>
          <CheckSquare size={13} /> Ziyaret listesine aktarıldı
        </div>
      ) : (
        <button onClick={onAktar} style={{
          width: "100%", background: "#E8EEF7", color: NAVY, border: "none", borderRadius: 8, padding: "8px 0",
          fontSize: 13, fontWeight: 700, cursor: "pointer"
        }}>Ziyaret Listesine Aktar</button>
      )}
    </div>
  );
}

function IlanAktarForm({ ilan, personeller, onAktar, onCancel }) {
  const [bolge, setBolge] = useState("");
  const [personel, setPersonel] = useState("");
  const [hata, setHata] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!bolge) { setHata("Bölge / İlçe seçimi gerekli"); return; }
    onAktar(bolge, personel);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Ziyaret Listesine Aktar</div>
      <div style={{ fontSize: 13, color: "#8A8F98", marginBottom: 16 }}>{ilan.firmaAdi}</div>
      <Field label="Bölge / İlçe *">
        <select value={bolge} onChange={e => setBolge(e.target.value)} style={inputStyle}>
          <option value="">Seçin</option>
          {BOLGE_SECENEKLERI.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </Field>
      <Field label="Atanacak Personel (opsiyonel)">
        <select value={personel} onChange={e => setPersonel(e.target.value)} style={inputStyle}>
          <option value="">Atanmadı</option>
          {personeller.map(p => <option key={p.id} value={p.ad}>{p.ad}</option>)}
        </select>
      </Field>
      {hata && <div style={{ color: "#C0392B", fontSize: 12.5, marginBottom: 12, fontWeight: 600 }}>{hata}</div>}
      <button type="submit" style={{
        width: "100%", background: NAVY, color: "white", border: "none", borderRadius: 10,
        padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4
      }}>Ziyaret Listesine Ekle</button>
    </form>
  );
}

function PersonelSayfasi({ personeller, onAdd, onDelete, onUpdatePin, leads }) {
  const [yeniAd, setYeniAd] = useState("");
  const [yeniPin, setYeniPin] = useState("");
  const [pinHata, setPinHata] = useState("");
  const [duzenlenenId, setDuzenlenenId] = useState(null);
  const [duzenlenenPin, setDuzenlenenPin] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!yeniAd.trim()) return;
    if (!/^\d{4,6}$/.test(yeniPin)) {
      setPinHata("PIN 4-6 haneli rakam olmalı");
      return;
    }
    if (yeniPin === ADMIN_PIN || personeller.some(p => p.pin === yeniPin)) {
      setPinHata("Bu PIN başka bir hesapta kullanılıyor, farklı bir PIN seçin");
      return;
    }
    onAdd(yeniAd, yeniPin);
    setYeniAd(""); setYeniPin(""); setPinHata("");
  }

  function startEditPin(p) {
    setDuzenlenenId(p.id);
    setDuzenlenenPin(p.pin || "");
  }

  function saveEditPin(p) {
    if (!/^\d{4,6}$/.test(duzenlenenPin)) { setPinHata("PIN 4-6 haneli rakam olmalı"); return; }
    if (duzenlenenPin === ADMIN_PIN || personeller.some(other => other.id !== p.id && other.pin === duzenlenenPin)) {
      setPinHata("Bu PIN başka bir hesapta kullanılıyor"); return;
    }
    onUpdatePin(p.id, duzenlenenPin);
    setDuzenlenenId(null); setPinHata("");
  }

  return (
    <div>
      <div style={{ background: "#E8EEF7", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: NAVY, fontWeight: 600 }}>
        Her personel kendi PIN'i ile giriş yapar ve sadece kendine atanan firmaları görür. Personeller birbirinin ekranını göremez.
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={yeniAd} onChange={e => setYeniAd(e.target.value)} placeholder="Personel adı"
            style={{ ...inputStyle, flex: 1 }} />
          <input value={yeniPin} onChange={e => setYeniPin(e.target.value.replace(/\D/g, ""))} placeholder="PIN (4-6 hane)"
            inputMode="numeric" style={{ ...inputStyle, width: 130, flexShrink: 0 }} />
        </div>
        {pinHata && <div style={{ color: "#C0392B", fontSize: 12.5, fontWeight: 600 }}>{pinHata}</div>}
        <button type="submit" style={{
          background: NAVY, color: "white", border: "none", borderRadius: 8, padding: "10px 16px",
          fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5
        }}><Plus size={14} /> Personel Ekle</button>
      </form>

      {personeller.length === 0 ? (
        <EmptyState text="Henüz personel eklenmemiş." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {personeller.map(p => {
            const atananSayisi = leads.filter(l => l.atananPersonel === p.ad).length;
            return (
              <div key={p.id} style={{ background: "white", borderRadius: 10, padding: "12px 14px", border: "1px solid #ECEDF0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: "#E8EEF7", color: NAVY,
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0
                  }}>{p.ad.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1D24" }}>{p.ad}</div>
                    <div style={{ fontSize: 12, color: "#9AA0AC" }}>{atananSayisi} firma atanmış</div>
                  </div>
                  <button onClick={() => onDelete(p.id)} style={{
                    background: "none", border: "none", cursor: "pointer", color: "#C0C4CC", flexShrink: 0
                  }}><Trash2 size={16} /></button>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F5F6F8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#8A8F98", fontWeight: 600 }}>PIN:</span>
                  {duzenlenenId === p.id ? (
                    <>
                      <input value={duzenlenenPin} onChange={e => setDuzenlenenPin(e.target.value.replace(/\D/g, ""))}
                        inputMode="numeric" style={{ ...inputStyle, width: 90, padding: "5px 8px", fontSize: 13 }} autoFocus />
                      <button onClick={() => saveEditPin(p)} style={{
                        background: NAVY, color: "white", border: "none", borderRadius: 6, padding: "5px 10px",
                        fontSize: 11.5, fontWeight: 700, cursor: "pointer"
                      }}>Kaydet</button>
                      <button onClick={() => { setDuzenlenenId(null); setPinHata(""); }} style={{
                        background: "none", border: "none", color: "#9AA0AC", fontSize: 11.5, cursor: "pointer"
                      }}>Vazgeç</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, fontFamily: "monospace" }}>{p.pin || "—"}</span>
                      <button onClick={() => startEditPin(p)} style={{
                        background: "#F0F1F3", border: "none", borderRadius: 6, padding: "4px 10px",
                        fontSize: 11.5, fontWeight: 600, color: "#5A6072", cursor: "pointer"
                      }}>Değiştir</button>
                    </>
                  )}
                </div>
                {duzenlenenId === p.id && pinHata && <div style={{ color: "#C0392B", fontSize: 11.5, marginTop: 6, fontWeight: 600 }}>{pinHata}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: "1 1 auto", minWidth: 0, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer",
      background: active ? "white" : "transparent",
      color: active ? NAVY : "#8A8F98",
      fontSize: 10.5, fontWeight: 700, boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 3, whiteSpace: "nowrap",
      overflow: "hidden", textOverflow: "ellipsis"
    }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {count > 0 && <span style={{
        background: active ? ORANGE : "#D5D8DD", color: active ? NAVY : "white",
        borderRadius: 7, fontSize: 9, padding: "1px 5px", fontWeight: 800, flexShrink: 0
      }}>{count}</span>}
    </button>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 4,
      background: active ? "rgba(242,161,46,0.15)" : "transparent",
      color: active ? ORANGE : "rgba(255,255,255,0.75)",
      fontSize: 14, fontWeight: active ? 700 : 600, textAlign: "left"
    }}>
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{ background: ORANGE, color: NAVY, fontSize: 11, fontWeight: 800,
          borderRadius: 10, padding: "1px 7px" }}>{badge}</span>
      )}
    </button>
  );
}

function LeadCard({ lead, onClick }) {
  const sonucStyle = SONUC_RENK[lead.sonuc] || SONUC_RENK["Beklemede"];
  return (
    <button onClick={onClick} style={{
      background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #ECEDF0",
      textAlign: "left", cursor: "pointer", width: "100%", display: "flex", flexDirection: "column", gap: 6
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1D24" }}>{lead.firmaAdi}</div>
          <div style={{ fontSize: 12, color: "#8A8F98", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <Building2 size={12} /> {lead.firmaTipi}{lead.sektor && ` · ${lead.sektor}`}
            {lead.bolge && <> · <MapPin size={12} /> {lead.bolge}</>}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, flexShrink: 0,
          background: sonucStyle.bg, color: sonucStyle.text }}>{lead.sonuc}</span>
      </div>
      {lead.kaynak && lead.kaynak !== "Saha Ziyareti" && (
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5, alignSelf: "flex-start",
          background: lead.kaynak === "LinkedIn" ? "#E8EEF7" : lead.kaynak === "Instagram" ? "#FCE8D6" : "#EFE7F7",
          color: lead.kaynak === "LinkedIn" ? NAVY : lead.kaynak === "Instagram" ? "#B5651D" : "#6B3FA0"
        }}>{lead.kaynak}{lead.ilanKaynagi && ` · ${lead.ilanKaynagi}`}</span>
      )}
      {lead.etiketler && lead.etiketler.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {lead.etiketler.map(et => (
            <span key={et} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
              background: ETIKET_RENK[et]?.bg, color: ETIKET_RENK[et]?.text }}>{et}</span>
          ))}
        </div>
      )}
      {lead.ziyaretTarihi && (
        <div style={{ fontSize: 12, color: "#9AA0AC", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <Calendar size={12} /> {lead.ziyaretTarihi}{lead.ziyaretSaati && ` · ${lead.ziyaretSaati}`} {lead.ziyaretEden && `· ${lead.ziyaretEden}`}
          {lead.atananPersonel && <span style={{ color: NAVY, fontWeight: 700 }}>· 👤 {lead.atananPersonel}</span>}
        </div>
      )}
      {lead.sonuc === "Satış Yapıldı" && lead.paket && (
        <div style={{ fontSize: 12, color: "#2E7D4F", fontWeight: 700 }}>
          {lead.paket} · {fmtTL(paketKdvli(paketFiyatBul(lead.paket)))}
        </div>
      )}
    </button>
  );
}

function LeadDetail({ lead, isAdmin, personeller, currentPersonel, onUpdate, onDelete }) {
  const [sonuc, setSonuc] = useState(lead.sonuc);
  const [notlar, setNotlar] = useState(lead.notlar || "");
  const [olumsuzlukNedeni, setOlumsuzlukNedeni] = useState(lead.olumsuzlukNedeni || "");
  const [etiketler, setEtiketler] = useState(lead.etiketler || []);
  const [paket, setPaket] = useState(lead.paket || "");
  const [satisTarihi, setSatisTarihi] = useState(lead.satisTarihi || todayKey());
  const [atananPersonel, setAtananPersonel] = useState(lead.atananPersonel || "");
  const [yetkiliAdi, setYetkiliAdi] = useState(lead.yetkiliAdi || "");
  const [yetkiliUnvan, setYetkiliUnvan] = useState(lead.yetkiliUnvan || "");
  const [yetkiliTelefon, setYetkiliTelefon] = useState(lead.yetkiliTelefon || "");
  const [yetkiliEmail, setYetkiliEmail] = useState(lead.yetkiliEmail || "");

  const paketler = paketFiyatListesi(lead.firmaTipi);
  const yetkiliGorebilir = isAdmin || (currentPersonel && lead.girenPersonel === currentPersonel.ad);

  function saveChanges() {
    const activities = [];
    if (sonuc !== lead.sonuc) activities.push(`Sonuç "${lead.sonuc}" → "${sonuc}" olarak değiştirildi`);
    if (notlar !== (lead.notlar || "")) activities.push("Not güncellendi");
    if (sonuc === "Satış Yapıldı" && paket && paket !== lead.paket) activities.push(`Paket: ${paket}`);
    if (atananPersonel !== (lead.atananPersonel || "")) activities.push(`Personel ataması: ${atananPersonel || "Kaldırıldı"}`);
    const updates = { sonuc, notlar, olumsuzlukNedeni, etiketler, paket, satisTarihi, atananPersonel };
    if (yetkiliGorebilir) {
      if (yetkiliAdi !== (lead.yetkiliAdi || "")) activities.push("Yetkili bilgisi güncellendi");
      updates.yetkiliAdi = yetkiliAdi;
      updates.yetkiliUnvan = yetkiliUnvan;
      updates.yetkiliTelefon = yetkiliTelefon;
      updates.yetkiliEmail = yetkiliEmail;
    }
    onUpdate(updates, activities.join("; "));
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 4 }}>{lead.firmaAdi}</div>
      <div style={{ fontSize: 13, color: "#8A8F98", marginBottom: 16 }}>
        {lead.firmaTipi}{lead.sektor && ` · ${lead.sektor}`}{lead.bolge && ` · ${lead.bolge}`} {lead.adres && `· ${lead.adres}`} {lead.kaynak && `· ${lead.kaynak}`}
      </div>

      {lead.talepDetayi && (
        <div style={{ background: "#F7F8FA", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#42485A" }}>
          <b style={{ color: NAVY }}>Talep:</b> {lead.talepDetayi}
        </div>
      )}

      {lead.ziyaretTarihi && (
        <div style={{ fontSize: 13, color: "#5A6072", marginBottom: 16, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span><Calendar size={13} style={{ verticalAlign: -2 }} /> {lead.ziyaretTarihi}{lead.ziyaretSaati && ` · ${lead.ziyaretSaati}`}</span>
          {lead.ziyaretEden && <span>Ziyaret eden: {lead.ziyaretEden}</span>}
          {lead.ilanKaynagi && <span>İlan: {lead.ilanKaynagi}</span>}
        </div>
      )}

      {isAdmin ? (
        <Field label="Atanan Personel">
          <select value={atananPersonel} onChange={e => setAtananPersonel(e.target.value)} style={inputStyle}>
            <option value="">Atanmadı</option>
            {personeller.map(p => <option key={p.id} value={p.ad}>{p.ad}</option>)}
          </select>
        </Field>
      ) : (
        lead.atananPersonel && (
          <div style={{ fontSize: 12.5, color: NAVY, fontWeight: 600, marginBottom: 12 }}>
            👤 Bu firma size atanmış
          </div>
        )
      )}

      <Field label="Sonuç">
        <select value={sonuc} onChange={e => setSonuc(e.target.value)} style={inputStyle}>
          {SONUC_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      {sonuc === "Olumsuz" && (
        <Field label="Olumsuzluk Nedeni">
          <select value={olumsuzlukNedeni} onChange={e => setOlumsuzlukNedeni(e.target.value)} style={inputStyle}>
            <option value="">Seçin</option>
            {OLUMSUZLUK_NEDENLERI.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      )}

      {sonuc === "Satış Yapıldı" && (
        <>
          <Field label="Paket">
            <select value={paket} onChange={e => setPaket(e.target.value)} style={inputStyle}>
              <option value="">Seçin</option>
              {Object.keys(paketler).map(p => <option key={p} value={p}>{p} — {fmtTL(paketler[p])} +KDV</option>)}
            </select>
          </Field>
          <Field label="Satış Tarihi">
            <input type="date" value={satisTarihi} onChange={e => setSatisTarihi(e.target.value)} style={inputStyle} />
          </Field>
          {paket && (
            <div style={{ background: "#E5F3EA", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#2E7D4F" }}>
              KDV hariç: <b>{fmtTL(paketler[paket])}</b> · KDV dahil: <b>{fmtTL(paketKdvli(paketler[paket]))}</b>
            </div>
          )}
        </>
      )}

      {yetkiliGorebilir && (
        <>
          <div style={{ background: "#FFF4E0", borderRadius: 8, padding: "8px 12px", marginBottom: 12, marginTop: 4, fontSize: 11.5, color: "#9A6B00", fontWeight: 600 }}>
            🔒 Bu bilgiler sadece size ve yöneticiye görünür
          </div>
          <Field label="Yetkili Adı Soyadı">
            <input value={yetkiliAdi} onChange={e => setYetkiliAdi(e.target.value)} style={inputStyle} placeholder="Görüşülen kişi" />
          </Field>
          <Field label="Yetkili Unvanı">
            <input value={yetkiliUnvan} onChange={e => setYetkiliUnvan(e.target.value)} style={inputStyle} placeholder="Örn: Satınalma Müdürü" />
          </Field>
          <Field label="Yetkili Telefon">
            <input value={yetkiliTelefon} onChange={e => setYetkiliTelefon(e.target.value)} style={inputStyle} placeholder="05xx xxx xx xx" />
          </Field>
          <Field label="Yetkili E-posta">
            <input value={yetkiliEmail} onChange={e => setYetkiliEmail(e.target.value)} style={inputStyle} placeholder="ornek@firma.com" />
          </Field>
        </>
      )}

      <Field label="Etiketler">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ETIKET_SECENEKLERI.map(et => {
            const active = etiketler.includes(et);
            return (
              <button key={et} type="button" onClick={() => {
                setEtiketler(active ? etiketler.filter(x => x !== et) : [...etiketler, et]);
              }} style={{
                padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: active ? "none" : "1px solid #DDE0E5",
                background: active ? ETIKET_RENK[et].bg : "white",
                color: active ? ETIKET_RENK[et].text : "#8A8F98"
              }}>{et}</button>
            );
          })}
        </div>
      </Field>

      <Field label="Notlar">
        <textarea rows={3} value={notlar} onChange={e => setNotlar(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }} placeholder="Görüşme notları..." />
      </Field>

      <button onClick={saveChanges} style={{
        width: "100%", background: NAVY, color: "white", border: "none", borderRadius: 10,
        padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8, marginBottom: 16
      }}>Değişiklikleri Kaydet</button>

      {lead.activities && lead.activities.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#8A8F98", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={13} /> ZAMAN ÇİZELGESİ
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
            {[...lead.activities].reverse().map(a => (
              <div key={a.id} style={{ fontSize: 12.5, color: "#5A6072", paddingLeft: 10, borderLeft: "2px solid #E4E7EC" }}>
                <div>{a.text}</div>
                <div style={{ fontSize: 11, color: "#B0B5BD" }}>{fmtDateTime(a.at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <button onClick={onDelete} style={{
          width: "100%", background: "none", color: "#B23B3B", border: "1px solid #F0D0D0", borderRadius: 10,
          padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", gap: 6
        }}><Trash2 size={14} /> Firmayı Sil</button>
      )}
    </div>
  );
}

function TaskSection({ title, color, tasks, leads, onToggle, onDelete }) {
  if (tasks.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8, letterSpacing: 0.5 }}>{title.toUpperCase()} ({tasks.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tasks.map(t => {
          const lead = leads.find(l => l.id === t.leadId);
          return (
            <div key={t.id} style={{ background: "white", borderRadius: 10, padding: "12px 14px", border: "1px solid #ECEDF0",
              display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => onToggle(t.id)} style={{
                width: 20, height: 20, borderRadius: 5, border: `2px solid ${color}`, background: "none",
                cursor: "pointer", flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "#1A1D24", fontWeight: 600 }}>{t.baslik}</div>
                <div style={{ fontSize: 12, color: "#9AA0AC" }}>{t.tarih}{lead && ` · ${lead.firmaAdi}`}</div>
              </div>
              <button onClick={() => onDelete(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0C4CC" }}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
      alignItems: "flex-end", justifyContent: "center", zIndex: 60 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "white", borderRadius: "20px 20px 0 0", padding: "20px 20px 28px 20px",
        width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", overflowX: "hidden",
        position: "relative", boxSizing: "border-box"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, background: "#F0F1F3", border: "none",
          borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", color: "#5A6072", flexShrink: 0
        }}><X size={16} /></button>
        <div style={{ maxWidth: "100%", boxSizing: "border-box" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "white", borderRadius: 8, padding: "8px 4px", textAlign: "center", border: "1px solid #ECEDF0" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 8.5, color: "#8A8F98", fontWeight: 600, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function ReportCard({ icon, label, value, color }) {
  return (
    <div style={{ background: "white", borderRadius: 14, padding: 18, border: "1px solid #ECEDF0" }}>
      <div style={{ color, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#1A1D24" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8A8F98", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ background: "white", borderRadius: 14, padding: "40px 20px", textAlign: "center",
      color: "#9AA0AC", fontSize: 14, border: "1px dashed #DDE0E5" }}>{text}</div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12, width: "100%", boxSizing: "border-box" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5A6072", marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", border: "1px solid #DDE0E5", borderRadius: 8, padding: "10px 12px",
  fontSize: 14, fontFamily: "inherit", color: "#1A1D24", outline: "none", background: "white", boxSizing: "border-box"
};
