import React, { useMemo } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Briefcase,
  PieChart,
  BarChart2,
  Zap,
  Minus,
  Building2,
  Target
} from 'lucide-react';
import { BankAccount, Transaction, Investment } from '../types';

interface FinancialReportProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  investments: Investment[];
  exchangeRate: number;
  selectedMonth: string;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  accounts = [],
  transactions = [],
  investments = [],
  exchangeRate = 1,
  selectedMonth
}) => {
  // --- ESTILOS DE IMPRESIÓN REPARADOS Y SIN MÁRGENES MUERTOS ---
  const printStyles = `
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body * { visibility: hidden; }
      #report-core-container, #report-core-container * { 
        visibility: visible; 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
      #report-core-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 10mm !important;
        background-color: white !important;
        box-shadow: none !important;
        border: none !important;
      }
      .no-print { display: none !important; }
      .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
    }
  `;

  const toUSD = (amount: number, currency: string) => currency === 'VES' ? amount / exchangeRate : amount;

  // 1. Patrimonio Neto Actual
  const { netWorth } = useMemo(() => {
    let assets = 0, liabilities = 0;
    accounts.forEach(acc => {
      const val = toUSD(acc.balance, acc.currency);
      if (acc.type === 'Tarjeta de Crédito' && val < 0) liabilities += Math.abs(val);
      else assets += val;
    });
    investments.forEach(inv => {
      assets += toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
    });
    return { netWorth: assets - liabilities };
  }, [accounts, investments, exchangeRate]);

  // 2. Fondo de Emergencia (Lectura de cuenta dinámica)
  const emergencyFund = useMemo(() => {
    const fundAcc = accounts.find(a => a.name.toLowerCase().includes('emergencia'));
    return { current: fundAcc ? toUSD(fundAcc.balance, fundAcc.currency) : 0 };
  }, [accounts, exchangeRate]);

  // 3. Flujos del Mes y Flujo de Caja
  const { income, expenses, savingsRate, cashFlow } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.filter(t => t?.date?.startsWith(selectedMonth)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });
    return { income: inc, expenses: exp, savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0, cashFlow: inc - exp };
  }, [transactions, selectedMonth, exchangeRate]);

  // 4. Gráficos Históricos Operativos (6 Meses)
  const history6Months = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let inc = 0, exp = 0;
      transactions.filter(t => t?.date?.startsWith(targetMonth)).forEach(t => {
        const val = toUSD(t.amount, t.currency);
        if (t.type === 'Ingreso') inc += val;
        if (t.type === 'Gasto') exp += val;
      });
      monthsData.push({ label: d.toLocaleString('es-ES', { month: 'short' }).toUpperCase(), income: inc, expenses: exp });
    }
    return monthsData;
  }, [selectedMonth, transactions, exchangeRate]);

  // 5. Inversiones (ROI Real)
  const assetBreakdown = useMemo(() => {
    return investments.map(inv => {
      const cost = toUSD(inv.initialInvestment || (inv.quantity * inv.buyPrice) || 0, inv.currency);
      const current = toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
      return { name: inv.ticker || inv.name || 'Activo', cost, current, roi: cost > 0 ? ((current - cost) / cost) * 100 : 0 };
    }).sort((a, b) => b.current - a.current);
  }, [investments, exchangeRate]);
  const totalInvested = assetBreakdown.reduce((acc, inv) => acc + inv.cost, 0);

  // 6. Portafolio Donut
  const portfolioData = useMemo(() => {
    const cats: Record<string, number> = {};
    let total = 0;
    investments.forEach(inv => {
      const valUSD = toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
      cats[inv.category || 'Otros'] = (cats[inv.category || 'Otros'] || 0) + valUSD;
      total += valUSD;
    });
    const colors = ['#0f172a', '#3b82f6', '#93c5fd', '#10b981', '#f59e0b'];
    let currentDegree = 0;
    const segments = Object.entries(cats).sort((a,b) => b[1]-a[1]).map(([name, val], i) => {
      const perc = total > 0 ? (val/total)*100 : 0;
      const start = currentDegree;
      currentDegree += (perc/100)*360;
      return { name, perc, color: colors[i % colors.length], start, end: currentDegree };
    });
    return { segments, total, conicGradient: segments.length > 0 ? segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ') : '#e2e8f0 0deg 360deg' };
  }, [investments, exchangeRate]);

  // 7. Análisis de Gastos Mayores (Top 5)
  const spendingTable = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t?.date?.startsWith(selectedMonth) && t.type === 'Gasto').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + toUSD(t.amount, t.currency);
    });
    return Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [transactions, selectedMonth, exchangeRate]);

  const fUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
  const fPct = (v: number) => isNaN(v) ? '0.0%' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

  const displayDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[parseInt(month) - 1]} ${year}`;
  }, [selectedMonth]);

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 200);
  };

  return (
    <>
      <style>{printStyles}</style>
      <div className="bg-slate-100 min-h-screen py-8 flex justify-center w-full no-print">
        
        <div id="report-core-container" className="relative w-full max-w-[210mm] bg-white shadow-2xl overflow-hidden font-sans text-slate-800 border border-slate-200">
          
          {/* HEADER CORPORATIVO SÓLIDO AZUL OSCURO */}
          <div className="bg-slate-900 text-white px-10 py-8 flex justify-between items-center relative z-10 border-b border-slate-800" style={{ backgroundColor: '#0f172a' }}>
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border border-blue-700 no-print" style={{ backgroundColor: '#2563eb' }}>
                <Building2 size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase text-white">Balance Financiero Mensual</h1>
                <p className="text-blue-400 font-bold text-xs mt-1 uppercase tracking-widest">Periodo: {displayDate}</p>
              </div>
            </div>
            <button onClick={handlePrint} className="no-print bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center gap-2" style={{ backgroundColor: '#2563eb' }}>
              <Download size={16} /> EXPORTAR
            </button>
          </div>

          <div className="p-10 space-y-12 bg-white relative z-10">
            
            {/* SECCIÓN 1: KPIs */}
            <div className="grid grid-cols-4 gap-6 print-break-avoid border-b border-slate-100 pb-10">
              <KPICol title="Patrimonio Neto" value={fUSD(netWorth)} desc="Total activos" color="#1e3a8a" icon={<Briefcase size={20}/>} />
              <KPICol title="Ingresos" value={fUSD(income)} desc="Entradas operativas" color="#059669" icon={<TrendingUp size={20}/>} />
              <KPICol title="Gastos" value={fUSD(expenses)} desc="Salidas operativas" color="#e11d48" icon={<TrendingDown size={20}/>} />
              <KPICol title="Flujo de Caja" value={fUSD(cashFlow)} desc="Saldo del periodo" color={cashFlow >= 0 ? "#0d9488" : "#e11d48"} icon={<Activity size={20}/>} highlight={cashFlow > 0} />
            </div>

            {/* SECCIÓN 2: COMPARACIÓN DE FLUJO DE CAJA (BARRAS BLINDADAS) */}
            <div className="print-break-avoid border border-slate-100 p-8 rounded-3xl" style={{ backgroundColor: '#f8fafc' }}>
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-14 text-center">Comparación de Flujo de Caja (6 Meses)</h2>
              <div className="flex items-end justify-center gap-4 md:gap-8 h-48 w-full relative px-2">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-10">
                  {[0,1,2,3].map(i => <div key={i} className="w-full border-t border-slate-900 border-dashed h-0" />)}
                </div>
                {history6Months.map((m, i) => {
                  const max = Math.max(...history6Months.map(x => Math.max(x.income, x.expenses))) || 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative z-10">
                      <div className="flex items-end gap-1.5 w-full justify-center h-full pb-8">
                        {/* Ingresos (Azul Oscuro) */}
                        <div className="flex flex-col items-center justify-end h-full w-full max-w-[24px]">
                          <span className="text-[7px] font-black text-slate-900 mb-1">{m.income > 0 ? fUSD(m.income) : ''}</span>
                          <div style={{ height: `${Math.max((m.income/max)*100, 1)}%`, backgroundColor: '#0f172a', width: '100%', borderRadius: '4px 4px 0 0' }} />
                        </div>
                        {/* Gastos (Rojo) */}
                        <div className="flex flex-col items-center justify-end h-full w-full max-w-[24px]">
                          <span className="text-[7px] font-black text-rose-600 mb-1">{m.expenses > 0 ? fUSD(m.expenses) : ''}</span>
                          <div style={{ height: `${Math.max((m.expenses/max)*100, 1)}%`, backgroundColor: '#e11d48', width: '100%', borderRadius: '4px 4px 0 0' }} />
                        </div>
                      </div>
                      <span className="absolute bottom-0 text-[8px] md:text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">{m.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2"><div className="w-3 h-3" style={{ backgroundColor: '#0f172a' }}></div><span className="text-[9px] font-bold text-slate-600 uppercase">Ingresos</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3" style={{ backgroundColor: '#e11d48' }}></div><span className="text-[9px] font-bold text-slate-600 uppercase">Gastos</span></div>
              </div>
            </div>

            {/* SECCIÓN 3: INVERSIONES Y PORTAFOLIO */}
            <div className="grid grid-cols-5 gap-10 print-break-avoid border-t border-slate-200 pt-10">
              <div className="col-span-3 space-y-6">
                <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16} className="text-blue-600"/> Rendimiento de Activos (ROI Real)</h2>
                <div className="h-56 border border-slate-100 bg-slate-50 p-6 flex items-end justify-around gap-4 relative shadow-sm rounded-xl" style={{ backgroundColor: '#f8fafc' }}>
                  {assetBreakdown.slice(0, 5).map((inv, i) => {
                    const max = Math.max(...assetBreakdown.map(x => Math.max(x.cost, x.current))) || 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 w-full group">
                        <div className="flex items-end gap-1 w-full justify-center flex-1 transition-all">
                          <div className="w-4 rounded-t-sm" title="Inversión" style={{ height: `${Math.max((inv.cost/max)*100, 2)}%`, backgroundColor: '#cbd5e1' }} />
                          <div className="w-4 rounded-t-sm" title="Valor" style={{ height: `${Math.max((inv.current/max)*100, 2)}%`, backgroundColor: '#1d4ed8' }} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-2 truncate w-full text-center group-hover:text-slate-800">{inv.name}</span>
                      </div>
                    );
                  })}
                </div>
                <table className="w-full text-[10px] border-collapse border border-slate-100">
                  <thead>
                    <tr className="text-white uppercase tracking-widest border-b border-slate-800" style={{ backgroundColor: '#0f172a' }}>
                      <th className="p-2 text-left rounded-tl-lg">Posición</th>
                      <th className="p-2 text-right">Inversión</th>
                      <th className="p-2 text-right">Valor Actual</th>
                      <th className="p-2 text-center rounded-tr-lg">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetBreakdown.length > 0 ? assetBreakdown.map((inv, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="p-2 font-black text-slate-700 uppercase">{inv.name}</td>
                        <td className="p-2 text-right text-slate-500 font-medium">{fUSD(inv.cost)}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{fUSD(inv.current)}</td>
                        <td className={`p-2 text-center font-black ${inv.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fPct(inv.roi)}</td>
                      </tr>
                    )) : <tr><td colSpan={4} className="p-4 text-center">Sin inversiones</td></tr>}
                    <tr className="font-black border-t-2 border-blue-200" style={{ backgroundColor: '#eff6ff' }}>
                      <td className="p-2 uppercase text-blue-900">Total Portafolio</td>
                      <td className="p-2 text-right text-blue-900">{fUSD(totalInvested)}</td>
                      <td className="p-2 text-right text-blue-900">{fUSD(portfolioData.total)}</td>
                      <td className="p-2 text-center text-blue-900">{totalInvested > 0 ? fPct(((portfolioData.total - totalInvested)/totalInvested)*100) : '0.0%'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="col-span-2 space-y-6">
                <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2"><PieChart size={16} className="text-blue-600"/> Distribución de Capital</h2>
                <div className="aspect-square border border-slate-100 rounded-full flex items-center justify-center relative shadow-inner" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="w-48 h-48 rounded-full" style={{ background: `conic-gradient(${portfolioData.conicGradient})` }} />
                  <div className="absolute w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-xl border border-slate-50">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">AUM Total</span>
                    <span className="text-sm font-black text-slate-900">{fUSD(portfolioData.total)}</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {portfolioData.segments.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: s.color}} />
                        <span className="text-slate-500 uppercase truncate max-w-[100px]">{s.name}</span>
                      </div>
                      <span>{s.perc.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: GASTOS MAYORES Y PROYECCIONES (TOTALMENTE RESTAURADO) */}
            <div className="grid grid-cols-2 gap-10 print-break-avoid pt-10 border-t border-slate-200">
              <div>
                <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart2 size={16} className="text-blue-600"/> Gastos Mayores (Top 5)</h2>
                <div className="space-y-3">
                  {spendingTable.length > 0 ? spendingTable.map(([cat, val], i) => (
                    <div key={i} className="relative bg-white p-3.5 rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="absolute left-0 top-0 bottom-0 rounded-l-lg" style={{ width: `${(val/expenses)*100}%`, backgroundColor: 'rgba(255, 228, 230, 0.4)' }}></div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-5 h-5 rounded-md bg-white shadow-sm text-[9px] font-black ${i < 2 ? 'text-rose-500' : 'text-slate-400'}`}>
                            {i < 2 ? <TrendingDown size={10} /> : <Minus size={10} />}
                          </span>
                          <span className="text-[10px] font-black text-slate-700 uppercase">{cat}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900">{fUSD(val)}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{fPct((val/expenses)*100)} del total</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                     <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Sin salidas registradas</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-2 flex items-center gap-2"><Zap size={16} className="text-blue-600"/> Proyección a 6 Meses</h2>
                <div className="border border-slate-100 p-6 rounded-2xl space-y-3" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Escenario Base</span>
                    <span className="text-xs font-black text-slate-900">{fUSD(netWorth + (cashFlow * 6))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 border rounded-xl" style={{ backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }}>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1.5"><TrendingUp size={10}/> Optimista (+20% Ing)</span>
                    <span className="text-xs font-black text-emerald-700">{fUSD(netWorth + ((income * 1.2 - expenses) * 6))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 border rounded-xl" style={{ backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }}>
                    <span className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1.5"><TrendingDown size={10}/> Pesimista (+20% Gas)</span>
                    <span className="text-xs font-black text-rose-700">{fUSD(netWorth + ((income - expenses * 1.2) * 6))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: FONDO DE EMERGENCIA Y AUDITORÍA */}
            <div className="pt-10 border-t border-slate-200 print-break-avoid">
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Shield size={16} className="text-blue-600"/> Reserva y Salud Financiera</h2>
              
              <div className="grid grid-cols-3 gap-8">
                <div className="text-white p-6 rounded-2xl shadow-lg flex flex-col justify-center relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                  <Shield size={80} className="absolute -right-4 -bottom-4 opacity-10" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Fondo de Emergencia</span>
                  <span className="text-4xl font-black text-white">{fUSD(emergencyFund.current)}</span>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-6">
                  <div className="flex gap-4 items-start p-5 bg-white border border-slate-100 shadow-sm relative overflow-hidden h-full rounded-xl">
                    <div className="absolute top-0 right-0 p-2 opacity-5"><Target size={40}/></div>
                    <div className="p-2.5 rounded-xl shrink-0 text-blue-600" style={{ backgroundColor: '#eff6ff' }}><Shield size={20}/></div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-slate-900 mb-1 tracking-widest">Status Liquidez: <span className="text-blue-600">{fUSD(emergencyFund.current)}</span></h4>
                      <p className="text-[9px] text-slate-500 font-bold leading-relaxed">{emergencyFund.current > (expenses * 3) ? "Excelente cobertura (3+ meses)." : "Aumentar reserva."}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start p-5 bg-white border border-slate-100 shadow-sm relative overflow-hidden h-full rounded-xl">
                    <div className="absolute top-0 right-0 p-2 opacity-5"><Target size={40}/></div>
                    <div className="p-2.5 rounded-xl shrink-0 text-blue-600" style={{ backgroundColor: '#eff6ff' }}><Activity size={20}/></div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase text-slate-900 mb-1 tracking-widest">Eficiencia Ahorro: <span className="text-blue-600">{fPct(savingsRate).replace('+', '')}</span></h4>
                      <p className="text-[9px] text-slate-500 font-bold leading-relaxed">{savingsRate > 20 ? "Óptimo margen de capitalización." : "Revisar gastos operativos."}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="text-white/50 text-center py-4 text-[7px] uppercase tracking-[0.4em] font-black italic border-t border-slate-800" style={{ backgroundColor: '#0f172a' }}>
            Documento Confidencial • Generado Automáticamente por Finanza360
          </div>
        </div>
      </div>
    </>
  );
};

const KPICol = ({ title, value, desc, color, icon, highlight = false }: any) => (
  <div className="text-center p-2 border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all rounded-2xl">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg`} style={{ backgroundColor: color }}>
      {icon}
    </div>
    <p className={`text-2xl font-black ${highlight ? 'text-teal-600' : 'text-slate-900'}`}>{value}</p>
    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{title}</h3>
    <p className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase leading-tight">{desc}</p>
  </div>
);
