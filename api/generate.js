module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key is missing on backend.' });

  try {
    const { prompt, type } = req.body;
    const fullPrompt = `You are a professional social media manager. Rewrite the following text into a professional ${type || 'Social Media'} post. Add relevant emojis and hashtags.

Text:
${prompt}`;

    // STEP 1: Google se poochho ki aaj kaunse models available hain
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const listData = await listRes.json();

    if (!listData.models || listData.models.length === 0) {
      return res.status(500).json({ 
        error: 'Koi bhi model available nahi hai. Kripya Google AI Studio mein "Generative Language API" enable karein.' 
      });
    }

    // STEP 2: Sirf woh models chuno jo generateContent support karte hain
    let availableModels = listData.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
      .filter(name => name.includes('flash') || name.includes('latest'));

    // STEP 3: Sort karo - sabse naya aur fast model pehle
    availableModels.sort((a, b) => {
      const score = (name) => {
        if (name.includes('3.8')) return 1;
        if (name.includes('3.7')) return 2;
        if (name.includes('3.6')) return 3;
        if (name.includes('3.5')) return 4;
        if (name.includes('3.1')) return 5;
        if (name.includes('2.5')) return 6;
        if (name.includes('2.0')) return 7;
        if (name.includes('latest')) return 0; // latest alias ko sabse pehle
        return 10;
      };
      return score(a) - score(b);
    });

    if (availableModels.length === 0) {
      return res.status(500).json({ 
        error: 'Koi bhi Flash model available nahi hai. Kripya API key aur billing check karein.' 
      });
    }

    // STEP 4: Har available model try karo (fallback system)
    let lastError = null;
    for (const model of availableModels) {
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
          lastError = data.error?.message;
          continue;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return res.status(200).json({ text });

      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({
      error: 'Sabhi models try kiye, lekin koi kaam nahi kiya. Kripya 2 minute baad try karein.'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
