import React, { useState } from 'react';
import { Transaction, BankAccount, Investment } from '../types';
import {
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  RefreshCw,
  Info,
  Wallet,
  ArrowUpRight,
  Smartphone,
  Briefcase,
  Users,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Eye,
  Landmark,
  X,
  BarChart3
} from 'lucide-react';

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: any[];
  selectedMonth: string;
  exchangeRate: number;
  rateSourceUrl?: string;
  onSyncRate: () => void;
  isSyncingRate: boolean;
}

type NormalizedInvestment = {
  id: string;
  name: string;
  platform: string;
  currency: 'USD' | 'VES';
  rawValue: number;
  valueUSD: number;
};

export const Dashboard: React.FC<Props> = ({
  accounts,
  transactions,
  investments,
  selectedMonth,
  exchangeRate,
  onSyncRate,
  isSyncingRate
}) => {
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'VES'>('USD');
  const [showBalanceDetail, setShowBalanceDetail] = useState(false);

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

  const normalizedInvestments: NormalizedInvestment[] = investments.map((inv) => {
    const rawValue =
      typeof inv.value === 'number' && Number.isFinite(inv.value)
        ? inv.value
        : typeof inv.currentValue === 'number' && Number.isFinite(inv.currentValue)
        ? inv.currentValue
        : typeof inv.marketValue === 'number' && Number.isFinite(inv.marketValue)
        ? inv.marketValue
        : typeof inv.totalValue === 'number' && Number.isFinite(inv.totalValue)
        ? inv.totalValue
        : typeof inv.amount === 'number' && Number.isFinite(inv.amount)
        ? inv.amount
        : typeof inv.quantity === 'number' &&
          Number.isFinite(inv.quantity) &&
          typeof inv.currentMarketPrice === 'number' &&
          Number.isFinite(inv.currentMarketPrice)
        ? inv.quantity * inv.currentMarketPrice
        : typeof inv.quantity === 'number' &&
          Number.isFinite(inv.quantity) &&
          typeof inv.currentPrice === 'number' &&
          Number.isFinite(inv.currentPrice)
        ? inv.quantity * inv.currentPrice
        : typeof inv.quantity === 'number' &&
          Number.isFinite(inv.quantity) &&
          typeof inv.price === 'number' &&
          Number.isFinite(inv.price)
        ? inv.quantity * inv.price
        : typeof inv.quantity === 'number' &&
          Number.isFinite(inv.quantity) &&
          typeof inv.purchasePrice === 'number' &&
          Number.isFinite(inv.purchasePrice)
        ? inv.quantity * inv.purchasePrice
        : typeof inv.quantity === 'number' &&
          Number.isFinite(inv.quantity) &&
          typeof inv.buyPrice === 'number' &&
          Number.isFinite(inv.buyPrice)
        ? inv.quantity * inv.buyPrice
        : 0;

    const currency = inv.currency === 'VES' ? 'VES' : 'USD';
    const valueUSD = currency === 'VES' ? rawValue / exchangeRate : rawValue;

    return {
      id: inv.id,
      name: inv.name || inv.ticker || inv.symbol || 'Inversión',
      platform: inv.platform || inv.brokerId || inv.ticker || 'Sin plataforma',
      currency,
      rawValue,
      valueUSD
    };
  });

  const totalInvestedUSD = normalizedInvestments.reduce((acc, inv) => acc + inv.valueUSD, 0);

  const currentLiquidOwnUSD = Math.max(0, totalLiquidUSD - totalThirdPartyUSD);
  const currentTotalUSD = currentLiquidOwnUSD + totalInvestedUSD;
  const currentTotalVES = currentTotalUSD * exchangeRate;
  const realPersonalNetWorth = currentTotalUSD;

  const liquidAccountsForDetail = accounts
    .map((acc) => {
      const valueUSD = acc.currency === 'USD' ? acc.balance : acc.balance / exchangeRate;
      const adjustedUSD = acc.type === 'Tarjeta de Crédito' ? -Math.abs(valueUSD) : valueUSD;

      return {
        ...acc,
        valueUSD: adjustedUSD
      };
    })
    .filter((acc) => acc.type !== 'Tarjeta de Crédito' && acc.valueUSD > 0)
    .sort((a, b) => b.valueUSD - a.valueUSD);

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

  const formatMoney = (val: number, currency: 'USD' | 'VES', digits = 2) => {
    const safe = Number.isFinite(val) ? val : 0;
    return currency === 'USD'
      ? `$${safe.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
      : `Bs. ${safe.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  };

  const formatSmallValue = (val: number, curr: 'USD' | 'VES') => {
    return curr === 'USD'
      ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : `Bs. ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthDate = new Date(year, month - 1);
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(monthDate);
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const balanceAccentClasses =
    netResult >= 0 ? 'text-emerald-300' : 'text-rose-300';

  const balanceBadgeClasses =
    netResult >= 0
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'
      : 'bg-rose-500/15 text-rose-300 border-rose-400/20';

  return (
    <>
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
                {isSyncingRate && (
                  <span className="text-[10px] font-bold text-blue-500 animate-pulse">
                    ACTUALIZANDO...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-200/50 p-1.5 rounded-[1.8rem] flex gap-1 self-center lg:self-auto">
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                displayCurrency === 'USD' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'
              }`}
            >
              Dólares
            </button>
            <button
              onClick={() => setDisplayCurrency('VES')}
              className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                displayCurrency === 'VES' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500'
              }`}
            >
              Bolívares
            </button>
          </div>
        </div>

        <section className="space-y-6">
          {/* SALDO ACTUAL TOTAL */}
          <div className="rounded-[2.8rem] border border-emerald-300/80 bg-white shadow-[0_20px_60px_-35px_rgba(16,185,129,0.45)] overflow-hidden">
            <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-0">
              <div className="p-8 md:p-9 border-b xl:border-b-0 xl:border-r border-slate-100">
                <div className="flex items-start gap-5">
                  <div className="w-24 h-24 rounded-[2rem] bg-emerald-950 text-emerald-300 flex items-center justify-center shadow-[0_18px_35px_-18px_rgba(5,150,105,0.75)] shrink-0">
                    <Wallet size={40} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                        Saldo actual total
                      </p>
                      <Info size={16} className="text-slate-300" />
                    </div>

                    <h3 className="text-5xl md:text-6xl font-black tracking-tighter text-emerald-950 leading-none">
                      {formatMoney(currentTotalUSD, 'USD')}
                    </h3>

                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
                      <RefreshCw size={14} />
                      <span className="text-sm font-black">
                        Equivalente: {formatMoney(currentTotalVES, 'VES')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-9">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Desglose
                  </p>

                  <button
                    onClick={() => setShowBalanceDetail(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-black text-sm hover:bg-emerald-100 transition-colors"
                  >
                    <Eye size={16} />
                    Ver detalle
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-[2rem] px-5 py-5 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Landmark size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700">
                          Liquidez disponible
                        </p>
                        <p className="text-3xl font-black text-emerald-700 mt-1">
                          {formatMoney(currentLiquidOwnUSD, 'USD')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] px-5 py-5 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700">
                          Invertido
                        </p>
                        <p className="text-3xl font-black text-violet-700 mt-1">
                          {formatMoney(totalInvestedUSD, 'USD')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FLUJO NETO */}
          <div className="flex items-center gap-2 px-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              Flujo Neto Personal
              <ArrowUpRight size={20} className="text-blue-500" />
            </h2>
          </div>

          <div className="relative overflow-hidden rounded-[3rem] border border-slate-800/60 bg-slate-950 shadow-[0_30px_80px_-25px_rgba(15,23,42,0.55)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_22%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_22%)]" />
            <div className="absolute inset-y-0 right-0 w-[48%] hidden lg:block opacity-90">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(52,211,153,0.06),transparent)]" />
              <svg
                viewBox="0 0 600 300"
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="balanceLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.00)" />
                    <stop offset="40%" stopColor="rgba(52,211,153,0.35)" />
                    <stop offset="100%" stopColor="rgba(110,231,183,0.95)" />
                  </linearGradient>
                  <linearGradient id="balanceGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.00)" />
                    <stop offset="100%" stopColor="rgba(16,185,129,0.28)" />
                  </linearGradient>
                </defs>

                <path
                  d="M20 250 C90 250, 130 225, 180 195 S280 170, 330 145 S420 160, 470 105 S545 95, 580 48"
                  fill="none"
                  stroke="url(#balanceLine)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M20 250 C90 250, 130 225, 180 195 S280 170, 330 145 S420 160, 470 105 S545 95, 580 48 L580 300 L20 300 Z"
                  fill="url(#balanceGlow)"
                  opacity="0.5"
                />
                <circle cx="580" cy="48" r="10" fill="rgba(110,231,183,1)" />
                <circle cx="580" cy="48" r="20" fill="rgba(110,231,183,0.18)" />
              </svg>
            </div>

            <div className="relative z-10 p-8 md:p-10 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
                <div>
                  <div className="flex items-start gap-5">
                    <div className="w-24 h-24 rounded-full border border-emerald-400/40 bg-emerald-500/10 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.25)] shrink-0">
                      <Wallet size={40} className="text-emerald-300" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300 mb-3">
                        Balance {monthName}
                      </p>

                      <h3 className={`text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none ${balanceAccentClasses}`}>
                        {netResult >= 0 ? '+' : ''}{formatValue(netResult)}
                      </h3>

                      <div className={`inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full border text-sm font-black ${balanceBadgeClasses}`}>
                        {netResult >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {netResult >= 0 ? 'Resultado positivo este mes' : 'Resultado negativo este mes'}
                      </div>

                      <p className="mt-5 text-base md:text-lg text-slate-300 max-w-[560px] leading-relaxed">
                        Tus ingresos superan a tus gastos en{' '}
                        <span className="font-black text-white">
                          {formatValue(Math.abs(netResult))}
                        </span>{' '}
                        después de todas las transacciones personales del mes.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-7 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">
                        <TrendingUp size={24} className="text-emerald-300" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                          Ingresos Totales
                        </p>
                        <p className="text-3xl font-black text-white">
                          {formatValue(totalIncomeNormalized)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-400/20 flex items-center justify-center">
                        <TrendingDown size={24} className="text-rose-300" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                          Gastos Totales
                        </p>
                        <p className="text-3xl font-black text-white">
                          {formatValue(totalExpenseNormalized)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex justify-end">
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-[1.4rem] bg-white/5 border border-white/10 shadow-[0_12px_30px_-18px_rgba(16,185,129,0.45)]">
                    <CalendarDays size={18} className="text-emerald-300" />
                    <span className="text-lg font-black text-white">
                      {monthNameCapitalized}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INGRESOS Y GASTOS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="relative overflow-hidden rounded-[2.8rem] border border-emerald-500/20 bg-emerald-700 shadow-[0_25px_60px_-30px_rgba(5,150,105,0.55)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(110,231,183,0.22),transparent_24%)]" />
              <div className="relative z-10 p-8 md:p-9 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-[1.8rem] bg-white/10 border border-white/10 flex items-center justify-center shadow-lg">
                      <Wallet size={34} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/70 mb-3">
                        Tus Ingresos Reales
                      </p>
                      <h3 className="text-5xl md:text-6xl font-black tracking-tighter">
                        {formatValue(totalIncomeNormalized)}
                      </h3>
                    </div>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-white/10 flex items-center justify-center">
                    <ArrowUpRight size={26} className="text-white" />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/15">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100/60 mb-2">
                    Ingreso histórico del mes en USD
                  </p>
                  <p className="text-3xl font-black text-white">
                    ${totalIncomeHistoricalUSD.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/55 mb-1.5">
                      Efectivo USD
                    </p>
                    <p className="text-2xl font-black text-white">
                      {formatSmallValue(incomeUSD, 'USD')}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/55 mb-1.5">
                      Bolívares VES
                    </p>
                    <p className="text-2xl font-black text-white">
                      {formatSmallValue(incomeVES, 'VES')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.8rem] p-8 md:p-9 border border-slate-200 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)] overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.06),transparent_20%)]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-[1.8rem] bg-rose-50 border border-rose-100 flex items-center justify-center shadow-sm">
                      <TrendingDown size={32} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                        Tus Gastos Personales
                      </p>
                      <h3 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">
                        {formatValue(totalExpenseNormalized)}
                      </h3>
                    </div>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <ArrowUpRight size={24} className="text-rose-500 rotate-90" />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1.5">
                      Débito USD
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {formatSmallValue(expenseUSD, 'USD')}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1.5">
                      Consumo VES
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {formatSmallValue(expenseVES, 'VES')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PATRIMONIO */}
        <section className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 px-2">
            Patrimonio Neto Real <Info size={16} className="text-slate-300" />
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-4 bg-slate-900 rounded-[3.5rem] p-10 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[450px]">
              <div>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">
                  Activo Neto Propio
                </p>
                <h3 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter">
                  {formatValue(realPersonalNetWorth)}
                </h3>
                <p className="text-sm font-medium text-slate-400 leading-relaxed max-w-[260px]">
                  Valor total de tu riqueza personal descontando pasivos de terceros.
                </p>
              </div>

              <div className="space-y-5 pt-10 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    Dinero Ajeno
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    -{formatValue(totalThirdPartyUSD)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    Saldo en Bancos
                  </span>
                  <span className="text-xl font-black">
                    {formatValue(totalLiquidUSD)}
                  </span>
                </div>
              </div>
            </div>

            <div className="xl:col-span-8 bg-white rounded-[3.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-10">
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">
                  Distribución por Entidad
                </h4>
                <div className="space-y-5 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                  {accounts.map(acc => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between group p-3 hover:bg-slate-50 rounded-[1.5rem] transition-all border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          {acc.type === 'Billetera Virtual' ? <Smartphone size={18} /> : <Wallet size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">
                            {acc.name}
                          </p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {acc.type}
                          </p>
                        </div>
                      </div>
                      <p className="text-base font-black text-slate-800">
                        {acc.currency === 'USD' ? '$' : 'Bs.'} {acc.balance.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {accounts.length === 0 && (
                    <div className="py-10 text-center opacity-30 italic font-medium">
                      No hay cuentas registradas
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-[280px] flex flex-col items-center justify-center pt-10 md:pt-0 border-t md:border-t-0 md:border-l border-slate-50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">
                  Composición de Caja
                </h4>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={chartData}
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '24px',
                          border: 'none',
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                          padding: '15px'
                        }}
                        itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-[9px] font-black uppercase text-slate-500">Propio</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black uppercase text-slate-500">Custodia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
            <div className="bg-indigo-50/70 border-2 border-indigo-100 p-6 rounded-[2.5rem] flex items-center gap-5 group transition-all hover:bg-indigo-50">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Briefcase size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest leading-none mb-1">
                  Fondo de Trabajo
                </p>
                <p className="text-xs font-bold text-indigo-400 italic">
                  Anticipos y gastos corporativos aislados.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/70 border-2 border-emerald-100 p-6 rounded-[2.5rem] flex items-center gap-5 group transition-all hover:bg-emerald-50">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1">
                  Gestión de Terceros
                </p>
                <p className="text-xs font-bold text-emerald-400 italic">
                  Dinero bajo tu cuidado pero de otros dueños.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* MODAL DETALLE SALDO ACTUAL */}
      {showBalanceDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setShowBalanceDetail(false)}
          />

          <div className="relative z-10 w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-[2.5rem] bg-white shadow-[0_40px_100px_-30px_rgba(15,23,42,0.55)] border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between gap-4 p-6 md:p-8 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-950 text-emerald-300 flex items-center justify-center shadow-[0_18px_35px_-18px_rgba(5,150,105,0.75)]">
                  <Wallet size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    Detalle del Saldo Actual
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">
                    Composición completa de tu patrimonio actual
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBalanceDetail(false)}
                className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
                title="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(92vh-110px)] p-6 md:p-8 space-y-6">
              <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/50 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 mb-2">
                      Saldo actual total
                    </p>
                    <p className="text-5xl font-black tracking-tighter text-emerald-950">
                      {formatMoney(currentTotalUSD, 'USD')}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-emerald-100 text-emerald-700 self-start">
                    <RefreshCw size={14} />
                    <span className="text-sm font-black">
                      Equivalente: {formatMoney(currentTotalVES, 'VES')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-[2rem] bg-slate-50 border border-slate-100 p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Landmark size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700">Liquidez disponible</p>
                      <p className="text-3xl font-black text-emerald-700 mt-1">
                        {formatMoney(currentLiquidOwnUSD, 'USD')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-slate-50 border border-slate-100 p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700">Inversiones</p>
                      <p className="text-3xl font-black text-violet-700 mt-1">
                        {formatMoney(totalInvestedUSD, 'USD')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-[2rem] border border-emerald-200 overflow-hidden">
                  <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Landmark size={22} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900">Liquidez Disponible</p>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                          {liquidAccountsForDetail.length} cuentas
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-emerald-700">
                      Total: {formatMoney(currentLiquidOwnUSD, 'USD')}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[560px]">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
                          <th className="px-5 py-4">Cuenta / Entidad</th>
                          <th className="px-5 py-4">Tipo</th>
                          <th className="px-5 py-4">Moneda</th>
                          <th className="px-5 py-4 text-right">Saldo en USD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {liquidAccountsForDetail.map((acc) => (
                          <tr key={acc.id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-4">
                              <p className="font-black text-slate-900">{acc.name}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                                {acc.type}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-black text-slate-600">{acc.currency}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <p className="font-black text-slate-900">
                                {formatMoney(acc.valueUSD, 'USD')}
                              </p>
                              {acc.currency === 'VES' && (
                                <p className="text-xs text-slate-400">
                                  ({formatMoney(acc.balance, 'VES')})
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}

                        {liquidAccountsForDetail.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-bold">
                              No hay liquidez disponible registrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-violet-200 overflow-hidden">
                  <div className="px-5 py-4 bg-violet-50 border-b border-violet-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                        <BarChart3 size={22} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900">Inversiones</p>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                          {normalizedInvestments.length} activos
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-violet-700">
                      Total: {formatMoney(totalInvestedUSD, 'USD')}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[560px]">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
                          <th className="px-5 py-4">Activo</th>
                          <th className="px-5 py-4">Plataforma</th>
                          <th className="px-5 py-4">Moneda</th>
                          <th className="px-5 py-4 text-right">Valor en USD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {normalizedInvestments.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-4">
                              <p className="font-black text-slate-900">{inv.name}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-600">{inv.platform}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-black text-slate-600">{inv.currency}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <p className="font-black text-slate-900">
                                {formatMoney(inv.valueUSD, 'USD')}
                              </p>
                              {inv.currency === 'VES' && (
                                <p className="text-xs text-slate-400">
                                  ({formatMoney(inv.rawValue, 'VES')})
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}

                        {normalizedInvestments.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-bold">
                              No hay inversiones registradas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.6rem] bg-blue-50 border border-blue-100 px-5 py-4">
                <p className="text-sm font-bold text-blue-800">
                  El saldo actual mostrado aquí representa tu dinero propio disponible más el valor actual de tus inversiones.
                  El dinero de terceros se excluye y sigue reflejándose en Patrimonio Neto Real.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
