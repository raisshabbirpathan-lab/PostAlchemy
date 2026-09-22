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
    return res.status(500).json({
      error: 'GEMINI_API_KEY not found in Vercel Environment Variables'
    });
  }

  try {
    const { prompt, type } = req.body;

    const fullPrompt = `
    You are a professional social media manager. Rewrite the following text into a professional ${type || 'Social Media'} post. 
    Add relevant emojis and hashtags.

    Text:
    ${prompt}
    `;

    // Gemini 2.0 Flash ka updated endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || 'Gemini API Error'
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: 'No response received from Gemini'
      });
    }

    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};
