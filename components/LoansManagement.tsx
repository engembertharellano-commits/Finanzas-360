import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  Calendar, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  HandCoins,
  ArrowUpRight,
  Search,
  Filter,
  MoreVertical,
  ArrowDownLeft
} from 'lucide-react';
import { Loan, BankAccount, Transaction, Currency, LoanPayment } from '../types';

interface LoansManagementProps {
  loans: Loan[];
  accounts: BankAccount[];
  onAdd: (loan: Loan) => void;
  onUpdate: (loan: Loan) => void;
  onDelete: (id: string) => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  exchangeRate: number;
}

export const LoansManagement: React.FC<LoansManagementProps> = ({
  loans,
  accounts,
  onAdd,
  onUpdate,
  onDelete,
  onAddTransaction,
  exchangeRate
}) => {
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  const selectedLoan = useMemo(() => loans.find(l => l.id === selectedLoanId), [loans, selectedLoanId]);

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchesSearch = l.borrower.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            l.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || l.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [loans, searchTerm, filterStatus]);

  const totals = useMemo(() => {
    const pendingLoans = loans.filter(l => l.status !== 'paid');
    const totalUSD = pendingLoans.reduce((acc, l) => {
      const remaining = l.amount - l.payments.reduce((sum, p) => sum + p.amount, 0);
      return acc + (l.currency === 'USD' ? remaining : remaining / exchangeRate);
    }, 0);
    const totalVES = pendingLoans.reduce((acc, l) => {
      const remaining = l.amount - l.payments.reduce((sum, p) => sum + p.amount, 0);
      return acc + (l.currency === 'VES' ? remaining : remaining * exchangeRate);
    }, 0);
    return { usd: totalUSD, ves: totalVES };
  }, [loans, exchangeRate]);

  const handleCreateLoan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const amount = Number(formData.get('amount'));
    const currency = formData.get('currency') as Currency;
    const accountId = formData.get('accountId') as string;
    const borrower = formData.get('borrower') as string;
    const description = formData.get('description') as string;
    const dueDate = formData.get('dueDate') as string;
    const interestRate = Number(formData.get('interestRate')) || 0;
    const commission = Number(formData.get('commission')) || 0;

    const newLoan: Loan = {
      id: crypto.randomUUID(),
      borrower,
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

    onAdd(newLoan);

    // Create a transaction to reflect the money going out (amount + commission)
    onAddTransaction({
      description: `Préstamo a ${borrower}${commission > 0 ? ' (inc. comisión)' : ''}`,
      amount: amount + commission,
      type: 'Gasto',
      category: 'Préstamos',
      date: new Date().toISOString().split('T')[0],
      currency,
      accountId
    });

    setIsAddingLoan(false);
  };

  const handleAddPayment = (loanId: string, amount: number) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const newPayment: LoanPayment = {
      id: crypto.randomUUID(),
      amount,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedPayments = [...(loan.payments || []), newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + (p?.amount || 0), 0);
    
    const updatedLoan: Loan = {
      ...loan,
      payments: updatedPayments,
      status: totalPaid >= loan.amount ? 'paid' : 'pending'
    };

    onUpdate(updatedLoan);

    // Create a transaction to reflect the money coming back
    onAddTransaction({
      description: `Pago de préstamo: ${loan.borrower}`,
      amount: amount,
      type: 'Ingreso',
      category: 'Préstamos',
      date: new Date().toISOString().split('T')[0],
      currency: loan.currency,
      accountId: loan.accountId
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Préstamos</h1>
          <p className="text-slate-500 font-medium">Gestiona el dinero que has prestado y haz seguimiento de los cobros.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-end min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Pendiente USD</span>
            <span className="text-2xl font-black text-slate-900">${totals.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-3xl shadow-xl flex flex-col items-end min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Pendiente VES</span>
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
            placeholder="Buscar por deudor o descripción..."
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
            onClick={() => setIsAddingLoan(true)}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            Nuevo Préstamo
          </button>
        </div>
      </div>

      {/* Loans Grid/List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLoans.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <HandCoins className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No hay préstamos</h3>
            <p className="text-slate-400 max-w-xs font-medium">Comienza registrando un préstamo para llevar el control de tus deudores.</p>
          </div>
        ) : (
          filteredLoans.map(loan => {
            const payments = Array.isArray(loan.payments) ? loan.payments : [];
            const totalPaid = payments.reduce((sum, p) => sum + (p?.amount || 0), 0);
            const remaining = (loan.amount || 0) - totalPaid;
            const progress = (totalPaid / loan.amount) * 100;
            const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date() && loan.status !== 'paid';

            return (
              <div 
                key={loan.id}
                onClick={() => setSelectedLoanId(loan.id === selectedLoanId ? null : loan.id)}
                className={`
                  group bg-white rounded-[2.5rem] border transition-all cursor-pointer overflow-hidden
                  ${selectedLoanId === loan.id ? 'border-slate-900 ring-4 ring-slate-100' : 'border-slate-100 hover:border-slate-200 hover:shadow-xl'}
                `}
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl
                        ${loan.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-900'}
                      `}>
                        {loan.borrower.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg leading-tight">{loan.borrower}</h3>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">{loan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">
                        {loan.currency === 'USD' ? '$' : ''}{loan.amount.toLocaleString()} {loan.currency === 'VES' ? 'VES' : ''}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {loan.status === 'paid' ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            <CheckCircle2 size={12} /> Pagado
                          </span>
                        ) : isOverdue ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-500">
                            <Clock size={12} /> Vencido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <Clock size={12} /> Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Progreso de cobro</span>
                      <span className="font-black text-slate-900">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${loan.status === 'paid' ? 'bg-emerald-500' : 'bg-slate-900'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</span>
                          <span className="text-sm font-bold text-slate-600">{loan.startDate}</span>
                        </div>
                        {loan.dueDate && (
                          <div className="flex flex-col border-l border-slate-100 pl-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimiento</span>
                            <span className={`text-sm font-bold ${isOverdue ? 'text-rose-500' : 'text-slate-600'}`}>{loan.dueDate}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Por cobrar</span>
                        <span className="text-xl font-black text-slate-900">
                          {loan.currency === 'USD' ? '$' : ''}{remaining.toLocaleString()} {loan.currency === 'VES' ? 'VES' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payments Section (Accordion) */}
                {selectedLoanId === loan.id && (
                  <div className="border-t border-slate-50 bg-slate-50/50 p-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Historial de Pagos</h4>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const amountStr = prompt(`Ingresa el monto del pago para ${loan.borrower} (${loan.currency}):`, remaining.toString());
                          if (amountStr) {
                            const val = parseFloat(amountStr);
                            if (!isNaN(val) && val > 0) handleAddPayment(loan.id, val);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-900 transition-colors"
                      >
                        <Plus size={14} /> Registrar Pago
                      </button>
                    </div>

                    <div className="space-y-3">
                      {loan.payments.length === 0 ? (
                        <p className="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-widest italic">Sin pagos registrados</p>
                      ) : (
                        loan.payments.map(payment => (
                          <div key={payment.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                                <ArrowDownLeft size={16} />
                              </div>
                              <span className="text-sm font-bold text-slate-600">{payment.date}</span>
                            </div>
                            <span className="font-black text-slate-900">
                              +{loan.currency === 'USD' ? '$' : ''}{payment.amount.toLocaleString()} {loan.currency === 'VES' ? 'VES' : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(loan.id);
                        }}
                        className="p-3 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Eliminar préstamo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Agregar Préstamo */}
      {isAddingLoan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAddingLoan(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Préstamo</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Registra una salida de dinero por préstamo</p>
                </div>
                <button onClick={() => setIsAddingLoan(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateLoan} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deudor (Persona)</label>
                    <input 
                      name="borrower" 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                      placeholder="Ej: Juan Perez"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Monto</label>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01" 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Moneda</label>
                    <select 
                      name="currency" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold appearance-none"
                    >
                      <option value="USD">Dólares (USD)</option>
                      <option value="VES">Bolívares (VES)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cuenta Origen</label>
                    <select 
                      name="accountId" 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold appearance-none"
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
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Comisión / Gasto inicial</label>
                    <input 
                      name="commission" 
                      type="number" 
                      step="0.01" 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
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
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descripción</label>
                  <textarea 
                    name="description" 
                    rows={3} 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold resize-none"
                    placeholder="¿Para qué es el préstamo?"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-slate-800 transition-all shadow-2xl active:scale-[0.98] mt-4"
                >
                  Registrar Préstamo
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
