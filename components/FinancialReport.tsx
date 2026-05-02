import React, { useMemo } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Target,
  Shield,
  Briefcase,
  Sparkles,
  PieChart,
  BarChart2,
  Zap
} from 'lucide-react';
import { BankAccount, Transaction, Investment, FinancialPlan } from '../types';

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
  // --- LÓGICA DE DATOS ---

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
    if (cashFlow < 0 || debtToAsset > 0.5) return { label: 'Riesgo Alto', color: 'text-rose-100', bg: 'bg-rose-500', icon: <AlertTriangle size={16}/> };
    if (savingsRate < 15) return { label: 'Riesgo Medio', color: 'text-amber-100', bg: 'bg-amber-500', icon: <AlertTriangle size={16}/> };
    return { label: 'Saludable', color: 'text-emerald-100', bg: 'bg-emerald-500', icon: <Shield size={16}/> };
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

    const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
    let currentDegree = 0;
    const segments = Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([name, val], i) => {
      const perc = total > 0 ? (val / total) * 100 : 0;
      const start = currentDegree;
      currentDegree += (perc / 100) * 360;
      return { name, perc, color: colors[i % colors.length], start, end: currentDegree };
    });

    const conicGradient = segments.length > 0 
      ? segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ')
      : '#f1f5f9 0deg 360deg';

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
  
  const [year, month] = selectedMonth.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const displayDate = `${meses[parseInt(month) - 1]} ${year}`;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* HEADER ELEGANTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
            <BarChart2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Informe Financiero</h1>
            <div className="flex items-center gap-2 mt-0.5 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
              <Calendar size={12} />
              Periodo: {displayDate}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select className="flex-1 md:flex-none bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow">
            <option>Mensual</option>
            <option>Trimestral</option>
            <option>Anual</option>
          </select>
          <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all">
            <Download size={14} />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI CARDS (DISEÑO PREMIUM) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Patrimonio Neto (Destacado) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Briefcase size={12} /> Patrimonio Neto
            </p>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${riskLevel.bg} ${riskLevel.color}`}>
              {riskLevel.icon} {riskLevel.label}
            </div>
          </div>
          <p className="text-3xl font-black tracking-tighter mt-4 relative z-10">{fUSD(netWorth)}</p>
        </div>

        {/* Flujo de Caja */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={12} /> Flujo de Caja
            </p>
            <div className={`p-1.5 rounded-lg ${cashFlow >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              {cashFlow >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
          </div>
          <p className={`text-3xl font-black tracking-tighter mt-4 ${cashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {fUSD(cashFlow)}
          </p>
        </div>

        {/* Ingresos / Gastos Combinados */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div>
            <div className="flex justify-between items-end mb-3 border-b border-slate-50 pb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={12} className="text-emerald-500"/> Ingresos</span>
              <span className="text-lg font-black text-slate-900">{fUSD(income)}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><TrendingDown size={12} className="text-rose-500"/> Gastos</span>
              <span className="text-lg font-black text-slate-900">{fUSD(expenses)}</span>
            </div>
          </div>
        </div>

        {/* Tasa de Ahorro */}
        <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-4 -right-4 text-indigo-500/10">
            <Target size={100} />
          </div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 relative z-10">
            <Target size={12} /> Tasa de Ahorro
          </p>
          <div className="mt-4 flex items-baseline gap-2 relative z-10">
            <p className="text-3xl font-black tracking-tighter text-indigo-600">{fPct(savingsRate)}</p>
            <span className="text-[10px] font-bold text-indigo-400 uppercase">del ingreso</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO COMPARATIVO: INGRESOS VS GASTOS */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Balance Operativo</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Ingresos</span></div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Gastos</span></div>
            </div>
          </div>
          
          <div className="relative h-56 flex items-end justify-center gap-8 md:gap-16 pb-2">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2">
              {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-slate-100/80 border-dashed h-0" />)}
            </div>

            <div className="flex-1 max-w-[120px] flex flex-col items-center justify-end h-full relative group z-10">
              <span className="absolute -top-8 bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none shadow-xl">{fUSD(income)}</span>
              <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-1000 ease-out" style={{height: income === 0 && expenses === 0 ? '5%' : `${Math.max((income / Math.max(income, expenses)) * 100, 5)}%`}} />
            </div>
            
            <div className="flex-1 max-w-[120px] flex flex-col items-center justify-end h-full relative group z-10">
              <span className="absolute -top-8 bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none shadow-xl">{fUSD(expenses)}</span>
              <div className="w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-2xl shadow-lg shadow-rose-500/20 transition-all duration-1000 ease-out" style={{height: income === 0 && expenses === 0 ? '5%' : `${Math.max((expenses / Math.max(income, expenses)) * 100, 5)}%`}} />
            </div>
          </div>
        </div>

        {/* GRÁFICO TIPO DONUT: PORTAFOLIO */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
            <PieChart size={16} className="text-slate-400" /> Distribución de Activos
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-8">Porcentaje del Portafolio</p>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {portfolioData.segments.length > 0 ? (
              <>
                <div className="relative w-48 h-48 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.05)] hover:scale-105 transition-transform duration-500" style={{ background: `conic-gradient(${portfolioData.conicGradient})` }}>
                  <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total USD</span>
                    <span className="text-lg font-black text-slate-900 tracking-tight">{fUSD(portfolioData.total)}</span>
                  </div>
                </div>
                <div className="mt-8 w-full space-y-3 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                  {portfolioData.segments.map((s, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-md shadow-sm" style={{backgroundColor: s.color}} />
                        <span className="text-[11px] font-bold text-slate-600 uppercase group-hover:text-slate-900 transition-colors">{s.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-900">{fPct(s.perc)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-50">
                <Briefcase size={48} className="text-slate-300 mb-4" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin posiciones activas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RANKING DE GASTOS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart2 size={16} className="text-slate-400" /> Análisis de Gastos Mayores
          </h3>
          <div className="space-y-4 flex-1">
            {spendingAnalysis.length > 0 ? spendingAnalysis.slice(0, 5).map(([cat, val], i) => (
              <div key={i} className="relative bg-slate-50 p-4 rounded-2xl border border-slate-100 overflow-hidden group hover:border-slate-300 transition-colors">
                {/* Barra de progreso de fondo */}
                <div className="absolute left-0 top-0 bottom-0 bg-slate-200/50 transition-all duration-1000" style={{ width: `${(val/expenses)*100}%` }}></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 font-black text-[10px]">
                      {i+1}
                    </div>
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{cat}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{fUSD(val)}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{fPct((val/expenses)*100)} del total</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-full border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Cero gastos registrados</p>
              </div>
            )}
          </div>
        </div>

        {/* INSIGHTS Y PROYECCIONES */}
        <div className="space-y-6">
          {/* Alertas Inteligentes */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Zap size={120} />
            </div>
            <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
              <Sparkles size={16} /> Observaciones Estratégicas
            </h3>
            <div className="space-y-3 relative z-10">
              <InsightItem 
                title="Liquidez y Ahorro" 
                desc={savingsRate >= 20 ? "Excelente disciplina. Estás por encima de la regla del 20% de ahorro." : savingsRate > 0 ? "Tu tasa de ahorro es baja. Considera ajustar el presupuesto discrecional." : "Estás operando a pérdida este mes. Prioriza recortar gastos inmediatamente."} 
                status={savingsRate >= 20 ? 'success' : savingsRate > 0 ? 'warning' : 'danger'}
              />
              <InsightItem 
                title="Apalancamiento" 
                desc={totalLiabilities === 0 ? "Operas sin deuda registrada, eliminando el riesgo de intereses." : `Mantienes una relación deuda/patrimonio del ${fPct((totalLiabilities/totalAssets)*100)}.`} 
                status={totalLiabilities === 0 ? 'success' : 'neutral'}
              />
            </div>
          </div>

          {/* Proyecciones */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Proyección a 6 Meses</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <OutlookCard label="Base (Actual)" value={fUSD(netWorth + (cashFlow * 6))} color="slate" />
              <OutlookCard label="Optimista (+20%)" value={fUSD(netWorth + (cashFlow * 1.2 * 6))} color="emerald" />
              <OutlookCard label="Pesimista (-20%)" value={fUSD(netWorth + (cashFlow * 0.8 * 6))} color="rose" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InsightItem = ({ title, desc, status }: { title: string, desc: string, status: 'success' | 'warning' | 'danger' | 'neutral' }) => {
  const colors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-400',
    danger: 'bg-rose-500',
    neutral: 'bg-indigo-400'
  };

  return (
    <div className="p-4 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${colors[status]}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">{title}</span>
      </div>
      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  );
};

const OutlookCard = ({ label, value, color }: { label: string, value: string, color: 'emerald' | 'rose' | 'slate' }) => (
  <div className={`p-4 rounded-2xl border flex flex-col justify-center ${color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : color === 'rose' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-sm font-black tracking-tight ${color === 'emerald' ? 'text-emerald-700' : color === 'rose' ? 'text-rose-700' : 'text-slate-700'}`}>{value}</p>
  </div>
);
