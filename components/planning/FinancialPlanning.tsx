import React, { useState, useMemo } from 'react';
import { simulatePlan, calculateSummary } from '../../utils/financialEngine';

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

  return (
    <div className="space-y-8">

      {/* CONFIGURACIÓN */}
      <div className="bg-white p-6 rounded-2xl border">
        <h2 className="text-xl font-bold mb-4">Planificador Financiero</h2>

        <div className="grid grid-cols-2 gap-4">

          <input type="number" value={plan.initialAmount}
            onChange={e => update('initialAmount', +e.target.value)}
            placeholder="Capital inicial"
          />

          <input type="number" value={plan.monthlyContribution}
            onChange={e => update('monthlyContribution', +e.target.value)}
            placeholder="Aporte mensual"
          />

          <input type="number" value={plan.annualInterestRate}
            onChange={e => update('annualInterestRate', +e.target.value)}
            placeholder="Interés anual (%)"
          />

          <input type="number" value={plan.durationMonths}
            onChange={e => update('durationMonths', +e.target.value)}
            placeholder="Meses"
          />

          <select
            value={plan.type}
            onChange={e => update('type', e.target.value)}
          >
            <option value="general">General</option>
            <option value="real_estate">Bienes Raíces</option>
          </select>

          <input type="number" value={plan.goalAmount}
            onChange={e => update('goalAmount', +e.target.value)}
            placeholder="Meta"
          />
        </div>

        {plan.type === 'real_estate' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <input type="number" placeholder="Renta mensual"
              onChange={e => update('monthlyRent', +e.target.value)}
            />
          </div>
        )}
      </div>

      {/* RESULTADOS */}
      <div className="bg-white p-6 rounded-2xl border">
        <h2 className="text-xl font-bold mb-4">Resultados</h2>

        <p>Total final: ${summary.finalBalance.toFixed(2)}</p>
        <p>Aportado: ${summary.totalContributed.toFixed(2)}</p>
        <p className="text-green-600">
          Intereses: ${summary.totalInterest.toFixed(2)}
        </p>
      </div>

      {/* META */}
      {plan.goalAmount && (
        <div className="bg-white p-6 rounded-2xl border">
          {summary.finalBalance >= plan.goalAmount ? (
            <p className="text-green-600">✔ Alcanzas la meta</p>
          ) : (
            <p className="text-red-500">❌ No alcanzas la meta</p>
          )}
        </div>
      )}

      {/* TIMELINE */}
      <div className="bg-white p-6 rounded-2xl border max-h-60 overflow-y-auto">
        <h2 className="text-lg font-bold mb-2">Proyección</h2>

        {timeline.map((m: any) => (
          <div key={m.month} className="flex justify-between text-sm border-b py-1">
            <span>Mes {m.month}</span>
            <span>${m.balance.toFixed(2)}</span>
          </div>
        ))}
      </div>

    </div>
  );
};
