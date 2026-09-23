module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key missing.' });

  try {
    const { prompt, type } = req.body;
    const fullPrompt = `Write an engaging ${type || 'social media'} post (120-180 words) with emojis & hashtags based on: "${prompt}"`;

    const fastModels = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash'];

    for (const model of fastModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { temperature: 0.9, maxOutputTokens: 600 }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return res.status(200).json({ text });
        }
      } catch (err) { /* next */ }
    }

    return res.status(500).json({ error: 'Server busy. 2 minute baad try karein.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
