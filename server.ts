import express from "express";
import cors from "cors";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
const app = express();
const port = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === "production";
const files = {
  workspace: path.join(dataDir, "workspace.json"),
  marketplace: path.join(dataDir, "marketplace.json"),
  inquiries: path.join(dataDir, "inquiries.json"),
  marketing: path.join(dataDir, "marketing_stats.json")
};
await mkdir(dataDir, { recursive: true });
for (const [key, file] of Object.entries(files)) {
  if (!existsSync(file)) {
    const seed = key === "inquiries" ? [] : key === "marketplace" ? { pins: [], messages: [] } : key === "marketing" ? { sharesByChannel: {}, lastSharedAt: null } : {};
    await writeFile(file, JSON.stringify(seed, null, 2));
  }
}
app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "12mb" }));
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return fallback; }
}
async function writeJson(file: string, value: unknown) {
  const temp = file + ".tmp";
  await writeFile(temp, JSON.stringify(value, null, 2));
  await rename(temp, file);
}
const route = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get("/api/health", route(async (_req, res) => res.json({
  ok: true,
  geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  mapsKeyConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY),
  workspaceSaved: existsSync(files.workspace),
  mode: production ? "production" : "development"
})));
app.get("/api/workspace", route(async (_req, res) => res.json(await readJson(files.workspace, {}))));
app.put("/api/workspace", route(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ error: "Nieprawidłowy format workspace." });
  await writeJson(files.workspace, req.body);
  res.json({ ok: true, updatedAt: new Date().toISOString() });
}));
app.delete("/api/workspace", route(async (_req, res) => { await writeJson(files.workspace, {}); res.json({ ok: true }); }));
app.get("/api/inquiries", route(async (_req, res) => res.json(await readJson(files.inquiries, []))));
app.post("/api/inquiries", route(async (req, res) => {
  const { name, email, message } = req.body ?? {};
  if (![name, email, message].every((v: unknown) => typeof v === "string" && v.trim())) return res.status(400).json({ error: "Uzupełnij imię, e-mail i wiadomość." });
  const rows = await readJson<any[]>(files.inquiries, []);
  const row = { id: crypto.randomUUID(), name: name.trim().slice(0, 160), email: email.trim().slice(0, 254), phone: String(req.body.phone ?? "").slice(0, 40), message: message.trim().slice(0, 5000), status: "nowe", createdAt: new Date().toISOString() };
  rows.unshift(row);
  await writeJson(files.inquiries, rows);
  res.status(201).json(row);
}));
app.get("/api/marketplace/pins", route(async (_req, res) => res.json(await readJson(files.marketplace, { pins: [], messages: [] }))));
app.post("/api/marketplace/pins", route(async (req, res) => {
  const store = await readJson<any>(files.marketplace, { pins: [], messages: [] });
  const pin = { ...req.body, id: crypto.randomUUID(), status: "active", createdAt: new Date().toISOString() };
  store.pins.unshift(pin);
  await writeJson(files.marketplace, store);
  res.status(201).json(pin);
}));
app.get("/api/marketing/stats", route(async (_req, res) => res.json(await readJson(files.marketing, { sharesByChannel: {} }))));
app.post("/api/marketing/track-share", route(async (req, res) => {
  const channel = String(req.body?.channel ?? "").slice(0, 48);
  if (!/^[a-z0-9_-]+$/i.test(channel)) return res.status(400).json({ error: "Nieprawidłowy kanał." });
  const stats = await readJson<any>(files.marketing, { sharesByChannel: {} });
  stats.sharesByChannel[channel] = (stats.sharesByChannel[channel] ?? 0) + 1;
  stats.lastSharedAt = new Date().toISOString();
  await writeJson(files.marketing, stats);
  res.json(stats);
}));
app.post("/api/ai/open-studio-plan", route(async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").toLowerCase();
  const plan = prompt.includes("złot")
    ? { brightness: 8, contrast: 5, saturation: 7, warmth: 18, highlights: -12, shadows: 16, sharpen: 10, vignette: 0, presetMood: "golden-hour" }
    : prompt.includes("skand")
      ? { brightness: 12, contrast: -3, saturation: -5, warmth: 4, highlights: -8, shadows: 18, sharpen: 8, vignette: 0, presetMood: "scandinavian" }
      : { brightness: 6, contrast: 5, saturation: 3, warmth: 2, highlights: -16, shadows: 18, sharpen: 10, vignette: 1, presetMood: "natural-hdr" };
  res.json({ ...plan, source: "deterministic-fallback", stagingAdvice: "Zadbaj o neutralne światło, uporządkowane powierzchnie i spójne dodatki. Zachowaj rzeczywisty układ oraz cechy nieruchomości.", estimatedCostPln: null, buyerImpact: "Potencjalnie poprawia czytelność zdjęcia; nie stanowi prognozy sprzedaży.", notice: "Plan regułowy — AI nie zostało wywołane." });
}));
app.post("/api/ai/redesign-image", (_req, res) => res.json({ ok: true, useClientOpenHdr: true, message: "Retusz wykonuj lokalnie w Canvas 2D; brak płatnego generowania obrazu." }));
app.post("/api/ai/optimize-photo", (_req, res) => res.json({ ok: true, useClientOpenHdr: true, message: "Korekta obrazu ma działać lokalnie w przeglądarce." }));
for (const endpoint of ["/api/ai/index-media-batch", "/api/ai/analyze-property-media", "/api/ai/generate-listings", "/api/ai/marketing-autopilot", "/api/ai/contract", "/api/ai/draft-reply"]) {
  app.post(endpoint, (_req, res) => res.status(503).json({ error: "Ta funkcja zostanie aktywowana po wdrożeniu bezpiecznej integracji Gemini po stronie serwera." }));
}
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[api]", err instanceof Error ? err.message : err);
  res.status(500).json({ error: "Wystąpił błąd serwera. Spróbuj ponownie." });
});
if (!production) {
  const vite = await createViteServer({ configFile: path.join(root, "vite.config.ts"), server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(root, "dist"), { index: false, maxAge: "1h" }));
  app.get("*", (_req, res) => res.sendFile(path.join(root, "dist", "index.html")));
}
app.listen(port, "0.0.0.0", () => console.log(`Willa Panorama server listening on :${port}`));
