import { GoogleGenAI, Type } from "@google/genai";

const API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.API_KEY ||
  process.env.VITE_GEMINI_API_KEY ||
  "";

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    if (!API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Falta API key de Gemini en Vercel (GEMINI_API_KEY o API_KEY).",
      });
    }

    const rawTicker = String(req.query?.ticker || "").trim().toUpperCase();
    if (!rawTicker) {
      return res.status(400).json({ ok: false, error: "Falta ticker" });
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const prompt = `
Busca el activo financiero con ticker/símbolo "${rawTicker}".
Devuelve SOLO JSON con:
- name: nombre oficial del activo
- price: precio actual en USD (número)
No agregues texto adicional.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            price: { type: Type.NUMBER },
          },
          required: ["name", "price"],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const data = safeParseJson(response.text);
    if (!data || typeof data.name !== "string" || typeof data.price !== "number") {
      return res.status(502).json({
        ok: false,
        error: "No se pudo interpretar respuesta de IA para ticker.",
      });
    }

    return res.status(200).json({
      ok: true,
      ticker: rawTicker,
      name: data.name,
      price: data.price,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return res.status(500).json({ ok: false, error: message });
  }
}
