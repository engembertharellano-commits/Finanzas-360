import React from "react";

export default function IngresosModule({
  transactions,
  selectedMonth,
  exchangeRate,
  incomeCategories
}) {

  // Filtrar ingresos del mes seleccionado
  const incomes = transactions.filter(t => {

    const date = new Date(t.date);
    const month = date.getMonth();
    const year = date.getFullYear();

    const selected = new Date(selectedMonth);

    const sameMonth =
      month === selected.getMonth() &&
      year === selected.getFullYear();

    const isIncome =
      t.type === "income" ||
      incomeCategories?.includes(t.category);

    return sameMonth && isIncome;

  });

  // Total ingresos
  const totalIncome = incomes.reduce(
    (acc, t) => acc + Number(t.amount),
    0
  );

  // Agrupar por categoría
  const incomeByCategory = {};

  incomes.forEach(t => {

    const cat = t.category || "Otros";

    if (!incomeByCategory[cat]) {
      incomeByCategory[cat] = 0;
    }

    incomeByCategory[cat] += Number(t.amount);

  });

  return (
    <div style={{ padding: "20px" }}>

      <h2 style={{ marginBottom: "20px" }}>
        Ingresos
      </h2>

      {/* TOTAL INGRESOS */}

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px"
        }}
      >

        <h4>Total ingresos</h4>

        <h1 style={{ color: "#22c55e" }}>
          ${totalIncome.toFixed(2)}
        </h1>

      </div>

      {/* INGRESOS POR CATEGORIA */}

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px"
        }}
      >

        <h4 style={{ marginBottom: "15px" }}>
          Ingresos por categoría
        </h4>

        {Object.keys(incomeByCategory).length === 0 && (
          <p>No hay ingresos este mes</p>
        )}

        {Object.keys(incomeByCategory).map(cat => (

          <div
            key={cat}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px"
            }}
          >

            <span>{cat}</span>

            <strong>
              ${incomeByCategory[cat].toFixed(2)}
            </strong>

          </div>

        ))}

      </div>

      {/* GRAFICO SIMPLE */}

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px"
        }}
      >

        <h4>Gráfico ingresos</h4>

        <div style={{ marginTop: "20px" }}>

          {incomes.slice(0,10).map((t,i) => (

            <div
              key={i}
              style={{
                height: "10px",
                width: `${t.amount / 10}%`,
                background: "#22c55e",
                marginBottom: "6px",
                borderRadius: "4px"
              }}
            />

          ))}

        </div>

      </div>

    </div>
  );
}
