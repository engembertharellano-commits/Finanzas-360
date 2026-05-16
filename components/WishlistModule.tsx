import React, { useState, useMemo } from 'react';
import { WishlistItem, Currency } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  XCircle,
  TrendingUp,
  Search,
  Filter,
  Target
} from 'lucide-react';

interface WishlistProps {
  items: WishlistItem[];
  onAdd: (item: WishlistItem) => void;
  onUpdate: (item: WishlistItem) => void;
  onDelete: (id: string) => void;
  exchangeRate: number;
}

export const WishlistModule: React.FC<WishlistProps> = ({
  items,
  onAdd,
  onUpdate,
  onDelete,
  exchangeRate
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'bought' | 'cancelled'>('pending');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      // Sort by priority (high > medium > low) and then by amount
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      const aVal = a.currency === 'USD' ? a.amount : a.amount / exchangeRate;
      const bVal = b.currency === 'USD' ? b.amount : b.amount / exchangeRate;
      return bVal - aVal;
    });
  }, [items, searchTerm, filterStatus, exchangeRate]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newItem: WishlistItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      description: formData.get('description') as string,
      amount: Number(formData.get('amount')),
      currency: formData.get('currency') as Currency,
      priority: formData.get('priority') as 'low' | 'medium' | 'high',
      category: formData.get('category') as string,
      estimatedDate: formData.get('estimatedDate') as string || undefined,
      url: formData.get('url') as string || undefined,
      savedAmount: editingItem ? editingItem.savedAmount : 0,
      status: editingItem ? editingItem.status : 'pending'
    };

    if (editingItem) {
      onUpdate(newItem);
    } else {
      onAdd(newItem);
    }
    
    setIsAdding(false);
    setEditingItem(null);
  };

  const handleUpdateSavedAmount = (item: WishlistItem) => {
    const amountStr = prompt(`¿Cuánto tienes ahorrado actualmente para "${item.description}"? (${item.currency}):`, item.savedAmount.toString());
    if (amountStr !== null) {
      const val = parseFloat(amountStr);
      if (!isNaN(val) && val >= 0) {
        onUpdate({ ...item, savedAmount: val });
      }
    }
  };

  const handleStatusChange = (item: WishlistItem, newStatus: 'pending' | 'bought' | 'cancelled') => {
    onUpdate({ ...item, status: newStatus });
  };

  const totals = useMemo(() => {
    const pendingItems = items.filter(i => i.status === 'pending');
    let totalUSD = 0;
    let savedUSD = 0;

    pendingItems.forEach(item => {
      const valUSD = item.currency === 'USD' ? item.amount : item.amount / exchangeRate;
      const savUSD = item.currency === 'USD' ? item.savedAmount : item.savedAmount / exchangeRate;
      totalUSD += valUSD;
      savedUSD += savUSD;
    });

    return {
      targetUSD: totalUSD,
      targetVES: totalUSD * exchangeRate,
      savedUSD: savedUSD,
      progress: totalUSD > 0 ? (savedUSD / totalUSD) * 100 : 0
    };
  }, [items, exchangeRate]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Lista de Deseos</h1>
          <p className="text-slate-500 font-medium">Planifica tus próximas compras y haz seguimiento de tu ahorro.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-end min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ahorrado (Total USD)</span>
            <span className="text-2xl font-black text-emerald-600">${totals.savedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-slate-900 p-4 rounded-3xl shadow-xl flex flex-col items-end min-w-[140px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Meta (Total USD)</span>
            <span className="text-2xl font-black text-white">${totals.targetUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
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
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all font-medium"
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-600 appearance-none cursor-pointer"
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
        {filteredItems.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No hay elementos aquí</h3>
            <p className="text-slate-400 max-w-xs font-medium">Comienza a agregar cosas que quieres comprar en el futuro.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const progress = item.amount > 0 ? (item.savedAmount / item.amount) * 100 : 0;
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
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${priorityColors[item.priority]}`}>
                      {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'} Prioridad
                    </span>
                    <div className="flex gap-2">
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors">
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setIsAdding(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        Editar
                      </button>
                    </div>
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
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-bold text-slate-500">Ahorrado: {item.currency === 'USD' ? '$' : ''}{item.savedAmount.toLocaleString()}</span>
                      <span className="font-black text-slate-900">{Math.min(progress, 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    {item.status === 'pending' && (
                      <button 
                        onClick={() => handleUpdateSavedAmount(item)}
                        className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-900 transition-colors flex items-center justify-center gap-2"
                      >
                        <Target size={14} /> Actualizar Ahorro
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  {item.status === 'pending' ? (
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prioridad</label>
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
