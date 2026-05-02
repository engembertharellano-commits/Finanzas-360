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
  Briefcase
} from 'lucide-react';
import { BankAccount, Transaction, Investment, FinancialPlan } from '../types';

interface FinancialReportProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  investments: Investment[];
  exchangeRate: number;
  selectedMonth: string;
  financialPlans: FinancialPlan[];
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  accounts,
  transactions,
  investments,
  exchangeRate,
  selectedMonth,
  financialPlans
}) => {
  // Función auxiliar para convertir valores a USD si están en VES
  const toUSD = (amount: number, currency: string) => {
    if (!amount) return 0;
    return currency === 'VES' ? amount / exchangeRate : amount;
  };

  // 1. Cálculos de NET WORTH
  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    accounts.forEach((acc) => {
      const val = toUSD(acc.balance, acc.currency);
      // Asumimos que las tarjetas de crédito representan deuda (pasivo) si su balance es positivo/negativo en contabilidad
      if (acc.type === 'Tarjeta de Crédito') {
        liabilities += Math.abs(val); // Lo sumamos como pasivo absoluto
      } else {
        assets += val;
      }
    });

    investments.forEach((inv) => {
      // Tomar el valor de la inversión (value o currentValue según compatibilidad)
      const invValue = inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0;
      assets += toUSD(invValue, inv.currency);
    });

    return { totalAssets: assets, totalLiabilities: liabilities, netWorth: assets - liabilities };
  }, [accounts, investments, exchangeRate]);

  // 2. Cálculos de FLUJO DE CAJA (Periodo actual)
  const { income, expenses, cashFlow, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    const currentMonthTxs = transactions.filter(t => t.date.startsWith(selectedMonth));
    
    currentMonthTxs.forEach((t) => {
      const val = toUSD(t.amount, t.currency);
      if (t.type === 'Ingreso') inc += val;
      if (t.type === 'Gasto') exp += val;
    });

    const flow = inc - exp;
    const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;

    return { income: inc, expenses: exp, cashFlow: flow, savingsRate: rate };
  }, [transactions, selectedMonth, exchangeRate]);

  // 3. Determinar el RISK LEVEL
  const riskLevel = useMemo(() => {
    if (expenses > income && netWorth < expenses * 3) return { level: 'High', color: 'text-rose-500', bg: 'bg-rose-100' };
    if (savingsRate < 15 || totalLiabilities > totalAssets * 0.4) return { level: 'Medium', color: 'text-amber-500', bg: 'bg-amber-100' };
    return { level: 'Low', color: 'text-emerald-500', bg: 'bg-emerald-100' };
  }, [expenses, income, savingsRate, totalLiabilities, totalAssets, netWorth]);

  // 4. SPENDING ANALYSIS (Ranking de categorías)
  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    const currentMonthTxs = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'Gasto');
    
    currentMonthTxs.forEach(t => {
      const val = toUSD(t.amount, t.currency);
      categories[t.category] = (categories[t.category] || 0) + val;
    });

    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount, percentage: expenses > 0 ? (amount / expenses) * 100 : 0 }));
  }, [transactions, selectedMonth, exchangeRate, expenses]);

  // 5. PORTFOLIO ALLOCATION (Para el Donut Chart)
  const portfolioAllocation = useMemo(() => {
    const allocation: Record<string, number> = {};
    let totalPortfolio = 0;

    investments.forEach((inv) => {
      const invValue = inv.value || inv.currentValue || (inv.quantity * (inv.currentMarketPrice || inv.buyPrice)) || 0;
      const valUSD = toUSD(invValue, inv.currency);
      const cat = inv.type || inv.category || 'Otros';
      allocation[cat] = (allocation[cat] || 0) + valUSD;
      totalPortfolio += valUSD;
    });

    const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
    
    let currentDegree = 0;
    const chartSegments = Object.entries(allocation)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => {
        const percentage = totalPortfolio > 0 ? (value / totalPortfolio) * 100 : 0;
        const degreeStart = currentDegree;
        currentDegree += (percentage / 100) * 360;
        return {
          name,
          value,
          percentage,
          color: colors[index % colors.length],
          degreeStart,
          degreeEnd: currentDegree
        };
      });

    const conicGradient = chartSegments.length > 0 
      ? chartSegments.map(s => `${s.color} ${s.degreeStart}deg ${s.degreeEnd}deg`).join(', ')
      : '#f1f5f9 0deg 360deg'; // Gris claro si no hay datos

    return { segments: chartSegments, totalPortfolio, conicGradient };
  }, [investments, exchangeRate]);

  // Formateadores
  const formatUSD = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;
  
  const [year, month] = selectedMonth.split('-');
  const displayDate = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-200">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Financial Report</h1>
          <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
            <Calendar size={14} />
            Period: {displayDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 uppercase tracking-widest border border-slate-700">
            Mensual
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/30">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Net Worth" value={formatUSD(netWorth)} icon={<Briefcase size={20} />} trend="up" />
        <KPICard title="Cash Flow" value={formatUSD(cashFlow)} icon={<Activity size={20} />} trend={cashFlow >= 0 ? 'up' : 'down'} color={cashFlow >= 0 ? 'emerald' : 'rose'} />
        <KPICard title="Savings Rate" value={formatPercent(savingsRate)} icon={<Target size={20} />} trend={savingsRate >= 20 ? 'up' : 'down'} color={savingsRate >= 20 ? 'emerald' : 'amber'} />
        <KPICard title="Income" value={formatUSD(income)} icon={<TrendingUp size={20} />} trend="up" color="emerald" />
        <KPICard title="Expenses" value={formatUSD(expenses)} icon={<TrendingDown size={20} />} trend="down" color="rose" />
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Risk Level</p>
            <div className={`p-2 rounded-xl ${riskLevel.bg} ${riskLevel.color}`}>
              <Shield size={20} />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-black tracking-tight ${riskLevel.color}`}>{riskLevel.level}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">Based on current ratio</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* INCOME VS EXPENSES CHART (Placeholder CSS) */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Income vs Expenses (Current Period)</h3>
          <div className="relative h-48 flex items-end gap-8 pb-6 border-b border-slate-100">
            {/* Income Bar */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group">
              <span className="text-xs font-bold text-slate-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{formatUSD(income)}</span>
              <div className="w-16 bg-emerald-400 rounded-t-xl transition-all duration-1000 ease-out" style={{ height: income === 0 && expenses === 0 ? '0%' : `${(income / Math.max(income, expenses)) * 100}%` }}></div>
              <span className="absolute -bottom-6 text-xs font-bold text-slate-500">Income</span>
            </div>
            {/* Expense Bar */}
            <div className="flex-1 flex flex-col items-center justify-end h-full group">
              <span className="text-xs font-bold text-slate-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{formatUSD(expenses)}</span>
              <div className="w-16 bg-rose-400 rounded-t-xl transition-all duration-1000 ease-out" style={{ height: income === 0 && expenses === 0 ? '0%' : `${(expenses / Math.max(income, expenses)) * 100}%` }}></div>
              <span className="absolute -bottom-6 text-xs font-bold text-slate-500">Expenses</span>
            </div>
          </div>
        </div>

        {/* PORTFOLIO ALLOCATION */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Asset Allocation</h3>
          {portfolioAllocation.segments.length > 0 ? (
            <div className="flex flex-col items-center">
              {/* Donut Chart usando CSS */}
              <div className="relative w-40 h-40 rounded-full flex items-center justify-center shadow-inner" style={{ background: `conic-gradient(${portfolioAllocation.conicGradient})` }}>
                <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-xs font-black text-slate-900">Total</span>
                </div>
              </div>
              <div className="mt-6 w-full space-y-3">
                {portfolioAllocation.segments.map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></div>
                      <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{seg.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{formatPercent(seg.percentage)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-bold uppercase text-center border-2 border-dashed border-slate-100 rounded-2xl">
              No portfolio data
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SPENDING ANALYSIS */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Spending Analysis</h3>
          {expensesByCategory.length > 0 ? (
            <div className="space-y-4">
              {expensesByCategory.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">{cat.name}</span>
                    <span className="text-slate-900">{formatUSD(cat.amount)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-bold">No expenses recorded for this period.</p>
          )}
        </div>

        {/* RISK & INSIGHTS / ACTION PLAN */}
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={16} /> Controller Insights
            </h3>
            <ul className="space-y-3">
              {savingsRate < 20 && cashFlow > 0 && (
                <li className="text-sm text-indigo-800 font-medium bg-white p-3 rounded-xl shadow-sm">
                  <strong className="font-black">Observation:</strong> Savings rate is at {formatPercent(savingsRate)}. Consider reallocating excessive cash to investments to beat inflation.
                </li>
              )}
              {cashFlow < 0 && (
                <li className="text-sm text-rose-800 font-medium bg-rose-50 p-3 rounded-xl shadow-sm border border-rose-100">
                  <strong className="font-black">Alert:</strong> Negative cash flow detected. Immediate reduction of discretionary spending recommended to preserve liquidity.
                </li>
              )}
              {totalLiabilities > totalAssets * 0.3 && (
                <li className="text-sm text-amber-800 font-medium bg-amber-50 p-3 rounded-xl shadow-sm border border-amber-100">
                  <strong className="font-black">Warning:</strong> Debt-to-asset ratio is elevating. Prioritize paying down high-interest liabilities.
                </li>
              )}
              {savingsRate >= 20 && (
                <li className="text-sm text-emerald-800 font-medium bg-emerald-50 p-3 rounded-xl shadow-sm border border-emerald-100">
                  <strong className="font-black">Status:</strong> Optimal savings rate maintained. Portfolio growth is on a healthy trajectory.
                </li>
              )}
            </ul>
          </div>
          
          {/* OUTLOOK (Proyección simple) */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">6-Month Outlook Projection</h3>
             <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="text-xs font-bold text-slate-300">Base Scenario (Current flow)</span>
                  <span className="text-sm font-black text-emerald-400">{formatUSD(netWorth + (cashFlow * 6))}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <span className="text-xs font-bold text-slate-300">Pessimistic (-20% Income)</span>
                  <span className="text-sm font-black text-amber-400">{formatUSD(netWorth + ((income * 0.8 - expenses) * 6))}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  color?: 'emerald' | 'rose' | 'indigo' | 'amber' | 'slate';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, trend, color = 'indigo' }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-50 text-slate-600',
  };

  return (
    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between group hover:-translate-y-1 transition-transform">
      <div className="flex justify-between items-start">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <h3 className="text-2xl font-black tracking-tight text-slate-900">{value}</h3>
      </div>
    </div>
  );
};
