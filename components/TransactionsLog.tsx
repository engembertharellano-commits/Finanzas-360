import React, { useState, useMemo } from 'react';
import { Transaction, BankAccount } from '../types';
import { TransactionForm } from './TransactionForm';
import { Search, ArrowUpCircle, ArrowDownCircle, RefreshCcw, Trash2, Briefcase, Users } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  accounts: BankAccount[];
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  selectedMonth: string;
  exchangeRate: number;
  expenseCategories: string[];
  incomeCategories: string[];
}

export const TransactionsLog: React.FC<Props> = ({ 
  transactions, accounts, onAdd, onDelete, selectedMonth, exchangeRate, expenseCategories, incomeCategories 
}) => {

  const [filter, setFilter] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);

  // ✅ NUEVO ESTADO
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  const monthName = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(year, month - 1));
  }, [selectedMonth]);

  const filteredTransactions = transactions
    .filter(t => t.date.startsWith(selectedMonth))

    // 🔍 filtro texto
    .filter(t => 
      t.description.toLowerCase().includes(filter.toLowerCase()) || 
      t.category.toLowerCase().includes(filter.toLowerCase())
    )

    // ✅ NUEVO FILTRO POR ORIGEN
    .filter(t => {
      if (selectedAccount === "all") return true;

      return (
        t.accountId === selectedAccount ||
        t.toAccountId === selectedAccount
      );
    });

  return (
    <div className="space-y-8 pb-10">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Bitácora de Movimientos</h2>
          <p className="text-slate-500 text-sm font-medium">Control total de entradas y salidas del periodo</p>
        </div>

        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
            showAdd ? 'bg-white text-slate-600 border-2 border-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {showAdd ? 'Cerrar Panel' : 'Añadir Operación'}
        </button>
      </div>

      {showAdd && (
        <div className="animate-in fade-in slide-in-from-top-6 duration-500">
          <TransactionForm 
            onAdd={(t) => {
              let enhanced = { ...t };

              if (t.currency === 'VES' && exchangeRate > 0) {
                enhanced = {
                  ...t,
                  exchangeRateAtCreation: exchangeRate,
                  usdEquivalentAtCreation: t.amount / exchangeRate
                };
              }

              onAdd(enhanced);
              setShowAdd(false);
            }} 
            accounts={accounts}
            globalExchangeRate={exchangeRate}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
          />
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">

        {/* 🔥 FILTROS */}
        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row gap-4">

          {/* BUSCADOR */}
          <div className="relative group flex-1">
            <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" />
            <input 
              className="w-full pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:bg-white focus:border-blue-100 text-sm font-bold"
              placeholder="Filtra por nombre, categoría o etiqueta..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          {/* ✅ DROPDOWN ORIGEN */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-sm font-bold"
          >
            <option value="all">Todas las cuentas</option>

            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}

          </select>

        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                <th className="px-10 py-6">Fecha</th>
                <th className="px-10 py-6">Detalle de Operación</th>
                <th className="px-10 py-6">Origen</th>
                <th className="px-10 py-6 text-right">Monto</th>
                <th className="px-10 py-6 text-center">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.map(t => {
                const sourceAcc = accounts.find(a => a.id === t.accountId);
                
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">

                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-900">
                        {new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </p>
                    </td>

                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-900">{t.description}</p>
                    </td>

                    <td className="px-10 py-6">
                      <span className="text-xs font-black text-slate-700">
                        {sourceAcc?.name || '---'}
                      </span>
                    </td>

          <td className="px-10 py-6 text-right">
  <p className={`font-bold ${
    t.type === 'ingreso'
      ? 'text-blue-500'
      : t.type === 'gasto'
      ? 'text-red-500'
      : 'text-black'
  }`}>
    ${t.amount.toFixed(2)}
  </p>
</td>

                    <td className="px-10 py-6 text-center">
                      <button onClick={() => onDelete(t.id)}>
                        <Trash2 size={18} />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
