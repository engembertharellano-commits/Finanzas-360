import React, { useState, useMemo } from 'react';
import { BankAccount, AccountType, Currency } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  Smartphone,
  BarChart2,
  CalendarDays,
  AlertCircle,
  TrendingUp,
  Info
} from 'lucide-react';

interface Props {
  accounts: BankAccount[];
  onAdd: (acc: BankAccount) => void;
  onUpdate: (acc: BankAccount) => void;
  onDelete: (id: string) => void;
  onAddTransaction: (t: any) => void; // Para registrar el pago
}

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'Ahorros',
  'Corriente',
  'Efectivo',
  'Billetera Virtual',
  'Broker',
  'Tarjeta de Crédito'
];

const getGroupAccent = (type: AccountType) => {
  switch (type) {
    case 'Ahorros':
      return {
        bar: 'bg-blue-500',
        badge: 'bg-blue-500 text-white',
        iconBg: 'bg-blue-500/10',
        iconText: 'text-blue-600',
        dot: 'bg-blue-400'
      };
    case 'Corriente':
      return {
        bar: 'bg-indigo-500',
        badge: 'bg-indigo-500 text-white',
        iconBg: 'bg-indigo-500/10',
        iconText: 'text-indigo-600',
        dot: 'bg-indigo-400'
      };
    case 'Efectivo':
      return {
        bar: 'bg-emerald-500',
        badge: 'bg-emerald-500 text-white',
        iconBg: 'bg-emerald-500/10',
        iconText: 'text-emerald-600',
        dot: 'bg-emerald-400'
      };
    case 'Billetera Virtual':
      return {
        bar: 'bg-violet-500',
        badge: 'bg-violet-500 text-white',
        iconBg: 'bg-violet-500/10',
        iconText: 'text-violet-600',
        dot: 'bg-violet-400'
      };
    case 'Broker':
      return {
        bar: 'bg-cyan-500',
        badge: 'bg-cyan-500 text-white',
        iconBg: 'bg-cyan-500/10',
        iconText: 'text-cyan-600',
        dot: 'bg-cyan-400'
      };
    case 'Tarjeta de Crédito':
      return {
        bar: 'bg-rose-500',
        badge: 'bg-rose-500 text-white',
        iconBg: 'bg-rose-500/10',
        iconText: 'text-rose-600',
        dot: 'bg-rose-400'
      };
    default:
      return {
        bar: 'bg-blue-500',
        badge: 'bg-blue-500 text-white',
        iconBg: 'bg-blue-500/10',
        iconText: 'text-blue-600',
        dot: 'bg-blue-400'
      };
  }
};

export const AccountsList: React.FC<Props> = ({ accounts, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [payingCardId, setPayingCardId] = useState<string | null>(null); // Nuevo: para el pago rápido
  const [paymentData, setPaymentData] = useState({ fromAccountId: '', amount: 0 });

  const [newAcc, setNewAcc] = useState({
    name: '',
    type: 'Ahorros' as AccountType,
    balance: 0,
    currency: 'USD' as Currency,
    color: '#3b82f6',
    creditLimit: 0,
    closingDay: 1,
    dueDay: 1,
    annualInterestRate: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedBalance = Number(newAcc.balance) || 0;
    const parsedLimit = Number(newAcc.creditLimit) || 0;
    const parsedClosingDay = Math.min(31, Math.max(1, Math.trunc(Number(newAcc.closingDay) || 1)));
    const parsedDueDay = Math.min(31, Math.max(1, Math.trunc(Number(newAcc.dueDay) || 1)));

    const isCredit = newAcc.type === 'Tarjeta de Crédito';

    const accountData: BankAccount = {
      ...newAcc,
      id: editingId || crypto.randomUUID(),
      balance: isCredit ? -Math.abs(parsedBalance) : parsedBalance,
      ...(isCredit
        ? {
            creditLimit: Math.max(0, parsedLimit),
            closingDay: parsedClosingDay,
            dueDay: parsedDueDay,
            annualInterestRate: Number(newAcc.annualInterestRate) || 0
          }
        : {
            creditLimit: undefined,
            closingDay: undefined,
            dueDay: undefined,
            annualInterestRate: undefined
          })
    };

    if (editingId) {
      onUpdate(accountData);
    } else {
      onAdd(accountData);
    }

    handleCancel();
  };

  const handleEdit = (acc: BankAccount) => {
    setEditingId(acc.id);
    setNewAcc({
      name: acc.name,
      type: acc.type,
      balance: Math.abs(acc.balance),
      currency: acc.currency,
      color: acc.color || '#3b82f6',
      creditLimit: acc.creditLimit || 0,
      closingDay: acc.closingDay || 1,
      dueDay: acc.dueDay || 1,
      annualInterestRate: acc.annualInterestRate || 0
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setNewAcc({
      name: '',
      type: 'Ahorros',
      balance: 0,
      currency: 'USD',
      color: '#3b82f6',
      creditLimit: 0,
      closingDay: 1,
      dueDay: 1,
      annualInterestRate: 0
    });
  };

  const handleQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const card = accounts.find(a => a.id === payingCardId);
    const fromAcc = accounts.find(a => a.id === paymentData.fromAccountId);
    
    if (!card || !fromAcc || paymentData.amount <= 0) return;

    onAddTransaction({
      description: `Pago de Tarjeta: ${card.name}`,
      amount: paymentData.amount,
      type: 'Transferencia',
      category: 'Pago Tarjeta',
      date: new Date().toISOString().split('T')[0],
      currency: card.currency,
      accountId: fromAcc.id,
      toAccountId: card.id
    });

    setPayingCardId(null);
    setPaymentData({ fromAccountId: '', amount: 0 });
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'Tarjeta de Crédito':
        return <CreditCard size={18} />;
      case 'Efectivo':
        return <WalletIcon size={18} />;
      case 'Billetera Virtual':
        return <Smartphone size={18} />;
      case 'Broker':
        return <BarChart2 size={18} />;
      default:
        return <Landmark size={18} />;
    }
  };

  const formatAmount = (amount: number, currency: Currency) =>
    `${currency === 'USD' ? '$' : 'Bs '}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const groupedAccounts = useMemo(() => {
    return ACCOUNT_TYPE_ORDER.map((type) => ({
      type,
      items: accounts
        .filter((acc) => acc.type === type)
        .sort((a, b) => {
          const aVal = Math.abs(a.balance);
          const bVal = Math.abs(b.balance);
          return bVal - aVal;
        })
    })).filter((group) => group.items.length > 0);
  }, [accounts]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4 flex-wrap mb-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Bancos y Brokers</h2>
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
            Gestión de liquidez e inversión
          </p>
        </div>

        <button
          onClick={() => { if(showForm && editingId) handleCancel(); else setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={16} /> Nueva Cuenta
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl animate-in fade-in zoom-in duration-300 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">
                Nombre Entidad
              </label>
              <input
                placeholder="Ej. Banesco, Hapi..."
                className="px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                value={newAcc.name}
                onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">
                Tipo
              </label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 outline-none bg-slate-50 text-sm font-medium"
                value={newAcc.type}
                onChange={(e) => setNewAcc({ ...newAcc, type: e.target.value as AccountType })}
              >
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
                <option value="Broker">Broker / Inversiones</option>
                <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                <option value="Billetera Virtual">Billetera Virtual</option>
                <option value="Efectivo">Efectivo</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">
                {newAcc.type === 'Tarjeta de Crédito' ? 'Deuda Inicial' : 'Saldo Inicial'}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-medium"
                value={newAcc.balance}
                onChange={(e) =>
                  setNewAcc({
                    ...newAcc,
                    balance: e.target.value === '' ? 0 : parseFloat(e.target.value)
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Moneda</label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 outline-none bg-slate-50 text-sm font-medium"
                value={newAcc.currency}
                onChange={(e) => setNewAcc({ ...newAcc, currency: e.target.value as Currency })}
              >
                <option value="USD">Dólares (USD)</option>
                <option value="VES">Bolívares (VES)</option>
              </select>
            </div>
          </div>

          {newAcc.type === 'Tarjeta de Crédito' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Límite</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-medium"
                  value={newAcc.creditLimit}
                  onChange={(e) => setNewAcc({ ...newAcc, creditLimit: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Corte (día)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-medium"
                  value={newAcc.closingDay}
                  onChange={(e) => setNewAcc({ ...newAcc, closingDay: e.target.value === '' ? 1 : parseInt(e.target.value, 10) })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Pago (día)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-medium"
                  value={newAcc.dueDay}
                  onChange={(e) => setNewAcc({ ...newAcc, dueDay: e.target.value === '' ? 1 : parseInt(e.target.value, 10) })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Interés (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-sm font-medium"
                  value={newAcc.annualInterestRate}
                  onChange={(e) => setNewAcc({ ...newAcc, annualInterestRate: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
            >
              {editingId ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {groupedAccounts.map((group) => {
          const accent = getGroupAccent(group.type);

          return (
            <section
              key={group.type}
              className="rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-white"
            >
              <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${accent.iconBg} ${accent.iconText}`}>
                    {getAccountIcon(group.type)}
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                    {group.type}
                  </h3>
                  <span className="text-[9px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded-md uppercase">
                    {group.items.length}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {group.items.map((acc) => {
                  const isCredit = acc.type === 'Tarjeta de Crédito';
                  const currentDebt = isCredit ? Math.max(0, -acc.balance) : 0;
                  const creditLimit = isCredit ? Math.max(0, acc.creditLimit || 0) : 0;
                  const availableCredit = isCredit ? Math.max(0, creditLimit - currentDebt) : 0;
                  const usagePct = isCredit && creditLimit > 0 ? Math.min((currentDebt / creditLimit) * 100, 100) : 0;

                  return (
                    <div
                      key={acc.id}
                      className="group px-5 py-3 hover:bg-slate-50/80 transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Identidad de Cuenta */}
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              backgroundColor: `${acc.color || '#3b82f6'}15`,
                              color: acc.color || '#3b82f6',
                              border: `1px solid ${acc.color || '#3b82f6'}30`
                            }}
                          >
                            {getAccountIcon(acc.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate tracking-tight">{acc.name}</p>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{acc.currency}</span>
                          </div>
                        </div>

                        {/* Información Financiera */}
                        <div className="flex-1">
                          {!isCredit ? (
                            <div className="flex items-center gap-8">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Saldo Disponible</span>
                                <span className="text-base font-black text-slate-900 leading-tight">
                                  {formatAmount(acc.balance, acc.currency)}
                                </span>
                              </div>
                              <div className="hidden sm:flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Estado</span>
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                  Activa
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                              <div className="flex flex-col min-w-[120px]">
                                <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Deuda Actual</span>
                                <span className={`text-base font-black leading-tight ${usagePct >= 85 ? 'text-rose-600' : 'text-slate-900'}`}>
                                  {formatAmount(currentDebt, acc.currency)}
                                </span>
                              </div>
                              
                              <div className="flex flex-col min-w-[120px]">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Crédito Disponible</span>
                                <span className="text-base font-black text-emerald-600 leading-tight">
                                  {formatAmount(availableCredit, acc.currency)}
                                </span>
                              </div>

                              <div className="flex-1 min-w-[180px] space-y-1.5">
                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
                                  <span className="text-slate-400">Uso: {usagePct.toFixed(1)}%</span>
                                  <span className="text-slate-400">Límite: {formatAmount(creditLimit, acc.currency)}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                  <div
                                    className={`h-full transition-all duration-700 ${
                                      usagePct >= 85 ? 'bg-rose-500' : usagePct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${usagePct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Detalles Adicionales y Acciones */}
                        <div className="flex items-center gap-3 justify-between lg:justify-end">
                          {isCredit && (
                            <button
                              onClick={() => setExpandedCardId(expandedCardId === acc.id ? null : acc.id)}
                              className={`p-2 rounded-lg transition-all ${expandedCardId === acc.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                              title="Ver detalles de fechas e intereses"
                            >
                              <Info size={16} className={expandedCardId === acc.id ? 'animate-pulse' : ''} />
                            </button>
                          )}

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isCredit && currentDebt > 0 && (
                              <button
                                onClick={() => {
                                  setPayingCardId(acc.id);
                                  setPaymentData({ ...paymentData, amount: currentDebt });
                                }}
                                className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                              >
                                Pagar
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(acc)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => onDelete(acc.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sección Expandible de Detalles (Solo para Crédito) */}
                      {isCredit && expandedCardId === acc.id && (
                        <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Día de Corte</span>
                              <div className="flex items-center gap-2">
                                <CalendarDays size={14} className="text-blue-500" />
                                <span className="text-xs font-black text-slate-700 underline decoration-blue-200 decoration-2 underline-offset-4">Día {acc.closingDay}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Límite de Pago</span>
                              <div className="flex items-center gap-2">
                                <CalendarDays size={14} className="text-rose-500" />
                                <span className="text-xs font-black text-slate-700 underline decoration-rose-200 decoration-2 underline-offset-4">Día {acc.dueDay}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tasa Anual</span>
                              <div className="flex items-center gap-2">
                                <TrendingUp size={14} className="text-slate-400" />
                                <span className="text-xs font-black text-slate-700">{acc.annualInterestRate ? `${acc.annualInterestRate}%` : 'No definida'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Interés Proyectado</span>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-xs font-black text-rose-600">
                                  {acc.annualInterestRate 
                                    ? formatAmount((currentDebt * (acc.annualInterestRate / 100)) / 12, acc.currency)
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Modal de Pago Rápido - Integrado y elegante */}
                      {payingCardId === acc.id && (
                        <div className="mt-4 p-4 bg-slate-900 rounded-2xl text-white animate-in zoom-in duration-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Transferencia para Pago</h4>
                            <button onClick={() => setPayingCardId(null)} className="text-white/40 hover:text-white">
                              <Plus size={16} className="rotate-45" />
                            </button>
                          </div>
                          <form onSubmit={handleQuickPayment} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-black uppercase text-white/40 ml-1">Origen</label>
                              <select 
                                required
                                className="bg-white/10 border-none rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                                value={paymentData.fromAccountId}
                                onChange={e => setPaymentData({ ...paymentData, fromAccountId: e.target.value })}
                              >
                                <option value="" className="text-slate-900">Seleccionar...</option>
                                {accounts.filter(a => a.type !== 'Tarjeta de Crédito' && a.currency === acc.currency).map(a => (
                                  <option key={a.id} value={a.id} className="text-slate-900">{a.name} ({formatAmount(a.balance, a.currency)})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-black uppercase text-white/40 ml-1">Monto ({acc.currency})</label>
                              <input 
                                type="number" step="0.01" required
                                className="bg-white/10 border-none rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                                value={paymentData.amount}
                                onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                              />
                            </div>
                            <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-white font-black py-2 rounded-lg text-[9px] uppercase tracking-widest transition-all">
                              Confirmar
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
