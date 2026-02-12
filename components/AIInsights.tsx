import React, { useState, useMemo } from 'react';
import { Transaction, Budget, Investment } from '../types';
import { FinanceAIService } from '../services/geminiService';
import { Sparkles, ShieldAlert, Zap, BarChart3, Loader2 } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  budgets: Budget[];
  investments: Investment[];
  selectedMonth: string;
}

type AIReport = {
  summary: string;
  warnings: string[];
  opportunities: string[];
  score: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const normalizeReport = (raw: any): AIReport => {
  const scoreNum = Number(raw?.score);
  return {
    summary:
      typeof raw?.summary === 'string' && raw.summary.trim()
        ? raw.summary
        : 'No se pudo generar un resumen en este momento.',
    warnings: Array.isArray(raw?.warnings) ? raw.warnings.map(String) : [],
    opportunities: Array.isArray(raw?.opportunities) ? raw.opportunities.map(String) : [],
    score: Number.isFinite(scoreNum) ? clamp(scoreNum, 0, 100) : 0,
  };
};

export const AIInsights: React.FC<Props> = ({ transactions, budgets, investments, selectedMonth }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    if (!year || !month) return selectedMonth;
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1));
  }, [selectedMonth]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const service = new FinanceAIService();
      const result = await service.analyzeFinances(transactions, budgets, investments);
      setReport(normalizeReport(result));
    } catch (e) {
      console.error('Error generando reporte IA:', e);
      setError('No se pudo generar el análisis en este momento.');
      setReport({
        summary: 'No se pudo generar el análisis en este momento.',
        warnings: ['Error temporal de conexión con la IA.'],
        opportunities: ['Intenta nuevamente en unos minutos.'],
        score: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const score = report ? clamp(report.score, 0, 100) : 0;
  const scoreColor = score > 70 ? '#10b981' : score > 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
              <Sparkles className="text-amber-400" /> Asesoría con IA
            </h2>
            <p className="text-slate-400 font-medium">
              Gemini analiza tus patrones de gasto para optimizar tus finanzas.
            </p>
            <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
              Mes analizado: {monthLabel}
            </p>
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
            {loading ? 'Analizando...' : 'Generar Reporte'}
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 font-semibold">
          {error}
        </div>
      )}

      {report ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="text-blue-600" /> Resumen Ejecutivo
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">{report.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                <h3 className="text-rose-900 font-black mb-4 flex items-center gap-2">
                  <ShieldAlert size={20} /> Advertencias
                </h3>
                <ul className="space-y-2">
                  {report.warnings.length > 0 ? (
                    report.warnings.map((w: string, i: number) => (
                      <li key={i} className="text-rose-700 text-sm font-bold flex gap-2">
                        <span className="mt-1">•</span> {w}
                      </li>
                    ))
                  ) : (
                    <li className="text-rose-700 text-sm font-bold">• Sin alertas importantes por ahora.</li>
                  )}
                </ul>
              </div>

              <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                <h3 className="text-emerald-900 font-black mb-4 flex items-center gap-2">
                  <Zap size={20} /> Oportunidades
                </h3>
                <ul className="space-y-2">
                  {report.opportunities.length > 0 ? (
                    report.opportunities.map((o: string, i: number) => (
                      <li key={i} className="text-emerald-700 text-sm font-bold flex gap-2">
                        <span className="mt-1">•</span> {o}
                      </li>
                    ))
                  ) : (
                    <li className="text-emerald-700 text-sm font-bold">• No hay sugerencias nuevas por ahora.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-6">Salud Financiera</h3>
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="12"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute text-4xl font-black text-slate-900">{score}</span>
            </div>
            <p className="mt-6 text-sm font-bold text-slate-500 uppercase tracking-wider">Tu puntuación este mes</p>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-slate-300" size={40} />
            </div>
            <p className="text-slate-400 font-medium">
              Pulsa el botón superior para obtener un análisis inteligente de tus datos.
            </p>
          </div>
        )
      )}
    </div>
  );
};
