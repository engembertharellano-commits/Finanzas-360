import React, { useState, useMemo } from 'react';
import { WishlistItem, Currency, BankAccount } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Search,
  ArrowUp,
  ArrowDown,
  Wallet
} from 'lucide-react';

interface WishlistProps {
  items: WishlistItem[];
  accounts: BankAccount[];
  wishlistAccountId?: string;
  onUpdateAccountId: (id: string | undefined) => void;
  onAdd: (item: WishlistItem) => void;
  onUpdate: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  exchangeRate: number;
}

export const WishlistModule: React.FC<WishlistProps> = ({
  items,
  accounts,
  wishlistAccountId,
  onUpdateAccountId,
  onAdd,
  onUpdate,
  onDelete,
  exchangeRate
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'bought' | 'cancelled'>('pending');

  // Determinar saldo del fondo en USD
  const fundBalanceUSD = useMemo(() => {
    if (!wishlistAccountId) return 0;
    const acc = accounts.find(a => a.id === wishlistAccountId);
    if (!acc) return 0;
    return acc.currency === 'USD' ? acc.balance : acc.balance / exchangeRate;
  }, [wishlistAccountId, accounts, exchangeRate]);

  // Filtrar y ordenar items
  const filteredAndSortedItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => a.order - b.order);
  }, [items, searchTerm, filterStatus]);

  // Calcular Waterfall de ahorro para cada item
  const itemProgress = useMemo(() => {
    let remainingFund = fundBalanceUSD;
    const progressMap: Record<string, { savedUSD: number; percentage: number }> = {};

    // Solo calculamos cascada para los que están pendientes
    const pendingSorted = [...filteredAndSortedItems].filter(i => i.status === 'pending');

    pendingSorted.forEach(item => {
      const costUSD = item.currency === 'USD' ? item.amount : item.amount / exchangeRate;
      const allocated = Math.min(costUSD, remainingFund);
      remainingFund = Math.max(0, remainingFund - allocated);
      
      progressMap[item.id] = {
        savedUSD: allocated,
        percentage: costUSD > 0 ? (allocated / costUSD) * 100 : 0
      };
    });

    return progressMap;
  }, [filteredAndSortedItems, fundBalanceUSD, exchangeRate]);

  const moveItem = (item: WishlistItem, direction: 'up' | 'down') => {
    const currentIndex = items.findIndex(i => i.id === item.id);
    if (currentIndex === -1) return;

    // Encontrar el siguiente o anterior item del MISMO estado (para no mezclarlos visualmente si están filtrados)
    const currentSorted = [...items].sort((a,b) => a.order - b.order);
    const sortedIndex = currentSorted.findIndex(i => i.id === item.id);
    
    if (direction === 'up' && sortedIndex > 0) {
      const targetItem = currentSorted[sortedIndex - 1];
      onUpdate({ ...item, order: targetItem.order });
      onUpdate({ ...targetItem, order: item.order });
    } else if (direction === 'down' && sortedIndex < currentSorted.length - 1) {
      const targetItem = currentSorted[sortedIndex + 1];
      onUpdate({ ...item, order: targetItem.order });
      onUpdate({ ...targetItem, order: item.order });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Si es nuevo, ponerlo al final. Si es edición, mantener orden
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order)) : 0;
    
    const newItem: WishlistItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      currency: formData.get('currency') as Currency,
      priority: formData.get('priority') as 'low' | 'medium' | 'high',
      category: formData.get('category') as string,
      estimatedDate: formData.get('estimatedDate') as string || undefined,
      url: formData.get('url') as string || undefined,
      order: editingItem ? editingItem.order : maxOrder + 1,
      status: editingItem ? editingItem.status : 'pending'
    };

    if (editingItem) {
      onUpdate(newItem);
    } else {
      // Intentar auto-ordenar por prioridad si se desea, pero lo más fácil es ponerlo al final.
      onAdd(newItem);
    }
    
    setIsAdding(false);
    setEditingItem(null);
  };

  const handleStatusChange = (item: WishlistItem, newStatus: 'pending' | 'bought' | 'cancelled') => {
    onUpdate({ ...item, status: newStatus });
  };

  const totals = useMemo(() => {
    const pendingItems = items.filter(i => i.status === 'pending');
    let totalUSD = 0;

    pendingItems.forEach(item => {
      const valUSD = item.currency === 'USD' ? item.amount : item.amount / exchangeRate;
      totalUSD += valUSD;
    });

    return {
      targetUSD: totalUSD,
      targetVES: totalUSD * exchangeRate,
      savedUSD: fundBalanceUSD,
      progress: totalUSD > 0 ? (Math.min(fundBalanceUSD, totalUSD) / totalUSD) * 100 : 0
    };
  }, [items, exchangeRate, fundBalanceUSD]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Lista de Deseos</h1>
          <p className="text-slate-500 font-medium">Asigna un fondo y mira cómo se completan tus metas en orden.</p>
        </div>
        
        {/* Selector de Cuenta Fondo */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Cuenta Fondo (Origen de ahorros)
            </label>
            <select
              value={wishlistAccountId || ''}
              onChange={(e) => onUpdateAccountId(e.target.value || undefined)}
              className="bg-transparent font-bold text-slate-900 outline-none w-full max-w-[200px] cursor-pointer"
            >
              <option value="">Seleccionar cuenta...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-end min-w-[140px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ahorrado (Fondo)</span>
          <span className="text-2xl font-black text-emerald-600">${totals.savedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-slate-900 p-4 rounded-3xl shadow-xl flex flex-col items-end min-w-[140px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Pendiente</span>
          <span className="text-2xl font-black text-white">${totals.targetUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Progress Bar Overall */}
      {totals.targetUSD > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progreso Global</p>
              <p className="text-sm font-bold text-slate-600">Tienes ahorrado el {totals.progress.toFixed(1)}% de lo que quieres comprar</p>
            </div>
            <span className="text-2xl font-black text-slate-900">{totals.progress.toFixed(0)}%</span>
          </div>
          <div className="h-4 bg-slate-50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(totals.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por descripción o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-600 appearance-none cursor-pointer"
          >
            <option value="pending">Pendientes</option>
            <option value="bought">Comprados</option>
            <option value="cancelled">Cancelados</option>
            <option value="all">Todos</option>
          </select>
          <button 
            onClick={() => {
              setEditingItem(null);
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={20} />
            Añadir Deseo
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedItems.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No hay elementos aquí</h3>
            <p className="text-slate-400 max-w-xs font-medium">Comienza a agregar cosas que quieres comprar en el futuro.</p>
          </div>
        ) : (
          filteredAndSortedItems.map((item, index) => {
            const isPending = item.status === 'pending';
            const progressInfo = itemProgress[item.id] || { savedUSD: 0, percentage: 0 };
            const progress = isPending ? progressInfo.percentage : (item.status === 'bought' ? 100 : 0);
            
            const priorityColors = {
              high: 'bg-rose-100 text-rose-700',
              medium: 'bg-amber-100 text-amber-700',
              low: 'bg-slate-100 text-slate-700'
            };

            return (
              <div 
                key={item.id}
                className="bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 hover:shadow-xl transition-all overflow-hidden flex flex-col"
              >
                <div className="p-6 flex-1 relative">
                  {/* Controles de orden */}
                  {isPending && filterStatus === 'pending' && !searchTerm && (
                    <div className="absolute top-6 right-6 flex flex-col bg-slate-50 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                      <button 
                        onClick={() => moveItem(item, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button 
                        onClick={() => moveItem(item, 'down')}
                        disabled={index === filteredAndSortedItems.length - 1}
                        className="p-1 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-colors border-t border-slate-100"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4 pr-10">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${priorityColors[item.priority]}`}>
                      {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'} Prioridad
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{item.description}</h3>
                  <p className="text-sm font-bold text-slate-400 mb-6">{item.category}</p>

                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Precio estimado</p>
                      <p className="text-2xl font-black text-slate-900">
                        {item.currency === 'USD' ? '$' : ''}{item.amount.toLocaleString()} {item.currency === 'VES' ? 'VES' : ''}
                      </p>
                    </div>
                    {item.estimatedDate && (
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Para</p>
                        <p className="text-sm font-bold text-slate-600">{new Date(item.estimatedDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Individual Progress */}
                  {isPending && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-bold text-slate-500">Cubierto: ${progressInfo.savedUSD.toLocaleString('en-US', {maximumFractionDigits: 2})}</span>
                        <span className="font-black text-slate-900">{Math.min(progress, 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="px-4 py-3 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-colors" title="Ver producto">
                      <ExternalLink size={18} />
                    </a>
                  )}
                  <button 
                    onClick={() => {
                      setEditingItem(item);
                      setIsAdding(true);
                    }}
                    className="px-4 py-3 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded-xl transition-colors"
                    title="Editar"
                  >
                    Editar
                  </button>
                  
                  {isPending ? (
                    <>
                      <button 
                        onClick={() => handleStatusChange(item, 'bought')}
                        className="flex-1 py-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle2 size={16} /> Comprado
                      </button>
                      <button 
                        onClick={() => handleStatusChange(item, 'cancelled')}
                        className="px-4 py-3 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 rounded-xl flex items-center justify-center transition-colors"
                        title="Cancelar / Descartar"
                      >
                        <XCircle size={18} />
                      </button>
                    </>
                  ) : (
                    <div className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${item.status === 'bought' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                      {item.status === 'bought' ? <><CheckCircle2 size={16} /> Comprado</> : <><XCircle size={16} /> Cancelado</>}
                    </div>
                  )}
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Agregar/Editar */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setIsAdding(false); setEditingItem(null); }} />
          <div className="relative bg-white w-full max-w-xl max-h-[90vh] flex flex-col rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-10 shrink-0">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingItem ? 'Editar Deseo' : 'Nuevo Deseo'}</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">¿Qué tienes planeado comprar?</p>
                </div>
                <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">¿Qué quieres comprar?</label>
                  <input 
                    name="description" 
                    required 
                    defaultValue={editingItem?.description}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="Ej: Laptop nueva, Viaje a Cancún..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Precio Referencial</label>
                    <input 
                      name="amount" 
                      type="number" 
                      step="0.01" 
                      required 
                      defaultValue={editingItem?.amount}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Moneda</label>
                    <select 
                      name="currency" 
                      defaultValue={editingItem?.currency || 'USD'}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold appearance-none"
                    >
                      <option value="USD">Dólares (USD)</option>
                      <option value="VES">Bolívares (VES)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Categoría</label>
                    <input 
                      name="category" 
                      required 
                      defaultValue={editingItem?.category}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                      placeholder="Ej: Tecnología, Hogar..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prioridad (Inicial)</label>
                    <select 
                      name="priority" 
                      defaultValue={editingItem?.priority || 'medium'}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold appearance-none"
                    >
                      <option value="high">Alta (Urgente / Muy Deseado)</option>
                      <option value="medium">Media (Normal)</option>
                      <option value="low">Baja (Capricho / Futuro)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">URL / Link del producto (Opcional)</label>
                  <input 
                    name="url" 
                    type="url"
                    defaultValue={editingItem?.url}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha tentativa de compra (Opcional)</label>
                  <input 
                    name="estimatedDate" 
                    type="date"
                    defaultValue={editingItem?.estimatedDate}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-[0.98] mt-4"
                >
                  {editingItem ? 'Guardar Cambios' : 'Añadir a Lista de Deseos'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
