module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing on backend.' });
  }

  try {
    const { prompt, type } = req.body;

    const fullPrompt = `You are a professional social media manager. Rewrite the following text into a professional ${type || 'Social Media'} post. Add relevant emojis and hashtags.

Text:
${prompt}`;

    // Google ke naye "alias" models - yeh hamesha latest available model ko auto-select karte hain
    const models = [
      'gemini-flash-latest',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash'
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }]
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError = data.error?.message || 'Gemini API Error';
          continue;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          return res.status(200).json({ text });
        }

        lastError = 'No response received from Gemini';
      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({
      error: 'Server thoda busy hai. Kripya 2 minute baad dubara try karein. (Details: ' + lastError + ')'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
