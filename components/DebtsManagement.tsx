import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Banknote,
  ArrowUpRight,
  Search,
  Filter,
  ArrowUpFromLine,
  ArrowDownToLine
} from 'lucide-react';
import { Debt, BankAccount, Transaction, Currency, DebtPayment } from '../types';

interface DebtsManagementProps {
  debts: Debt[];
  accounts: BankAccount[];
  onAdd: (debt: Debt) => void;
  onUpdate: (debt: Debt) => void;
  onDelete: (id: string) => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  exchangeRate: number;
}

export const DebtsManagement: React.FC<DebtsManagementProps> = ({
  debts,
  accounts,
  onAdd,
  onUpdate,
  onDelete,
  onAddTransaction,
  exchangeRate
}) => {
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const matchesSearch = d.creditor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            d.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || d.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [debts, searchTerm, filterStatus]);

  const totals = useMemo(() => {
    const pendingDebts = debts.filter(d => d.status !== 'paid');
    const totalUSD = pendingDebts.reduce((acc, d) => {
      const remaining = d.amount - d.payments.reduce((sum, p) => sum + p.amount, 0);
      return acc + (d.currency === 'USD' ? remaining : remaining / exchangeRate);
    }, 0);
    const totalVES = pendingDebts.reduce((acc, d) => {
      const remaining = d.amount - d.payments.reduce((sum, p) => sum + p.amount, 0);
      return acc + (d.currency === 'VES' ? remaining : remaining * exchangeRate);
    }, 0);
    return { usd: totalUSD, ves: totalVES };
  }, [debts, exchangeRate]);

  const handleCreateDebt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const accountId = formData.get('accountId') as string;
    const creditor = formData.get('creditor') as string;
    const description = formData.get('description') as string;
    const dueDate = formData.get('dueDate') as string;
    const interestRate = Number(formData.get('interestRate')) || 0;
    const commission = Number(formData.get('commission')) || 0;

    const newDebt: Debt = {
      id: crypto.randomUUID(),
      creditor,
      amount,
      currency,
      interestRate,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate || undefined,
      status: 'pending',
      description,
      accountId,
      commission,
      payments: []
    };

    onAdd(newDebt);

    // Create a transaction to reflect the money coming in (amount - commission)
    onAddTransaction({
      description: `Deuda con ${creditor}${commission > 0 ? ' (neto de comisión)' : ''}`,
      amount: amount - commission,
      type: 'Ingreso',
      category: 'Deudas',
      date: new Date().toISOString().split('T')[0],
      currency,
      accountId
    });

    setIsAddingDebt(false);
  };

  const handleAddPayment = (debtId: string, amount: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const newPayment: DebtPayment = {
      id: crypto.randomUUID(),
      amount,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedPayments = [...(debt.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + (p?.amount || 0), 0);
    
    const updatedDebt: Debt = {
      ...debt,
      payments: updatedPayments,
      status: totalPaid >= debt.amount ? 'paid' : 'pending'
    };

    onUpdate(updatedDebt);

    // Create a transaction to reflect the money going out
    onAddTransaction({
      description: `Pago de deuda: ${debt.creditor}`,
      amount: amount,
      type: 'Gasto',
      category: 'Deudas',
      date: new Date().toISOString().split('T')[0],
      currency: debt.currency,
      accountId: debt.accountId
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Mis Deudas</h1>
          <p className="text-slate-500 font-medium">Lleva el control de lo que debes a otros y tus compromisos de pago.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-end min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Deuda USD</span>
            <span className="text-2xl font-black text-rose-600">${totals.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-3xl shadow-xl flex flex-col items-end min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Deuda VES</span>
            <span className="text-2xl font-black text-white">{totals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por acreedor o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium"
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-600 appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="paid">Pagados</option>
            <option value="overdue">Vencidos</option>
          </select>
          <button 
            onClick={() => setIsAddingDebt(true)}
            className="flex items-center gap-2 px-8 py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            Nueva Deuda
          </button>
        </div>
      </div>

      {/* Debts Grid/List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredDebts.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Banknote className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No hay deudas registradas</h3>
            <p className="text-slate-400 max-w-xs font-medium">Registra tus deudas para tener un panorama real de tu situación financiera.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                  <th className="px-6 py-4">Acreedor</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4">Progreso / Fechas</th>
                  <th className="px-6 py-4 text-right">Por pagar</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDebts.map(debt => {
                  const payments = Array.isArray(debt.payments) ? debt.payments : [];
                  const totalPaid = payments.reduce((sum, p) => sum + (p?.amount || 0), 0);
                  const remaining = (debt.amount || 0) - totalPaid;
                  const progress = (totalPaid / debt.amount) * 100;
                  const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status !== 'paid';

                  return (
                    <React.Fragment key={debt.id}>
                      <tr 
                        onClick={() => setSelectedDebtId(debt.id === selectedDebtId ? null : debt.id)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedDebtId === debt.id ? 'bg-slate-50/80' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm
                              ${debt.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-900'}
                            `}>
                              {debt.creditor.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-sm">{debt.creditor}</span>
                              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{debt.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-base font-black text-slate-900">
                            {debt.currency === 'USD' ? '$' : ''}{debt.amount.toLocaleString()} {debt.currency === 'VES' ? 'VES' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {debt.status === 'paid' ? 'Liquidada' : isOverdue ? 'Vencida' : 'Pendiente'}
                              </span>
                              <span className="text-xs font-black text-slate-900">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${debt.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Inicio: {debt.startDate}</span>
                              {debt.dueDate && (
                                <span className={`text-[9px] font-bold uppercase ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                  Vence: {debt.dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-base font-black text-rose-600">
                            {debt.currency === 'USD' ? '$' : ''}{remaining.toLocaleString()} {debt.currency === 'VES' ? 'VES' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {debt.status === 'paid' ? (
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1">
                                <CheckCircle2 size={12} /> Pagado
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2 py-1 bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1">
                                <Clock size={12} /> Vencido
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-md flex items-center gap-1">
                                <Clock size={12} /> Pendiente
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Accordion para detalles y pagos */}
                      {selectedDebtId === debt.id && (
                        <tr>
                          <td colSpan={5} className="p-0 border-b border-slate-100">
                            <div className="bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-300 shadow-inner">
                              <div className="flex justify-between items-center mb-6">
                                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Historial de Pagos</h4>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const amountStr = prompt(`Ingresa el monto a pagar a ${debt.creditor} (${debt.currency}):`, remaining.toString());
                                    if (amountStr) {
                                      const val = parseFloat(amountStr);
                                      if (!isNaN(val) && val > 0) handleAddPayment(debt.id, val);
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-rose-500 transition-colors"
                                >
                                  <Plus size={14} /> Registrar Abono
                                </button>
                              </div>

                              <div className="space-y-3">
                                {debt.payments.length === 0 ? (
                                  <p className="text-center py-4 text-slate-400 text-xs font-bold uppercase tracking-widest italic">Sin abonos registrados</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {debt.payments.map(payment => (
                                      <div key={payment.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center">
                                            <ArrowUpFromLine size={12} />
                                          </div>
                                          <span className="text-xs font-bold text-slate-600">{payment.date}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900">
                                          -{debt.currency === 'USD' ? '$' : ''}{payment.amount.toLocaleString()} {debt.currency === 'VES' ? 'VES' : ''}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="mt-6 flex justify-end gap-3">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(debt.id);
                                  }}
                                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                                  title="Eliminar registro de deuda"
                                >
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Agregar Deuda */}
      {isAddingDebt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddingDebt(false)} />
          <div className="relative bg-white w-full max-w-xl max-h-[90vh] flex flex-col rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-10 shrink-0">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nueva Deuda</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Registra dinero que has recibido y debes devolver</p>
                </div>
                <button onClick={() => setIsAddingDebt(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateDebt} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Acreedor (Persona/Entidad)</label>
                    <input 
                      name="creditor" 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold"
                      placeholder="Ej: Banco o Familiar"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Monto inicial</label>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01" 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Moneda</label>
                    <select 
                      name="currency" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold appearance-none"
                    >
                      <option value="USD">Dólares (USD)</option>
                      <option value="VES">Bolívares (VES)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Depositar en cuenta</label>
                    <select 
                      name="accountId" 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold appearance-none"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toLocaleString()} {acc.currency})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha Vencimiento (Opcional)</label>
                    <input 
                      name="dueDate" 
                      type="date" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Comisión / Descuento inicial</label>
                    <input 
                      name="commission" 
                      type="number" 
                      step="0.01" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tasa Interés Anual % (Opcional)</label>
                    <input 
                      name="interestRate" 
                      type="number" 
                      step="0.1" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descripción</label>
                  <textarea 
                    name="description" 
                    rows={3} 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold resize-none"
                    placeholder="¿Para qué recibiste este dinero?"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-rose-600 text-white rounded-[2rem] font-black text-lg hover:bg-rose-700 transition-all shadow-2xl active:scale-[0.98] mt-4"
                >
                  Registrar Deuda
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
