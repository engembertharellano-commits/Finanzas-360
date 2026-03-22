export const simulatePlan = (plan: any) => {
  const monthlyRate = (plan.annualInterestRate || 0) / 12 / 100;
  let balance = plan.initialAmount || 0;
  
  // Variables para trackear el acumulado en el gráfico
  let accumulatedContributed = plan.initialAmount || 0;
  let accumulatedInterest = 0;
  
  const timeline = [];

  for (let month = 1; month <= plan.durationMonths; month++) {
    // 1. Calcular interés del mes sobre el saldo acumulado anterior
    const interest = balance * monthlyRate;
    accumulatedInterest += interest;
    balance += interest;

    // 2. Definir inyecciones de capital (Tu aporte + Renta)
    const monthlyContribution = (plan.monthlyContribution || 0);
    const rentContribution = (plan.type === 'real_estate' ? (plan.monthlyRent || 0) : 0);
    const totalInjection = monthlyContribution + rentContribution;
    
    // 3. Actualizar saldo y contador de capital aportado
    balance += totalInjection;
    accumulatedContributed += totalInjection;

    timeline.push({
      month,
      balance,                  // Línea total del patrimonio
      accumulatedContributed,   // Área de Capital (Aportes + Rentas)
      accumulatedInterest,      // Área de Ganancia (Interés Compuesto)
      interest                  // Valor del interés de este mes
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

  // Caso sin intereses: Despeje lineal simple
  if (r === 0) {
    return Math.max(0, (FV - PV) / n - rent);
  }

  // Fórmula de Anualidades: PM = (FV - PV*(1+r)^n) * r / ((1+r)^n - 1)
  const power = Math.pow(1 + r, n);
  const contributionNeeded = (FV - PV * power) * r / (power - 1);
  
  // Restamos la renta porque es dinero que ya "entra solo" para ayudar a la meta
  return Math.max(0, contributionNeeded - rent);
};

export const calculateSummary = (plan: any, timeline: any[]) => {
  const lastEntry = timeline[timeline.length - 1];
  
  // Extraemos los valores acumulados del último mes de la simulación
  const finalBalance = lastEntry?.balance || 0;
  const totalContributed = lastEntry?.accumulatedContributed || (plan.initialAmount || 0);
  const totalInterest = lastEntry?.accumulatedInterest || 0;

  return {
    finalBalance,
    totalContributed,
    totalInterest
  };
};
