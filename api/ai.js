const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function extractText(apiJson) {
  const parts = apiJson?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('\n')
    .trim();
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Intento extra por si viene con texto adicional
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

async function callGemini(prompt, responseMimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en variables de entorno');

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      ...(responseMimeType ? { responseMimeType } : {}),
    },
  };

  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json();
  if (!resp.ok) {
    const msg = json?.error?.message || 'Error llamando a Gemini';
    throw new Error(msg);
  }

  return extractText(json);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const body = parseBody(req);
    const task = String(body.task || 'chat');

    // Caso 1: pedir tasa
    if (task === 'exchange_rate') {
      const prompt = `
Devuelve SOLO JSON válido (sin markdown), con esta estructura exacta:
{"rate": number, "sourceUrl": "https://...", "asOf": "YYYY-MM-DD"}

Objetivo:
- Tasa de cambio USD -> VES más reciente posible.
- "rate" debe ser número positivo.
- "sourceUrl" debe ser URL de referencia.
      `.trim();

      const text = await callGemini(prompt, 'application/json');
      const parsed = tryParseJson(text) || {};
      const rate = Number(parsed.rate);

      return res.status(200).json({
        ok: true,
        rate: Number.isFinite(rate) && rate > 0 ? rate : 45.5,
        sourceUrl: typeof parsed.sourceUrl === 'string' ? parsed.sourceUrl : undefined,
        asOf: typeof parsed.asOf === 'string' ? parsed.asOf : undefined,
      });
    }

    // Caso 2: chat / análisis
    const promptText =
      typeof body.prompt === 'string'
        ? body.prompt
        : body.payload
          ? JSON.stringify(body.payload, null, 2)
          : 'Ayúdame con análisis financiero personal.';

    const system = `
Eres un asistente de finanzas personales.
Responde en español claro, breve y accionable.
Si faltan datos, indica supuestos razonables.
    `.trim();

    const finalPrompt = `${system}\n\nTarea: ${task}\n\nContenido:\n${promptText}`;
    const text = await callGemini(finalPrompt);

    return res.status(200).json({ ok: true, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return res.status(500).json({ ok: false, error: message });
  }
}
