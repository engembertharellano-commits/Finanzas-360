import React, { useState, useMemo } from 'react';
import { simulatePlan, calculateSummary } from '../../utils/financialEngine';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Percent, 
  CircleDollarSign, 
  Home,
  CheckCircle2,
  AlertCircle,
  BarChart3 // Icono para la sección de gráfica
} from 'lucide-react';

// IMPORTACIÓN DE RECHARTS - Requiere 'npm install recharts'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export const FinancialPlanning = () => {
  const [plan, setPlan] = useState({
    name: 'Mi Plan',
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

  const timeline = useMemo(() => simulatePlan(plan), [plan]);
  const summary = useMemo(() => calculateSummary(plan, timeline), [plan, timeline]);

  const update = (field: string, value: any) => {
    setPlan(prev => ({ ...prev, [field]: value }));
  };

  // Clases compartidas para consistencia visual
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";
  const labelClass = "block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1.5 ml-1";
  const cardClass = "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm";

  // Formateador personalizado para el Tooltip de la gráfica
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-700">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Mes {payload[0].payload.month}</p>
          <p className="text-sm font-black text-indigo-300">
            ${payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. SECCIÓN DE CONFIGURACIÓN */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Target size={20} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-800">Planificador Financiero</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Capital Inicial */}
          <div>
            <label className={labelClass}>Capital Inicial</label>
            <div className="relative">
              <CircleDollarSign className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.initialAmount}
                onChange={e => update('initialAmount', +e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="0"
              />
            </div>
          </div>

          {/* Aporte Mensual */}
          <div>
            <label className={labelClass}>Aporte Mensual</label>
            <div className="relative">
              <TrendingUp className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.monthlyContribution}
                onChange={e => update('monthlyContribution', +e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="0"
              />
            </div>
          </div>

          {/* Interés Anual */}
          <div>
            <label className={labelClass}>Interés Anual (%)</label>
            <div className="relative">
              <Percent className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.annualInterestRate}
                onChange={e => update('annualInterestRate', +e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="0"
              />
            </div>
          </div>

          {/* Plazo */}
          <div>
            <label className={labelClass}>Plazo (Meses)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.durationMonths}
                onChange={e => update('durationMonths', +e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="0"
              />
            </div>
          </div>

          {/* Tipo de Inversión */}
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

          {/* Meta de Ahorro */}
          <div>
            <label className={labelClass}>Meta de Ahorro</label>
            <div className="relative">
              <Target className="absolute left-4 top-3.5 text-slate-300" size={16} />
              <input type="number" value={plan.goalAmount}
                onChange={e => update('goalAmount', +e.target.value)}
                className={`${inputClass} pl-11 font-black text-indigo-600 border-indigo-100 bg-indigo-50/50`}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Campos extra para Bienes Raíces (Animado) */}
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

      {/* 2. STATUS DE LA META (Solo si hay meta definida) */}
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

      {/* 3. SECCIÓN DE RESULTADOS DESTACADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardClass}>
          <p className={labelClass}>Total Final (Patrimonio)</p>
          <p className="text-3xl font-black text-slate-950 tracking-tighter">${summary.finalBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`${cardClass} bg-slate-50/50 border-slate-100`}>
          <p className={labelClass}>Capital Aportado</p>
          <p className="text-3xl font-black text-slate-600 tracking-tighter">${summary.totalContributed.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`${cardClass} border-emerald-100 bg-emerald-50/20`}>
          <p className={labelClass}>Intereses Generados (Ganancia)</p>
          <p className="text-3xl font-black text-emerald-600 tracking-tighter">+${summary.totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* 4. VISUALIZACIÓN GRÁFICA Y DETALLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica Lineal (2/3 del ancho en desktop) */}
        <div className={`${cardClass} lg:col-span-2 overflow-hidden flex flex-col`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Evolución del Patrimonio</h3>
          </div>
          
          <div className="flex-1 h-80 lg:h-full min-h-[320px] -ml-6 -mb-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeline}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                  interval={Math.ceil(timeline.length / 10)} // Ajusta densidad de etiquetas
                  label={{ value: 'Meses', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#cbd5e1', fontWeight: 'bold' }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                  tickFormatter={(value) => `$${value / 1000}k`} // Formato abreviado $1k, $2k
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '6 6' }} />
                
                {/* Línea de la Meta (Solo si hay meta) */}
                {plan.goalAmount > 0 && (
                  <Line 
                    type="monotone" 
                    dataKey={() => plan.goalAmount} 
                    stroke="#fda4af" // Rose 300
                    strokeWidth={2} 
                    strokeDasharray="8 8" 
                    dot={false}
                    activeDot={false}
                    name="Meta"
                  />
                )}

                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#6366f1" // Indigo 500
                  strokeWidth={4} 
                  dot={{ stroke: '#6366f1', strokeWidth: 2, r: 4, fill: 'white' }}
                  activeDot={{ r: 6, stroke: '#4338ca', fill: 'white' }}
                  name="Saldo"
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla de Proyección (1/3 del ancho en desktop) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-7 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">Detalle Mes a Mes</h3>
          </div>
          
          <div className="flex-1 max-h-[400px] lg:max-h-full overflow-y-auto px-7 py-2 custom-scrollbar">
            {timeline.map((m: any, index: number) => (
              <div 
                key={m.month} 
                className={`flex justify-between items-center py-4 border-b last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-xl ${
                  m.balance >= plan.goalAmount && plan.goalAmount > 0 && timeline[index-1]?.balance < plan.goalAmount
                  ? 'border-l-4 border-emerald-300 bg-emerald-50/50 my-1' // Resalta el mes que se alcanza la meta
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
