const express = require("express");
const router = express.Router();
const { getDb } = require("../../database/init");
router.get("/", (req, res) => {
  const db = getDb();
  const stockResult = db
    .prepare("SELECT COALESCE(SUM(quantite), 0) as total FROM plantes")
    .get();
  const year = req.query.year || "";
  const month = req.query.month || "";
  let whereClause = "1=1";
  let params = [];
  if (year) {
    whereClause += " AND strftime('%Y', v.date_vente) = ?";
    params.push(year);
  }
  if (month) {
    whereClause += " AND strftime('%m', v.date_vente) = ?";
    params.push(month.padStart(2, "0"));
  }
  const totals = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(dv.quantite * dv.prix_unitaire), 0) as ca_total,
      COALESCE(SUM(dv.quantite * (dv.prix_unitaire - dv.cout_unitaire)), 0) as benefice_total,
      COALESCE(COUNT(DISTINCT v.id), 0) as nb_ventes
    FROM ventes v
    LEFT JOIN details_vente dv ON v.id = dv.id_vente
    WHERE ${whereClause}
  `,
    )
    .get(...params);
  const parMois = db
    .prepare(
      `
    SELECT
      strftime('%Y-%m', v.date_vente) as mois,
      SUM(dv.quantite * dv.prix_unitaire) as ca,
      SUM(dv.quantite * (dv.prix_unitaire - dv.cout_unitaire)) as benefice,
      COUNT(DISTINCT v.id) as nb_ventes
    FROM ventes v
    JOIN details_vente dv ON v.id = dv.id_vente
    WHERE ${whereClause}
    GROUP BY mois
    ORDER BY mois DESC
    LIMIT 12
  `,
    )
    .all(...params);
  const yearsResult = db
    .prepare(
      "SELECT DISTINCT strftime('%Y', date_vente) as year FROM ventes ORDER BY year DESC",
    )
    .all();
  const availableYears = yearsResult
    .map((y) => y.year)
    .filter((y) => y !== null);
  db.close();
  res.render("admin/statistiques", {
    title: "Statistics",
    total_stock: stockResult.total,
    totals,
    parMois,
    availableYears,
    query: req.query,
  });
});
module.exports = router;
