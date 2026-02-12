// api/asset-lookup.js
// Lookup de ticker sin depender de Gemini (evita error 429 por cuota agotada)

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

async function fetchJSON(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Finanza360/1.0 (Vercel Serverless)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} en ${url}`);
    }

    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

async function tryYahoo(ticker) {
  const t = ticker.toUpperCase();

  const candidates = new Set([t]);

  // Para cripto, Yahoo suele usar BTC-USD, ETH-USD, etc.
  if (!t.includes("-") && /^[A-Z0-9]{2,12}$/.test(t)) {
    candidates.add(`${t}-USD`);
  }

  const symbols = [...candidates].join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

  const data = await fetchJSON(url);
  const result = data?.quoteResponse?.result;

  if (!Array.isArray(result) || result.length === 0) return null;

  const exact = result.find((x) => String(x.symbol || "").toUpperCase() === t);
  const cryptoLike = result.find((x) => String(x.symbol || "").toUpperCase() === `${t}-USD`);
  const firstWithPrice = result.find((x) =>
    Number.isFinite(toNumber(x.regularMarketPrice)) ||
    Number.isFinite(toNumber(x.postMarketPrice)) ||
    Number.isFinite(toNumber(x.preMarketPrice))
  );

  const pick = exact || cryptoLike || firstWithPrice;
  if (!pick) return null;

  const price =
    toNumber(pick.regularMarketPrice) ||
    toNumber(pick.postMarketPrice) ||
    toNumber(pick.preMarketPrice);

  if (!Number.isFinite(price) || price <= 0) return null;

  const name =
    pick.longName ||
    pick.shortName ||
    pick.displayName ||
    (pick.symbol ? String(pick.symbol) : t);

  return {
    name: String(name),
    price,
    source: "yahoo",
    symbolResolved: String(pick.symbol || t),
  };
}

async function tryCoinGecko(ticker) {
  const t = ticker.toLowerCase();

  // 1) Buscar coin por símbolo
  const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(t)}`;
  const search = await fetchJSON(searchUrl);

  const coins = Array.isArray(search?.coins) ? search.coins : [];
  if (!coins.length) return null;

  const exactSymbol =
    coins.find((c) => String(c.symbol || "").toLowerCase() === t) || coins[0];

  if (!exactSymbol?.id) return null;

  // 2) Obtener precio en USD
  const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    exactSymbol.id
  )}&vs_currencies=usd`;

  const priceData = await fetchJSON(priceUrl);
  const price = toNumber(priceData?.[exactSymbol.id]?.usd);

  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    name: String(exactSymbol.name || ticker.toUpperCase()),
    price,
    source: "coingecko",
    symbolResolved: String(exactSymbol.symbol || ticker).toUpperCase(),
  };
}

async function tryBinanceUSDT(ticker) {
  const t = ticker.toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(t)) return null;

  // Muchos tickers crypto existen como XXXUSDT
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(
    `${t}USDT`
  )}`;

  const data = await fetchJSON(url);
  const price = toNumber(data?.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    name: `${t} / USDT`,
    price,
    source: "binance",
    symbolResolved: `${t}USDT`,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const raw = String(req.query?.ticker || "").trim().toUpperCase();
    const ticker = raw.replace(/\s+/g, "");

    if (!ticker) {
      return res.status(400).json({ ok: false, error: "Falta ticker" });
    }

    // Seguridad básica de formato
    if (!/^[A-Z0-9.\-_=]{1,20}$/.test(ticker)) {
      return res.status(400).json({ ok: false, error: "Ticker inválido" });
    }

    const errors = [];

    // Orden de intentos: Yahoo -> CoinGecko -> Binance
    try {
      const y = await tryYahoo(ticker);
      if (y) {
        return res.status(200).json({
          ok: true,
          ticker,
          name: y.name,
          price: y.price,
          source: y.source,
          symbolResolved: y.symbolResolved,
        });
      }
    } catch (e) {
      errors.push(`yahoo: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const c = await tryCoinGecko(ticker);
      if (c) {
        return res.status(200).json({
          ok: true,
          ticker,
          name: c.name,
          price: c.price,
          source: c.source,
          symbolResolved: c.symbolResolved,
        });
      }
    } catch (e) {
      errors.push(`coingecko: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const b = await tryBinanceUSDT(ticker);
      if (b) {
        return res.status(200).json({
          ok: true,
          ticker,
          name: b.name,
          price: b.price,
          source: b.source,
          symbolResolved: b.symbolResolved,
        });
      }
    } catch (e) {
      errors.push(`binance: ${e instanceof Error ? e.message : String(e)}`);
    }

    return res.status(404).json({
      ok: false,
      error: `No se encontró precio para ${ticker}`,
      details: errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return res.status(500).json({ ok: false, error: message });
  }
}
