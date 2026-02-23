const ALLOWED_METADATA_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'referrer',
  'landing_path',
  'signup_context',
];

function extractMetadata(input = {}) {
  return ALLOWED_METADATA_FIELDS.reduce((acc, key) => {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      acc[key] = value.trim().slice(0, 300);
    }
    return acc;
  }, {});
}

function formatLeadAlert({ email, metadata }) {
  const tags = [
    metadata.utm_source,
    metadata.utm_medium,
    metadata.utm_campaign,
  ].filter(Boolean).join(' / ');

  const context = [
    metadata.signup_context,
    metadata.landing_path,
  ].filter(Boolean).join(' · ');

  return [
    '🔥 New ProformAI waitlist lead',
    `Email: ${email}`,
    tags ? `UTM: ${tags}` : null,
    context ? `Context: ${context}` : null,
    metadata.referrer ? `Referrer: ${metadata.referrer}` : null,
  ].filter(Boolean).join('\n');
}

async function sendLeadAlert({ email, metadata }) {
  const webhookUrl = process.env.WAITLIST_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: formatLeadAlert({ email, metadata }) }),
    });
  } catch (error) {
    console.error('waitlist alert failed', error?.message || error);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
  if (!LOOPS_API_KEY) return res.status(500).json({ error: 'Loops API key not configured' });

  const { email, ...rest } = req.body || {};
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  const metadata = extractMetadata(rest);

  try {
    const response = await fetch('https://app.loops.so/api/v1/contacts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        source: 'proformai-waitlist',
        userGroup: 'waitlist',
        ...metadata,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = (data?.message || data?.error || '').toLowerCase();
      if (msg.includes('already exists') || msg.includes('already in your audience') || msg.includes('already')) {
        return res.status(200).json({ success: true, message: 'already_subscribed' });
      }
      return res.status(response.status).json({ error: data.message || data.error || 'Failed to subscribe' });
    }

    await sendLeadAlert({ email, metadata });
    return res.status(200).json({ success: true, message: 'subscribed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
