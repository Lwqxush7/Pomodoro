const APP_ID = "a823248a-8bfe-48c3-b6ed-96419313a1b4";
const ALLOWED_ORIGIN = "https://lwqxush7.github.io";
const OS_URL = "https://onesignal.com/api/v1/notifications";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("POST only");
    return;
  }

  const key = process.env.ONESIGNAL_REST_API_KEY;
  if (!key) {
    res.status(500).json({ error: "ONESIGNAL_REST_API_KEY yok" });
    return;
  }

  let b = req.body || {};
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch { b = {}; }
  }
  const { uid, title, body, endAt, cancelId } = b;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Basic ${key}`
  };

  try {
    // İptal
    if (cancelId) {
      const r = await fetch(`${OS_URL}/${encodeURIComponent(cancelId)}?app_id=${APP_ID}`, {
        method: "DELETE",
        headers
      });
      const data = await r.json().catch(() => ({}));
      res.status(200).json({ ok: r.ok, result: data });
      return;
    }

    // Zamanlama
    if (!uid || !title || !body || !endAt) {
      res.status(400).json({ error: "uid, title, body, endAt gerekli" });
      return;
    }
    const when = new Date(endAt);
    if (isNaN(when.getTime())) {
      res.status(400).json({ error: "endAt geçersiz" });
      return;
    }
    if (when.getTime() < Date.now() - 5000) {
      res.status(400).json({ error: "endAt geçmişte" });
      return;
    }

    const r = await fetch(OS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        app_id: APP_ID,
        target_channel: "push",
        include_aliases: { external_id: [String(uid)] },
        headings: { en: String(title), tr: String(title) },
        contents: { en: String(body), tr: String(body) },
        send_after: when.toUTCString()
      })
    });
    const data = await r.json();
    if (!r.ok || data.errors) {
      res.status(502).json({ error: data });
      return;
    }
    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
