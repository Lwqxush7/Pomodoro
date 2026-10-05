// OneSignal bildirim altyapısı — Vercel serverless fonksiyonu
//
// POST { title, body, endAt, externalId?, userId? }
//   -> endAt zamanında planlanmış push bildirimi oluşturur.
//      externalId: OneSignal external user id (Firebase uid)
//      userId:     OneSignal user id (S.onesignalId)
//      İkisi de yoksa tüm kullanıcılara gider (All segmenti).
// PUT { id }
//   -> Planlanmış bildirimi iptal eder (REST anahtarının Admin erişimde olması gerekir).
//
// Ortam değişkenleri (Vercel > Settings > Environment Variables):
//   ONESIGNAL_REST_API_KEY  (zorunlu)
//   APP_URL                 (opsiyonel, bildirime tıklandığında açılacak adres)

const APP_ID = "a823248a-8bfe-48c3-b6ed-96419313a1b4";
const OS_API = "https://onesignal.com/api/v1";

function targetOf({ userId, externalId } = {}) {
  // OneSignal REST API v1: target by external user ID (Firebase UID) first for cross-device delivery
  if (externalId) return { include_external_user_ids: [externalId] };
  if (userId) return { include_player_ids: [userId] };
  return { included_segments: ["All"] };
}

export default async function handler(req, res) {
  try {
    if (!process.env.ONESIGNAL_REST_API_KEY) {
      res.status(500).json({ error: "ONESIGNAL_REST_API_KEY ortam değişkeni tanımlı değil" });
      return;
    }
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
    };

    // --- Planlanmış bildirim oluştur ---
    if (req.method === "POST") {
      const { title, body, endAt, userId, externalId } = req.body || {};
      if (!title || !body || !endAt) {
        res.status(400).json({ error: "title, body, endAt gerekli" });
        return;
      }
      const sendAt = new Date(endAt);
      if (isNaN(sendAt)) {
        res.status(400).json({ error: "endAt geçerli bir tarih değil" });
        return;
      }
      if (sendAt.getTime() < Date.now()) {
        res.status(400).json({ error: "endAt geçmiş bir tarih olamaz" });
        return;
      }

      const payload = {
        app_id: APP_ID,
        headings: { en: title, tr: title },
        contents: { en: body, tr: body },
        send_after: sendAt.toUTCString(),
        ...targetOf({ userId, externalId })
      };
      if (process.env.APP_URL) payload.launch_url = process.env.APP_URL;

      const r = await fetch(`${OS_API}/notifications`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        res.status(502).json({ error: data || { status: r.status } });
        return;
      }
      res.status(200).json({ ok: true, id: data.id });
      return;
    }

    // --- Planlanmış bildirimi iptal et ---
    if (req.method === "PUT") {
      const { id } = req.body || {};
      if (!id) {
        res.status(400).json({ error: "id gerekli" });
        return;
      }
      const r = await fetch(`${OS_API}/notifications/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ q: "" })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        res.status(502).json({ error: data || { status: r.status } });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).send("POST (planla) veya PUT (iptal) kullan");
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
