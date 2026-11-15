import { useEffect, useState } from "react";
import { ArrowUpRight, Building2, Camera, Compass, FileText, Images, MapPinned, MessageCircle, Settings2, ShieldCheck, Sparkles } from "lucide-react";

type Mode = "kupujacy" | "wlasciciel" | "agencja";
const labels: Record<Mode, string> = { kupujacy: "Kupujący", wlasciciel: "Właściciel", agencja: "Agencja" };
const modules = [
  { id: "overview", title: "Wizytówka i parametry", desc: "Hero, KPI, wycena i dokumentacja", icon: Building2 },
  { id: "tour", title: "Spacer przestrzenny", desc: "Stacje fotograficzne i widoki 3D", icon: Compass },
  { id: "media", title: "Archiwum mediów", desc: "Zdjęcia, wideo, kategorie i foldery", icon: Images },
  { id: "studio", title: "Studio obrazu", desc: "Retusz lokalny i porównanie przed / po", icon: Camera },
  { id: "map", title: "Mapa i okolica", desc: "Warstwy, POI, trasy i analiza lokalizacji", icon: MapPinned },
  { id: "market", title: "Giełda bezpośrednia 0%", desc: "Oferty, radary, wiadomości i negocjacje", icon: MessageCircle },
  { id: "seller", title: "Studio sprzedawcy", desc: "Media, marketing, dokumenty i skrzynka", icon: Settings2 },
  { id: "contact", title: "Kontakt i zapytania", desc: "Bezpośrednie zgłoszenia kupujących", icon: FileText }
];
export default function App() {
  const initial = new URLSearchParams(location.search).get("tryb") as Mode | null;
  const [mode, setMode] = useState<Mode>(initial && initial in labels ? initial : "kupujacy");
  const [workspace, setWorkspace] = useState<any>({});
  const [health, setHealth] = useState("loading");
  const [active, setActive] = useState("overview");
  const [notice, setNotice] = useState("");
  useEffect(() => { history.replaceState(null, "", "?tryb=" + mode); }, [mode]);
  useEffect(() => {
    let live = true;
    Promise.all([fetch("/api/workspace").then(r => r.ok ? r.json() : Promise.reject()), fetch("/api/health").then(r => r.ok ? r.json() : Promise.reject())])
      .then(([data]) => { if (live) { setWorkspace(data); setHealth("ok"); } })
      .catch(() => { if (live) setHealth("error"); });
    return () => { live = false; };
  }, []);
  const property = workspace.property ?? {};
  const mediaCount = workspace.importedMedia?.length ?? property.totalIndexedFiles ?? 0;
  const current = modules.find(m => m.id === active)!;
  const Icon = current.icon;
  const share = async () => {
    const url = new URL(location.href); url.searchParams.set("tryb", "kupujacy");
    try { await navigator.clipboard.writeText(url.toString()); setNotice("Skopiowano czysty link kupującego."); } catch { setNotice(url.toString()); }
  };
  return <main>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">W</span><span>WILLA <b>PANORAMA</b><small>REAL ESTATE · DIGITAL STUDIO</small></span></a>
      <nav className="mode-switch">{(Object.keys(labels) as Mode[]).map(m => <button key={m} className={mode === m ? "selected" : ""} onClick={() => setMode(m)}>{labels[m]}</button>)}</nav>
      <button className="share" onClick={share}>Udostępnij <ArrowUpRight size={15}/></button>
    </header>
    <section className="hero" id="top"><div className="hero-copy"><span className="eyebrow">BORZYGNIEW · JEZIORO MIETKOWSKIE</span><h1>Przestrzeń, która<br/><i>ma swoją historię.</i></h1>
      <p>{property.tagline || "Dom w Borzygniewie — cyfrowa prezentacja nieruchomości i centrum zarządzania ofertą."}</p>
      <div className="hero-actions"><button className="primary" onClick={() => setActive("tour")}>Otwórz spacer <ArrowUpRight size={16}/></button><button className="ghost" onClick={() => setActive("media")}>Zobacz archiwum</button></div>
      <div className="hero-status"><span className={health === "ok" ? "dot live" : "dot"}/>{health === "ok" ? "Połączenie z serwerem aktywne" : health === "loading" ? "Łączenie z serwerem…" : "Tryb ograniczony — brak API"}</div>
    </div><div className="hero-art"><div className="art-frame"><img src={property.heroImageUrl || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85"} alt="Zdjęcie ilustracyjne architektury domu"/><div className="art-caption"><span>01 / RESIDENCE</span><b>Dom w Borzygniewie</b></div></div><div className="art-note"><Sparkles size={16}/><span>Cyfrowe studio nieruchomości<br/><b>Osiem modułów projektu</b></span></div></div></section>
    <section className="metrics">{[["Materiały", mediaCount ? mediaCount.toLocaleString("pl-PL") : "—"], ["Powierzchnia", "Do potwierdzenia"], ["Działka", "Do potwierdzenia"], ["Prowizja", "0%"]].map(([a,b]) => <div key={a}><span>{a}</span><b>{b}</b></div>)}</section>
    <section className="workspace"><div className="section-heading"><div><span className="eyebrow">WORKSPACE / {mode.toUpperCase()}</span><h2>Centrum nieruchomości</h2></div><span className="data-note"><ShieldCheck size={15}/> Dane serwerowe · bez kluczy w przeglądarce</span></div>
      <div className="module-layout"><aside className="module-nav">{modules.filter(m => mode !== "kupujacy" || m.id !== "seller").map(m => <button key={m.id} onClick={() => setActive(m.id)} className={active === m.id ? "active" : ""}><m.icon size={17}/><span>{m.title}</span></button>)}</aside>
        <article className="module-panel"><div className="panel-top"><div className="panel-icon"><Icon size={21}/></div><div><span className="eyebrow">MODUŁ {String(modules.findIndex(m => m.id === active) + 1).padStart(2, "0")}</span><h3>{current.title}</h3></div></div><p>{current.desc}</p>
          {active === "overview" && <div className="panel-content"><p className="muted">Dane źródłowe zostaną pokazane po imporcie kopii zapasowej. Rozbieżne wartości nie będą automatycznie ujednolicane.</p><div className="status-row"><span>Profil nieruchomości</span><b>{property.name || "Oczekuje na import danych"}</b></div><div className="status-row"><span>Zaimportowane media</span><b>{mediaCount || "Oczekuje na import"}</b></div></div>}
          {active === "tour" && <Placeholder icon={<Compass size={34}/>} title="Spacer przestrzenny — etap konstrukcji" body="Widok 3D zostanie zbudowany na podstawie rzeczywistych stacji fotograficznych i klatek wideo. Nie generujemy fikcyjnego modelu domu."/>}
          {active === "media" && <div className="panel-content"><div className="status-row"><span>Pliki w archiwum</span><b>{mediaCount || "Nie zaimportowano"}</b></div><p className="muted">Oryginalne adresy mediów i metadane pozostają w kopii zapasowej do czasu pełnego importu.</p></div>}
          {active === "studio" && <div className="panel-content"><label className="field-label">Polecenie korekty<textarea id="studio-prompt" placeholder="Np. odzyskaj szczegóły w cieniach i ocieplij balans bieli…"/></label><button className="primary" onClick={async () => { const prompt = (document.getElementById("studio-prompt") as HTMLTextAreaElement).value; const r = await fetch("/api/ai/open-studio-plan", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt}) }); const d = await r.json(); setNotice(d.notice || "Plan korekty przygotowany."); }}>Przygotuj plan korekty <Sparkles size={15}/></button></div>}
          {active === "map" && <Placeholder icon={<MapPinned size={34}/>} title="Mapa terenu i analiza okolicy" body="Po imporcie współrzędnych nieruchomości podłączymy warstwy OSM, POI i trasy. Brak współrzędnych nie będzie zastępowany zgadywaniem."/>}
          {active === "market" && <div className="panel-content"><p className="muted">API giełdy jest przygotowane. Dane ofert i wiadomości zostaną odczytane z kopii zapasowej.</p><button className="ghost" onClick={() => fetch("/api/marketplace/pins").then(r => r.json()).then(d => setNotice("Giełda: " + (d.pins?.length ?? 0) + " ofert w aktywnym magazynie."))}>Sprawdź oferty</button></div>}
          {active === "seller" && <div className="panel-content"><p className="muted">Panel właściciela: import mediów, marketing, dokumenty/OCR oraz skrzynka kupujących. Funkcje będą aktywowane moduł po module.</p></div>}
          {active === "contact" && <Contact done={setNotice}/>}
        </article></div>
    </section>
    <footer><span>WILLA PANORAMA · RESET KONSTYTUCYJNY</span><span>PROJEKT 2026 · TRYB {labels[mode]}</span></footer>
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice} ×</button>}
  </main>;
}
function Placeholder({icon,title,body}:{icon:React.ReactNode;title:string;body:string}) { return <div className="panel-content"><div className="placeholder-visual">{icon}<b>{title}</b><span>{body}</span></div></div>; }
function Contact({done}:{done:(s:string)=>void}) {
  const [name,setName] = useState(""); const [email,setEmail] = useState(""); const [message,setMessage] = useState("");
  return <form className="contact-form" onSubmit={async e => { e.preventDefault(); const r = await fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,message})}); const d = await r.json(); done(r.ok ? "Zapytanie zapisane." : d.error || "Nie udało się zapisać zapytania."); }}>
    <label>Imię i nazwisko<input required value={name} onChange={e=>setName(e.target.value)}/></label>
    <label>E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Wiadomość<textarea required value={message} onChange={e=>setMessage(e.target.value)}/></label>
    <button className="primary">Wyślij zapytanie <ArrowUpRight size={15}/></button>
  </form>;
}