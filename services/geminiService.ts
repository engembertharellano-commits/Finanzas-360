import { Transaction, Budget, Investment, BankAccount } from "../types";

export interface ExchangeRateResponse {
  rate: number;
  sourceUrl?: string;
}

export interface AssetLookupResponse {
  name: string;
  price: number;
}

type AnalyzeResponse = {
  summary: string;
  warnings: string[];
  opportunities: string[];
  score: number;
};

type AnyObj = Record<string, unknown>;

export class FinanceAIService {
  private async requestAI(body: AnyObj): Promise<AnyObj> {
    const resp = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await resp.json().catch(() => ({}))) as AnyObj;

    if (!resp.ok || json?.ok === false) {
      const msg =
        typeof json?.error === "string" && json.error.trim()
          ? json.error
          : `Error IA (${resp.status})`;
      throw new Error(msg);
    }

    return json;
  }

  private parseJsonFromText<T>(input: unknown): T | null {
    if (typeof input !== "string") return null;
    let text = input.trim();
    if (!text) return null;

    // Limpia markdown fences
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    // Intento directo
    try {
      return JSON.parse(text) as T;
    } catch {
      // Extrae primer objeto JSON encontrado
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const candidate = text.slice(start, end + 1);
        try {
          return JSON.parse(candidate) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async getExchangeRate(): Promise<ExchangeRateResponse> {
    try {
      const data = await this.requestAI({ task: "exchange_rate" });
      const rate = Number(data?.rate);

      return {
        rate: Number.isFinite(rate) && rate > 0 ? rate : 45.5,
        sourceUrl: typeof data?.sourceUrl === "string" ? data.sourceUrl : undefined,
      };
    } catch (error) {
      console.error("AI Rate Sync Error:", error);
      return { rate: 45.5 };
    }
  }

  async lookupAssetInfo(ticker: string): Promise<AssetLookupResponse | null> {
    try {
      const prompt = `
Devuelve SOLO JSON válido (sin markdown) con esta estructura:
{"name":"string","price":number}

Busca el activo con ticker: ${ticker}
- "name": nombre oficial/descriptivo.
- "price": precio actual en USD.
      `.trim();

      const data = await this.requestAI({
        task: "lookup_asset",
        prompt,
      });

      // Si backend devuelve texto
      const parsedFromText = this.parseJsonFromText<AssetLookupResponse>(data?.text);

      // O si backend devuelve campos directos
      const direct: AssetLookupResponse | null =
        typeof data?.name === "string" && Number.isFinite(Number(data?.price))
          ? { name: String(data.name), price: Number(data.price) }
          : null;

      const result = direct ?? parsedFromText;
      if (!result) return null;

      const price = Number(result.price);
      if (!Number.isFinite(price)) return null;

      return {
        name: String(result.name || ticker).trim(),
        price,
      };
    } catch (error) {
      console.error("Error buscando activo:", error);
      return null;
    }
  }

  async analyzeFinances(
    transactions: Transaction[],
    budgets: Budget[],
    investments: Investment[]
  ): Promise<AnalyzeResponse> {
    const fallback: AnalyzeResponse = {
      summary: "No se pudo generar el análisis en este momento.",
      warnings: ["Error de conexión con la IA"],
      opportunities: ["Intenta de nuevo más tarde"],
      score: 0,
    };

    try {
      const personalTransactions = transactions.filter(
        (t) => !t.isWorkRelated && !t.isThirdParty
      );

      const prompt = `
Actúa como un asesor financiero experto y responde SOLO en JSON válido con esta forma:
{
  "summary": "string",
  "warnings": ["string"],
  "opportunities": ["string"],
  "score": number
}

REGLAS:
- Analiza SOLO finanzas personales.
- Ignora dinero laboral (pote de trabajo) y custodia (dinero de terceros).
- Score de 0 a 100.

DATOS:
- Transacciones personales (máx 50): ${JSON.stringify(personalTransactions.slice(0, 50))}
- Presupuestos: ${JSON.stringify(budgets)}
- Inversiones: ${JSON.stringify(investments)}
      `.trim();

      const data = await this.requestAI({
        task: "analyze_finances",
        prompt,
      });

      const parsed = this.parseJsonFromText<AnalyzeResponse>(data?.text);

      if (parsed) {
        return {
          summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : fallback.warnings,
          opportunities: Array.isArray(parsed.opportunities)
            ? parsed.opportunities.map(String)
            : fallback.opportunities,
          score: Number.isFinite(Number(parsed.score)) ? Number(parsed.score) : 0,
        };
      }

      // Si algún día backend devuelve campos directos
      const direct: AnalyzeResponse = {
        summary:
          typeof data?.summary === "string" ? String(data.summary) : fallback.summary,
        warnings:
          Array.isArray(data?.warnings) ? (data.warnings as unknown[]).map(String) : fallback.warnings,
        opportunities:
          Array.isArray(data?.opportunities)
            ? (data.opportunities as unknown[]).map(String)
            : fallback.opportunities,
        score: Number.isFinite(Number(data?.score)) ? Number(data?.score) : 0,
      };

      return direct;
    } catch (error) {
      console.error("Error en análisis financiero IA:", error);
      return fallback;
    }
  }

  async chatWithData(
    message: string,
    context: { transactions: Transaction[]; accounts: BankAccount[] }
  ): Promise<string> {
    try {
      const systemInstruction = `
Eres el asistente financiero personal de Finanza360.
Instrucciones críticas:
1) Hay tres cubetas: PERSONAL, LABORAL (Pote Trabajo) y CUSTODIA (Dinero de terceros).
2) No mezcles totales.
3) Responde en español, claro y muy conciso.
      `.trim();

      // Reducimos volumen para no saturar tokens
      const compactContext = {
        transactions: context.transactions.slice(0, 60),
        accounts: context.accounts.slice(0, 20),
      };

      const prompt = `
${systemInstruction}

Pregunta del usuario:
${message}

Contexto de datos:
${JSON.stringify(compactContext)}
      `.trim();

      const data = await this.requestAI({
        task: "chat_with_data",
        prompt,
      });

      const text =
        typeof data?.text === "string" ? data.text.trim() : "";

      return text || "No pude responder en este momento.";
    } catch (error) {
      console.error("Error en chat IA:", error);
      return "Hubo un error en el chat.";
    }
  }
}
