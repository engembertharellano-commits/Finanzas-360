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
  Zap,
  CheckCircle2,
  ArrowRight,
  Minus
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
  const toUSD = (amount: number, currency: string) => currency === 'VES' ? amount / exchangeRate : amount;

  const { netWorth, totalAssets, totalLiabilities } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    accounts.forEach(acc => {
      const val = toUSD(acc.balance, acc.currency);
      if (acc.type === 'Tarjeta de Crédito' && val < 0) liabilities += Math.abs(val);
      else if (acc.type === 'Tarjeta de Crédito' && val >= 0) assets += val;
      else assets += val;
    });
    investments.forEach(inv => {
      const invValue = inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0;
      assets += toUSD(invValue, inv.currency);
    });
    return { totalAssets: assets, totalLiabilities: liabilities, netWorth: assets - liabilities };
  }, [accounts, investments, exchangeRate]);

  const { income, expenses, cashFlow, savingsRate } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.filter(t => t.date.startsWith(selectedMonth)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });
    return { income: inc, expenses: exp, cashFlow: inc - exp, savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0 };
  }, [transactions, selectedMonth, exchangeRate]);

  const riskLevel = useMemo(() => {
    const debtToAsset = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
    if (cashFlow < 0 || debtToAsset > 0.5) return { label: 'Riesgo Alto', color: 'text-rose-100', bg: 'bg-rose-500', icon: <AlertTriangle size={16}/> };
    if (savingsRate < 15) return { label: 'Riesgo Medio', color: 'text-amber-100', bg: 'bg-amber-500', icon: <AlertTriangle size={16}/> };
    return { label: 'Saludable', color: 'text-emerald-100', bg: 'bg-emerald-500', icon: <Shield size={16}/> };
  }, [cashFlow, savingsRate, totalLiabilities, totalAssets]);

  const portfolioData = useMemo(() => {
    const cats: Record<string, number> = {};
    let total = 0;
    investments.forEach(inv => {
      const val = toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
      const name = inv.category || 'Otros';
      cats[name] = (cats[name] || 0) + val;
      total += val;
    });
    const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
    let currentDegree = 0;
    const segments = Object.entries(cats).sort((a,b) => b[1]-a[1]).map(([name, val], i) => {
      const perc = total > 0 ? (val/total)*100 : 0;
      const start = currentDegree;
      currentDegree += (perc/100)*360;
      return { name, perc, color: colors[i % colors.length], start, end: currentDegree };
    });
    const conicGradient = segments.length > 0 ? segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ') : '#f1f5f9 0deg 360deg';
    return { segments, total, conicGradient };
  }, [investments, exchangeRate]);

  const spendingAnalysis = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'Gasto').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + toUSD(t.amount, t.currency);
    });
    return Object.entries(cats).sort((a,b) => b[1]-a[1]);
  }, [transactions, selectedMonth, exchangeRate]);

  // --- FORMATEADORES Y HELPERS ---
  const fUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fPct = (v: number) => `${v.toFixed(1)}%`;
  
  const [year, month] = selectedMonth.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const displayDate = `${meses[parseInt(month) - 1]} ${year}`;

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700 print:p-0">
      {/* HEADER ELEGANTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:shadow-none print:border-none">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner print:hidden">
            <BarChart2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Informe Financiero Corporativo</h1>
            <div className="flex items-center gap-2 mt-0.5 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
              <Calendar size={12} /> Periodo: {displayDate}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
          <select className="flex-1 md:flex-none bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow">
            <option>Mensual</option>
            <option>Trimestral</option>
            <option>Anual</option>
          </select>
          <button onClick={handleExport} className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all">
            <Download size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Patrimonio Neto */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2"><Briefcase size={12} /> Patrimonio Neto</p>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${riskLevel.bg} ${riskLevel.color}`}>
              {riskLevel.icon} {riskLevel.label}
            </div>
          </div>
          <p className="text-3xl font-black tracking-tighter mt-4 relative z-10">{fUSD(netWorth)}</p>
        </div>

        {/* Flujo de Caja */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity size={12} /> Flujo de Caja</p>
            <div className={`p-1.5 rounded-lg ${cashFlow >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              {cashFlow >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
          </div>
          <p className={`text-3xl font-black tracking-tighter mt-4 ${cashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{fUSD(cashFlow)}</p>
        </div>

        {/* Ingresos / Gastos */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-end mb-3 border-b border-slate-50 pb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={12} className="text-emerald-500"/> Ingresos</span>
            <span className="text-lg font-black text-slate-900">{fUSD(income)}</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><TrendingDown size={12} className="text-rose-500"/> Gastos</span>
            <span className="text-lg font-black text-slate-900">{fUSD(expenses)}</span>
          </div>
        </div>

        {/* Tasa de Ahorro */}
        <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute -bottom-4 -right-4 text-indigo-500/10"><Target size={100} /></div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 relative z-10"><Target size={12} /> Tasa de Ahorro</p>
          <div className="mt-4 flex items-baseline gap-2 relative z-10">
            <p className="text-3xl font-black tracking-tighter text-indigo-600">{fPct(savingsRate)}</p>
            <span className="text-[10px] font-bold text-indigo-400 uppercase">del ingreso</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: TENDENCIA DE PATRIMONIO */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-400" /> Tendencia de Patrimonio (Net Worth Trend)
          </h3>
          <div className="h-56 w-full relative">
            {/* Gráfico SVG puro */}
            <svg className="w-full h-full drop-shadow-xl" viewBox="0 0 400 100" preserveAspectRatio="none">
              {/* Línea principal */}
              <path 
                d="M0,80 Q50,75 100,85 T200,60 T300,40 T400,20" 
                fill="none" stroke="#4f46e5" strokeWidth="4" 
                strokeLinecap="round" strokeLinejoin="round"
                className="animate-[dash_2s_ease-in-out]"
              />
              {/* Relleno con gradiente */}
              <path 
                d="M0,80 Q50,75 100,85 T200,60 T300,40 T400,20 L400,100 L0,100 Z" 
                fill="url(#grad)" opacity="0.15" 
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-30">
              {[0, 1, 2].map(i => <div key={i} className="w-full border-t border-slate-300 border-dashed h-0" />)}
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase">
              <span>Hace 6 meses</span><span>Hoy</span>
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: INGRESOS VS GASTOS BARRAS */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <BarChart2 size={16} className="text-slate-400" /> Balance Operativo
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div><span className="text-[9px] font-bold text-slate-400 uppercase">Ingresos</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div><span className="text-[9px] font-bold text-slate-400 uppercase">Gastos</span></div>
            </div>
          </div>
          
          <div className="relative h-48 flex items-end justify-center gap-12 md:gap-20 pb-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2 opacity-40">
              {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-slate-200 border-dashed h-0" />)}
            </div>
            
            <div className="flex-1 max-w-[100px] flex flex-col items-center justify-end h-full relative group z-10">
              <span className="absolute -top-8 bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none shadow-xl">{fUSD(income)}</span>
              <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-1000 ease-out" style={{height: income === 0 && expenses === 0 ? '5%' : `${Math.max((income / Math.max(income, expenses)) * 100, 5)}%`}} />
            </div>
            
            <div className="flex-1 max-w-[100px] flex flex-col items-center justify-end h-full relative group z-10">
              <span className="absolute -top-8 bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 pointer-events-none shadow-xl">{fUSD(expenses)}</span>
              <div className="w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-2xl shadow-lg shadow-rose-500/20 transition-all duration-1000 ease-out" style={{height: income === 0 && expenses === 0 ? '5%' : `${Math.max((expenses / Math.max(income, expenses)) * 100, 5)}%`}} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO 3: DONUT PORTAFOLIO */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <PieChart size={16} className="text-slate-400" /> Distribución Activos
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            {portfolioData.segments.length > 0 ? (
              <>
                <div className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.05)] hover:scale-105 transition-transform duration-500" style={{ background: `conic-gradient(${portfolioData.conicGradient})` }}>
                  <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total USD</span>
                    <span className="text-lg font-black text-slate-900 tracking-tight">{fUSD(portfolioData.total)}</span>
                  </div>
                </div>
                <div className="mt-8 w-full space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
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

        {/* RANKING DE GASTOS */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Zap size={16} className="text-slate-400" /> Análisis de Gastos (Tendencias)
          </h3>
          <div className="space-y-4 flex-1">
            {spendingAnalysis.length > 0 ? spendingAnalysis.slice(0, 5).map(([cat, val], i) => (
              <div key={i} className="relative bg-slate-50 p-4 rounded-2xl border border-slate-100 overflow-hidden group hover:border-slate-300 transition-colors">
                <div className="absolute left-0 top-0 bottom-0 bg-slate-200/50 transition-all duration-1000" style={{ width: `${(val/expenses)*100}%` }}></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm text-[10px] ${i < 2 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {i < 2 ? <TrendingUp size={12} /> : <Minus size={12} />}
                    </span>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SEGUIMIENTO DE OBJETIVOS Y PLAN DE ACCIÓN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Target size={120} /></div>
            <h3 className="text-xs font-black text-indigo-200 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
              <CheckCircle2 size={16} /> Plan de Acción Sugerido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <ActionCard icon={<TrendingDown size={14}/>} title="Optimizar Gastos" desc={expenses > income ? "Tus gastos superan los ingresos. Recorte crítico requerido." : "Revisar suscripciones y categorías top."} />
              <ActionCard icon={<ArrowRight size={14}/>} title="Liquidez" desc={`Considerar reinvertir ${fUSD(cashFlow * 0.4)} del flujo positivo actual.`} />
              <ActionCard icon={<Shield size={14}/>} title="Protección" desc={savingsRate < 10 ? "Alerta: Ahorro inferior al 10%. Riesgo de descapitalización." : "Mantienes un margen de seguridad sano."} />
              <ActionCard icon={<PieChart size={14}/>} title="Portafolio" desc="Mantener seguimiento a la diversificación de activos." />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target size={16} className="text-slate-400" /> Tracking de Objetivos
            </h3>
            <div className="space-y-6">
              {financialPlans.length > 0 ? financialPlans.map((p, i) => {
                const percent = Math.min((p.initialAmount / (p.goalAmount || 1)) * 100, 100);
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[11px] font-black uppercase text-slate-700">{p.name}</p>
                        <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">{fUSD(p.initialAmount)} de {fUSD(p.goalAmount || 0)}</p>
                      </div>
                      <span className="text-[11px] font-black text-indigo-600">{fPct(percent)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-6">No hay planes financieros configurados en el módulo de Planificación.</p>
              )}
            </div>
          </div>
        </div>

        {/* OUTLOOK */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Proyección 6 Meses</h3>
          <div className="space-y-4">
            <OutlookItem label="Escenario Base (Flujo Actual)" value={fUSD(netWorth + (cashFlow * 6))} color="slate" />
            <OutlookItem label="Optimista (+20% Ingresos)" value={fUSD(netWorth + ((income * 1.2 - expenses) * 6))} color="emerald" />
            <OutlookItem label="Pesimista (+20% Gastos)" value={fUSD(netWorth + ((income - expenses * 1.2) * 6))} color="rose" />
          </div>
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 leading-relaxed text-center">
              Las proyecciones asumen un comportamiento constante basado en el mes actual ({displayDate}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 bg-white/10 rounded-lg text-indigo-100">{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-widest text-white">{title}</span>
    </div>
    <p className="text-[11px] text-indigo-100/90 leading-relaxed font-medium">{desc}</p>
  </div>
);

const OutlookItem = ({ label, value, color }: { label: string, value: string, color: 'emerald' | 'rose' | 'slate' }) => (
  <div className={`p-5 rounded-2xl border flex flex-col justify-center ${color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : color === 'rose' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
    <p className={`text-sm font-black tracking-tight ${color === 'emerald' ? 'text-emerald-700' : color === 'rose' ? 'text-rose-700' : 'text-slate-700'}`}>{value}</p>
  </div>
);
