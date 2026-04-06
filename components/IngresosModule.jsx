import React, { useEffect, useState } from "react";

export default function IngresosModule() {

  const [transactions, setTransactions] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [incomeByCategory, setIncomeByCategory] = useState({});

  useEffect(() => {
    loadIncome();
  }, []);

  const loadIncome = async () => {
    try {

      // Aquí llamas tu API o tu servicio de transacciones
      const response = await fetch("/api/transactions");
      const data = await response.json();

      // Filtrar solo ingresos
      const income = data.filter(t => t.type === "income");

      setTransactions(income);

      // Calcular total ingresos
      const total = income.reduce((acc, t) => acc + Number(t.amount), 0);
      setTotalIncome(total);

      // Agrupar por categoria
      const categories = {};

      income.forEach(t => {
        const cat = t.category || "Otros";

        if (!categories[cat]) {
          categories[cat] = 0;
        }

        categories[cat] += Number(t.amount);
      });

      setIncomeByCategory(categories);

    } catch (error) {
      console.error("Error cargando ingresos:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>

      <h2 style={{ marginBottom: "20px" }}>Ingresos</h2>

      {/* TOTAL INGRESOS */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}
      >
        <h4>Total ingresos</h4>
        <h1 style={{ color: "#0f9d58" }}>
          ${totalIncome.toFixed(2)}
        </h1>
      </div>


      {/* INGRESOS POR CATEGORIA */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}
      >
        <h4 style={{ marginBottom: "15px" }}>
          Ingresos por categoría
        </h4>

        {Object.keys(incomeByCategory).map(cat => (

          <div
            key={cat}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
              paddingBottom: "5px",
              borderBottom: "1px solid #eee"
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
          padding: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}
      >
        <h4>Gráfico ingresos</h4>

        <div style={{ marginTop: "20px" }}>

          {transactions.slice(0, 10).map((t, i) => (

            <div
              key={i}
              style={{
                height: "10px",
                width: `${t.amount / 10}%`,
                background: "#4caf50",
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
