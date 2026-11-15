export default function handler(_req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    runtime: "vercel-functions",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    storageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.DATABASE_URL),
    notice: "Warstwa API działa. Trwa konfiguracja trwałego magazynu danych."
  });
}
