export const simulatePlan = (plan: any) => {
  const monthlyRate = plan.annualInterestRate / 12 / 100;

  let balance = plan.initialAmount;
  const timeline = [];

  for (let month = 1; month <= plan.durationMonths; month++) {
    const interest = balance * monthlyRate;

    balance += interest;
    balance += plan.monthlyContribution;

    // Si es bienes raíces, suma renta
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

export const calculateSummary = (plan: any, timeline: any[]) => {
  const finalBalance = timeline[timeline.length - 1]?.balance || 0;

  const totalContributed =
    plan.initialAmount + plan.monthlyContribution * plan.durationMonths;

  const totalInterest = finalBalance - totalContributed;

  return {
    finalBalance,
    totalContributed,
    totalInterest
  };
};
