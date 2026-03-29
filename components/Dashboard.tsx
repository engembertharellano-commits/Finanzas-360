import React, { useState, useMemo } from 'react';
import { Transaction, BankAccount, Investment, Budget } from '../types';
import {
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  RefreshCw, Info, Wallet,
  ArrowUpRight, Smartphone, Briefcase, Users
} from 'lucide-react';

interface Props {
  accounts: BankAccount[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: Budget[];
  selectedMonth: string;
  exchangeRate: number;
  onSyncRate: () => void;
  isSyncingRate: boolean;
}

export const Dashboard: React.FC<Props> = ({
  accounts,
  transactions,
  investments,
  budgets,
  selectedMonth,
  exchangeRate,
  onSyncRate,
  isSyncingRate
}) => {
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'VES'>('USD');

  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  const incomeUSD = monthTransactions
    .filter(t => t.type === 'Ingreso' && t.currency === 'USD')
    .reduce((s, t) => s + t.amount, 0);

  const incomeVES = monthTransactions
    .filter(t => t.type === 'Ingreso' && t.currency === 'VES')
    .reduce((s, t) => s + t.amount, 0);

  const expenseUSD = monthTransactions
    .filter(t => t.type === 'Gasto' && t.currency === 'USD')
    .reduce((s, t) => s + t.amount, 0);

  const expenseVES = monthTransactions
    .filter(t => t.type === 'Gasto' && t.currency === 'VES')
    .reduce((s, t) => s + t.amount, 0);

  const totalIncomeNormalized = incomeUSD + (incomeVES / exchangeRate);
  const totalExpenseNormalized = expenseUSD + (expenseVES / exchangeRate);
  const netResult = totalIncomeNormalized - totalExpenseNormalized;

  const totalLiquidUSD = accounts.reduce((acc, curr) => {
    const val = curr.currency === 'USD' ? curr.balance : curr.balance / exchangeRate;
    return acc + val;
  }, 0);

  const chartData = [
    { name: 'Dinero', value: totalLiquidUSD, color: '#3b82f6' }
  ];

  const formatValue = (val: number) => {
    if (displayCurrency === 'USD') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return `Bs. ${(val * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' })
    .format(new Date(year, month - 1));

  return (
    <div className="space-y-10">

      {/* TASA */}
      <div className="flex justify-between gap-6">
        <div className="bg-white px-6 py-5 rounded-2xl border flex items-center gap-4">
          <button onClick={onSyncRate}>
            <RefreshCw />
          </button>
          <div>
            <p className="text-xs">Tasa BCV</p>
            <p className="font-bold">1 USD = {exchangeRate.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* BALANCE PROTAGONISTA */}
      <div className="bg-slate-900 rounded-3xl p-10 text-white shadow-2xl">
        <p className="text-xs uppercase text-gray-400 mb-2">
          Balance {monthName}
        </p>

        <h1 className={`text-5xl font-bold ${
          netResult >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {netResult >= 0 ? '+' : ''}{formatValue(netResult)}
        </h1>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-xs">Ingresos</p>
            <p className="text-xl font-bold">
              {formatValue(totalIncomeNormalized)}
            </p>
          </div>

          <div className="bg-white/10 p-4 rounded-xl">
            <p className="text-xs">Gastos</p>
            <p className="text-xl font-bold">
              {formatValue(totalExpenseNormalized)}
            </p>
          </div>
        </div>
      </div>

      {/* TARJETAS */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-green-600 text-white p-6 rounded-2xl">
          <p>Ingresos</p>
          <h2 className="text-3xl">{formatValue(totalIncomeNormalized)}</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl border">
          <p>Gastos</p>
          <h2 className="text-3xl">{formatValue(totalExpenseNormalized)}</h2>
        </div>
      </div>

      {/* PATRIMONIO */}
      <div className="bg-white p-6 rounded-2xl border">
        <h3 className="font-bold mb-4">Patrimonio</h3>

        <ResponsiveContainer width="100%" height={200}>
          <RechartsPieChart>
            <Pie data={chartData} dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
