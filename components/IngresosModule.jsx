import React, { useMemo } from "react";

export default function IngresosModule({
  transactions,
  selectedMonth,
  exchangeRate
}) {

  const incomes = useMemo(() => {

    return transactions.filter(tx => {

      if (tx.type !== "Ingreso") return false;

      if (!tx.date.startsWith(selectedMonth)) return false;

      return true;

    });

  }, [transactions, selectedMonth]);



  const breakdown = useMemo(() => {

    const data = {
      sueldo: 0,
      cesta: 0,
      vehiculo: 0,
      bono: 0,
      otros: 0
    };

    incomes.forEach(tx => {

      let amount = Number(tx.amount) || 0;

      if (tx.currency === "VES") {
        amount = amount / exchangeRate;
      }

      const desc = (tx.description || "").toLowerCase();

      if (desc.includes("cesta")) {
        data.cesta += amount;
      }
      else if (desc.includes("vehiculo") || desc.includes("vehículo")) {
        data.vehiculo += amount;
      }
      else if (desc.includes("bono")) {
        data.bono += amount;
      }
      else if (desc.includes("sueldo")) {
        data.sueldo += amount;
      }
      else {
        data.otros += amount;
      }

    });

    return data;

  }, [incomes, exchangeRate]);



  const totalIncome =
    breakdown.sueldo +
    breakdown.cesta +
    breakdown.vehiculo +
    breakdown.bono +
    breakdown.otros;



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

        <div className="space-y-3">

          <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-green-500 h-3"
              style={{ width: `${percent(breakdown.sueldo)}%` }}
            />
          </div>

          <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-3"
              style={{ width: `${percent(breakdown.cesta)}%` }}
            />
          </div>

          <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-yellow-500 h-3"
              style={{ width: `${percent(breakdown.vehiculo)}%` }}
            />
          </div>

          <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-3"
              style={{ width: `${percent(breakdown.bono)}%` }}
            />
          </div>

        </div>

      </div>



      {/* DETALLE */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">

        <h3 className="font-semibold mb-4">
          Desglose
        </h3>

        <div className="space-y-2">

          <div className="flex justify-between">
            <span>💼 Sueldo Base</span>
            <span>${breakdown.sueldo.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>🥗 Cesta Ticket</span>
            <span>${breakdown.cesta.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>🚗 Ayuda Vehículo</span>
            <span>${breakdown.vehiculo.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>🎁 Bonos</span>
            <span>${breakdown.bono.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>📦 Otros</span>
            <span>${breakdown.otros.toFixed(2)}</span>
          </div>

        </div>

      </div>

    </div>

  );

}
