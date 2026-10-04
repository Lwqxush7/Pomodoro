const APP_ID = 'a823248a-8bfe-48c3-b6ed-96419313a1b4';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://lwqxush7.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    Authorization: 'Key ' + process.env.ONESIGNAL_REST_API_KEY
  };
  const b = req.body || {};

  try {
    if (b.cancelId) {
      const r = await fetch(
        'https://api.onesignal.com/notifications/' + encodeURIComponent(b.cancelId) + '?app_id=' + APP_ID,
        { method: 'DELETE', headers }
      );
      return res.status(200).json({ ok: r.ok });
    }

    const t = Date.parse(b.endAt);
    if (!b.uid || typeof b.uid !== 'string' || b.uid.length > 128 || !t || t > Date.now() + 3 * 3600e3)
      return res.status(400).json({ error: 'bad request' });

    const payload = {
      app_id: APP_ID,
      target_channel: 'push',
      include_aliases: { external_id: [b.uid] },
      headings: { en: String(b.title || 'Odak').slice(0, 60) },
      contents: { en: String(b.body || '').slice(0, 120) }
    };
    if (t > Date.now()) payload.send_after = new Date(t).toISOString();

    const r = await fetch('https://api.onesignal.com/notifications?c=push', {
      method: 'POST', headers, body: JSON.stringify(payload)
    });
    return res.status(r.ok ? 200 : 502).json(await r.json());
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
};
