import React, { useMemo } from "react";

export default function IngresosModule({
  transactions,
  selectedMonth,
  exchangeRate
}) {

  const data = useMemo(() => {

    const sueldo = {};
    const otros = {};

    transactions.forEach(tx => {

      if (tx.type !== "Ingreso") return;
      if (!tx.date.startsWith(selectedMonth)) return;

      let amount = Number(tx.amount) || 0;

      if (tx.currency === "VES") {
        amount = amount / exchangeRate;
      }

      if (tx.category === "Sueldo") {

        const key = tx.description || "OTROS";

        if (!sueldo[key]) sueldo[key] = 0;

        sueldo[key] += amount;

      } else {

        const key = tx.category;

        if (!otros[key]) otros[key] = 0;

        otros[key] += amount;

      }

    });

    return { sueldo, otros };

  }, [transactions, selectedMonth, exchangeRate]);


  const totalIncome =
    [...Object.values(data.sueldo), ...Object.values(data.otros)]
      .reduce((a,b)=>a+b,0);

  const totalSueldo =
    Object.values(data.sueldo)
      .reduce((a,b)=>a+b,0);


  const percent = (value) => {
    if (totalSueldo === 0) return 0;
    return (value / totalSueldo) * 100;
  };


  return (

    <div className="space-y-6">


      {/* TOTAL INGRESOS */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <p className="text-gray-500 text-sm">
          Total ingresos del mes
        </p>

        <h1 className="text-3xl font-bold text-green-600 mt-2">
          ${totalIncome.toFixed(2)}
        </h1>

      </div>



      {/* DISTRIBUCION SUELDO */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <h3 className="font-semibold mb-4">
          Distribución del sueldo
        </h3>

        {Object.entries(data.sueldo).map(([name,value]) => (

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



      {/* DESGLOSE SUELDO */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <h3 className="font-semibold mb-4">
          Desglose sueldo
        </h3>

        {Object.entries(data.sueldo).map(([name,value]) => (

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



      {/* OTROS INGRESOS */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <h3 className="font-semibold mb-4">
          Otros ingresos
        </h3>

        {Object.entries(data.otros).map(([name,value]) => (

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
