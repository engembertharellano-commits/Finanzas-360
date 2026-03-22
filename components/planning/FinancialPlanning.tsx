import React, { useState, useMemo, useEffect } from 'react';
import { simulatePlan, calculateSummary, calculateNeededContribution } from '../../utils/financialEngine';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Percent, 
  CircleDollarSign, 
  Home,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Save,
  Zap,
  Plus,
  Trash2,
  List
} from 'lucide-react';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export const FinancialPlanning = ({ onSave, onDelete, savedPlans = [] }: { onSave: (plan: any) => void, onDelete: (id: string) => void, savedPlans: any[] }) => {
  const [mode, setMode] = useState<'simulate' | 'goal'>('simulate');
  const [showList, setShowList] = useState(false);

  const createEmptyPlan = () => ({
    id: crypto.randomUUID(),
    name: 'Nuevo Plan ' + (savedPlans.length + 1),
    initialAmount: 1000,
    monthlyContribution: 200,
    annualInterestRate: 10,
    durationMonths: 24,
    goalAmount: 10000,
    type: 'general',
    propertyValue: 0,
    downPayment: 0,
    monthlyRent: 0
  });

  const [plan, setPlan] = useState(savedPlans.length > 0 ? savedPlans[0] : createEmptyPlan());

  const handleSelectPlan = (p: any) => {
    setPlan(p);
    setShowList(false);
  };

  const handleConfirmSave = () => {
    const isUpdate = savedPlans.some(p => p.id === plan.id);
    const message = isUpdate 
      ? `¿Deseas actualizar los cambios en el plan "${plan.name}"?` 
      : `¿Deseas guardar "${plan.name}" como un nuevo plan en tu lista?`;

    if (window.confirm(message)) {
      onSave(plan);
      setShowList(false);
    }
  };

  useEffect(() => {
    if (mode === 'goal') {
      const needed = calculateNeededContribution(plan);
      setPlan(prev => ({ ...prev, monthlyContribution: Number(needed.toFixed(2)) }));
    }
  }, [mode, plan.goalAmount, plan.initialAmount, plan.durationMonths, plan.annualInterestRate, plan.monthlyRent]);

  const timeline = useMemo(() => simulatePlan(plan), [plan]);
  const summary = useMemo(() => calculateSummary(plan, timeline), [plan, timeline]);

  const update = (field: string, value: any) => {
    setPlan(prev => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";
  const labelClass = "block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1.5 ml-1";
  const cardClass = "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-700">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Mes {payload[0].payload.month}</p>
          <div className="space-y-1 mt-1">
            <p className="text-xs font-bold text-indigo-300">
              Capital: ${payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </p>
            <p className="text-xs font-bold text-emerald-400">
              Ganancia: ${payload[1]?.value.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </p>
            <div className="pt-1 border-t border-slate-700">
              <p className="text-sm font-black text-white">
                Total: ${(payload[0].value + payload[1]?.value).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* HEADER CON GESTIÓN DE MÚLTIPLES PLANES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Target size={24} />
          </div>
          <div className="flex flex-col">
            <input 
              value={plan.name}
              onChange={(e) => update('name', e.target.value)}
              className="text-xl font-black text-slate-800 tracking-tight bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
              placeholder="Nombre del plan..."
            />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planificación Activa</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => { setPlan(createEmptyPlan()); setMode('simulate'); }}
            className="p-2.5 bg-white text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm transition-all"
            title="Crear nuevo plan"
          >
            <Plus size={20} />
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowList(!showList)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${showList ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={14} /> MIS PLANES ({savedPlans.length})
            </button>

            {showList && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 p-2 animate-in zoom-in-95 duration-200">
                {savedPlans.length === 0 ? (
                  <p className="text-[10px] text-center py-4 font-bold text-slate-400 uppercase">No hay planes guardados</p>
                ) : (
                  savedPlans.map(p => (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${plan.id === p.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                      onClick={() => handleSelectPlan(p)}
                    >
                      <span className="text-xs font-black truncate flex-1">{p.name}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if(window.confirm(`¿Seguro que quieres borrar "${p.name}"?`)) {
                            onDelete(p.id);
                            if(plan.id === p.id) setPlan(createEmptyPlan());
                          }
                        }}
                        className="ml-2 p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <button 
            onClick={() => setMode('simulate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${mode === 'simulate' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TrendingUp size={14} /> SIMULAR
          </button>
          <button 
            onClick={() => setMode('goal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${mode === 'goal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Zap size={14} /> META
          </button>

          <button 
            onClick={handleConfirmSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 transition-all"
          >
            <Save size={14} /> GUARDAR
          </button>
        </div>
      </div>

      {/* INPUTS DE CONFIGURACIÓN */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>Capital Inicial</label>
            <div className="relative">
              <CircleDollarSign className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.initialAmount}
                onChange={e => update('initialAmount', +e.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{mode === 'goal' ? 'Aporte Necesario' : 'Aporte Mensual'}</label>
            <div className="relative">
              <TrendingUp className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.monthlyContribution}
                disabled={mode === 'goal'}
                onChange={e => update('monthlyContribution', +e.target.value)}
                className={`${inputClass} pl-11 ${mode === 'goal' ? 'bg-indigo-50 border-indigo-100 text-indigo-700 font-black' : ''}`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Interés Anual (%)</label>
            <div className="relative">
              <Percent className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.annualInterestRate}
                onChange={e => update('annualInterestRate', +e.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Plazo (Meses)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.durationMonths}
                onChange={e => update('durationMonths', +e.target.value)}
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tipo de Inversión</label>
            <select
              value={plan.type}
              onChange={e => update('type', e.target.value)}
              className={`${inputClass} appearance-none bg-slate-50`}
            >
              <option value="general">💼 Inversión General</option>
              <option value="real_estate">🏠 Bienes Raíces</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Meta de Ahorro</label>
            <div className="relative">
              <Target className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.goalAmount}
                onChange={e => update('goalAmount', +e.target.value)}
                className={`${inputClass} pl-11 font-black text-indigo-600 border-indigo-100 bg-indigo-50/50`}
              />
            </div>
          </div>
        </div>

        {plan.type === 'real_estate' && (
          <div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Renta Mensual Estimada</label>
                <div className="relative">
                  <Home className="absolute left-4 top-3.5 text-slate-300" size={16} />
                  <input type="number" value={plan.monthlyRent}
                    onChange={e => update('monthlyRent', +e.target.value)}
                    className={`${inputClass} pl-11 bg-white`}
                    placeholder="Ej: 500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STATUS DE LA META */}
      {plan.goalAmount > 0 && (
        <div className={`p-6 rounded-[2rem] flex items-center gap-5 border transition-all ${
          summary.finalBalance >= plan.goalAmount 
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
          : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          {summary.finalBalance >= plan.goalAmount ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-emerald-200 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={28} />
              </div>
              <div className="flex-1">
                <p className="font-black text-lg tracking-tight">¡Meta alcanzada!</p>
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Has superado tu objetivo por ${ (summary.finalBalance - plan.goalAmount).toLocaleString(undefined, {maximumFractionDigits: 0}) }</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-rose-200 flex items-center justify-center text-rose-500">
                <AlertCircle size={28} />
              </div>
              <div className="flex-1">
                <p className="font-black text-lg tracking-tight">Aún no alcanzas la meta</p>
                <p className="text-xs font-bold opacity-90 uppercase tracking-wider">Te faltan ${(plan.goalAmount - summary.finalBalance).toLocaleString(undefined, {maximumFractionDigits: 0})} para lograr tu objetivo.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* RESUMEN DE NÚMEROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardClass}>
          <p className={labelClass}>Total Final</p>
          <p className="text-3xl font-black text-slate-950 tracking-tighter">${summary.finalBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`${cardClass} bg-slate-50/50 border-slate-100`}>
          <p className={labelClass}>Total Aportado</p>
          <p className="text-3xl font-black text-slate-600 tracking-tighter">${summary.totalContributed.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`${cardClass} border-emerald-100 bg-emerald-50/20`}>
          <p className={labelClass}>Intereses Ganados</p>
          <p className="text-3xl font-black text-emerald-600 tracking-tighter">+${summary.totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* VISUALIZACIÓN DE PATRIMONIO MEJORADA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardClass} lg:col-span-2 overflow-hidden flex flex-col`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                <BarChart3 size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Composición del Crecimiento</h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Capital</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ganancia</div>
            </div>
          </div>
          
          <div className="flex-1 h-[300px] -ml-6 -mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" hide />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="accumulatedContributed" 
                  stackId="1" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCap)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="accumulatedInterest" 
                  stackId="1" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorInt)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-7 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">Detalle Mensual</h3>
          </div>
          
          <div className="flex-1 max-h-[400px] overflow-y-auto px-7 py-2 custom-scrollbar">
            {timeline.map((m: any, index: number) => (
              <div 
                key={m.month} 
                className={`flex justify-between items-center py-4 border-b last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-xl ${
                  m.balance >= plan.goalAmount && plan.goalAmount > 0 && timeline[index-1]?.balance < plan.goalAmount
                  ? 'border-l-4 border-emerald-300 bg-emerald-50/50 my-1'
                  : 'border-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 w-7 h-7 rounded-lg flex items-center justify-center">
                    {String(m.month).padStart(2, '0')}
                  </span>
                  {m.balance >= plan.goalAmount && plan.goalAmount > 0 && timeline[index-1]?.balance < plan.goalAmount && (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  )}
                </div>
                <span className={`text-sm font-black ${
                  m.balance >= plan.goalAmount && plan.goalAmount > 0
                  ? 'text-emerald-600'
                  : 'text-slate-700'
                }`}>
                  ${m.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
