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
    const fullPrompt = `Rewrite as a ${type || 'social media'} post with emojis & hashtags:\n\n${prompt}`;

    // FAST PATH: Direct fast models (single call = fastest)
    const fastModels = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const model of fastModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { temperature: 0.9, maxOutputTokens: 800 }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return res.status(200).json({ text });
        }
      } catch (err) { /* try next */ }
    }

    // DISCOVERY PATH: Only if fast models fail (rare)
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();

    const availableModels = (listData.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.includes('flash'));

    for (const model of availableModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: { temperature: 0.9, maxOutputTokens: 800 }
            })
          }
        );
        if (!response.ok) continue;
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return res.status(200).json({ text });
      } catch (err) { continue; }
    }

    return res.status(500).json({ error: '2 minute baad try karein.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
