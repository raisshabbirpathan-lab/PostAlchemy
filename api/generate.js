module.exports = async (req, res) => {
  // CORS Headers - taaki frontend se connect ho sake
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS request handle karna (browser preflight ke liye)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sirf POST request allow karna
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel se API Key nikalna
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'API key is missing on backend. Please check Vercel Environment Variables.'
    });
  }

  try {
    const { prompt, type } = req.body;

    // AI ko diya jane wala prompt
    const fullPrompt = `
    You are a professional social media manager. Rewrite the following text into a professional ${type || 'Social Media'} post. 
    Add relevant emojis and hashtags.

    Text:
    ${prompt}
    `;

    // Google Gemini ka naya endpoint aur naya model (gemini-3.6-flash)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // Agar Google se error aata hai
    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || 'Gemini API Error'
      });
    }

    // AI ka response nikalna
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: 'No response received from Gemini'
      });
    }

    // Success response bhejna
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};
