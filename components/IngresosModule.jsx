import React, { useMemo } from "react";

export default function IngresosModule({
  transactions,
  selectedMonth,
  exchangeRate
}) {

  const incomeBreakdown = useMemo(() => {

    const map = {};

    transactions.forEach(tx => {

      if (tx.type !== "Ingreso") return;

      if (!tx.date.startsWith(selectedMonth)) return;

      if (tx.category !== "Sueldo") return;

      let amount = Number(tx.amount) || 0;

      if (tx.currency === "VES") {
        amount = amount / exchangeRate;
      }

      const key = tx.description || "OTROS";

      if (!map[key]) {
        map[key] = 0;
      }

      map[key] += amount;

    });

    return map;

  }, [transactions, selectedMonth, exchangeRate]);


  const totalIncome = Object.values(incomeBreakdown)
    .reduce((a,b)=>a+b,0);


  const percent = (value) => {
    if (totalIncome === 0) return 0;
    return (value / totalIncome) * 100;
  };


  return (

    <div className="space-y-6">


      {/* TOTAL */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <p className="text-gray-500 text-sm">
          Total ingresos del mes
        </p>

        <h1 className="text-3xl font-bold text-green-600 mt-2">
          ${totalIncome.toFixed(2)}
        </h1>

      </div>



      {/* GRAFICA */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <h3 className="font-semibold mb-4">
          Distribución
        </h3>

        {Object.entries(incomeBreakdown).map(([name,value]) => (

          <div key={name} className="mb-3">

            <div className="flex justify-between text-sm mb-1">
              <span>{name}</span>
              <span>{percent(value).toFixed(0)}%</span>
            </div>

            <div className="bg-gray-200 h-3 rounded-full overflow-hidden">

              <div
                className="bg-green-500 h-3"
                style={{ width: `${percent(value)}%` }}
              />

            </div>

          </div>

        ))}

      </div>



      {/* DESGLOSE */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <h3 className="font-semibold mb-4">
          Desglose
        </h3>

        {Object.entries(incomeBreakdown).map(([name,value]) => (

          <div
            key={name}
            className="flex justify-between mb-2"
          >

            <span>{name}</span>

            <span>
              ${value.toFixed(2)}
            </span>

          </div>

        ))}

      </div>


    </div>

  );

}
