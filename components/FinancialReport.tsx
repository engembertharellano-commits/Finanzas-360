import React, { useMemo } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Shield,
  Briefcase,
  PieChart,
  BarChart2,
  Building2,
  Target,
  Zap,
  Minus
} from 'lucide-react';
import { BankAccount, Transaction, Investment } from '../types';

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
  selectedMonth
}) => {
  // --- INYECCIÓN DE ESTILOS PARA IMPRESIÓN A4 CORPORATIVA (MULTIPÁGINA Y A COLOR) ---
  const premiumStyles = `
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background-color: white !important;
      }
      .no-print { display: none !important; }
      .print-container { width: 210mm !important; margin: 0 auto !important; padding: 10mm !important; box-shadow: none !important; border: none !important; }
      .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
    }
    .report-bg-pattern {
      background-color: #f8fafc;
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .watermark-bg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 12rem;
      font-weight: 900;
      color: rgba(30, 58, 138, 0.1); // Opacidad aumentada del 2% al 10% para mayor visibilidad
      pointer-events: none;
      white-space: nowrap;
      z-index: 0;
      text-transform: uppercase;
    }
  `;

  const toUSD = (amount: number, currency: string) => currency === 'VES' ? amount / exchangeRate : amount;

  // 1. Patrimonio Neto Actual (HOY)
  const { netWorth, totalAssets, totalLiabilities } = useMemo(() => {
    let assets = 0, liabilities = 0;
    accounts.forEach(acc => {
      const val = toUSD(acc.balance, acc.currency);
      if (acc.type === 'Tarjeta de Crédito' && val < 0) liabilities += Math.abs(val);
      else assets += val;
    });
    investments.forEach(inv => {
      assets += toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
    });
    return { netWorth: assets - liabilities, totalAssets: assets, totalLiabilities: liabilities };
  }, [accounts, investments, exchangeRate]);

  // 2. FONDO DE EMERGENCIA (Lógica de Pote Dedicado)
  const emergencyFund = useMemo(() => {
    // Buscamos la cuenta que el usuario creó llamada "Fondo de Emergencia"
    const fundAcc = accounts.find(a => a.name.toLowerCase().includes('emergencia'));
    if (!fundAcc) return { current: 0, change: 0 };

    const currentBalance = toUSD(fundAcc.balance, fundAcc.currency);
    let currentMonthNetChange = 0;
    
    // Calcular balance del mes anterior sumando/restando transacciones de este mes en esa cuenta
    transactions.filter(t => t?.date?.startsWith(selectedMonth) && (t.accountId === fundAcc.id || t.toAccountId === fundAcc.id)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso' || t.toAccountId === fundAcc.id) currentMonthNetChange += val;
      if (t.type === 'Gasto' || (t.type === 'Transferencia' && t.accountId === fundAcc.id)) currentMonthNetChange -= val;
    });

    return { current: currentBalance, change: currentMonthNetChange };
  }, [accounts, transactions, selectedMonth, exchangeRate]);

  // 3. Flujos del Mes
  const { income, expenses, cashFlow, savingsRate } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.filter(t => t?.date?.startsWith(selectedMonth)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });
    return { income: inc, expenses: exp, cashFlow: inc - exp, savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0 };
  }, [transactions, selectedMonth, exchangeRate]);

  // 4. Gráficos Históricos Operativos (6 Meses)
  const history6Months = useMemo(() => {
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
      monthsData.push({ label: d.toLocaleString('es-ES', { month: 'short' }), income: inc, expenses: exp });
    }
    return monthsData;
  }, [selectedMonth, transactions, exchangeRate]);

  // 5. Inversiones (ROI Real) - Manteniendo la lógica real y proporcionada
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
    const colors = ['#1e3a8a', '#3b82f6', '#93c5fd', '#10b981', '#f59e0b'];
    let currentDegree = 0;
    const segments = Object.entries(cats).sort((a,b) => b[1]-a[1]).map(([name, val], i) => {
      const perc = total > 0 ? (val/total)*100 : 0;
      const start = currentDegree;
      currentDegree += (perc/100)*360;
      return { name, perc, color: colors[i % colors.length], start, end: currentDegree };
    });
    return { segments, total, conicGradient: segments.length > 0 ? segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', ') : '#e2e8f0 0deg 360deg' };
  }, [investments, exchangeRate]);

  // 7. RESTAURADO: Análisis de Gastos Mayores (Top 5)
  const spendingTable = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t?.date?.startsWith(selectedMonth) && t.type === 'Gasto').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + toUSD(t.amount, t.currency);
    });
    return Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0, 5); // Top 5
  }, [transactions, selectedMonth, exchangeRate]);

  // --- FORMATEADORES ---
  const fUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  
  const [year, month] = selectedMonth.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const displayDate = `${meses[parseInt(month) - 1]} ${year}`;

  return (
    <>
      <style>{premiumStyles}</style>
      <div className="report-bg-pattern min-h-screen py-8 no-print">
        
        <div className="print-container relative max-w-[210mm] mx-auto bg-white shadow-2xl overflow-hidden font-sans text-slate-800 border-t-8 border-blue-900">
          
          {/* MARCA DE AGUA */}
          <div className="watermark-bg">FINANZA360</div>

          {/* HEADER CORPORATIVO SÓLIDO AZUL OSCURO */}
          <div className="bg-slate-900 text-white px-10 py-8 flex justify-between items-center relative z-10 print-break-avoid border-b border-slate-800">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-700">
                <Building2 size={28} strokeWidth={2.5} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">Executive Report</h1>
                <p className="text-blue-400 font-bold text-[10px] tracking-[0.3em] uppercase mt-1">Periodo: {displayDate}</p>
              </div>
            </div>
            <button onClick={() => window.print()} className="no-print bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg flex items-center gap-2">
              <Download size={16} /> Exportar Reporte
            </button>
          </div>

          <div className="p-10 space-y-10 relative z-10">
            
            {/* SECCIÓN 1: KPIs */}
            <div className="grid grid-cols-4 gap-4 print-break-avoid border-b border-slate-200 pb-10">
              <KPICard title="Patrimonio Neto" value={fUSD(netWorth)} color="border-slate-900" icon={<Briefcase size={18}/>} />
              <KPICard title="Ingresos" value={fUSD(income)} color="border-emerald-500" icon={<TrendingUp size={18}/>} />
              <KPICard title="Gastos" value={fUSD(expenses)} color="border-rose-500" icon={<TrendingDown size={18}/>} />
              <KPICard 
                title="Fondo Emergencia" 
                value={fUSD(emergencyFund.current)} 
                color="border-blue-600" 
                icon={<Shield size={18}/>} 
                extra={<span className={`text-[9px] font-black ${emergencyFund.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {emergencyFund.change >= 0 ? '▲' : '▼'} {fUSD(Math.abs(emergencyFund.change))} este mes
                </span>}
              />
            </div>

            {/* SECCIÓN 2: GRÁFICOS HISTÓRICOS OPERATIVOS (6 MESES) */}
            <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-3xl print-break-avoid">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-10 text-center">Performance de Flujo Operativo (6 Meses)</h2>
              <div className="flex items-end justify-center gap-8 h-40 w-full relative px-10">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-10 px-10">
                  {[0,1,2,3].map(i => <div key={i} className="w-full border-t border-slate-900 border-dashed h-0" />)}
                </div>
                {history6Months.map((m, i) => {
                  const max = Math.max(...history6Months.map(x => Math.max(x.income, x.expenses))) || 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative z-10">
                      <div className="flex items-end gap-1.5 w-full justify-center h-full pb-6">
                        <div className="w-5 bg-slate-900 rounded-t-sm shadow-md" style={{height: `${Math.max((m.income/max)*100, 2)}%`}} />
                        <div className="w-5 bg-blue-400 rounded-t-sm" style={{height: `${Math.max((m.expenses/max)*100, 2)}%`}} />
                      </div>
                      <span className="absolute bottom-0 text-[10px] font-black text-slate-400 uppercase">{m.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-900 rounded-sm"></div><span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Ingresos</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div><span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Gastos</span></div>
              </div>
            </div>

            {/* SECCIÓN 3: INVERSIONES Y PORTAFOLIO */}
            <div className="grid grid-cols-5 gap-10 print-break-avoid pt-4">
              <div className="col-span-3 space-y-6">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-blue-600"/> Rendimiento de Activos (ROI)
                </h2>
                
                {/* GRÁFICA DE BARRAS DE INVERSIÓN (PROPORCIONADO) - CORREGIDA */}
                <div className="h-56 border border-slate-100 bg-white p-6 flex items-end justify-around gap-4 relative shadow-sm">
                  <div className="absolute inset-0 flex flex-col justify-between py-6 px-6 opacity-10 pointer-events-none">
                    {[0,1,2,3].map(i => <div key={i} className="w-full border-t border-slate-900 border-dashed" />)}
                  </div>
                  {assetBreakdown.slice(0, 5).map((inv, i) => {
                    const max = Math.max(...assetBreakdown.map(x => Math.max(x.cost, x.current))) || 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full z-10 w-full group">
                        <div className="bg-slate-50 px-2 py-0.5 rounded shadow-sm border border-slate-200 text-[9px] font-black text-blue-700 mb-2 transition-opacity group-hover:opacity-100 no-print">
                          {fPct(inv.roi)}
                        </div>
                        <div className="flex items-end gap-1 w-full justify-center flex-1 pb- group-hover:pb-1">
                          <div className="w-4 bg-slate-300 rounded-t-sm" title="Capital Invertido" style={{height: `${Math.max((inv.cost/max)*100, 2)}%`}} />
                          <div className="w-4 bg-blue-700 rounded-t-sm shadow-sm" title="Valor Mercado" style={{height: `${Math.max((inv.current/max)*100, 2)}%`}} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase mt-2 truncate w-full text-center group-hover:text-slate-800">{inv.name}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* TABLA DE RESUMEN DE INVERSIONES - RESTAURADA Y PROPORCIONADA */}
                <table className="w-full text-[10px] border-collapse border border-slate-100">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-widest border-b border-slate-800">
                      <th className="p-2 text-left">Posición</th>
                      <th className="p-2 text-right">Inversión</th>
                      <th className="p-2 text-right">Valor Actual</th>
                      <th className="p-2 text-center">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetBreakdown.length > 0 ? assetBreakdown.map((inv, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-black text-slate-700 uppercase">{inv.name}</td>
                        <td className="p-2 text-right text-slate-500 font-medium">{fUSD(inv.cost)}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{fUSD(inv.current)}</td>
                        <td className={`p-2 text-center font-black ${inv.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fPct(inv.roi)}</td>
                      </tr>
                    )) : <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin inversiones activas</td></tr>}
                    <tr className="bg-blue-50 font-black border-t-2 border-blue-200">
                      <td className="p-2 uppercase text-blue-900">Total Portafolio</td>
                      <td className="p-2 text-right text-blue-900">{fUSD(totalInvested)}</td>
                      <td className="p-2 text-right text-blue-900">{fUSD(portfolioData.total)}</td>
                      <td className={`p-2 text-center ${totalInvested > 0 && portfolioData.total >= totalInvested ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {totalInvested > 0 ? fPct(((portfolioData.total - totalInvested)/totalInvested)*100) : '0%'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* DISTRIBUCIÓN (DONUT) */}
              <div className="col-span-2 space-y-6">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <PieChart size={16} className="text-blue-600"/> Asset Allocation
                </h2>
                <div className="aspect-square bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center relative shadow-inner">
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
                      <span className="text-slate-700">{s.perc.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: GASTOS MAYORES Y PROYECCIONES - AMBAS RESTAURADAS intactas */}
            <div className="grid grid-cols-2 gap-10 print-break-avoid pt-10 border-t border-slate-200">
              
              {/* Análisis de Gastos Mayores (Top 5) - RESTAURADA */}
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart2 size={16} className="text-blue-600"/> Resumen de Gastos Mayores (Top 5)
                </h2>
                <div className="space-y-3">
                  {spendingTable.length > 0 ? spendingTable.map(([cat, val], i) => (
                    <div key={i} className="relative bg-white p-3 rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                      <div className="absolute left-0 top-0 bottom-0 bg-rose-100/30 rounded-l-lg" style={{ width: `${(val/expenses)*100}%` }}></div>
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Sin salidas de dinero registradas</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Proyecciones a 6 Meses (Outlook Financiero) - RESTAURADA intactas */}
              <div className="space-y-6">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Zap size={16} className="text-blue-600"/> Outlook Financiero a 6 Meses
                </h2>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center p-3.5 bg-white border border-slate-100 rounded-xl shadow-inner">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Escenario Base (Flujo Actual Consolidado)</span>
                    <span className="text-xs font-black text-slate-900">{fUSD(netWorth + (cashFlow * 6))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1.5"><TrendingUp size={10}/> Optimista (+20% Ingresos)</span>
                    <span className="text-xs font-black text-emerald-700">{fUSD(netWorth + ((income * 1.2 - expenses) * 6))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3.5 bg-rose-50 border border-rose-100 rounded-xl">
                    <span className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1.5"><TrendingDown size={10}/> Pesimista (+20% Gastos Operativos)</span>
                    <span className="text-xs font-black text-rose-700">{fUSD(netWorth + ((income - expenses * 1.2) * 6))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: AUDITORÍA Y SALUD */}
            <div className="grid grid-cols-2 gap-10 pt-10 border-t border-slate-200 print-break-avoid">
              <AuditBox 
                title="Status de Liquidez Consolidated" 
                value={fUSD(emergencyFund.current)} 
                desc={emergencyFund.current > (expenses * 3) ? "Excelente: Cubre más de 3 meses de gastos operativos consolidados." : "Alerta: Liquidez inferior al benchmark de seguridad (3 a 6 meses de gastos)."} 
              />
              <AuditBox 
                title="Eficiencia de Ahorro Consolidad" 
                value={fPct(savingsRate).replace('+', '')} 
                desc={savingsRate > 20 ? "Margen operativo óptimo para expansión de capital y reinversión constante." : "Ratio ajustado. Se recomienda auditoría exhaustiva de gastos variables consolidados."} 
              />
            </div>

          </div>

          <div className="bg-slate-900 text-white/40 text-center py-4 text-[7px] uppercase tracking-[0.4em] font-black italic border-t border-slate-800">
            Confidential Document • Finanza360 Intel System • ISO-9001 Compliant Report
          </div>
        </div>
      </div>
    </>
  );
};

// --- COMPONENTES AUXILIARES CON DISEÑO PREMIUM ---

const KPICard = ({ title, value, color, icon, extra }: any) => (
  <div className={`bg-white border border-slate-100 border-l-4 ${color} p-5 shadow-sm hover:shadow-lg transition-all`}>
    <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-3">
      <div className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100">{icon}</div>
      {extra}
    </div>
    <p className="text-xl font-black text-slate-900 tracking-tighter mb-0.5">{value}</p>
    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
  </div>
);

const AuditBox = ({ title, value, desc }: any) => (
  <div className="flex gap-4 items-start p-5 bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 hover:bg-blue-50/20 transition-all">
    <div className="absolute top-0 right-0 p-2 opacity-5"><Target size={40}/></div>
    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 group-hover:bg-blue-100"><Shield size={20}/></div>
    <div>
      <h4 className="text-[11px] font-black uppercase text-slate-900 mb-1 tracking-widest">{title}: <span className="text-blue-600">{value}</span></h4>
      <p className="text-[9px] text-slate-500 font-bold leading-relaxed">{desc}</p>
    </div>
  </div>
);
