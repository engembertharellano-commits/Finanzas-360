const DEFAULT_RATE = 45.5;

function parseLocaleNumber(raw) {
  if (!raw) return NaN;
  let s = String(raw).trim().replace(/\s/g, '');

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // El último separador suele ser decimal
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 -> 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      s = s.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // 123,45 -> 123.45
    s = s.replace(',', '.');
  } else {
    // solo punto o entero
    s = s.replace(/,/g, '');
  }

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

async function fetchWithTimeout(url, ms = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Finanza360/1.0 (+Vercel Serverless)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} en ${url}`);
    }

    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseTcambio(html) {
  // Ejemplo visible en HTML: "Bs.S 390.29"
  const rateMatches = [...html.matchAll(/Bs\.S\s*([0-9]+(?:[.,][0-9]+)*)/gi)];
  if (!rateMatches.length) {
    throw new Error('No se encontró tasa Bs.S en TCambio');
  }

  // Toma el primer valor válido
  let rate = NaN;
  for (const m of rateMatches) {
    const n = parseLocaleNumber(m[1]);
    if (Number.isFinite(n) && n > 0) {
      rate = n;
      break;
    }
  }

  if (!Number.isFinite(rate)) {
    throw new Error('No se pudo parsear la tasa de TCambio');
  }

  // "Ultima actualización Jueves, 12 de febrero de 2026"
  const dateMatch = html.match(/Ultima actualización\s*([^\n<]+)/i);
  const sourceDateText = dateMatch?.[1]?.trim() || null;

  return {
    rate,
    sourceName: 'TCambio',
    sourceUrl: 'https://www.tcambio.app/',
    sourceDateText,
  };
}

async function getRateFromSources() {
  // Fuente primaria
  const html = await fetchWithTimeout('https://www.tcambio.app/');
  return parseTcambio(html);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  try {
    const data = await getRateFromSources();

    // Cache CDN corta para no sobreconsultar, pero mantener frescura
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      ok: true,
      rate: data.rate,
      sourceUrl: data.sourceUrl,
      sourceName: data.sourceName,
      sourceDateText: data.sourceDateText,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';

    return res.status(200).json({
      ok: false,
      rate: DEFAULT_RATE,
      sourceUrl: undefined,
      sourceName: 'fallback',
      sourceDateText: null,
      fetchedAt: new Date().toISOString(),
      error: message,
    });
  }
}
