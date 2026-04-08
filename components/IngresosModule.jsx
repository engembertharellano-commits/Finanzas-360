import React from "react";

export default function IngresosModule({
  transactions,
  exchangeRate,
  incomeCategories
}) {

  // Detectar ingresos
  const incomes = transactions.filter(t =>
    t.type === "income" || incomeCategories?.includes(t.category)
  );

  // Convertir Bs a USD
  const toUSD = (amount) => {
    const value = Number(amount) || 0;
    if (!exchangeRate || exchangeRate === 0) return value;
    return value / exchangeRate;
  };

  // Total ingresos
  const totalIncome = incomes.reduce(
    (acc, t) => acc + toUSD(t.amount),
    0
  );

  // Agrupar por categoría
  const incomeByCategory = {};

  incomes.forEach(t => {

    const cat = t.category || "Otros";

    if (!incomeByCategory[cat]) {
      incomeByCategory[cat] = 0;
    }

    incomeByCategory[cat] += toUSD(t.amount);

  });

  const categories = Object.keys(incomeByCategory);

  const maxValue = Math.max(...Object.values(incomeByCategory), 1);

  return (

    <div style={{ padding: "30px" }}>

      {/* TITULO */}

      <h2 style={{
        fontSize: "22px",
        fontWeight: "600",
        marginBottom: "25px"
      }}>
        Ingresos
      </h2>

      {/* CARD TOTAL INGRESOS */}

      <div style={{
        background: "linear-gradient(135deg,#0f172a,#1e293b)",
        color: "white",
        borderRadius: "16px",
        padding: "30px",
        marginBottom: "30px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
      }}>

        <div style={{
          fontSize: "14px",
          opacity: 0.8
        }}>
          Ingresos Totales
        </div>

        <div style={{
          fontSize: "40px",
          fontWeight: "700",
          marginTop: "5px",
          color: "#4ade80"
        }}>
          ${totalIncome.toFixed(2)}
        </div>

      </div>

      {/* INGRESOS POR CATEGORIA */}

      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "25px",
        boxShadow: "0 5px 15px rgba(0,0,0,0.05)"
      }}>

        <h3 style={{
          marginBottom: "20px",
          fontSize: "18px",
          fontWeight: "600"
        }}>
          Ingresos por categoría
        </h3>

        {categories.length === 0 && (
          <p>No hay ingresos registrados</p>
        )}

        {categories.map(cat => {

          const value = incomeByCategory[cat];

          const percent = (value / maxValue) * 100;

          return (

            <div key={cat} style={{ marginBottom: "18px" }}>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px"
              }}>
                <span>{cat}</span>

                <strong>
                  ${value.toFixed(2)}
                </strong>
              </div>

              <div style={{
                height: "8px",
                background: "#e5e7eb",
                borderRadius: "10px",
                overflow: "hidden"
              }}>

                <div style={{
                  width: `${percent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg,#22c55e,#4ade80)"
                }} />

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}
