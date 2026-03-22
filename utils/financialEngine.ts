export const simulatePlan = (plan: any) => {
  const monthlyRate = (plan.annualInterestRate || 0) / 12 / 100;
  let balance = plan.initialAmount || 0;
  
  // Variables para trackear el gráfico de áreas
  let accumulatedContributed = plan.initialAmount || 0;
  let accumulatedInterest = 0;
  
  const timeline = [];

  for (let month = 1; month <= plan.durationMonths; month++) {
    // 1. Calcular interés del mes sobre el saldo anterior
    const interest = balance * monthlyRate;
    accumulatedInterest += interest;
    balance += interest;

    // 2. Sumar aportes (Mensual + Renta si aplica)
    const monthlyContribution = (plan.monthlyContribution || 0);
    const rentContribution = (plan.type === 'real_estate' ? (plan.monthlyRent || 0) : 0);
    
    balance += monthlyContribution + rentContribution;
    
    // El "Capital" en el gráfico es tu ahorro acumulado (no incluimos la renta aquí para ver el esfuerzo propio)
    accumulatedContributed += monthlyContribution;

    timeline.push({
      month,
      balance, // El total (Línea superior del gráfico)
      accumulatedContributed, // Área azul (Tu capital)
      accumulatedInterest, // Área verde (Ganancia acumulada)
      interest // Interés puntual del mes
    });
  }
  return timeline;
};

// FUNCIÓN: Ingeniería Inversa (Modo Meta)
export const calculateNeededContribution = (plan: any) => {
  const r = (plan.annualInterestRate || 0) / 12 / 100;
  const n = plan.durationMonths || 1;
  const FV = plan.goalAmount || 0;
  const PV = plan.initialAmount || 0;
  const rent = (plan.type === 'real_estate' ? (plan.monthlyRent || 0) : 0);

  // Si no hay interés, es una división simple
  if (r === 0) {
    return (FV - PV) / n - rent;
  }

  // Fórmula: PM = (FV - PV*(1+r)^n) * r / ((1+r)^n - 1)
  const power = Math.pow(1 + r, n);
  const contributionNeeded = (FV - PV * power) * r / (power - 1);
  
  // Restamos la renta porque ya es un "ingreso" que ayuda a la meta
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
    totalInterest
  };
};
