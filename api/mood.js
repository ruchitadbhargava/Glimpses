export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { userMood } = req.body;

  const prompt = `You are a music curator AI. A user feels: "${userMood}"

Respond with ONLY a raw JSON object, no markdown, no backticks, no explanation:
{"moodTitle":"...","moodDescription":"...","queries":["...","...","..."]}`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
       model: "meta-llama/llama-4-scout-17b-16e-instruct",,,
      messages: [
        {
          role: "system",
          content: "You are a JSON API. You only respond with raw JSON objects. Never use markdown or code blocks."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  const data = await groqRes.json();

  if (!groqRes.ok) {
    return res.status(500).json({ error: data.error?.message || "Groq failed" });
  }

  const raw = data.choices?.[0]?.message?.content || "";
  
  // Extract JSON even if there's surrounding text
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return res.status(500).json({ error: "No JSON found", raw });
  }

  try {
    const parsed = JSON.parse(match[0]);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: "Parse failed", raw });
  }
}
