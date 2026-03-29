import React, { useState, useMemo } from 'react';
import { Transaction, BankAccount, Investment, Budget } from '../types';
import {
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  RefreshCw, Info, Wallet,
  ArrowUpRight, Smartphone, Briefcase, Users,
  TrendingUp, TrendingDown, CalendarDays
} from 'lucide-react';

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: Budget[];
  selectedMonth: string;
  exchangeRate: number;
  rateSourceUrl?: string;
  onSyncRate: () => void;
  isSyncingRate: boolean;
}

export const Dashboard: React.FC<Props> = ({
  accounts, transactions, investments, budgets, selectedMonth, exchangeRate, rateSourceUrl, onSyncRate, isSyncingRate
}) => {
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'VES'>('USD');

  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  const incomeUSD = monthTransactions
    .filter(t => t.type === 'Ingreso' && t.currency === 'USD' && !t.isWorkRelated && !t.isThirdParty)
    .reduce((s, t) => s + t.amount, 0);

  const incomeVES = monthTransactions
    .filter(t => t.type === 'Ingreso' && t.currency === 'VES' && !t.isWorkRelated && !t.isThirdParty)
    .reduce((s, t) => s + t.amount, 0);

  const totalIncomeNormalized = incomeUSD + (incomeVES / exchangeRate);

  const totalIncomeHistoricalUSD = monthTransactions
    .filter(t => t.type === 'Ingreso' && !t.isWorkRelated && !t.isThirdParty)
    .reduce((sum, t) => {
      if (t.currency === 'USD') return sum + t.amount;

      if (t.currency === 'VES') {
        if (typeof t.usdEquivalentAtCreation === 'number' && Number.isFinite(t.usdEquivalentAtCreation)) {
          return sum + t.usdEquivalentAtCreation;
        }
        return sum + (t.amount / exchangeRate);
      }

      return sum;
    }, 0);

  const expenseUSD = monthTransactions
    .filter(t => t.type === 'Gasto' && t.currency === 'USD' && !t.isWorkRelated && !t.isThirdParty)
    .reduce((s, t) => s + t.amount, 0);

  const expenseVES = monthTransactions
    .filter(t => t.type === 'Gasto' && t.currency === 'VES' && !t.isWorkRelated && !t.isThirdParty)
    .reduce((s, t) => s + t.amount, 0);

  const totalExpenseNormalized = expenseUSD + (expenseVES / exchangeRate);

  const netResult = totalIncomeNormalized - totalExpenseNormalized;
  const isPositiveMonth = netResult >= 0;

  const totalThirdPartyUSD = transactions
    .filter(t => t.isThirdParty)
    .reduce((acc, t) => {
      const val = t.currency === 'USD' ? t.amount : t.amount / exchangeRate;
      return acc + (t.type === 'Ingreso' ? val : -val);
    }, 0);

  const totalLiquidUSD = accounts.reduce((acc, curr) => {
    const val = curr.currency === 'USD' ? curr.balance : curr.balance / exchangeRate;
    return acc + (curr.type === 'Tarjeta de Crédito' ? -val : val);
  }, 0);

  const realPersonalNetWorth = totalLiquidUSD - totalThirdPartyUSD + investments.reduce((acc, inv) => {
    return acc + (inv.currency === 'USD' ? inv.value : inv.value / exchangeRate);
  }, 0);

  const chartData = [
    { name: 'MI DINERO', value: Math.max(0, totalLiquidUSD - totalThirdPartyUSD), color: '#3b82f6' },
    { name: 'CUSTODIA', value: Math.max(0, totalThirdPartyUSD), color: '#10b981' }
  ];

  const formatValue = (val: number) => {
    if (displayCurrency === 'USD') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Bs. ${(val * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSmallValue = (val: number, curr: 'USD' | 'VES') => {
    return curr === 'USD'
      ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `Bs. ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const monthName = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(year, month - 1));
  }, [selectedMonth]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
        <div className="bg-white px-6 py-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-5 flex-1">
          <button
            onClick={onSyncRate}
            disabled={isSyncingRate}
            className={`w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-all ${isSyncingRate ? 'animate-spin opacity-50' : 'hover:scale-110 active:scale-95'}`}
          >
            <RefreshCw size={22} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
              Tasa Sincronizada (BCV)
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-black text-slate-900 leading-none">
                1 USD = {exchangeRate.toFixed(2)} VES
              </p>
              {isSyncingRate && <span className="text-[10px] font-bold text-blue-500 animate-pulse">ACTUALIZANDO...</span>}
            </div>
          </div>
        </div>

        <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] flex gap-1 self-center lg:self-auto">
          <button
            onClick={() => setDisplayCurrency('USD')}
            className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${displayCurrency === 'USD' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}
          >
            Dólares
          </button>
          <button
            onClick={() => setDisplayCurrency('VES')}
            className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${displayCurrency === 'VES' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'}`}
          >
            Bolívares
          </button>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4 px-2">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            Flujo Neto Personal <ArrowUpRight size={20} className="text-blue-500" />
          </h2>
        </div>

        <div
          className={`relative overflow-hidden rounded-[3rem] p-8 md:p-10 border shadow-2xl ${
            isPositiveMonth
              ? 'bg-slate-950 border-emerald-900/40 text-white'
              : 'bg-slate-950 border-rose-900/40 text-white'
          }`}
        >
          <div
            className={`absolute inset-0 opacity-30 ${
              isPositiveMonth
                ? 'bg-[radial-gradient(circle_at_15%_85%,rgba(16,185,129,0.35),transparent_22%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.22),transparent_18%),radial-gradient(circle_at_65%_65%,rgba(59,130,246,0.12),transparent_24%)]'
                : 'bg-[radial-gradient(circle_at_15%_85%,rgba(244,63,94,0.30),transparent_22%),radial-gradient(circle_at_85%_20%,rgba(244,63,94,0.18),transparent_18%),radial-gradient(circle_at_65%_65%,rgba(59,130,246,0.10),transparent_24%)]'
            }`}
          />
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
            <div className="xl:col-span-7 flex gap-5">
              <div
                className={`hidden md:flex h-24 w-24 shrink-0 rounded-[2rem] items-center justify-center border ${
                  isPositiveMonth
                    ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.18)]'
                    : 'bg-rose-500/10 border-rose-400/30 text-rose-300 shadow-[0_0_40px_rgba(244,63,94,0.18)]'
                }`}
              >
                <Wallet size={38} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <p className={`text-[11px] font-black uppercase tracking-[0.25em] ${
                    isPositiveMonth ? 'text-emerald-300/90' : 'text-rose-300/90'
                  }`}>
                    Balance {monthName}
                  </p>

                  <div className="ml-auto hidden md:flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/90">
                    <CalendarDays size={16} />
                    <span className="capitalize">{monthName}</span>
                  </div>
                </div>

                <h3
                  className={`text-5xl md:text-7xl font-black tracking-tighter leading-none ${
                    isPositiveMonth ? 'text-white' : 'text-white'
                  }`}
                >
                  {netResult >= 0 ? '+' : ''}{formatValue(netResult)}
                </h3>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black border ${
                      isPositiveMonth
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'
                        : 'bg-rose-500/15 text-rose-300 border-rose-400/20'
                    }`}
                  >
                    {isPositiveMonth ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {isPositiveMonth ? 'Resultado positivo este mes' : 'Resultado negativo este mes'}
                  </div>
                </div>

                <p className="mt-5 max-w-[520px] text-sm md:text-base font-medium leading-relaxed text-slate-300">
                  {isPositiveMonth
                    ? `Tus ingresos superan a tus gastos en ${formatValue(Math.abs(netResult))} después de todas las transacciones personales.`
                    : `Tus gastos superan a tus ingresos en ${formatValue(Math.abs(netResult))} después de todas las transacciones personales.`}
                </p>
              </div>
            </div>

            <div className="xl:col-span-5 flex items-center">
              <div className="w-full h-full min-h-[180px] rounded-[2rem] border border-white/5 bg-white/[0.03] p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Tendencia mensual
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Visual
                  </div>
                </div>

                <div className="relative h-28 mt-4">
                  <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
                  <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="balanceLine" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={isPositiveMonth ? '#10b981' : '#fb7185'} />
                        <stop offset="100%" stopColor="#7dd3fc" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M8 105 C 40 105, 55 80, 82 82 C 106 84, 120 95, 145 76 C 168 58, 184 44, 210 50 C 235 56, 248 34, 276 26 C 292 22, 305 16, 312 10"
                      fill="none"
                      stroke="url(#balanceLine)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <circle cx="312" cy="10" r="6" fill={isPositiveMonth ? '#86efac' : '#fda4af'} />
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="border-r border-white/10 pr-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Ingresos Totales
                    </p>
                    <p className="text-2xl font-black text-white">
                      {formatValue(totalIncomeNormalized)}
                    </p>
                  </div>
                  <div className="pl-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Gastos Totales
                    </p>
                    <p className="text-2xl font-black text-white">
                      {formatValue(totalExpenseNormalized)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-emerald-600 rounded-[3rem] p-8 md:p-9 text-white relative overflow-hidden shadow-2xl shadow-emerald-100 transition-all hover:-translate-y-1">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_20%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.12),transparent_18%)]" />
            <div className="relative z-10">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/70 mb-3">
                Tus Ingresos Reales
              </p>
              <h3 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">
                {formatValue(totalIncomeNormalized)}
              </h3>

              <div className="mb-6 rounded-2xl bg-white/10 border border-white/10 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/60 mb-1">
                  Ingreso histórico del mes en USD
                </p>
                <p className="text-2xl font-black text-white">
                  ${totalIncomeHistoricalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="flex justify-between items-end border-t border-white/20 pt-6">
                <div>
                  <p className="text-[9px] font-black uppercase text-emerald-100/50 mb-1.5">Efectivo USD</p>
                  <p className="text-xl font-black">{formatSmallValue(incomeUSD, 'USD')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-emerald-100/50 mb-1.5">Bolívares VES</p>
                  <p className="text-xl font-black">{formatSmallValue(incomeVES, 'VES')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-8 md:p-9 border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:-translate-y-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
              Tus Gastos Personales
            </p>
            <h3 className="text-4xl md:text-5xl font-black mb-8 text-slate-900 tracking-tighter">
              {formatValue(totalExpenseNormalized)}
            </h3>

            <div className="flex justify-between items-end border-t border-slate-50 pt-6">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Débito USD</p>
                <p className="text-xl font-black text-slate-700">{formatSmallValue(expenseUSD, 'USD')}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-1.5">Consumo VES</p>
                <p className="text-xl font-black text-slate-700">{formatSmallValue(expenseVES, 'VES')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 px-2">
          Patrimonio Neto Real <Info size={16} className="text-slate-300" />
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4 bg-slate-900 rounded-[3.5rem] p-10 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[450px]">
            <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Activo Neto Propio</p>
              <h3 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter">{formatValue(realPersonalNetWorth)}</h3>
              <p className="text-sm font-medium text-slate-400 leading-relaxed max-w-[260px]">
                Valor total de tu riqueza personal descontando pasivos de terceros.
              </p>
            </div>
            <div className="space-y-5 pt-10 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase">Dinero Ajeno</span>
                <span className="text-xl font-black text-emerald-400
