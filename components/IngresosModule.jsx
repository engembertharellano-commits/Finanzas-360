import React from "react";

export default function IngresosModule({
  transactions,
  incomeCategories
}) {

  // detectar ingresos
  const incomes = transactions.filter(t =>
    t.type === "income" || incomeCategories?.includes(t.category)
  );

  // función para obtener USD correcto
  const getUSD = (t) => {

    if (t.amountUSD) return Number(t.amountUSD);
    if (t.usdAmount) return Number(t.usdAmount);
    if (t.amountUsd) return Number(t.amountUsd);
    if (t.usd) return Number(t.usd);

    return 0;

  };

  // total ingresos
  const totalIncome = incomes.reduce(
    (acc, t) => acc + getUSD(t),
    0
  );

  // agrupar por categoría
  const incomeByCategory = {};

  incomes.forEach(t => {

    const cat = t.category || "Otros";
    const value = getUSD(t);

    if (!incomeByCategory[cat]) {
      incomeByCategory[cat] = 0;
    }

    incomeByCategory[cat] += value;

  });

  const categories = Object.keys(incomeByCategory);
  const maxValue = Math.max(...Object.values(incomeByCategory), 1);

  return (

    <div style={{ padding: "30px" }}>

      <h2 style={{
        fontSize: "22px",
        fontWeight: "600",
        marginBottom: "25px"
      }}>
        Ingresos
      </h2>

      {/* CARD TOTAL */}

      <div style={{
        background: "linear-gradient(135deg,#0f172a,#1e293b)",
        color: "white",
        borderRadius: "16px",
        padding: "30px",
        marginBottom: "30px"
      }}>

        <div style={{ opacity: 0.8 }}>
          Ingresos del mes
        </div>

        <div style={{
          fontSize: "40px",
          fontWeight: "700",
          color: "#4ade80"
        }}>
          ${totalIncome.toFixed(2)}
        </div>

      </div>

      {/* CATEGORIAS */}

      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "25px"
      }}>

        <h3 style={{
          marginBottom: "20px"
        }}>
          Ingresos por categoría
        </h3>

        {categories.map(cat => {

          const value = incomeByCategory[cat];
          const percent = (value / maxValue) * 100;

          return (

            <div key={cat} style={{ marginBottom: "18px" }}>

              <div style={{
                display: "flex",
                justifyContent: "space-between"
              }}>
                <span>{cat}</span>
                <strong>${value.toFixed(2)}</strong>
              </div>

              <div style={{
                height: "8px",
                background: "#e5e7eb",
                borderRadius: "10px",
                overflow: "hidden",
                marginTop: "5px"
              }}>

                <div style={{
                  width: `${percent}%`,
                  height: "100%",
                  background: "#22c55e"
                }} />

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}
