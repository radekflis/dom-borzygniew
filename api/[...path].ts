function json(res: any, status: number, body: unknown) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
export default async function handler(req: any, res: any) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  const pathname = new URL(req.url || "/", "https://internal.invalid").pathname;
  if (pathname === "/api/workspace" && req.method === "GET") return json(res, 200, {});
  if (pathname === "/api/ai/open-studio-plan" && req.method === "POST") {
    const prompt = String(req.body?.prompt || "").toLowerCase();
    const plan = prompt.includes("złot")
      ? { brightness: 8, contrast: 5, saturation: 7, warmth: 18, highlights: -12, shadows: 16, sharpen: 10, vignette: 0, presetMood: "golden-hour" }
      : prompt.includes("skand")
        ? { brightness: 12, contrast: -3, saturation: -5, warmth: 4, highlights: -8, shadows: 18, sharpen: 8, vignette: 0, presetMood: "scandinavian" }
        : { brightness: 6, contrast: 5, saturation: 3, warmth: 2, highlights: -16, shadows: 18, sharpen: 10, vignette: 1, presetMood: "natural-hdr" };
    return json(res, 200, { ...plan, source: "deterministic-fallback", stagingAdvice: "Zadbaj o neutralne światło, uporządkowane powierzchnie i spójne dodatki. Zachowaj rzeczywisty układ oraz cechy nieruchomości.", estimatedCostPln: null, buyerImpact: "Potencjalnie poprawia czytelność zdjęcia; nie stanowi prognozy sprzedaży.", notice: "Plan regułowy — AI nie zostało wywołane." });
  }
  if (pathname === "/api/ai/optimize-photo" || pathname === "/api/ai/redesign-image") return json(res, 200, { ok: true, useClientOpenHdr: true, message: "Korekta obrazu wykonywana lokalnie w przeglądarce." });
  if (pathname === "/api/workspace" || pathname.startsWith("/api/inquiries") || pathname.startsWith("/api/marketplace") || pathname.startsWith("/api/marketing")) {
    return json(res, 503, { error: "Trwa konfiguracja trwałego magazynu danych. Operacja nie została zapisana; ponów próbę po aktywacji magazynu." });
  }
  if (pathname.startsWith("/api/ai/")) return json(res, 503, { error: "Ta funkcja nie jest jeszcze aktywna. Nie wykonano płatnego wywołania AI." });
  return json(res, 404, { error: "Nie znaleziono endpointu API." });
}
