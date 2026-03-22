export const simulatePlan = (plan: any) => {
  const monthlyRate = (plan.annualInterestRate || 0) / 12 / 100;
  let balance = plan.initialAmount || 0;
  const timeline = [];

  for (let month = 1; month <= plan.durationMonths; month++) {
    const interest = balance * monthlyRate;
    balance += interest;
    balance += (plan.monthlyContribution || 0);

    if (plan.type === 'real_estate' && plan.monthlyRent) {
      balance += plan.monthlyRent;
    }

    timeline.push({
      month,
      balance,
      interest
    });
  }
  return timeline;
};

// NUEVA FUNCIÓN: Ingeniería Inversa
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
  const finalBalance = timeline[timeline.length - 1]?.balance || 0;
  const totalContributed = (plan.initialAmount || 0) + (plan.monthlyContribution || 0) * (plan.durationMonths || 0);
  const totalInterest = finalBalance - totalContributed;

  return {
    finalBalance,
    totalContributed,
    totalInterest
  };
};
