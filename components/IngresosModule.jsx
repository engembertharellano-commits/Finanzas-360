import React, { useMemo } from "react";
import { TrendingUp } from "lucide-react";

const IngresosModule = ({ transactions, selectedMonth, exchangeRate, incomeCategories }) => {

  const monthlyIncomeUSD = useMemo(() => {

    const filtered = transactions.filter((tx) => {
      if (tx.type !== "Ingreso") return false;
      if (!tx.date) return false;
      return tx.date.startsWith(selectedMonth);
    });

    return filtered.reduce((total, tx) => {

      let amount = Number(tx.amount) || 0;

      if (tx.currency === "VES") {
        amount = amount / exchangeRate;
      }

      const commission = Number(tx.commission) || 0;

      return total + (amount - commission);

    }, 0);

  }, [transactions, selectedMonth, exchangeRate]);



  const incomeByCategory = useMemo(() => {

    const map = {};

    transactions.forEach((tx) => {

      if (tx.type !== "Ingreso") return;
      if (!tx.date.startsWith(selectedMonth)) return;

      let amount = Number(tx.amount) || 0;

      if (tx.currency === "VES") {
        amount = amount / exchangeRate;
      }

      const category = tx.category || "Otros";

      if (!map[category]) {
        map[category] = 0;
      }

      map[category] += amount;

    });

    return map;

  }, [transactions, selectedMonth, exchangeRate]);


  return (
    <div className="space-y-8">

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">

        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="text-emerald-500" size={26} />
          <h2 className="text-xl font-bold">Ingresos del Mes</h2>
        </div>

        <p className="text-4xl font-black text-emerald-600">
          ${monthlyIncomeUSD.toFixed(2)}
        </p>

      </div>



      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">

        <h3 className="font-bold mb-6">Ingresos por Categoría</h3>

        <div className="space-y-3">

          {Object.entries(incomeByCategory).map(([cat, value]) => (

            <div key={cat} className="flex justify-between text-sm">

              <span className="text-slate-600">{cat}</span>

              <span className="font-bold text-emerald-600">
                ${value.toFixed(2)}
              </span>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
};

export default IngresosModule;
