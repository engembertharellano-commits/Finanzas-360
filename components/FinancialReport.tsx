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
  Target
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
  selectedMonth
}) => {
  // --- ESTILOS DE IMPRESIÓN ---
  const printStyles = `
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background-color: white !important;
      }
      .no-print { display: none !important; }
      .print-container { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; padding: 10mm !important; box-shadow: none !important; border: none !important; }
      .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
    }
  `;

  const toUSD = (amount: number, currency: string) => currency === 'VES' ? amount / exchangeRate : amount;

  // 1. Patrimonio Actual (HOY)
  const { netWorth, totalAssets, totalLiabilities } = useMemo(() => {
    let assets = 0, liabilities = 0;
    accounts.forEach(acc => {
      const val = toUSD(acc.balance, acc.currency);
      if (acc.type === 'Tarjeta de Crédito' && val < 0) liabilities += Math.abs(val);
      else if (acc.type === 'Tarjeta de Crédito' && val >= 0) assets += val;
      else assets += val;
    });
    investments.forEach(inv => {
      const val = toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
      assets += val;
    });
    return { totalAssets: assets, totalLiabilities: liabilities, netWorth: assets - liabilities };
  }, [accounts, investments, exchangeRate]);

  // 2. PATRIMONIO RETROACTIVO (Dinero exacto al cierre del mes seleccionado)
  const endOfMonthNW = useMemo(() => {
    if (!selectedMonth) return netWorth;
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);

    let futureNetCashFlow = 0;
    transactions.forEach(t => {
      if (!t.date) return;
      const [tYear, tMonth] = t.date.split('-').map(Number);
      
      // Verificamos si la transacción ocurrió DESPUÉS del mes que estamos consultando
      const isAfter = tYear > selYear || (tYear === selYear && tMonth > selMonth);
      
      if (isAfter) {
        const val = toUSD(t.amount, t.currency);
        if (t.type === 'Ingreso') futureNetCashFlow += val;
        if (t.type === 'Gasto') futureNetCashFlow -= val;
        if (t.type === 'Ajuste') {
          const adj = t.adjustmentDirection === 'minus' ? -val : val;
          futureNetCashFlow += adj;
        }
      }
    });
    // Al patrimonio actual le restamos el dinero que ganamos/perdimos en el futuro
    return netWorth - futureNetCashFlow;
  }, [selectedMonth, transactions, netWorth, exchangeRate]);

  // 3. Flujo del Mes Seleccionado
  const { income, expenses, cashFlow, savingsRate } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.filter(t => t?.date?.startsWith(selectedMonth)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });
    return { income: inc, expenses: exp, cashFlow: inc - exp, savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0 };
  }, [transactions, selectedMonth, exchangeRate]);

  // 4. Histórico 6 meses (Para gráfica operativa)
  const history6Months = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthsData = [];
    const mesesAbrev = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let inc = 0, exp = 0;
      transactions.filter(t => t?.date?.startsWith(targetMonth)).forEach(t => {
        const val = toUSD(t.amount, t.currency);
        if (t.type === 'Ingreso') inc += val;
        if (t.type === 'Gasto') exp += val;
      });
      monthsData.push({ label: `${mesesAbrev[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`, income: inc, expenses: exp });
    }
    return monthsData;
  }, [selectedMonth, transactions, exchangeRate]);

  const maxHistoryValue = Math.max(...history6Months.map(m => Math.max(m.income, m.expenses))) || 1;

  // 5. Rendimiento Real de Inversiones (ROI Real) - AHORA CORREGIDO
  const assetBreakdown = useMemo(() => {
    return investments.map(inv => {
      const cost = toUSD(inv.initialInvestment || (inv.quantity * inv.buyPrice) || 0, inv.currency);
      const current = toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency);
      const profit = current - cost;
      return {
        name: inv.ticker || inv.name || 'S/N',
        cost,
        current,
        roi: cost > 0 ? (profit / cost) * 100 : 0
      };
    }).sort((a, b) => b.current - a.current);
  }, [investments, exchangeRate]);

  const maxInvestValue = Math.max(...assetBreakdown.map(i => Math.max(i.cost, i.current))) || 1;
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

  // 7. Análisis de Gastos Mayores
  const spendingTable = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t?.date?.startsWith(selectedMonth) && t.type === 'Gasto').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + toUSD(t.amount, t.currency);
    });
    return Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0, 5);
  }, [transactions, selectedMonth, exchangeRate]);

  // --- FORMATEADORES ---
  const fUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fPct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  
  const [year, month] = selectedMonth.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const displayDate = `${meses[parseInt(month) - 1]} ${year}`;
  const isCurrentMonth = new Date().toISOString().startsWith(selectedMonth);

  return (
    <>
      <style>{printStyles}</style>
      <div className="print-container max-w-[210mm] mx-auto bg-white shadow-2xl overflow-hidden font-sans text-slate-800 border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-blue-900 text-white px-10 py-8 flex justify-between items-center print-break-avoid">
          <div className="flex items-center gap-4">
            <Building2 size={32} className="text-white" />
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase">Reporte General de Desempeño</h1>
              <p className="text-blue-200 font-bold text-xs mt-1 uppercase tracking-widest">Periodo: {displayDate}</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="no-print bg-white text-blue-900 px-5 py-2.5 rounded-md text-xs font-black uppercase hover:bg-blue-50 transition-colors shadow-md flex items-center gap-2">
            <Download size={14} /> Exportar
          </button>
        </div>

        <div className="p-10 space-y-12">
          
          {/* SECCIÓN 1: KPIs PRINCIPALES (REESTRUCTURADOS) */}
          <div className="grid grid-cols-4 gap-6 border-b border-slate-200 pb-10 print-break-avoid">
            <KPICard 
              title="Patrimonio (Cierre de Mes)" 
              value={fUSD(endOfMonthNW)} 
              subtitle={isCurrentMonth ? "Balance Total Actual" : "Balance Calculado a la Fecha"} 
              icon={<Briefcase size={20}/>} 
            />
            <KPICard 
              title="Ingresos Operativos" 
              value={fUSD(income)} 
              subtitle="Entradas del Mes" 
              icon={<TrendingUp size={20}/>} 
            />
            <KPICard 
              title="Gastos Operativos" 
              value={fUSD(expenses)} 
              subtitle="Salidas del Mes" 
              icon={<TrendingDown size={20}/>} 
            />
            <KPICard 
              title="Flujo de Caja Neto" 
              value={fUSD(cashFlow)} 
              subtitle="Saldo del Periodo" 
              icon={<Activity size={20}/>} 
              highlight={cashFlow >= 0} 
            />
          </div>

          {/* SECCIÓN 2: BALANCE OPERATIVO HISTÓRICO */}
          <div className="print-break-avoid">
            <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-8 text-center">Comparativa de Flujo de Caja Operativo (6 Meses)</h2>
            <div className="flex items-end justify-center gap-6 h-48 w-full relative px-10">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-10 px-10">
                {[0,1,2,3].map(i => <div key={i} className="w-full border-t border-slate-900 border-dashed h-0" />)}
              </div>
              {history6Months.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative z-10">
                  <div className="flex items-end gap-1 w-full justify-center h-full pb-8">
                    <div className="w-5 bg-blue-900 rounded-t-sm" style={{height: `${Math.max((m.income / maxHistoryValue) * 100, 2)}%`}} />
                    <div className="w-5 bg-blue-400 rounded-t-sm" style={{height: `${Math.max((m.expenses / maxHistoryValue) * 100, 2)}%`}} />
                  </div>
                  <span className="absolute bottom-0 text-[9px] font-bold text-slate-500 uppercase">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-6">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-900 rounded-sm"></div><span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Ingresos</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div><span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Gastos</span></div>
            </div>
          </div>

          {/* SECCIÓN 3: RENDIMIENTO DE INVERSIONES Y PORTAFOLIO */}
          <div className="grid grid-cols-5 gap-8 print-break-avoid border-t border-slate-200 pt-10">
            <div className="col-span-3">
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={16}/> Rendimiento de Activos (ROI Real)</h2>
              
              {/* GRÁFICO DE BARRAS DE INVERSIÓN (PROPORCIONADO) */}
              <div className="border border-slate-200 p-6 flex items-end justify-around gap-4 h-56 mb-8 bg-white relative">
                <div className="absolute inset-0 flex flex-col justify-between py-8 px-6 opacity-20 pointer-events-none">
                  {[0,1,2,3,4].map(i => <div key={i} className="w-full border-t border-slate-400 border-dashed" />)}
                </div>
                {assetBreakdown.slice(0, 5).map((inv, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full z-10 w-full group">
                    <div className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100 text-[9px] font-black text-slate-700 mb-2 z-20">
                      {fPct(inv.roi)}
                    </div>
                    {/* Contenedor flex-1 asegura que las barras usen el espacio restante exacto */}
                    <div className="flex items-end gap-1 w-full justify-center flex-1 pb-1">
                      <div className="w-5 bg-slate-300 rounded-t-sm" title="Capital Invertido" style={{height: `${Math.max((inv.cost / maxInvestValue) * 100, 1)}%`}}></div>
                      <div className="w-5 bg-blue-600 rounded-t-sm shadow-sm" title="Valor Mercado" style={{height: `${Math.max((inv.current / maxInvestValue) * 100, 1)}%`}}></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-800 uppercase mt-2">{inv.name}</span>
                  </div>
                ))}
              </div>
              
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 uppercase tracking-widest border-b border-slate-200">
                    <th className="p-2 text-left">Activo</th>
                    <th className="p-2 text-right">Inversión Total</th>
                    <th className="p-2 text-right">Valor Mercado</th>
                    <th className="p-2 text-center">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {assetBreakdown.length > 0 ? assetBreakdown.map((inv, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2 font-black text-blue-900 uppercase">{inv.name}</td>
                      <td className="p-2 text-right font-medium text-slate-500">{fUSD(inv.cost)}</td>
                      <td className="p-2 text-right font-black text-slate-900">{fUSD(inv.current)}</td>
                      <td className={`p-2 text-center font-black ${inv.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fPct(inv.roi)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-400 font-bold uppercase text-[10px]">Sin posiciones abiertas</td></tr>
                  )}
                  <tr className="bg-blue-50 font-black">
                    <td className="p-2 uppercase text-blue-900">Total Portafolio</td>
                    <td className="p-2 text-right text-blue-900">{fUSD(totalInvested)}</td>
                    <td className="p-2 text-right text-blue-900">{fUSD(portfolioData.total)}</td>
                    <td className={`p-2 text-center ${totalInvested > 0 && portfolioData.total >= totalInvested ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {totalInvested > 0 ? fPct(((portfolioData.total - totalInvested) / totalInvested) * 100) : '0%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ASSET ALLOCATION */}
            <div className="col-span-2 flex flex-col">
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={16}/> Distribución de Capital</h2>
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-none">
                <div className="relative w-40 h-40 rounded-full flex items-center justify-center mb-6" style={{ background: `conic-gradient(${portfolioData.conicGradient})` }}>
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Valuación</span>
                    <span className="text-xs font-black">{fUSD(portfolioData.total)}</span>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {portfolioData.segments.length > 0 ? portfolioData.segments.map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5" style={{backgroundColor: s.color}} /><span className="text-slate-600 uppercase">{s.name}</span></div>
                      <span>{s.perc.toFixed(1)}%</span>
                    </div>
                  )) : <p className="text-[10px] font-bold text-slate-400 uppercase text-center w-full">Sin activos</p>}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: GASTOS MAYORES Y AUDITORÍA */}
          <div className="grid grid-cols-2 gap-10 pt-10 border-t border-slate-200 print-break-avoid">
            
            {/* Tabla Estructurada de Gastos Mayores */}
            <div>
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart2 size={16}/> Resumen de Gastos Operativos Mayores
              </h2>
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-blue-900 text-white text-[10px] uppercase tracking-widest">
                    <th className="p-3 border border-blue-800">Categoría</th>
                    <th className="p-3 border border-blue-800 text-right">Monto (USD)</th>
                    <th className="p-3 border border-blue-800 text-center">% del Gasto</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-medium">
                  {spendingTable.length > 0 ? spendingTable.map(([cat, val], i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 border border-slate-200 font-bold text-slate-700">{cat}</td>
                      <td className="p-3 border border-slate-200 text-right text-slate-900">{fUSD(val)}</td>
                      <td className="p-3 border border-slate-200 text-center text-blue-600 font-black">{((val/expenses)*100).toFixed(1)}%</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-400 font-bold uppercase text-[10px]">Sin salidas este mes</td></tr>
                  )}
                  <tr className="bg-slate-100 font-black text-slate-900 text-[11px]">
                    <td className="p-3 border border-slate-200 uppercase">Total Gastos Reportados</td>
                    <td className="p-3 border border-slate-200 text-right">{fUSD(expenses)}</td>
                    <td className="p-3 border border-slate-200 text-center">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Auditoría de Salud */}
            <div>
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle size={16}/> Auditoría y Riesgo de Liquidez
              </h2>
              <div className="space-y-4">
                <AuditItem 
                  title={`Ratio de Ahorro (${savingsRate.toFixed(1)}%)`} 
                  desc={savingsRate >= 20 ? "Operación eficiente. Margen de liquidez superior al 20% recomendado, permitiendo reinversión." : "Margen de liquidez bajo. Se requiere optimización estructural de costos fijos y variables."} 
                  icon={<Target size={20}/>}
                />
                <AuditItem 
                  title="Apalancamiento y Pasivos" 
                  desc={totalLiabilities === 0 ? "Estructura de capital 100% propia. Riesgo de insolvencia nulo." : `Exposición crediticia equivalente al ${((totalLiabilities/totalAssets)*100 || 0).toFixed(1)}% de los activos consolidados.`} 
                  icon={<Shield size={20}/>}
                />
              </div>
            </div>

          </div>
        </div>

        <div className="bg-blue-900 text-blue-200 text-center py-4 text-[8px] uppercase tracking-widest font-black">
          Finanza360 Intel System • Reporte Generado bajo Estándares Corporativos
        </div>
      </div>
    </>
  );
};

const KPICard = ({ title, value, subtitle, icon, highlight = false }: any) => (
  <div className="text-center p-4 border border-transparent hover:border-slate-100 transition-all">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 ${highlight && value.includes('-') ? 'bg-rose-600 text-white' : highlight ? 'bg-emerald-600 text-white' : 'bg-blue-900 text-white'}`}>
      {icon}
    </div>
    <p className={`text-2xl font-black tracking-tighter mb-1 ${highlight && value.includes('-') ? 'text-rose-600' : highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</p>
    <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{title}</h3>
    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase leading-tight">{subtitle}</p>
  </div>
);

const AuditItem = ({ title, desc, icon }: any) => (
  <div className="flex gap-4 items-start p-4 bg-slate-50 border border-slate-200">
    <div className="p-2 bg-blue-100 text-blue-700 rounded-full shrink-0">{icon}</div>
    <div>
      <h4 className="text-[11px] font-black uppercase text-slate-900 mb-1 tracking-widest">{title}</h4>
      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);
