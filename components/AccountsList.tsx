import React, { useState, useMemo } from 'react';
import { BankAccount, AccountType, Currency } from '../types';
import {
  Plus,
  Trash2,
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  Smartphone,
  BarChart2,
  CalendarDays,
  AlertCircle
} from 'lucide-react';

interface Props {
  accounts: BankAccount[];
  onAdd: (acc: BankAccount) => void;
  onDelete: (id: string) => void;
}

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'Ahorros',
  'Corriente',
  'Efectivo',
  'Billetera Virtual',
  'Broker',
  'Tarjeta de Crédito'
];

export const AccountsList: React.FC<Props> = ({ accounts, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [newAcc, setNewAcc] = useState({
    name: '',
    type: 'Ahorros' as AccountType,
    balance: 0,
    currency: 'USD' as Currency,
    color: '#3b82f6',
    creditLimit: 0,
    closingDay: 1,
    dueDay: 1
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
      id: crypto.randomUUID(),
      balance: isCredit ? -Math.abs(parsedBalance) : parsedBalance,
      ...(isCredit
        ? {
            creditLimit: Math.max(0, parsedLimit),
            closingDay: parsedClosingDay,
            dueDay: parsedDueDay
          }
        : {
            creditLimit: undefined,
            closingDay: undefined,
            dueDay: undefined
          })
    };

    onAdd(accountData);
    setShowForm(false);
    setNewAcc({
      name: '',
      type: 'Ahorros',
      balance: 0,
      currency: 'USD',
      color: '#3b82f6',
      creditLimit: 0,
      closingDay: 1,
      dueDay: 1
    });
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
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Bancos y Brokers</h2>
          <p className="text-slate-500 text-sm font-medium">
            Gestiona tu liquidez y tus plataformas de inversión
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={20} /> Nueva Cuenta
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-2xl animate-in fade-in zoom-in duration-300 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Nombre Entidad / Broker
              </label>
              <input
                placeholder="Ej. Banesco, Binance, Hapi..."
                className="px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                value={newAcc.name}
                onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Tipo de Cuenta
              </label>
              <select
                className="px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50"
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
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                {newAcc.type === 'Tarjeta de Crédito' ? 'Deuda Inicial' : 'Saldo Inicial'}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="px-4 py-3 rounded-xl border border-slate-200 outline-none"
                value={newAcc.balance}
                onChange={(e) =>
                  setNewAcc({
                    ...newAcc,
                    balance: e.target.value === '' ? 0 : parseFloat(e.target.value)
                  })
                }
              />
              <p className="text-[9px] text-slate-400 mt-1">
                Puedes dejarlo en 0 y fondearla después mediante transferencias.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Moneda</label>
              <select
                className="px-4 py-3 rounded-xl border border-slate-200 outline-none bg-slate-50"
                value={newAcc.currency}
                onChange={(e) => setNewAcc({ ...newAcc, currency: e.target.value as Currency })}
              >
                <option value="USD">Dólares (USD)</option>
                <option value="VES">Bolívares (VES)</option>
              </select>
            </div>
          </div>

          {newAcc.type === 'Tarjeta de Crédito' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Límite de Crédito
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 1000.00"
                  className="px-4 py-3 rounded-xl border border-slate-200 outline-none"
                  value={newAcc.creditLimit}
                  onChange={(e) =>
                    setNewAcc({
                      ...newAcc,
                      creditLimit: e.target.value === '' ? 0 : parseFloat(e.target.value)
                    })
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Fecha de Corte (día)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="px-4 py-3 rounded-xl border border-slate-200 outline-none"
                  value={newAcc.closingDay}
                  onChange={(e) =>
                    setNewAcc({
                      ...newAcc,
                      closingDay: e.target.value === '' ? 1 : parseInt(e.target.value, 10)
                    })
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                  Fecha de Pago (día)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="px-4 py-3 rounded-xl border border-slate-200 outline-none"
                  value={newAcc.dueDay}
                  onChange={(e) =>
                    setNewAcc({
                      ...newAcc,
                      dueDay: e.target.value === '' ? 1 : parseInt(e.target.value, 10)
                    })
                  }
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-slate-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl"
            >
              Crear Cuenta
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {groupedAccounts.map((group) => (
          <section
            key={group.type}
            className="rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-200 bg-white"
          >
            <div className="relative px-6 md:px-8 py-5 bg-slate-900 text-white border-b border-slate-800">
              <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-500" />
              <div className="flex items-center justify-between gap-4 flex-wrap pl-2">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-white/10 text-white shadow-inner ring-1 ring-white/10">
                    {getAccountIcon(group.type)}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-black tracking-tight text-white">
                      {group.type}
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.18em] shadow-sm">
                      {group.items.length} {group.items.length === 1 ? 'cuenta' : 'cuentas'}
                    </span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 text-white/70">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                    Grupo de cuentas
                  </span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {group.items.map((acc) => {
                const isCredit = acc.type === 'Tarjeta de Crédito';
                const isBroker = acc.type === 'Broker';

                const currentDebt = isCredit ? Math.max(0, -acc.balance) : 0;
                const creditLimit = isCredit ? Math.max(0, acc.creditLimit || 0) : 0;
                const availableCredit = isCredit ? Math.max(0, creditLimit - currentDebt) : 0;
                const usagePct =
                  isCredit && creditLimit > 0 ? Math.min((currentDebt / creditLimit) * 100, 100) : 0;

                return (
                  <div
                    key={acc.id}
                    className={`px-6 md:px-8 py-6 transition-colors ${
                      isBroker ? 'bg-blue-50/20' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center gap-5 xl:gap-8">
                      <div className="min-w-0 xl:w-[280px]">
                        <div className="flex items-center gap-4">
                          <div
                            className="p-3.5 rounded-2xl shrink-0"
                            style={{
                              backgroundColor: isBroker ? '#3b82f615' : `${acc.color}15`,
                              color: isBroker ? '#3b82f6' : acc.color
                            }}
                          >
                            {getAccountIcon(acc.type)}
                          </div>

                          <div className="min-w-0">
                            <p className="text-lg font-black text-slate-900 truncate">{acc.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {acc.currency}
                              </span>

                              {isBroker && (
                                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                  Inversión
                                </span>
                              )}

                              {isCredit && usagePct >= 85 && (
                                <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                  Uso alto
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!isCredit ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-slate-50 rounded-2xl px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              {isBroker ? 'Disponible para invertir' : 'Efectivo / Caja'}
                            </p>
                            <p className="text-2xl font-black text-slate-900">
                              {formatAmount(acc.balance, acc.currency)}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-2xl px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              Tipo
                            </p>
                            <p className="text-lg font-black text-slate-900">{acc.type}</p>
                          </div>

                          <div className="bg-slate-50 rounded-2xl px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              Estado
                            </p>
                            <div className="flex items-center gap-2">
                              {isBroker && (
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    acc.balance > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                                  } animate-pulse`}
                                />
                              )}
                              <p
                                className={`text-sm font-black ${
                                  isBroker
                                    ? acc.balance > 0
                                      ? 'text-blue-600'
                                      : 'text-slate-400'
                                    : 'text-slate-700'
                                }`}
                              >
                                {isBroker
                                  ? acc.balance > 0
                                    ? 'Disponible para invertir'
                                    : 'Sin fondos para invertir'
                                  : 'Operativa'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-slate-50 rounded-2xl px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                Deuda actual
                              </p>
                              <p
                                className={`text-2xl font-black ${
                                  usagePct >= 85 ? 'text-rose-600' : 'text-slate-900'
                                }`}
                              >
                                {formatAmount(currentDebt, acc.currency)}
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                Límite
                              </p>
                              <p className="text-xl font-black text-slate-900">
                                {formatAmount(creditLimit, acc.currency)}
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                Disponible
                              </p>
                              <p className="text-xl font-black text-slate-900">
                                {formatAmount(availableCredit, acc.currency)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  usagePct >= 85 ? 'bg-rose-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className={usagePct >= 85 ? 'text-rose-600' : 'text-slate-500'}>
                                Uso del límite: {usagePct.toFixed(0)}%
                              </span>
                              <span className="text-slate-500">{formatAmount(availableCredit, acc.currency)} disponibles</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                              <CalendarDays size={14} />
                              Fecha de corte: día {acc.closingDay ?? '-'}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                              <CalendarDays size={14} />
                              Fecha de pago: día {acc.dueDay ?? '-'}
                            </div>
                          </div>

                          {usagePct >= 85 && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                              <AlertCircle size={14} />
                              Uso alto del límite.
                            </div>
                          )}
                        </div>
                      )}

                      <div className="xl:w-auto flex items-center xl:self-start">
                        <button
                          onClick={() => onDelete(acc.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 transition-all rounded-2xl hover:bg-rose-50"
                          title="Eliminar cuenta"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
