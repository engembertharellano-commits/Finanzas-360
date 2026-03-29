import React, { useState, useMemo, useEffect } from 'react';
import { Budget, Currency, Transaction } from '../types';
import {
  Plus,
  PieChart,
  AlertCircle,
  Trash2,
  Wallet,
  TrendingUp,
  ChevronRight,
  Pencil
} from 'lucide-react';

interface Props {
  budgets: Budget[];
  transactions: Transaction[];
  onAdd: (b: Omit<Budget, 'id'>) => void;
  onDelete: (id: string) => void;
  exchangeRate: number;
  selectedMonth: string;
  expenseCategories: string[];
}

type BudgetFormState = {
  category: string;
  limit: number;
  currency: Currency;
};

type EditingContext = {
  sourceId: string;
  sourceMonth: string;
};

export const BudgetView: React.FC<Props> = ({
  budgets,
  transactions,
  onAdd,
  onDelete,
  exchangeRate,
  selectedMonth,
  expenseCategories
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContext, setEditingContext] = useState<EditingContext | null>(null);

  const [newBudget, setNewBudget] = useState<BudgetFormState>({
    category: expenseCategories[0] || '',
    limit: 0,
    currency: 'USD'
  });

  useEffect(() => {
    if (expenseCategories.length === 0) return;
    if (!expenseCategories.includes(newBudget.category)) {
      setNewBudget((prev) => ({ ...prev, category: expenseCategories[0] }));
    }
  }, [expenseCategories, newBudget.category]);

  const activeBudgets = useMemo(() => {
    const categories = Array.from(new Set(budgets.map((b) => b.category)));

    return categories
      .map((cat) => {
        const currentMonthBudget = budgets.find(
          (b) => b.category === cat && b.month === selectedMonth
        );
        if (currentMonthBudget) return currentMonthBudget;

        const pastBudgets = budgets
          .filter((b) => b.category === cat && b.month < selectedMonth)
          .sort((a, b) => b.month.localeCompare(a.month));

        return pastBudgets[0];
      })
      .filter(Boolean) as Budget[];
  }, [budgets, selectedMonth]);

  const budgetsWithSpent = useMemo(() => {
    const monthTransactions = transactions.filter(
      (t) => t.date.startsWith(selectedMonth) && t.type === 'Gasto'
    );

    return activeBudgets
      .map((b) => {
        const spent = monthTransactions
          .filter((t) => t.category === b.category)
          .reduce((acc, t) => {
            if (t.currency === b.currency) return acc + t.amount;
            return acc + (t.currency === 'USD' ? t.amount * exchangeRate : t.amount / exchangeRate);
          }, 0);

        const limit = b.limit || 0;
        const percentageRaw = (spent / (limit || 1)) * 100;
        const percentage = Math.min(percentageRaw, 999);
        const isOver = spent > limit;
        const isWarning = percentage >= 80 && !isOver;
        const isHistorical = b.month !== selectedMonth;
        const remaining = Math.max(0, limit - spent);

        return {
          ...b,
          spent,
          limit,
          percentage,
          isOver,
          isWarning,
          isHistorical,
          remaining
        };
      })
      .sort((a, b) => {
        if (a.isOver !== b.isOver) return a.isOver ? -1 : 1;
        if (a.isWarning !== b.isWarning) return a.isWarning ? -1 : 1;
        return b.percentage - a.percentage;
      });
  }, [activeBudgets, transactions, selectedMonth, exchangeRate]);

  const globalSummary = useMemo(() => {
    const totalUSD = budgetsWithSpent
      .filter((b) => b.currency === 'USD')
      .reduce((s, b) => s + b.limit, 0);

    const totalVES = budgetsWithSpent
      .filter((b) => b.currency === 'VES')
      .reduce((s, b) => s + b.limit, 0);

    const totalSpentUSD = budgetsWithSpent
      .filter((b) => b.currency === 'USD')
      .reduce((s, b) => s + (b.spent || 0), 0);

    const totalSpentVES = budgetsWithSpent
      .filter((b) => b.currency === 'VES')
      .reduce((s, b) => s + (b.spent || 0), 0);

    const remainingUSD = Math.max(0, totalUSD - totalSpentUSD);
    const remainingVES = Math.max(0, totalVES - totalSpentVES);

    return {
      totalUSD,
      totalVES,
      totalSpentUSD,
      totalSpentVES,
      remainingUSD,
      remainingVES
    };
  }, [budgetsWithSpent]);

  const resetForm = () => {
    setShowForm(false);
    setIsEditMode(false);
    setEditingContext(null);
    setNewBudget({
      category: expenseCategories[0] || '',
      limit: 0,
      currency: 'USD'
    });
  };

  const openCreateForm = () => {
    setIsEditMode(false);
    setEditingContext(null);
    setNewBudget({
      category: expenseCategories[0] || '',
      limit: 0,
      currency: 'USD'
    });
    setShowForm(true);
  };

  const openEditForm = (b: Budget) => {
    setIsEditMode(true);
    setEditingContext({ sourceId: b.id, sourceMonth: b.month });
    setNewBudget({
      category: b.category,
      limit: Number.isFinite(b.limit) ? b.limit : 0,
      currency: b.currency
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const safeLimit = Number(newBudget.limit);
    if (!Number.isFinite(safeLimit) || safeLimit <= 0) return;

    onAdd({
      category: newBudget.category,
      limit: safeLimit,
      currency: newBudget.currency,
      month: selectedMonth
    });

    resetForm();
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
    new Date(year, month - 1)
  );

  const formatMoney = (value: number, currency: Currency) => {
    const safe = Number.isFinite(value) ? value : 0;
    return `${currency === 'USD' ? '$' : 'Bs. '}${safe.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusLabel = (isOver: boolean, isWarning: boolean) => {
    if (isOver) return 'Excedido';
    if (isWarning) return 'Cerca del límite';
    return 'Controlado';
  };

  const getStatusClasses = (isOver: boolean, isWarning: boolean) => {
    if (isOver) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (isWarning) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  const getBarClasses = (isOver: boolean, isWarning: boolean) => {
    if (isOver) return 'bg-rose-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-indigo-500';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <PieChart size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">Presupuesto Global</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                  Configuración para {monthName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-8 pt-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Total en Dólares
                </p>
                <p className="text-2xl font-black text-slate-900">
                  ${globalSummary.totalUSD.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{
                        width: `${Math.min(
                          (globalSummary.totalSpentUSD / (globalSummary.totalUSD || 1)) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 italic">
                    Ejecutado: ${globalSummary.totalSpentUSD.toFixed(0)}
                  </span>
                </div>
                <p className="text-[10px] font-black text-emerald-600 mt-2">
                  Restante: ${globalSummary.remainingUSD.toFixed(0)}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Total en Bolívares
                </p>
                <p className="text-2xl font-black text-slate-900">
                  Bs. {globalSummary.totalVES.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{
                        width: `${Math.min(
                          (globalSummary.totalSpentVES / (globalSummary.totalVES || 1)) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 italic">
                    Ejecutado: Bs. {globalSummary.totalSpentVES.toFixed(0)}
                  </span>
                </div>
                <p className="text-[10px] font-black text-emerald-600 mt-2">
                  Restante: Bs. {globalSummary.remainingVES.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => (showForm ? resetForm() : openCreateForm())}
            className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <Plus size={20} /> {showForm ? 'Cerrar Formulario' : 'Ajustar Límites'}
          </button>
        </div>

        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Wallet size={200} />
        </div>
      </section>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-2xl animate-in zoom-in duration-300"
        >
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <TrendingUp size={18} />
            <h3 className="font-black uppercase text-xs tracking-widest">
              {isEditMode ? 'Editar Límite' : 'Definir Límite'} para {monthName}
            </h3>
          </div>

          {isEditMode && editingContext && editingContext.sourceMonth !== selectedMonth && (
            <p className="mb-4 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              Estás editando un límite heredado de <b>{editingContext.sourceMonth}</b>. Al guardar,
              se creará o actualizará para <b>{selectedMonth}</b>.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">
                Categoría de Gasto
              </label>
              <select
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 disabled:opacity-60"
                value={newBudget.category}
                onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                disabled={isEditMode}
                title={isEditMode ? 'Para cambiar categoría, crea otro límite.' : ''}
              >
                {expenseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">
                Límite Mensual
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg"
                  placeholder="0.00"
                  value={Number.isFinite(newBudget.limit) && newBudget.limit > 0 ? newBudget.limit : ''}
                  onChange={(e) =>
                    setNewBudget({
                      ...newBudget,
                      limit: e.target.value === '' ? 0 : Number(e.target.value)
                    })
                  }
                  required
                />
                <select
                  className="px-4 py-4 rounded-2xl bg-slate-50 border-none outline-none font-black text-slate-600"
                  value={newBudget.currency}
                  onChange={(e) => setNewBudget({ ...newBudget, currency: e.target.value as Currency })}
                >
                  <option value="USD">USD</option>
                  <option value="VES">VES</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {isEditMode ? 'Guardar cambios' : `Establecer para ${monthName}`} <ChevronRight size={18} />
            </button>
          </div>
        </form>
      )}

      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Seguimiento de límites</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">
              Vista lista para control rápido
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordenado por prioridad</p>
            <p className="text-sm font-black text-slate-700">Excedidos y alertas arriba</p>
          </div>
        </div>

        {budgetsWithSpent.length === 0 ? (
          <div className="py-20 text-center px-6">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
              No hay límites configurados
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {budgetsWithSpent.map((b) => {
              const barWidth = Math.min(b.percentage, 100);

              return (
                <div
                  key={b.id}
                  className={`px-6 md:px-8 py-6 transition-colors ${
                    b.isOver ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex flex-col xl:flex-row xl:items-center gap-5 xl:gap-8">
                    <div className="min-w-0 xl:w-[260px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-black text-slate-900 truncate">{b.category}</h4>

                        {b.isHistorical && (
                          <span
                            className="text-[9px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase tracking-wider"
                            title="Heredado del mes anterior"
                          >
                            Fijo
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusClasses(
                            b.isOver,
                            b.isWarning
                          )}`}
                        >
                          {getStatusLabel(b.isOver, b.isWarning)}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Límite: {formatMoney(b.limit, b.currency)}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-2xl px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            Gastado
                          </p>
                          <p className={`text-lg font-black ${b.isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                            {formatMoney(b.spent, b.currency)}
                          </p>
                        </div>

                        <div className="bg-slate-50 rounded-2xl px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            Restante
                          </p>
                          <p className="text-lg font-black text-slate-900">
                            {formatMoney(b.remaining, b.currency)}
                          </p>
                        </div>

                        <div className="bg-slate-50 rounded-2xl px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            Uso
                          </p>
                          <p className={`text-lg font-black ${b.isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                            {b.percentage.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${getBarClasses(
                              b.isOver,
                              b.isWarning
                            )}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span
                            className={
                              b.isOver
                                ? 'text-rose-600'
                                : b.isWarning
                                ? 'text-amber-600'
                                : 'text-slate-500'
                            }
                          >
                            {b.isOver
                              ? 'Ya superaste este límite'
                              : b.isWarning
                              ? 'Este límite está cerca de agotarse'
                              : 'Este límite va bajo control'}
                          </span>

                          {b.isOver && (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-black">
                              <AlertCircle size={14} />
                              Atención
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="xl:w-auto flex items-center gap-2 xl:self-start">
                      <button
                        onClick={() => openEditForm(b)}
                        className="p-3 text-slate-400 hover:text-indigo-600 transition-all bg-slate-50 hover:bg-indigo-50 rounded-2xl"
                        title={b.isHistorical ? 'Editar para este mes' : 'Editar presupuesto'}
                      >
                        <Pencil size={18} />
                      </button>

                      {!b.isHistorical && (
                        <button
                          onClick={() => onDelete(b.id)}
                          className="p-3 text-slate-400 hover:text-rose-500 transition-all bg-slate-50 hover:bg-rose-50 rounded-2xl"
                          title="Eliminar presupuesto"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
