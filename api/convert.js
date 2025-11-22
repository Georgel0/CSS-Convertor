import fetch from 'node-fetch';

// This pulls the key from Vercel's environment variables
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

const SYSTEM_PROMPT = `You are an expert CSS to Tailwind CSS converter. 
Task: Return a JSON object with:
1. "output": The Tailwind classes.
2. "analysis": A 1-sentence explanation.
Rules:
- Output JSON only. No markdown.
- Handle media queries and pseudo-classes using Tailwind prefixes.
`;

export default async function handler(req, res) {
  // 1. Handle CORS (Allows your frontend to talk to this backend)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle pre-flight check
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Validation
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!API_KEY) return res.status(500).json({ error: "Server API Key missing" });

  const { cssCode } = req.body;
  if (!cssCode) return res.status(400).json({ error: "No CSS provided" });

  try {
    // 3. Call Gemini API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cssCode }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error?.message || 'API Error');

    // 4. Clean and Parse Response
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    // Remove markdown code blocks if AI includes them
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    res.status(200).json(JSON.parse(text));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Conversion failed: " + error.message });
  }
}
