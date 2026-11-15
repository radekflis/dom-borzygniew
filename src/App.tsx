import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, Camera, Compass, FileText, Images, MapPinned, MessageCircle, Settings2, ShieldCheck, Sparkles } from "lucide-react";

type Mode = "kupujacy" | "wlasciciel" | "agencja";
const BACKUP_DB = "willa-panorama-private";
const BACKUP_STORE = "backups";
function openBackupDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(BACKUP_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(BACKUP_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function savePrivateBackup(value: any) {
  const db = await openBackupDb();
  await new Promise<void>((resolve,reject) => {
    const tx = db.transaction(BACKUP_STORE,"readwrite");
    tx.objectStore(BACKUP_STORE).put(value,"latest");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function readPrivateBackup(): Promise<any | null> {
  const db = await openBackupDb();
  const value = await new Promise<any>((resolve,reject) => {
    const request = db.transaction(BACKUP_STORE,"readonly").objectStore(BACKUP_STORE).get("latest");
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

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
  const [storageAvailable, setStorageAvailable] = useState(false);
  const [active, setActive] = useState("overview");
  const [notice, setNotice] = useState("");
  const [backupLoaded, setBackupLoaded] = useState(false);
  useEffect(() => { history.replaceState(null, "", "?tryb=" + mode); }, [mode]);
  useEffect(() => {
    let live = true;
    Promise.all([fetch("/api/workspace").then(r => r.ok ? r.json() : Promise.reject()), fetch("/api/health").then(r => r.ok ? r.json() : Promise.reject())])
      .then(async ([data, status]) => {
        const saved = await readPrivateBackup().catch(() => null);
        if (live) { setWorkspace(saved?.workspace ?? data); setBackupLoaded(Boolean(saved?.workspace)); setStorageAvailable(Boolean(status.storageConfigured)); setHealth("ok"); }
      })
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
      <div className="hero-status"><span className={health === "ok" ? "dot live" : "dot"}/>{health === "ok" ? (storageAvailable ? "API i magazyn danych aktywne" : "API aktywne · magazyn trwały jeszcze niepodłączony") : health === "loading" ? "Łączenie z serwerem…" : "Tryb ograniczony — brak API"}</div>
    </div><div className="hero-art"><div className="art-frame"><img src={property.heroImageUrl || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=85"} alt="Zdjęcie ilustracyjne architektury domu"/><div className="art-caption"><span>01 / RESIDENCE</span><b>Dom w Borzygniewie</b></div></div><div className="art-note"><Sparkles size={16}/><span>Cyfrowe studio nieruchomości<br/><b>Osiem modułów projektu</b></span></div></div></section>
    <section className="metrics">{[["Materiały", mediaCount ? mediaCount.toLocaleString("pl-PL") : "—"], ["Powierzchnia", "Do potwierdzenia"], ["Działka", "Do potwierdzenia"], ["Prowizja", "0%"]].map(([a,b]) => <div key={a}><span>{a}</span><b>{b}</b></div>)}</section>
    <section className="workspace"><div className="section-heading"><div><span className="eyebrow">WORKSPACE / {mode.toUpperCase()}</span><h2>Centrum nieruchomości</h2></div><span className="data-note"><ShieldCheck size={15}/> Dane serwerowe · bez kluczy w przeglądarce</span></div>
      <div className="module-layout"><aside className="module-nav">{modules.filter(m => mode !== "kupujacy" || m.id !== "seller").map(m => <button key={m.id} onClick={() => setActive(m.id)} className={active === m.id ? "active" : ""}><m.icon size={17}/><span>{m.title}</span></button>)}</aside>
        <article className="module-panel"><div className="panel-top"><div className="panel-icon"><Icon size={21}/></div><div><span className="eyebrow">MODUŁ {String(modules.findIndex(m => m.id === active) + 1).padStart(2, "0")}</span><h3>{current.title}</h3></div></div><p>{current.desc}</p>
          {active === "overview" && <div className="panel-content"><p className="muted">Dane źródłowe zostaną pokazane po imporcie kopii zapasowej. Rozbieżne wartości nie będą automatycznie ujednolicane.</p><div className="status-row"><span>Profil nieruchomości</span><b>{property.name || "Oczekuje na import danych"}</b></div><div className="status-row"><span>Zaimportowane media</span><b>{mediaCount || "Oczekuje na import"}</b></div></div>}
          {active === "tour" && <Placeholder icon={<Compass size={34}/>} title="Spacer przestrzenny — etap konstrukcji" body="Widok 3D zostanie zbudowany na podstawie rzeczywistych stacji fotograficznych i klatek wideo. Nie generujemy fikcyjnego modelu domu."/>}
          {active === "media" && <MediaArchive items={workspace.importedMedia || []} count={mediaCount}/> }
          {active === "studio" && <PhotoStudio done={setNotice}/>}
          {active === "map" && <Placeholder icon={<MapPinned size={34}/>} title="Mapa terenu i analiza okolicy" body="Po imporcie współrzędnych nieruchomości podłączymy warstwy OSM, POI i trasy. Brak współrzędnych nie będzie zastępowany zgadywaniem."/>}
          {active === "market" && <div className="panel-content"><p className="muted">API giełdy jest przygotowane. Dane ofert i wiadomości zostaną odczytane z kopii zapasowej.</p><button className="ghost" onClick={() => fetch("/api/marketplace/pins").then(r => r.json()).then(d => setNotice("Giełda: " + (d.pins?.length ?? 0) + " ofert w aktywnym magazynie."))}>Sprawdź oferty</button></div>}
          {active === "seller" && <BackupImport onImported={async backup => { await savePrivateBackup(backup); setWorkspace(backup.workspace); setBackupLoaded(true); setNotice("Kopia zapisana prywatnie w tej przeglądarce. Nie wysłano jej na GitHub ani serwer."); }} loaded={backupLoaded} count={mediaCount}/> }
          {active === "contact" && <Contact done={setNotice}/>}
        </article></div>
    </section>
    <footer><span>WILLA PANORAMA · RESET KONSTYTUCYJNY</span><span>PROJEKT 2026 · TRYB {labels[mode]}</span></footer>
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice} ×</button>}
  </main>;
}
function BackupImport({onImported,loaded,count}:{onImported:(b:any)=>Promise<void>;loaded:boolean;count:number}) {
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  return <div className="panel-content">
    <p className="muted">Import kopii JSON do prywatnej pamięci tej przeglądarki. Plik nie trafia do publicznego repozytorium ani na serwer. Dane pozostają na tym urządzeniu i w tym profilu przeglądarki.</p>
    <div className="status-row"><span>Status archiwum</span><b>{loaded ? "Zaimportowano" : "Oczekuje na import"}</b></div>
    <div className="status-row"><span>Rekordy mediów</span><b>{count.toLocaleString("pl-PL")}</b></div>
    <label className="field-label">Wybierz plik kopii JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return;
      setBusy(true); setMessage("");
      try {
        if (file.size > 100 * 1024 * 1024) throw new Error("Plik przekracza limit 100 MB.");
        const parsed = JSON.parse(await file.text());
        if (!parsed || typeof parsed !== "object" || !parsed.workspace || !Array.isArray(parsed.workspace.importedMedia)) throw new Error("Nie rozpoznano kopii Willa Panorama — brak workspace.importedMedia.");
        await onImported(parsed);
        setMessage("Import zakończony: " + parsed.workspace.importedMedia.length.toLocaleString("pl-PL") + " rekordów mediów.");
      } catch(err:any) { setMessage(err?.message || "Nie udało się odczytać kopii."); }
      finally { setBusy(false); e.target.value = ""; }
    }}/></label>
    {busy && <p className="muted">Odczyt i zapis kopii…</p>}
    {message && <p className="muted" role="status">{message}</p>}
    <p className="muted">Etap bezpłatny, lokalny — dane nie synchronizują się między urządzeniami. Zachowaj oryginalny JSON.</p>
  </div>;
}
function MediaArchive({items,count}:{items:any[];count:number}) {
  const [filter,setFilter] = useState("all");
  const visible = items.filter(item => filter === "all" || (filter === "video" ? item.mediaType === "video" : item.mediaType !== "video")).slice(0,24);
  return <div className="panel-content">
    <div className="status-row"><span>Rekordy w archiwum</span><b>{count.toLocaleString("pl-PL")}</b></div>
    <div style={{display:"flex",gap:8,margin:"14px 0"}}><button className={filter==="all"?"primary":"ghost"} onClick={()=>setFilter("all")}>Wszystkie</button><button className={filter==="image"?"primary":"ghost"} onClick={()=>setFilter("image")}>Zdjęcia</button><button className={filter==="video"?"primary":"ghost"} onClick={()=>setFilter("video")}>Wideo</button></div>
    {visible.length ? <><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:12}}>{visible.map((item:any,i:number)=><div key={item.id || i} style={{minWidth:0}}>{item.mediaType === "video" ? <video src={item.url} controls preload="none" style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",borderRadius:10,background:"#111"}}/> : <a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} loading="lazy" alt={item.title || "Zdjęcie nieruchomości"} style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",borderRadius:10,background:"#eee"}}/></a>}<small className="muted" style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title || item.folder || "Materiał"}</small></div>)}</div><p className="muted">Wyświetlono {visible.length} z {count.toLocaleString("pl-PL")} rekordów.</p></> : <div className="placeholder-visual"><Images size={30}/><b>Archiwum czeka na import</b><span>Przejdź do Studio sprzedawcy i zaimportuj kopię JSON.</span></div>}
  </div>;
}

function PhotoStudio({done}:{done:(s:string)=>void}) {
  const [src,setSrc] = useState("");
  const [fileName,setFileName] = useState("willa-panorama.jpg");
  const [brightness,setBrightness] = useState(0);
  const [contrast,setContrast] = useState(0);
  const [saturation,setSaturation] = useState(0);
  const [warmth,setWarmth] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!src || !canvasRef.current) return;
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%) sepia(${Math.max(0,warmth)}%)`;
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      ctx.filter = "none";
      if (warmth < 0) {
        ctx.fillStyle = `rgba(70,135,190,${Math.abs(warmth)/500})`;
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
    };
    image.src = src;
  }, [src,brightness,contrast,saturation,warmth]);
  useEffect(() => () => { if (src.startsWith("blob:")) URL.revokeObjectURL(src); }, [src]);
  const reset = () => { setBrightness(0); setContrast(0); setSaturation(0); setWarmth(0); };
  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) return done("Nie udało się przygotować pliku.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName.replace(/\\.[^.]+$/, "") + "-retusz.jpg"; a.click();
      URL.revokeObjectURL(url);
      done("Gotowe — retusz zapisano lokalnie. Oryginał pozostał bez zmian.");
    }, "image/jpeg", 0.94);
  };
  const slider = (label:string,value:number,set:(n:number)=>void) => <label className="field-label" style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:12}}>{label}<b>{value>0?"+":""}{value}</b><input style={{gridColumn:"1 / -1",width:"100%"}} type="range" min="-30" max="30" value={value} onChange={e=>set(Number(e.target.value))}/></label>;
  return <div className="panel-content">
    <p className="muted">Lokalny retusz Canvas 2D. Zdjęcie nie jest wysyłane na serwer, nie uruchamiamy płatnego generowania obrazu.</p>
    <label className="field-label">Wybierz zdjęcie<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setFileName(f.name);setSrc(URL.createObjectURL(f));reset();}}}/></label>
    {src ? <><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,margin:"16px 0"}}>
      <div><small className="muted">ORYGINAŁ</small><img src={src} alt="Oryginalne zdjęcie" style={{width:"100%",maxHeight:320,objectFit:"contain",background:"#111",borderRadius:12}}/></div>
      <div><small className="muted">PODGLĄD RETUSZU</small><canvas ref={canvasRef} style={{width:"100%",maxHeight:320,objectFit:"contain",background:"#111",borderRadius:12}}/></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"4px 18px"}}>
      {slider("Jasność",brightness,setBrightness)}{slider("Kontrast",contrast,setContrast)}{slider("Nasycenie",saturation,setSaturation)}{slider("Temperatura",warmth,setWarmth)}
    </div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}><button className="primary" onClick={save}>Zapisz retusz lokalnie</button><button className="ghost" onClick={reset}>Resetuj korekty</button></div></> : <div className="placeholder-visual"><Camera size={32}/><b>Studio gotowe na zdjęcie</b><span>Wybierz plik z urządzenia. Korekty i eksport działają lokalnie w tej przeglądarce.</span></div>}
  </div>;
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