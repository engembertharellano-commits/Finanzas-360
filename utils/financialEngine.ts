export const simulatePlan = (plan: any) => {
  const monthlyRate = (plan.annualInterestRate || 0) / 12 / 100;
  let balance = plan.initialAmount || 0;
  
  // Variables para trackear el acumulado en el gráfico
  let accumulatedContributed = plan.initialAmount || 0;
  let accumulatedInterest = 0;
  
  // LÓGICA DE PLAZO: Si es retiro, calculamos meses por edad, si no, usamos durationMonths
  let duration = plan.durationMonths || 1;
  if (plan.type === 'retirement' && plan.currentAge && plan.retirementAge) {
    duration = Math.max(1, (plan.retirementAge - plan.currentAge) * 12);
  }
  
  const timeline = [];

  for (let month = 1; month <= duration; month++) {
    // 1. Calcular interés del mes sobre el saldo acumulado anterior
    const interest = balance * monthlyRate;
    accumulatedInterest += interest;
    balance += interest;

    // 2. Definir inyecciones de capital (Aporte + Renta)
    const monthlyContribution = (plan.monthlyContribution || 0);
    const rentContribution = (plan.type === 'real_estate' ? (plan.monthlyRent || 0) : 0);
    const totalInjection = monthlyContribution + rentContribution;
    
    // 3. Actualizar saldo y contador de capital aportado
    balance += totalInjection;
    accumulatedContributed += totalInjection;

    timeline.push({
      month,
      balance,                  
      accumulatedContributed,   
      accumulatedInterest,      
      interest                  
    });
  }
  return timeline;
};

// FUNCIÓN: Ingeniería Inversa (Modo Meta)
export const calculateNeededContribution = (plan: any) => {
  const r = (plan.annualInterestRate || 0) / 12 / 100;
  const FV = plan.goalAmount || 0;
  const PV = plan.initialAmount || 0;
  const rent = (plan.type === 'real_estate' ? (plan.monthlyRent || 0) : 0);

  // LÓGICA DE PLAZO PARA INGENIERÍA INVERSA
  let n = plan.durationMonths || 1;
  if (plan.type === 'retirement' && plan.currentAge && plan.retirementAge) {
    n = Math.max(1, (plan.retirementAge - plan.currentAge) * 12);
  }

  // Caso sin intereses
  if (r === 0) {
    return Math.max(0, (FV - PV) / n - rent);
  }

  // Fórmula de Anualidades
  const power = Math.pow(1 + r, n);
  const contributionNeeded = (FV - PV * power) * r / (power - 1);
  
  return Math.max(0, contributionNeeded - rent);
};

export const calculateSummary = (plan: any, timeline: any[]) => {
  const lastEntry = timeline[timeline.length - 1];
  
  const finalBalance = lastEntry?.balance || 0;
  const totalContributed = lastEntry?.accumulatedContributed || (plan.initialAmount || 0);
  const totalInterest = lastEntry?.accumulatedInterest || 0;

  return {
    finalBalance,
    totalContributed,
    totalInterest,
    // MÉTRICA EXTRA PARA RETIRO: Regla del 4% (Retiro mensual seguro)
    monthlyPension: (finalBalance * 0.04) / 12
  };
};
