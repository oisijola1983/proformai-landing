export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const LOOPS_API_KEY = process.env.LOOPS_API_KEY;
  if (!LOOPS_API_KEY) return res.status(500).json({ error: 'Loops API key not configured' });

  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  try {
    const response = await fetch('https://app.loops.so/api/v1/contacts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
      },
      body: JSON.stringify({ email, source: 'proformai-waitlist', userGroup: 'waitlist' }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = (data?.message || data?.error || '').toLowerCase();
      if (msg.includes('already exists') || msg.includes('already in your audience') || msg.includes('already')) {
        return res.status(200).json({ success: true, message: 'already_subscribed' });
      }
      return res.status(response.status).json({ error: data.message || data.error || 'Failed to subscribe' });
    }
    return res.status(200).json({ success: true, message: 'subscribed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
