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

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500"
  ];

  const donutColors = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#a855f7",
    "#ec4899"
  ];

  const donutData = Object.entries(data.sueldo).map(([name,value]) => ({
    name,
    value,
    percent: percent(value)
  }));

  const donutGradient = donutData
    .map((item,i)=>{
      const start = donutData
        .slice(0,i)
        .reduce((a,b)=>a+b.percent,0);

      const end = start + item.percent;

      return `${donutColors[i % donutColors.length]} ${start}% ${end}%`;
    })
    .join(",");

  const monthName =
    new Date(selectedMonth).toLocaleString("es-ES",{month:"long"});

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

      {/* SALARIO DEL MES */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <h3 className="font-semibold">
          Salario del mes de {monthName}
        </h3>

        {/* DONUT */}

        <div className="flex flex-col items-center mt-6 mb-6">

          <div
            className="w-40 h-40 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${donutGradient})`
            }}
          >

            <div className="bg-white w-24 h-24 rounded-full flex flex-col items-center justify-center shadow">

              <span className="text-xs text-gray-500">
                Salario
              </span>

              <span className="font-bold text-green-600">
                ${totalSueldo.toFixed(2)}
              </span>

            </div>

          </div>

        </div>

        {Object.entries(data.sueldo).map(([name,value], index) => (

          <div key={name} className="mb-3">

            <div className="flex justify-between text-sm mb-1">

              <span>{name}</span>

              <span className="flex gap-3">

                <span className="text-gray-600">
                  ${value.toFixed(2)}
                </span>

                <span className="font-semibold">
                  {percent(value).toFixed(0)}%
                </span>

              </span>

            </div>

            <div className="bg-gray-200 h-3 rounded-full overflow-hidden">

              <div
                className={`${colors[index % colors.length]} h-3`}
                style={{ width: `${percent(value)}%` }}
              />

            </div>

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
