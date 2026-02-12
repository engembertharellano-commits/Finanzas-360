import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, Budget, Investment, BankAccount } from "../types";

export interface ExchangeRateResponse {
  rate: number;
  sourceUrl?: string;
  sourceName?: string;
  sourceDateText?: string | null;
  fetchedAt?: string;
}

export interface AssetLookupResponse {
  name: string;
  price: number;
}

export class FinanceAIService {
  private getApiKey(): string {
    // Cliente (Vite) y fallback legacy
    const viteKey =
      (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
      (import.meta as any)?.env?.API_KEY ||
      "";

    const processKey =
      (typeof process !== "undefined" && (process as any)?.env?.API_KEY) || "";

    return String(viteKey || processKey || "").trim();
  }

  private getClient() {
    return new GoogleGenAI({ apiKey: this.getApiKey() });
  }

  // Tasa VES desde endpoint backend
  async getExchangeRate(): Promise<ExchangeRateResponse> {
    try {
      const resp = await fetch("/api/exchange-rate", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok || !data || typeof data.rate !== "number") {
        return { rate: 45.5 };
      }

      return {
        rate: data.rate,
        sourceUrl: data.sourceUrl,
        sourceName: data.sourceName,
        sourceDateText: data.sourceDateText ?? null,
        fetchedAt: data.fetchedAt,
      };
    } catch (error) {
      console.error("Error al consultar /api/exchange-rate:", error);
      return { rate: 45.5 };
    }
  }

  // ✅ Lookup ticker por backend (estable en producción)
  async lookupAssetInfo(ticker: string): Promise<AssetLookupResponse | null> {
    const cleanTicker = String(ticker || "").trim().toUpperCase();
    if (!cleanTicker) return null;

    // 1) Intento principal: endpoint backend
    try {
      const resp = await fetch(`/api/asset-lookup?ticker=${encodeURIComponent(cleanTicker)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await resp.json().catch(() => null);

      if (resp.ok && data?.ok && typeof data.name === "string" && typeof data.price === "number") {
        return { name: data.name, price: data.price };
      }
    } catch (error) {
      console.warn("lookupAssetInfo backend falló, probando fallback cliente:", error);
    }

    // 2) Fallback: cliente directo (si hay key expuesta)
    if (!this.getApiKey()) return null;

    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Busca el nombre oficial y el precio de mercado actual de la acción o criptomoneda con ticker: ${cleanTicker}. Responde en formato JSON.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nombre completo descriptivo del activo" },
              price: { type: Type.NUMBER, description: "Precio actual de mercado en USD" }
            },
            required: ["name", "price"]
          },
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const text = response.text;
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error("Error buscando activo (fallback cliente):", error);
      return null;
    }
  }

  async analyzeFinances(
    transactions: Transaction[],
    budgets: Budget[],
    investments: Investment[]
  ) {
    if (!this.getApiKey()) {
      return {
        summary: "⚠️ Inteligencia Artificial no conectada. Por favor, configura tu API_KEY en el panel de control.",
        warnings: ["Análisis limitado por falta de conexión."],
        opportunities: [],
        score: 0
      };
    }

    const personalTransactions = transactions.filter(t => !t.isWorkRelated && !t.isThirdParty);

    const prompt = `
      Actúa como un asesor financiero experto. Analiza la situación PERSONAL del usuario:

      DATOS PERSONALES (Usa esto para el Score y el Resumen):
      - Transacciones Personales: ${JSON.stringify(personalTransactions.slice(0, 50))}
      - Presupuestos: ${JSON.stringify(budgets)}
      - Inversiones: ${JSON.stringify(investments)}

      REGLA DE ORO:
      Ignora cualquier flujo que no sea gasto personal o ingreso propio. Los fondos de trabajo y de terceros (custodia) NO son parte de la salud financiera personal del usuario, son pasivos temporales.

      Genera un informe detallado en JSON con:
      1. 'summary': Resumen de su economía real.
      2. 'warnings': Alertas de gastos personales excesivos.
      3. 'opportunities': Consejos de inversión o ahorro.
      4. 'score': Salud financiera de 0 a 100 basada SOLO en lo personal.
    `;

    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              score: { type: Type.NUMBER }
            },
            required: ["summary", "warnings", "opportunities", "score"]
          },
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Respuesta vacía de la IA");
      return JSON.parse(text);
    } catch (error) {
      console.error("Error en análisis financiero IA:", error);
      return {
        summary: "No se pudo generar el análisis en este momento.",
        warnings: ["Error de conexión con la IA"],
        opportunities: ["Intenta de nuevo más tarde"],
        score: 0
      };
    }
  }

  async chatWithData(
    message: string,
    context: { transactions: Transaction[]; accounts: BankAccount[] }
  ) {
    if (!this.getApiKey()) {
      return "Lo siento, la función de chat requiere una API_KEY configurada en el servidor.";
    }

    const systemInstruction = `
      Eres el asistente financiero personal de Finanza360.
      Instrucciones Críticas:
      1. Tienes tres cubetas: PERSONAL, LABORAL (Pote Trabajo) y CUSTODIA (Dinero de otros).
      2. No mezcles los totales. Si el usuario pregunta "cuánto tengo", aclara si te refieres a su dinero neto personal o al saldo total en bancos (que incluye dinero de otros).
      3. Responde de forma muy concisa en Español.
    `;

    const resumenContexto = `
      CONTEXTO ACTUAL:
      - total_transacciones: ${context.transactions.length}
      - total_cuentas: ${context.accounts.length}
    `;

    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${resumenContexto}\n\nPREGUNTA DEL USUARIO:\n${message}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      return response.text;
    } catch (error) {
      console.error("Error en chat IA:", error);
      return "Hubo un error en el chat.";
    }
  }
}
