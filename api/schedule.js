export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("POST kullan");
    return;
  }
  const { title, body, endAt } = req.body || {};
  if (!title || !body || !endAt) {
    res.status(400).json({ error: "title, body, endAt gerekli" });
    return;
  }
  try {
    const r = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: "a823248a-8bfe-48c3-b6ed-96419313a1b4",
        included_segments: ["All"],
        headings: { tr: title },
        contents: { tr: body },
        send_after: new Date(endAt).toUTCString()
      })
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: data });
      return;
    }
    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
