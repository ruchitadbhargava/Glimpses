export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { userMood } = req.body;

  const prompt = `
You are a music curator AI. A user has described their current mood as:
"${userMood}"

Return a JSON object with:
- "moodTitle": A poetic 3–6 word title for this mood
- "moodDescription": One atmospheric sentence under 20 words
- "queries": Array of exactly 3 Spotify search queries, each in a different language/culture

Only return valid JSON. No markdown, no extra text.
`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await groqRes.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const cleaned = raw.replace(/```json|```/gi, "").trim();

  res.status(200).json(JSON.parse(cleaned));
}
