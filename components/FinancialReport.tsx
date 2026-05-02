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
  ArrowRight
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
  // --- INYECCIÓN DE ESTILOS PARA IMPRESIÓN PERFECTA ---
  const printStyles = `
    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background-color: #f8fafc !important;
      }
      @page { margin: 10mm; size: A4 portrait; }
      .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
    }
  `;

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

  // CÁLCULO DEL MES ANTERIOR PARA COMPARATIVA
  const prevMonthStr = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1 - 1, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const { prevIncome, prevExpenses } = useMemo(() => {
    let pInc = 0; let pExp = 0;
    transactions.filter(t => t.date.startsWith(prevMonthStr)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') pInc += val;
      if (t.type === 'Gasto') pExp += val;
    });
    return { prevIncome: pInc, prevExpenses: pExp };
  }, [transactions, prevMonthStr, exchangeRate]);

  const { income, expenses, cashFlow, savingsRate } = useMemo(() => {
    let inc = 0; let exp = 0;
    transactions.filter(t => t.date.startsWith(selectedMonth)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });
    return { income: inc, expenses: exp, cashFlow: inc - exp, savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0 };
  }, [transactions, selectedMonth, exchangeRate]);

  // PORCENTAJES DE VARIACIÓN
  const incomeChange = prevIncome === 0 ? 0 : ((income - prevIncome) / prevIncome) * 100;
  const expensesChange = prevExpenses === 0 ? 0 : ((expenses - prevExpenses) / prevExpenses) * 100;
  const maxChartValue = Math.max(income, expenses, prevIncome, prevExpenses) || 1;

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
      const valUSD = toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
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
    return { segments, total, conicGradient: segments.length > 0 ? segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ') : '#f1f5f9 0deg 360deg' };
  }, [investments, exchangeRate]);

  const spendingAnalysis = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'Gasto').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + toUSD(t.amount, t.currency);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [transactions, selectedMonth, exchangeRate]);

  // --- FORMATEADORES ---
  const fUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fPct = (v: number) => `${v.toFixed(1)}%`;
  
  const [year, month] = selectedMonth.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const displayDate = `${meses[parseInt(month) - 1]} ${year}`;
  
  const [pYear, pMonth] = prevMonthStr.split('-');
  const prevDisplayDate = `${meses[parseInt(pMonth) - 1]} ${pYear}`;

  return (
    <>
      <style>{printStyles}</style>
      <div className="space-y-8 pb-10 animate-in fade-in duration-700 print:space-y-6 print:pb-0">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:shadow-none print:border-b-2 print:border-slate-800 print:rounded-none print:px-0 print:pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 print:bg-slate-900 print:shadow-none">
              <BarChart2 size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Resumen Financiero</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-slate-500 font-black uppercase text-[11px] tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                  Reporte Confidencial
                </span>
                <span className="text-indigo-600 font-bold uppercase text-[11px] tracking-widest flex items-center gap-1">
                  <Calendar size={12} /> {displayDate}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
            <button 
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-xl hover:shadow-slate-300 hover:-translate-y-0.5 transition-all"
            >
              <Download size={16} />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* KPI CARDS (AHORA CLARAS EN PDF) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 print:grid-cols-4 print:gap-4 print-break-avoid">
          {/* Patrimonio Neto */}
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden group print:shadow-none print:border-2 print:border-slate-800 print:rounded-2xl">
            <div className="flex justify-between items-start relative z-10">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2 print:text-slate-400">
                <Briefcase size={12} /> Patrimonio Neto
              </p>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${riskLevel.bg} ${riskLevel.color}`}>
                {riskLevel.icon} {riskLevel.label}
              </div>
            </div>
            <p className="text-3xl font-black tracking-tighter mt-4 relative z-10">{fUSD(netWorth)}</p>
          </div>

          {/* Flujo de Caja */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:shadow-none print:border-2 print:border-slate-200 print:rounded-2xl">
            <div className="flex justify-between items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} /> Flujo de Caja
              </p>
            </div>
            <p className={`text-3xl font-black tracking-tighter mt-4 ${cashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {fUSD(cashFlow)}
            </p>
          </div>

          {/* Ingresos Combinados con BADGE DE COMPARATIVA */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center print:shadow-none print:border-2 print:border-slate-200 print:rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={12} className="text-emerald-500"/> Ingresos
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-slate-900">{fUSD(income)}</span>
              {/* BADGE DESTACADO */}
              <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${incomeChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}% vs ant.
              </div>
            </div>
          </div>

          {/* Gastos Combinados con BADGE DE COMPARATIVA */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center print:shadow-none print:border-2 print:border-slate-200 print:rounded-2xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingDown size={12} className="text-rose-500"/> Gastos
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-slate-900">{fUSD(expenses)}</span>
              {/* BADGE DESTACADO */}
              <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${expensesChange <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {expensesChange > 0 ? '+' : ''}{expensesChange.toFixed(1)}% vs ant.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:flex print:flex-row print:w-full print:gap-4 print-break-avoid">
          
          {/* NUEVO GRÁFICO COMPARATIVO: BARRAS LADO A LADO */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm print:w-2/3 print:shadow-none print:border-2 print:border-slate-200 print:rounded-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Balance Operativo Comparativo</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{prevDisplayDate} vs {displayDate}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400"></div><span className="text-[10px] font-black text-slate-500 uppercase">Ingresos</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-400"></div><span className="text-[10px] font-black text-slate-500 uppercase">Gastos</span></div>
              </div>
            </div>
            
            <div className="relative h-56 flex items-end justify-around pb-6 border-b border-slate-100 print:border-slate-300 print:h-48">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-30">
                {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-slate-400 border-dashed h-0" />)}
              </div>

              {/* GRUPO INGRESOS */}
              <div className="flex items-end gap-2 h-full z-10 w-full max-w-[150px] relative">
                {/* Ingreso Anterior */}
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[9px] font-black text-slate-400 mb-2">{fUSD(prevIncome)}</span>
                  <div className="w-full bg-emerald-200 rounded-t-xl transition-all duration-1000" style={{height: `${Math.max((prevIncome / maxChartValue) * 100, 5)}%`}} />
                  <span className="absolute -bottom-6 text-[9px] font-bold text-slate-400 uppercase">Mes Ant.</span>
                </div>
                {/* Ingreso Actual */}
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-black text-slate-900 mb-2">{fUSD(income)}</span>
                  <div className="w-full bg-emerald-500 rounded-t-xl shadow-lg shadow-emerald-500/30 print:shadow-none transition-all duration-1000" style={{height: `${Math.max((income / maxChartValue) * 100, 5)}%`}} />
                  <span className="absolute -bottom-6 text-[10px] font-black text-slate-900 uppercase">Actual</span>
                </div>
              </div>
              
              {/* GRUPO GASTOS */}
              <div className="flex items-end gap-2 h-full z-10 w-full max-w-[150px] relative">
                {/* Gasto Anterior */}
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[9px] font-black text-slate-400 mb-2">{fUSD(prevExpenses)}</span>
                  <div className="w-full bg-rose-200 rounded-t-xl transition-all duration-1000" style={{height: `${Math.max((prevExpenses / maxChartValue) * 100, 5)}%`}} />
                  <span className="absolute -bottom-6 text-[9px] font-bold text-slate-400 uppercase">Mes Ant.</span>
                </div>
                {/* Gasto Actual */}
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-black text-slate-900 mb-2">{fUSD(expenses)}</span>
                  <div className="w-full bg-rose-500 rounded-t-xl shadow-lg shadow-rose-500/30 print:shadow-none transition-all duration-1000" style={{height: `${Math.max((expenses / maxChartValue) * 100, 5)}%`}} />
                  <span className="absolute -bottom-6 text-[10px] font-black text-slate-900 uppercase">Actual</span>
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO TIPO DONUT: PORTAFOLIO */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col print:w-1/3 print:shadow-none print:border-2 print:border-slate-200 print:rounded-2xl">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <PieChart size={16} className="text-slate-400" /> Activos
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center">
              {portfolioData.segments.length > 0 ? (
                <>
                  <div className="relative w-40 h-40 rounded-full flex items-center justify-center shadow-lg print:shadow-none print:border-2 print:border-slate-100" style={{ background: `conic-gradient(${portfolioData.conicGradient})` }}>
                    <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-inner print:shadow-none print:border print:border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                      <span className="text-sm font-black text-slate-900">{fUSD(portfolioData.total)}</span>
                    </div>
                  </div>
                  <div className="mt-6 w-full space-y-2">
                    {portfolioData.segments.slice(0,4).map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shadow-sm print:shadow-none" style={{backgroundColor: s.color}} />
                          <span className="text-[10px] font-bold text-slate-600 uppercase">{s.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-900">{fPct(s.perc)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Briefcase size={36} className="text-slate-300 mb-3" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Sin portafolio</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:flex print:flex-row print:w-full print:gap-4 print-break-avoid">
          {/* RANKING DE GASTOS */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col print:w-1/2 print:shadow-none print:border-2 print:border-slate-200 print:rounded-2xl">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <BarChart2 size={16} className="text-slate-400" /> Gastos Mayores
            </h3>
            <div className="space-y-4 flex-1">
              {spendingAnalysis.length > 0 ? spendingAnalysis.slice(0, 5).map(([cat, val], i) => (
                <div key={i} className="relative bg-slate-50 p-4 rounded-2xl border border-slate-100 overflow-hidden print:bg-white print:border-slate-200">
                  <div className="absolute left-0 top-0 bottom-0 bg-slate-200/60 print:bg-slate-100" style={{ width: `${(val/expenses)*100}%` }}></div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-400 font-black text-[10px] print:shadow-none print:border print:border-slate-200">
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
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sin gastos</p>
                </div>
              )}
            </div>
          </div>

          {/* INSIGHTS Y PROYECCIONES */}
          <div className="space-y-6 print:w-1/2 print:space-y-4">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden print:bg-slate-50 print:border-2 print:border-slate-200 print:text-slate-900 print:shadow-none print:rounded-2xl">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none print:hidden"><Zap size={100} /></div>
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2 print:text-slate-900">
                <Sparkles size={16} className="print:text-slate-500"/> Observaciones
              </h3>
              <div className="space-y-3 relative z-10">
                <InsightItem 
                  title="Liquidez y Ahorro" 
                  desc={savingsRate >= 20 ? "Disciplina óptima. Por encima de la regla del 20%." : savingsRate > 0 ? "Ahorro bajo. Ajustar presupuesto discrecional." : "Pérdida operativa. Recorte crítico requerido."} 
                  status={savingsRate >= 20 ? 'success' : savingsRate > 0 ? 'warning' : 'danger'}
                />
                <InsightItem 
                  title="Apalancamiento" 
                  desc={totalLiabilities === 0 ? "Operas sin deuda registrada, bajo riesgo." : `Relación deuda/patrimonio del ${fPct((totalLiabilities/totalAssets)*100)}.`} 
                  status={totalLiabilities === 0 ? 'success' : 'neutral'}
                />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm print:shadow-none print:border-2 print:border-slate-200 print:rounded-2xl">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Proyección a 6 Meses</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <OutlookCard label="Base" value={fUSD(netWorth + (cashFlow * 6))} color="slate" />
                <OutlookCard label="Optimista" value={fUSD(netWorth + (cashFlow * 1.2 * 6))} color="emerald" />
                <OutlookCard label="Pesimista" value={fUSD(netWorth + (cashFlow * 0.8 * 6))} color="rose" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const InsightItem = ({ title, desc, status }: { title: string, desc: string, status: 'success' | 'warning' | 'danger' | 'neutral' }) => {
  const colors = { success: 'bg-emerald-500', warning: 'bg-amber-400', danger: 'bg-rose-500', neutral: 'bg-indigo-400' };
  return (
    <div className="p-4 bg-white/10 rounded-2xl border border-white/5 print:bg-white print:border-slate-200 print:shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] print:shadow-none ${colors[status]}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 print:text-slate-500">{title}</span>
      </div>
      <p className="text-[11px] text-slate-400 font-medium leading-relaxed print:text-slate-800">{desc}</p>
    </div>
  );
};

const OutlookCard = ({ label, value, color }: { label: string, value: string, color: 'emerald' | 'rose' | 'slate' }) => (
  <div className={`p-4 rounded-2xl border flex flex-col justify-center print:border-slate-200 ${color === 'emerald' ? 'bg-emerald-50 border-emerald-100 print:bg-emerald-50/50' : color === 'rose' ? 'bg-rose-50 border-rose-100 print:bg-rose-50/50' : 'bg-slate-50 border-slate-200 print:bg-slate-50'}`}>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 print:text-slate-500">{label}</p>
    <p className={`text-sm font-black tracking-tight ${color === 'emerald' ? 'text-emerald-700' : color === 'rose' ? 'text-rose-700' : 'text-slate-700'}`}>{value}</p>
  </div>
);
