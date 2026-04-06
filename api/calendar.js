export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const credsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (!credsJson) return res.status(500).json({ error: 'GOOGLE_CALENDAR_CREDENTIALS not configured' });

  const calendarId = req.query.calendarId;
  if (!calendarId) return res.status(400).json({ error: 'calendarId query param required' });

  try {
    const creds = JSON.parse(credsJson);
    const token = await getAccessToken(creds);

    // Fetch today's events
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      `timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}` +
      `&singleEvents=true&orderBy=startTime&maxResults=50`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Calendar API error' });
    }

    const data = await response.json();

    // Parse events into simplified format
    const events = (data.items || []).map(e => ({
      summary: e.summary || '',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      durationMin: calcDurationMin(e.start, e.end)
    }));

    res.status(200).json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function calcDurationMin(start, end) {
  const s = start?.dateTime || start?.date;
  const e = end?.dateTime || end?.date;
  if (!s || !e) return 0;
  return Math.round((new Date(e) - new Date(s)) / 60000);
}

// --- Google Service Account JWT auth ---

async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const jwt = await signJWT(header, payload, creds.private_key);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(tokenData.error_description || 'Token exchange failed');
  return tokenData.access_token;
}

async function signJWT(header, payload, privateKeyPem) {
  const enc = new TextEncoder();

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import PEM private key
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const keyBuf = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8', keyBuf,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
  const sigB64 = base64url(sig);

  return `${signingInput}.${sigB64}`;
}

function base64url(input) {
  let str;
  if (typeof input === 'string') {
    str = btoa(input);
  } else {
    // ArrayBuffer
    const bytes = new Uint8Array(input);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    str = btoa(binary);
  }
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
