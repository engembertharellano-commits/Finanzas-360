import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Wallet, TrendingUp, PieChart, Sparkles, CreditCard,
  Menu, X, ChevronLeft, ChevronRight, Settings2, Briefcase, Users, UserX
} from 'lucide-react';
import {
  BankAccount, Transaction, Investment, Budget, User, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES
} from './types';
import { Dashboard } from './components/Dashboard';
import { AccountsList } from './components/AccountsList';
import { TransactionsLog } from './components/TransactionsLog';
import { AIInsights } from './components/AIInsights';
import { Portfolio } from './components/Portfolio';
import { BudgetView } from './components/BudgetView';
import { AIChat } from './components/AIChat';
import { CategorySettings } from './components/CategorySettings';
import { ConfirmationModal } from './components/ConfirmationModal';
import { WorkManagement } from './components/WorkManagement';
import { CustodyManagement } from './components/CustodyManagement';
import { Auth } from './components/Auth';
import { FinanceAIService } from './services/geminiService';

type View = 'dashboard' | 'accounts' | 'transactions' | 'portfolio' | 'budget' | 'ai' | 'settings' | 'work' | 'custody';

type PersistedFinanceData = {
  accounts: BankAccount[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: Budget[];
  expenseCategories: string[];
  incomeCategories: string[];
};

type CloudStatus = 'idle' | 'saving' | 'saved' | 'error';

const EMPTY_DATA: PersistedFinanceData = {
  accounts: [],
  transactions: [],
  investments: [],
  budgets: [],
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  incomeCategories: DEFAULT_INCOME_CATEGORIES
};

const USER_REGISTRY_KEYS = ['f360_users', 'finanza360_users', 'users'];

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const normalizeData = (input: any): PersistedFinanceData => ({
  accounts: Array.isArray(input?.accounts) ? input.accounts : [],
  transactions: Array.isArray(input?.transactions) ? input.transactions : [],
  investments: Array.isArray(input?.investments) ? input.investments : [],
  budgets: Array.isArray(input?.budgets) ? input.budgets : [],
  expenseCategories: Array.isArray(input?.expenseCategories) ? input.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
  incomeCategories: Array.isArray(input?.incomeCategories) ? input.incomeCategories : DEFAULT_INCOME_CATEGORIES
});

const normalizeEmail = (email?: string | null): string => {
  const raw = String(email || '').trim().toLowerCase();
  if (!raw || !raw.includes('@')) return '';

  const [localPart, domain] = raw.split('@');
  if (!localPart || !domain) return raw;

  // Canonicalización Gmail: quita +tag y puntos en local part
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const localNoPlus = localPart.split('+')[0];
    const localNoDots = localNoPlus.replace(/\./g, '');
    return `${localNoDots}@gmail.com`;
  }

  return raw;
};

const getPrimaryCloudKey = (user: User): string => {
  const email = normalizeEmail(user.email);
  if (email) return `mail:${email}`;
  return `id:${String((user as any).id || '').trim()}`; // fallback extremo
};

const getLegacyCloudKeys = (user: User): string[] => {
  const rawEmail = String((user as any).email || '').trim().toLowerCase();
  const id = String((user as any).id || '').trim();

  return Array.from(
    new Set(
      [
        rawEmail ? `mail:${rawEmail}` : '', // email sin canonicalizar (legacy)
        id ? `id:${id}` : '',               // id con prefijo
        id,                                 // id legacy puro
      ].filter(Boolean)
    )
  );
};

const readLocalUserData = (userId: string): PersistedFinanceData => {
  const raw = localStorage.getItem(`f360_data_${userId}`);
  return normalizeData(safeParse(raw, EMPTY_DATA));
};

const removeUserFromRegistries = (user: User) => {
  const targetId = String((user as any).id || '').trim();
  const targetEmail = normalizeEmail((user as any).email);

  USER_REGISTRY_KEYS.forEach((key) => {
    const parsed = safeParse<any>(localStorage.getItem(key), null);
    if (!Array.isArray(parsed)) return;

    const filtered = parsed.filter((u: any) => {
      const uid = String(u?.id || '').trim();
      const uEmail = normalizeEmail(u?.email);
      return uid !== targetId && uEmail !== targetEmail;
    });

    if (filtered.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(key);
    }
  });
};

const getInvestmentAmountUSD = (inv: Investment): number => {
  const i = inv as any;

  if (typeof i.currentValue === 'number' && Number.isFinite(i.currentValue)) return i.currentValue;
  if (typeof i.marketValue === 'number' && Number.isFinite(i.marketValue)) return i.marketValue;
  if (typeof i.totalValue === 'number' && Number.isFinite(i.totalValue)) return i.totalValue;

  const qty = Number(i.quantity ?? 0);

  if (typeof i.currentPrice === 'number' && Number.isFinite(i.currentPrice)) return qty * i.currentPrice;
  if (typeof i.price === 'number' && Number.isFinite(i.price)) return qty * i.price;
  if (typeof i.purchasePrice === 'number' && Number.isFinite(i.purchasePrice)) return qty * i.purchasePrice;
  if (typeof i.buyPrice === 'number' && Number.isFinite(i.buyPrice)) return qty * i.buyPrice;

  if (typeof i.amount === 'number' && Number.isFinite(i.amount)) return i.amount;

  return 0;
};

const formatCurrency = (value: number, currency: 'USD' | 'VES') => {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(safe);
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('f360_user');
    return safeParse<User | null>(saved, null);
  });

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [exchangeRate, setExchangeRate] = useState<number>(45.50);
  const [rateSourceUrl, setRateSourceUrl] = useState<string | undefined>(undefined);
  const [isSyncingRate, setIsSyncingRate] = useState(false);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES);

  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('idle');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const lastPersistedRef = useRef<string>(''); // evita guardado redundante

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const applyData = useCallback((data: PersistedFinanceData) => {
    const clean = normalizeData(data);
    setAccounts(clean.accounts);
    setTransactions(clean.transactions);
    setInvestments(clean.investments);
    setBudgets(clean.budgets);
    setExpenseCategories(clean.expenseCategories);
    setIncomeCategories(clean.incomeCategories);
  }, []);

  const fetchRate = useCallback(async () => {
    setIsSyncingRate(true);
    try {
      const service = new FinanceAIService();
      const response = await service.getExchangeRate();
      setExchangeRate(response.rate);
      setRateSourceUrl(response.sourceUrl);
    } catch (error) {
      console.error('Error al sincronizar tasa:', error);
    } finally {
      setIsSyncingRate(false);
    }
  }, []);

  const loadFromCloud = useCallback(async (userKey: string): Promise<PersistedFinanceData | null> => {
    const resp = await fetch(`/api/state?userId=${encodeURIComponent(userKey)}`);
    const json = await resp.json().catch(() => null);

    if (!resp.ok || !json?.ok) return null;
    if (!json?.found || !json?.payload || typeof json.payload !== 'object') return null;

    return normalizeData(json.payload);
  }, []);

  const saveToCloud = useCallback(async (userKey: string, payload: PersistedFinanceData): Promise<void> => {
    const resp = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userKey, payload })
    });

    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      throw new Error(j?.error || `Error guardando en nube (${resp.status})`);
    }
  }, []);

  const deleteFromCloud = useCallback(async (user: User): Promise<void> => {
    const keys = Array.from(new Set([getPrimaryCloudKey(user), ...getLegacyCloudKeys(user)]));

    // Best effort: si backend no soporta DELETE, no bloquea baja local
    await Promise.allSettled(
      keys.map(async (key) => {
        const resp = await fetch(`/api/state?userId=${encodeURIComponent(key)}`, { method: 'DELETE' });
        // 200/204 ok, 404 no encontrado (también válido), 405 método no permitido (ignorable)
        if (!resp.ok && resp.status !== 404 && resp.status !== 405) {
          throw new Error(`No se pudo eliminar estado nube para ${key} (status ${resp.status})`);
        }
      })
    );
  }, []);

  const resetSessionState = useCallback(() => {
    setAccounts([]);
    setTransactions([]);
    setInvestments([]);
    setBudgets([]);
    setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    setIncomeCategories(DEFAULT_INCOME_CATEGORIES);

    setIsDataReady(false);
    setCloudStatus('idle');
    loadedUserIdRef.current = null;
    lastPersistedRef.current = '';

    setActiveView('dashboard');
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (currentUser) fetchRate();
  }, [currentUser, fetchRate]);

  // Auto-ocultar mensajes saved/error
  useEffect(() => {
    if (cloudStatus === 'saved' || cloudStatus === 'error') {
      const t = setTimeout(() => setCloudStatus('idle'), 2200);
      return () => clearTimeout(t);
    }
  }, [cloudStatus]);

  // Cargar datos del usuario: nube primero (clave canónica), local de respaldo
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!currentUser) {
        loadedUserIdRef.current = null;
        setIsDataReady(false);
        setCloudStatus('idle');
        lastPersistedRef.current = '';
        applyData(EMPTY_DATA);
        return;
      }

      setIsLoadingCloud(true);
      setIsDataReady(false);
      setCloudStatus('idle');

      try {
        const localData = readLocalUserData(String((currentUser as any).id || ''));
        let finalData = localData;

        try {
          const primaryKey = getPrimaryCloudKey(currentUser);
          const candidates = [primaryKey, ...getLegacyCloudKeys(currentUser)];

          let cloudData: PersistedFinanceData | null = null;
          let foundKey: string | null = null;

          for (const key of candidates) {
            const d = await loadFromCloud(key);
            if (d) {
              cloudData = d;
              foundKey = key;
              break;
            }
          }

          if (cloudData) {
            finalData = cloudData;

            // Migración automática al key canónico si vino por legacy
            if (foundKey && foundKey !== primaryKey) {
              saveToCloud(primaryKey, cloudData).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('No se pudo leer nube, usando local:', e);
        }

        if (cancelled) return;

        applyData(finalData);
        localStorage.setItem('f360_user', JSON.stringify(currentUser));

        const serializedFinal = JSON.stringify(finalData);
        localStorage.setItem(`f360_data_${String((currentUser as any).id || '')}`, serializedFinal);

        lastPersistedRef.current = serializedFinal;
        loadedUserIdRef.current = String((currentUser as any).id || '');
        setIsDataReady(true);
      } finally {
        if (!cancelled) setIsLoadingCloud(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [currentUser, applyData, loadFromCloud, saveToCloud]);

  // Guardado: local inmediato + nube con debounce SOLO clave canónica
  useEffect(() => {
    if (!currentUser) return;
    if (!isDataReady) return;
    if (loadedUserIdRef.current !== String((currentUser as any).id || '')) return;

    const localUserId = String((currentUser as any).id || '');
    const data: PersistedFinanceData = {
      accounts,
      transactions,
      investments,
      budgets,
      expenseCategories,
      incomeCategories
    };

    const serialized = JSON.stringify(data);
    localStorage.setItem(`f360_data_${localUserId}`, serialized);

    // no guardar en nube si no cambió
    if (serialized === lastPersistedRef.current) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        setCloudStatus('saving');
        const primaryKey = getPrimaryCloudKey(currentUser);
        await saveToCloud(primaryKey, data);
        lastPersistedRef.current = serialized;
        setCloudStatus('saved');
      } catch (e) {
        console.warn('No se pudo guardar en nube (se guardó local):', e);
        setCloudStatus('error');
      }
    }, 900);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    accounts,
    transactions,
    investments,
    budgets,
    expenseCategories,
    incomeCategories,
    currentUser,
    isDataReady,
    saveToCloud
  ]);

  const requestDelete = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Impacto contable unificado
  const applyTransactionImpact = useCallback(
    (accountsList: BankAccount[], tx: Transaction, direction: 1 | -1 = 1): BankAccount[] => {
      const t = tx as any;
      const comm = t.commission ?? 0;
      const arrivalAmount = t.targetAmount ?? t.amount;

      return accountsList.map((acc) => {
        // Cuenta origen
        if ((acc as any).id === t.accountId) {
          if (t.type === 'Gasto') {
            return { ...acc, balance: (acc as any).balance - direction * (t.amount + comm) };
          }
          if (t.type === 'Ingreso') {
            return { ...acc, balance: (acc as any).balance + direction * (t.amount - comm) };
          }
          if (t.type === 'Transferencia') {
            return { ...acc, balance: (acc as any).balance - direction * t.amount };
          }
          if (t.type === 'Ajuste') {
            const adj = t.adjustmentDirection === 'plus' ? t.amount : -t.amount;
            return { ...acc, balance: (acc as any).balance + direction * adj };
          }
        }

        // Cuenta destino (solo transferencia)
        if (t.type === 'Transferencia' && (acc as any).id === t.toAccountId) {
          return { ...acc, balance: (acc as any).balance + direction * (arrivalAmount - comm) };
        }

        return acc;
      });
    },
    []
  );

  const totalInvestmentUSD = useMemo(() => {
    return investments.reduce((acc, inv) => acc + getInvestmentAmountUSD(inv), 0);
  }, [investments]);

  const totalInvestmentVES = useMemo(() => totalInvestmentUSD * exchangeRate, [totalInvestmentUSD, exchangeRate]);

  const handleAddAccount = (acc: BankAccount) => setAccounts(prev => [...prev, acc]);

  const handleDeleteAccount = (id: string) => {
    const acc = accounts.find(a => (a as any).id === id);
    requestDelete(
      '¿Eliminar Cuenta?',
      `Estás a punto de eliminar "${(acc as any)?.name}". Esta acción también podría afectar el historial visual de tus saldos.`,
      () => setAccounts(prev => prev.filter(a => (a as any).id !== id))
    );
  };

  const handleAddTransaction = (tData: Omit<Transaction, 'id'>) => {
    const newT: Transaction = { ...(tData as any), id: crypto.randomUUID() } as Transaction;
    setTransactions(prev => [newT, ...prev]);
    setAccounts(prev => applyTransactionImpact(prev, newT, 1));
  };

  const handleDeleteTransaction = (id: string) => {
    const t = transactions.find(item => (item as any).id === id);
    if (!t) return;

    requestDelete(
      '¿Eliminar Movimiento?',
      `Se revertirá el impacto de "${(t as any).description}" en los saldos.`,
      () => {
        setAccounts(prev => applyTransactionImpact(prev, t, -1));
        setTransactions(prev => prev.filter(item => (item as any).id !== id));
      }
    );
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    const original = transactions.find(t => (t as any).id === (updated as any).id);

    if (!original) {
      setTransactions(prev => prev.map(t => ((t as any).id === (updated as any).id ? updated : t)));
      return;
    }

    setAccounts(prev => applyTransactionImpact(applyTransactionImpact(prev, original, -1), updated, 1));
    setTransactions(prev => prev.map(t => ((t as any).id === (updated as any).id ? updated : t)));
  };

  const handleAddInvestment = (inv: Investment) => setInvestments(prev => [...prev, inv]);

  const handleUpdateInvestment = (updatedInv: Investment) => {
    setInvestments(prev =>
      prev
        .map(i => ((i as any).id === (updatedInv as any).id ? updatedInv : i))
        .filter(i => Number((i as any).quantity ?? 0) > 0)
    );
  };

  const handleDeleteInvestment = (id: string) => {
    const inv = investments.find(i => (i as any).id === id);
    requestDelete(
      '¿Eliminar Inversión?',
      `¿Quitar "${(inv as any)?.name}" de tu cartera?`,
      () => setInvestments(prev => prev.filter(i => (i as any).id !== id))
    );
  };

  const handleAddBudget = (b: Omit<Budget, 'id'>) => {
    setBudgets(prev => {
      const filtered = prev.filter(item => !((item as any).category === (b as any).category && (item as any).month === selectedMonth));
      return [...filtered, { ...(b as any), id: crypto.randomUUID(), month: selectedMonth } as Budget];
    });
  };

  const handleDeleteBudget = (id: string) => {
    requestDelete('¿Eliminar Presupuesto?', 'El límite será eliminado.', () => setBudgets(prev => prev.filter(item => (item as any).id !== id)));
  };

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formattedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1));
  }, [selectedMonth]);

  const handleLogout = () => {
    localStorage.removeItem('f360_user');
    setCurrentUser(null);
    resetSessionState();
  };

  const handleSelfDeleteAccount = useCallback(async () => {
    if (!currentUser) return;

    const userToDelete = currentUser;

    setIsDeletingAccount(true);
    try {
      await deleteFromCloud(userToDelete);
    } catch (e) {
      console.warn('No se pudo completar borrado en nube, se continuará con borrado local:', e);
    } finally {
      // borrado local total del usuario
      localStorage.removeItem(`f360_data_${String((userToDelete as any).id || '')}`);
      removeUserFromRegistries(userToDelete);
      localStorage.removeItem('f360_user');

      setCurrentUser(null);
      resetSessionState();
      setIsDeletingAccount(false);
    }
  }, [currentUser, deleteFromCloud, resetSessionState]);

  if (!currentUser) return <Auth onSelectUser={setCurrentUser} />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 animate-in fade-in duration-500 overflow-x-hidden font-sans">
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Header móvil */}
      <div className="md:hidden bg-white border-b px-6 py-5 flex items-center justify-between sticky top-0 z-[60] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tighter">Finanza360</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 rounded-xl">
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:block md:w-80 md:min-h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="bg-white border-r h-full flex flex-col p-8 shadow-2xl md:shadow-none">
          <div className="hidden md:flex items-center space-x-3 mb-10">
            <div className="w-11 h-11 bg-slate-900 rounded-[1.2rem] flex items-center justify-center shadow-2xl">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Finanza360</span>
          </div>

          {/* Usuario */}
          <div className="mb-8 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center space-x-4">
            <div className="w-11 h-11 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 font-black shadow-sm">
              {String((currentUser as any).name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black truncate text-slate-900">{(currentUser as any).name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{(currentUser as any).email}</p>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
            <NavItem active={activeView === 'dashboard'} onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard size={20} />} label="Resumen General" />

            <NavItem
              active={activeView === 'ai'}
              onClick={() => { setActiveView('ai'); setIsMobileMenuOpen(false); }}
              icon={<Sparkles size={20} />}
              label="Análisis Inteligente"
              isSpecial
            />

            <div className="h-px bg-slate-100 my-4 mx-2"></div>

            <NavItem active={activeView === 'accounts'} onClick={() => { setActiveView('accounts'); setIsMobileMenuOpen(false); }} icon={<CreditCard size={20} />} label="Bancos y Efectivo" />
            <NavItem active={activeView === 'transactions'} onClick={() => { setActiveView('transactions'); setIsMobileMenuOpen(false); }} icon={<Wallet size={20} />} label="Historial Movimientos" />
            <NavItem active={activeView === 'portfolio'} onClick={() => { setActiveView('portfolio'); setIsMobileMenuOpen(false); }} icon={<TrendingUp size={20} />} label="Mi Portafolio" />

            <div className="h-px bg-slate-100 my-4 mx-2"></div>

            <NavItem active={activeView === 'work'} onClick={() => { setActiveView('work'); setIsMobileMenuOpen(false); }} icon={<Briefcase size={20} />} label="Pote de Trabajo" />
            <NavItem active={activeView === 'custody'} onClick={() => { setActiveView('custody'); setIsMobileMenuOpen(false); }} icon={<Users size={20} />} label="Dinero Terceros" />
            <NavItem active={activeView === 'budget'} onClick={() => { setActiveView('budget'); setIsMobileMenuOpen(false); }} icon={<PieChart size={20} />} label="Límites Gastos" />
            <NavItem active={activeView === 'settings'} onClick={() => { setActiveView('settings'); setIsMobileMenuOpen(false); }} icon={<Settings2 size={20} />} label="Categorías" />
          </nav>

          <div className="mt-6 space-y-3 pt-4 border-t border-slate-50">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-xl text-slate-400"><ChevronLeft size={16} /></button>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-center">{formattedMonth}</span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-xl text-slate-400"><ChevronRight size={16} /></button>
              </div>
            </div>

            <button
              onClick={() =>
                requestDelete(
                  'Darse de baja y eliminar cuenta',
                  'Esta acción eliminará tu perfil local, tus datos guardados en este dispositivo y cerrará sesión. No se puede deshacer.',
                  () => { void handleSelfDeleteAccount(); }
                )
              }
              className="w-full py-3 text-[10px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <UserX size={14} />
              Darse de baja
            </button>

            <button onClick={handleLogout} className="w-full py-3 text-[10px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest transition-colors">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-8 md:p-14 view-container">
        <div className="max-w-7xl mx-auto space-y-3">
          {isLoadingCloud && (
            <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Sincronizando datos con la nube...
            </div>
          )}

          {isDeletingAccount && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-rose-600">
              Eliminando cuenta...
            </div>
          )}

          {!isLoadingCloud && cloudStatus === 'saving' && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-blue-600">
              Guardando en la nube...
            </div>
          )}

          {!isLoadingCloud && cloudStatus === 'saved' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-600">
              Datos sincronizados en la nube
            </div>
          )}

          {!isLoadingCloud && cloudStatus === 'error' && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-rose-600">
              No se pudo sincronizar en nube (se guardó localmente)
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto space-y-8 md:space-y-10">
          {activeView === 'dashboard' && (
            <section className="bg-white border border-slate-100 rounded-3xl p-6 md:p-7 shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400">Monto de inversión</p>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-1">
                    {formatCurrency(totalInvestmentUSD, 'USD')}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500 mt-1">
                    Equivalente aprox.: {formatCurrency(totalInvestmentVES, 'VES')}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <TrendingUp size={26} />
                </div>
              </div>
            </section>
          )}

          <div className="space-y-12">
            {activeView === 'dashboard' && (
              <Dashboard
                accounts={accounts}
                transactions={transactions}
                investments={investments}
                budgets={budgets}
                selectedMonth={selectedMonth}
                exchangeRate={exchangeRate}
                rateSourceUrl={rateSourceUrl}
                onSyncRate={fetchRate}
                isSyncingRate={isSyncingRate}
              />
            )}

            {activeView === 'accounts' && <AccountsList accounts={accounts} onAdd={handleAddAccount} onDelete={handleDeleteAccount} />}

            {activeView === 'transactions' && (
              <TransactionsLog
                transactions={transactions}
                accounts={accounts}
                onAdd={handleAddTransaction}
                onDelete={handleDeleteTransaction}
                selectedMonth={selectedMonth}
                exchangeRate={exchangeRate}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
              />
            )}

            {activeView === 'work' && (
              <WorkManagement transactions={transactions} onUpdateTransaction={handleUpdateTransaction} exchangeRate={exchangeRate} />
            )}

            {activeView === 'custody' && (
              <CustodyManagement transactions={transactions} exchangeRate={exchangeRate} />
            )}

            {activeView === 'ai' && (
              <AIInsights transactions={transactions} budgets={budgets} investments={investments} selectedMonth={selectedMonth} />
            )}

            {activeView === 'portfolio' && (
              <Portfolio
                investments={investments}
                accounts={accounts}
                onAdd={handleAddInvestment}
                onUpdate={handleUpdateInvestment}
                onDelete={handleDeleteInvestment}
                onAddTransaction={handleAddTransaction}
                exchangeRate={exchangeRate}
              />
            )}

            {activeView === 'budget' && (
              <BudgetView
                budgets={budgets}
                transactions={transactions}
                onAdd={handleAddBudget}
                onDelete={handleDeleteBudget}
                exchangeRate={exchangeRate}
                selectedMonth={selectedMonth}
                expenseCategories={expenseCategories}
              />
            )}

            {activeView === 'settings' && (
              <CategorySettings
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                onUpdateExpenses={setExpenseCategories}
                onUpdateIncome={setIncomeCategories}
              />
            )}
          </div>
        </div>
      </main>

      <AIChat transactions={transactions} accounts={accounts} />
      {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}
    </div>
  );
};

type NavItemProps = {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  isSpecial?: boolean;
};

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label, isSpecial = false }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center space-x-4 w-full p-4 rounded-2xl transition-all duration-300 group
      ${active
        ? isSpecial
          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 font-bold'
          : 'bg-slate-900 text-white shadow-xl shadow-slate-200 font-bold'
        : isSpecial
          ? 'text-indigo-500 hover:bg-indigo-50 font-bold'
          : 'text-slate-500 hover:bg-slate-50'}
    `}
  >
    <span className={`${active ? 'scale-110' : 'opacity-70 group-hover:scale-110'} transition-transform`}>{icon}</span>
    <span className="text-sm tracking-tight">{label}</span>
    {isSpecial && !active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_indigo]"></div>}
  </button>
);

export default App;
