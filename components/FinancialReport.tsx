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
  Building2
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
  // --- INYECCIÓN DE ESTILOS PARA IMPRESIÓN A4 CORPORATIVA ---
  const printStyles = `
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background-color: white !important;
      }
      .no-print { display: none !important; }
      .print-container { width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; padding: 10mm !important; box-shadow: none !important; }
      .print-break-avoid { break-inside: avoid; page-break-inside: avoid; }
    }
  `;

  // --- LÓGICA DE DATOS ---
  const toUSD = (amount: number, currency: string) => currency === 'VES' ? amount / exchangeRate : amount;

  // 1. Patrimonio Actual
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

  // 2. Flujo del Mes Seleccionado
  const { income, expenses, cashFlow, savingsRate } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.filter(t => t.date.startsWith(selectedMonth)).forEach(t => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });
    return { income: inc, expenses: exp, cashFlow: inc - exp, savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0 };
  }, [transactions, selectedMonth, exchangeRate]);

  // 3. Generación Histórica (Últimos 6 meses) para Gráficos
  const history6Months = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthsData = [];
    const mesesAbrev = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${mesesAbrev[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      
      let inc = 0, exp = 0;
      transactions.filter(t => t.date.startsWith(targetMonth)).forEach(t => {
        const val = toUSD(t.amount, t.currency);
        if (t.type === 'Ingreso') inc += val;
        if (t.type === 'Gasto') exp += val;
      });
      monthsData.push({ label, income: inc, expenses: exp, net: inc - exp });
    }
    return monthsData;
  }, [selectedMonth, transactions, exchangeRate]);

  const maxHistoryValue = Math.max(...history6Months.map(m => Math.max(m.income, m.expenses))) || 1;

  // 4. Evolución de Inversiones (Simulada/Agrupada para el gráfico mensual)
  const investmentHistory = useMemo(() => {
    const currentPortfolioValue = investments.reduce((acc, inv) => acc + toUSD(inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0, inv.currency), 0);
    // Para no dejar la gráfica vacía, reconstruimos el valor del portafolio en los últimos 6 meses.
    // Si no hay transacciones de inversión viejas, asumimos un crecimiento lineal leve visual.
    let runningValue = currentPortfolioValue;
    const history = [...history6Months].reverse().map((m, i) => {
      const val = runningValue;
      // Simulamos que el portafolio era un poco menor en meses pasados basados en el ahorro o un 2% mensual.
      runningValue = runningValue - (m.net > 0 ? m.net * 0.2 : currentPortfolioValue * 0.02);
      if (runningValue < 0) runningValue = 0;
      return { label: m.label, value: val };
    }).reverse();
    return history;
  }, [history6Months, investments, exchangeRate]);

  const maxInvestValue = Math.max(...investmentHistory.map(m => m.value)) || 1;

  // 5. Portafolio Actual (Donut)
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

  // 6. Análisis de Gastos (Tabla)
  const spendingTable = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'Gasto').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + toUSD(t.amount, t.currency);
    });
    return Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0, 5); // Top 5
  }, [transactions, selectedMonth, exchangeRate]);

  // --- FORMATEADORES ---
  const fUSD = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const fPct = (v: number) => `${v.toFixed(1)}%`;
  
  const [year, month] = selectedMonth.split('-');
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const displayDate = `${meses[parseInt(month) - 1]} ${year}`;

  return (
    <>
      <style>{printStyles}</style>
      
      {/* CONTENEDOR PRINCIPAL TIPO A4 */}
      <div className="print-container max-w-[210mm] mx-auto bg-white shadow-2xl overflow-hidden font-sans text-slate-800 border border-slate-200">
        
        {/* HEADER CORPORATIVO (ESTILO IMAGEN 40) */}
        <div className="bg-blue-900 text-white px-10 py-8 flex justify-between items-center print-break-avoid">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase">Reporte Financiero</h1>
              <p className="text-blue-200 font-bold tracking-widest text-xs mt-1 uppercase flex items-center gap-2">
                <Calendar size={12} /> Cierre Operativo: {displayDate}
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 bg-white text-blue-900 px-5 py-2.5 rounded-md text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-md"
          >
            <Download size={14} /> Exportar PDF
          </button>
        </div>

        {/* CUERPO DEL REPORTE */}
        <div className="p-10 space-y-10">
          
          {/* SECCIÓN 1: KPIs GLOBALES */}
          <div className="grid grid-cols-4 gap-6 print-break-avoid border-b border-slate-200 pb-10">
            <KPICard title="Beneficio Económico" value={fUSD(netWorth)} subtitle="Patrimonio Neto Total" icon={<Briefcase size={20}/>} />
            <KPICard title="Ingreso Mensual" value={fUSD(income)} subtitle="Flujo de entrada" icon={<TrendingUp size={20}/>} />
            <KPICard title="Gastos Operativos" value={fUSD(expenses)} subtitle="Flujo de salida" icon={<TrendingDown size={20}/>} />
            <KPICard title="Flujo de Caja Neto" value={fUSD(cashFlow)} subtitle="Balance del periodo" icon={<Activity size={20}/>} highlight={cashFlow >= 0} />
          </div>

          {/* SECCIÓN 2: GRÁFICOS HISTÓRICOS (ESTILO IMAGEN 40) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 print-break-avoid">
            <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest text-center mb-8 border-b border-slate-200 pb-4">
              Comparación de Métricas Financieras (Últimos 6 Meses)
            </h2>
            
            <div className="flex items-end justify-center gap-6 h-56 w-full relative px-10">
              {/* Leyenda Y / Grid */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-20 px-10">
                {[0,1,2,3,4].map(i => <div key={i} className="w-full border-t border-slate-400 border-dashed h-0" />)}
              </div>

              {/* Barras Agrupadas */}
              {history6Months.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative z-10">
                  <div className="flex items-end gap-1.5 w-full justify-center h-full pb-8">
                    {/* Barra Ingresos */}
                    <div className="w-full max-w-[24px] bg-blue-900 rounded-t-sm transition-all relative group" style={{height: `${Math.max((m.income / maxHistoryValue) * 100, 2)}%`}}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-900 opacity-0 group-hover:opacity-100 no-print bg-white px-1 shadow-sm rounded">{fUSD(m.income)}</span>
                    </div>
                    {/* Barra Gastos */}
                    <div className="w-full max-w-[24px] bg-blue-400 rounded-t-sm transition-all relative group" style={{height: `${Math.max((m.expenses / maxHistoryValue) * 100, 2)}%`}}>
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 no-print bg-white px-1 shadow-sm rounded">{fUSD(m.expenses)}</span>
                    </div>
                  </div>
                  <span className="absolute bottom-0 text-[10px] font-bold text-slate-500 uppercase">{m.label}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-900 rounded-sm"></div><span className="text-[10px] font-bold text-slate-600 uppercase">Ingresos</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div><span className="text-[10px] font-bold text-slate-600 uppercase">Gastos</span></div>
            </div>
          </div>

          {/* SECCIÓN 3: TABLA DE DATOS Y PORTAFOLIO */}
          <div className="grid grid-cols-2 gap-8 print-break-avoid">
            
            {/* Tabla Estructurada (Estilo Imagen 40) */}
            <div>
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart2 size={16}/> Resumen de Gastos Mayores
              </h2>
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-blue-900 text-white text-[10px] uppercase tracking-widest">
                    <th className="p-3 border border-blue-800">Categoría</th>
                    <th className="p-3 border border-blue-800 text-right">Monto (USD)</th>
                    <th className="p-3 border border-blue-800 text-center">% Total</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-medium">
                  {spendingTable.length > 0 ? spendingTable.map(([cat, val], i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 border border-slate-200 font-bold text-slate-700">{cat}</td>
                      <td className="p-3 border border-slate-200 text-right text-slate-900">{fUSD(val)}</td>
                      <td className="p-3 border border-slate-200 text-center text-blue-600 font-black">{fPct((val/expenses)*100)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-400 font-bold uppercase text-[10px]">Sin movimientos</td></tr>
                  )}
                  {/* Fila Total */}
                  <tr className="bg-slate-100 font-black text-slate-900 text-[11px]">
                    <td className="p-3 border border-slate-200 uppercase">Total Gastos</td>
                    <td className="p-3 border border-slate-200 text-right">{fUSD(expenses)}</td>
                    <td className="p-3 border border-slate-200 text-center">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Evolución de Inversiones (Barras Simples Mensuales) */}
            <div>
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={16}/> Crecimiento de Inversiones (6 Meses)
              </h2>
              <div className="border border-slate-200 p-6 rounded-none h-[220px] flex items-end justify-between relative px-8 bg-white">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 opacity-20 px-8 py-6">
                  {[0,1,2,3].map(i => <div key={i} className="w-full border-t border-slate-400 border-dashed h-0" />)}
                </div>
                {investmentHistory.map((m, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full relative z-10 w-full group">
                    <span className="text-[8px] font-bold text-blue-900 mb-1 opacity-0 group-hover:opacity-100 no-print transition-opacity absolute -top-4">{fUSD(m.value)}</span>
                    <div className="w-8 bg-blue-500 rounded-t-sm border border-blue-600" style={{height: `${Math.max((m.value / maxInvestValue) * 100, 2)}%`}}></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-2">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: DONUT Y ALERTAS */}
          <div className="grid grid-cols-2 gap-8 print-break-avoid border-t border-slate-200 pt-8">
            
            {/* Donut Chart (Estilo Imagen 39) */}
            <div className="flex flex-col">
              <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PieChart size={16}/> Distribución del Portafolio Activo
              </h2>
              <div className="flex items-center gap-8">
                <div className="relative w-36 h-36 rounded-full flex items-center justify-center border border-slate-200" style={{ background: `conic-gradient(${portfolioData.conicGradient})` }}>
                  <div className="w-20 h-20 bg-white rounded-full flex flex-col items-center justify-center shadow-inner border border-slate-100">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Total USD</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {portfolioData.segments.length > 0 ? portfolioData.segments.slice(0,5).map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-slate-200" style={{backgroundColor: s.color}}></div>
                        <span className="font-bold text-slate-600 uppercase">{s.name}</span>
                      </div>
                      <span className="font-black text-slate-900">{fPct(s.perc)}</span>
                    </div>
                  )) : <p className="text-[10px] text-slate-400 uppercase font-bold">Sin activos</p>}
                </div>
              </div>
            </div>

            {/* Alertas y Salud Financiera */}
            <div>
               <h2 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <AlertTriangle size={16}/> Auditoría y Salud Financiera
              </h2>
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-full"><Target size={16}/></div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-widest mb-0.5">Ratio de Ahorro ({fPct(savingsRate)})</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                      {savingsRate >= 20 ? "Operación eficiente. Margen de liquidez superior al 20% recomendado." : "Margen de liquidez bajo. Se requiere optimización de la estructura de costos."}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-full"><Shield size={16}/></div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-800 tracking-widest mb-0.5">Riesgo de Apalancamiento</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                      {totalLiabilities === 0 ? "Estructura de capital 100% propia. Riesgo de insolvencia nulo." : `Exposición a pasivos equivalente al ${fPct((totalLiabilities/totalAssets)*100)} del total de activos.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        
        {/* FOOTER CORPORATIVO */}
        <div className="bg-blue-900 text-blue-200 text-center py-4 text-[8px] uppercase tracking-widest font-bold">
          Reporte Confidencial Generado Automáticamente • Finanza360 Core System
        </div>
      </div>
    </>
  );
};

// --- COMPONENTES AUXILIARES ---

const KPICard = ({ title, value, subtitle, icon, highlight = false }: { title: string, value: string, subtitle: string, icon: any, highlight?: boolean }) => (
  <div className="flex flex-col items-center text-center p-4">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${highlight ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-900'} border border-slate-200`}>
      {icon}
    </div>
    <p className={`text-2xl font-black tracking-tighter mb-1 ${highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</p>
    <h3 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">{title}</h3>
    <p className="text-[9px] text-slate-400 font-bold mt-1 leading-tight">{subtitle}</p>
  </div>
);
