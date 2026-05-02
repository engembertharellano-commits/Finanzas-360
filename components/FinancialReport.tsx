import React, { useMemo } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  AlertTriangle,
  Target,
  Shield,
  Briefcase,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { BankAccount, Transaction, Investment, Budget, FinancialPlan } from '../types';

interface FinancialReportProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  investments: Investment[];
  exchangeRate: number;
  selectedMonth: string;
  financialPlans?: any[];
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  accounts,
  transactions,
  investments,
  exchangeRate,
  selectedMonth,
  financialPlans = []
}) => {
  // --- LÓGICA DE DATOS (CONTROLLER / PORTFOLIO MANAGER) ---

  const toUSD = (amount: number, currency: string) => {
    return currency === 'VES' ? amount / exchangeRate : amount;
  };

  const { netWorth, totalAssets, totalLiabilities } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    accounts.forEach(acc => {
      const val = toUSD(acc.balance, acc.currency);
      if (acc.type === 'Tarjeta de Crédito' && val < 0) {
        liabilities += Math.abs(val);
      } else if (acc.type === 'Tarjeta de Crédito' && val >= 0) {
        // Balance a favor en TC cuenta como activo líquido
        assets += val;
      } else {
        assets += val;
      }
    });

    investments.forEach(inv => {
      const invValue = inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0;
      assets += toUSD(invValue, inv.currency);
    });

    return { totalAssets: assets, totalLiabilities: liabilities, netWorth: assets - liabilities };
  }, [accounts, investments, exchangeRate]);

  const { income, expenses, cashFlow, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const currentMonthTxs = transactions.filter(t => t.date.startsWith(selectedMonth));

    currentMonthTxs.forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });

    return { 
      income: inc, 
      expenses: exp, 
      cashFlow: inc - exp, 
      savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0 
    };
  }, [transactions, selectedMonth, exchangeRate]);

  const riskLevel = useMemo(() => {
    const debtToAsset = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
    if (cashFlow < 0 || debtToAsset > 0.5) return { label: 'Crítico', color: 'text-rose-600', bg: 'bg-rose-100', icon: <AlertTriangle size={18}/> };
    if (savingsRate < 15) return { label: 'Moderado', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Shield size={18}/> };
    return { label: 'Conservador', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <Shield size={18}/> };
  }, [cashFlow, savingsRate, totalLiabilities, totalAssets]);

  const portfolioData = useMemo(() => {
    const categories: Record<string, number> = {};
    let total = 0;
    investments.forEach(inv => {
      const invValue = inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0;
      const valUSD = toUSD(invValue, inv.currency);
      const cat = inv.category || 'Otros';
      categories[cat] = (categories[cat] || 0) + valUSD;
      total += valUSD;
    });

    const colors = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];
    let currentDegree = 0;
    const segments = Object.entries(categories).map(([name, val], i) => {
      const perc = (val / total) * 100;
      const start = currentDegree;
      currentDegree += (perc / 100) * 360;
      return { name, perc, color: colors[i % colors.length], start, end: currentDegree };
    });

    const conicGradient = segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ');
    return { segments, total, conicGradient };
  }, [investments, exchangeRate]);

  const spendingAnalysis = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'Gasto')
      .forEach(t => {
        cats[t.category] = (cats[t.category] || 0) + toUSD(t.amount, t.currency);
      });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [transactions, selectedMonth, exchangeRate]);

  // --- FORMATEADORES ---
  const fUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fPct = (v: number) => `${v.toFixed(1)}%`;

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Informe Financiero</h1>
          <div className="flex items-center gap-2 mt-1 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            <Calendar size={12} />
            Periodo Actual: {selectedMonth}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900">
            <option>Mensual</option>
            <option>Trimestral</option>
            <option>Anual</option>
          </select>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPIItem title="Net Worth" value={fUSD(netWorth)} />
        <KPIItem title="Cash Flow" value={fUSD(cashFlow)} highlight={cashFlow < 0 ? 'rose' : 'emerald'} />
        <KPIItem title="Savings Rate" value={fPct(savingsRate)} />
        <KPIItem title="Income" value={fUSD(income)} />
        <KPIItem title="Expenses" value={fUSD(expenses)} />
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Risk Level</p>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${riskLevel.bg} ${riskLevel.color} text-[10px] font-black uppercase tracking-tighter`}>
            {riskLevel.icon}
            {riskLevel.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* INCOME vs EXPENSES CHART (CSS BAR CHART) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-2">
            <Activity size={16} className="text-slate-400" />
            Flujo de Caja vs Presupuesto
          </h3>
          <div className="relative h-64 flex items-end justify-around gap-4 pb-4 border-b border-slate-50">
            <div className="flex-1 flex flex-col items-center gap-4 group">
              <div className="w-full max-w-[80px] bg-emerald-500/10 rounded-t-2xl relative overflow-hidden flex items-end transition-all group-hover:bg-emerald-500/20" style={{height: '100%'}}>
                 <div className="w-full bg-emerald-500 rounded-t-2xl transition-all duration-700" style={{height: `${(income / Math.max(income, expenses)) * 100}%`}} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos</span>
              <span className="absolute -top-6 text-xs font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">{fUSD(income)}</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-4 group">
              <div className="w-full max-w-[80px] bg-rose-500/10 rounded-t-2xl relative overflow-hidden flex items-end transition-all group-hover:bg-rose-500/20" style={{height: '100%'}}>
                 <div className="w-full bg-rose-500 rounded-t-2xl transition-all duration-700" style={{height: `${(expenses / Math.max(income, expenses)) * 100}%`}} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos</span>
              <span className="absolute -top-6 text-xs font-black text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">{fUSD(expenses)}</span>
            </div>
          </div>
        </div>

        {/* PORTFOLIO DONUT (CSS CONIC GRADIENT) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">Asset Allocation</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            {portfolioData.segments.length > 0 ? (
              <>
                <div className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-inner" style={{ background: `conic-gradient(${portfolioData.conicGradient})` }}>
                  <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                    <span className="text-sm font-black text-slate-900">{fUSD(portfolioData.total)}</span>
                  </div>
                </div>
                <div className="mt-8 w-full space-y-2">
                  {portfolioData.segments.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: s.color}} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{s.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-900">{fPct(s.perc)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <Briefcase className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin datos de inversión</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SPENDING ANALYSIS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Spending Analysis</h3>
          <div className="space-y-4">
            {spendingAnalysis.length > 0 ? spendingAnalysis.map(([cat, val], i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-xs font-black text-slate-400">#{i+1}</span>
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{cat}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-900">{fUSD(val)}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{fPct((val/expenses)*100)} del total</p>
                </div>
              </div>
            )) : <p className="text-center text-slate-400 text-xs font-bold py-10 uppercase tracking-widest">No hay gastos este mes</p>}
          </div>
        </div>

        {/* RISK & INSIGHTS / OUTLOOK */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              Controller Insights
            </h3>
            <div className="space-y-4">
              <InsightItem 
                title="Tasa de Ahorro" 
                desc={savingsRate > 20 ? "Óptimo: Estás por encima del benchmark del 20%." : "Alerta: Tu tasa de ahorro es baja. Revisa gastos hormiga."} 
                status={savingsRate > 20 ? 'success' : 'warning'}
              />
              <InsightItem 
                title="Net Worth Outlook" 
                desc={`A este ritmo, tu patrimonio proyectado a 6 meses es de ${fUSD(netWorth + (cashFlow * 6))}.`} 
                status="neutral"
              />
              <InsightItem 
                title="Deuda" 
                desc={totalLiabilities === 0 ? "Excepcional: Operas con apalancamiento cero." : `Tu ratio de deuda/activo es del ${fPct((totalLiabilities/totalAssets)*100)}.`} 
                status={totalLiabilities === 0 ? 'success' : 'neutral'}
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Financial Outlook (6M)</h3>
            <div className="grid grid-cols-3 gap-4">
              <OutlookCard label="Base" value={fUSD(netWorth + (cashFlow * 6))} color="slate" />
              <OutlookCard label="Optimista" value={fUSD(netWorth + (cashFlow * 1.2 * 6))} color="emerald" />
              <OutlookCard label="Pesimista" value={fUSD(netWorth + (cashFlow * 0.7 * 6))} color="rose" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPIItem = ({ title, value, highlight = 'slate' }: { title: string, value: string, highlight?: 'slate' | 'emerald' | 'rose' }) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <p className={`text-sm font-black tracking-tighter ${highlight === 'emerald' ? 'text-emerald-600' : highlight === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>
      {value}
    </p>
  </div>
);

const InsightItem = ({ title, desc, status }: { title: string, desc: string, status: 'success' | 'warning' | 'neutral' }) => (
  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'success' ? 'bg-emerald-400' : status === 'warning' ? 'bg-rose-400' : 'bg-slate-400'}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{title}</span>
    </div>
    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
  </div>
);

const OutlookCard = ({ label, value, color }: { label: string, value: string, color: 'emerald' | 'rose' | 'slate' }) => (
  <div className={`p-4 rounded-2xl border ${color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : color === 'rose' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-[10px] font-black ${color === 'emerald' ? 'text-emerald-700' : color === 'rose' ? 'text-rose-700' : 'text-slate-700'}`}>{value}</p>
  </div>
);

const Sparkles = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);
