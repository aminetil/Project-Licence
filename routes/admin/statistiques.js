const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

// GET /admin/statistiques — Stats overview (tables only, no charts)
router.get('/', (req, res) => {
  const db = getDb();

  // Total plantes en stock
  const stockResult = db.prepare('SELECT COALESCE(SUM(quantite), 0) as total FROM plantes').get();

  // CA & Bénéfice total
  const totals = db.prepare(`
    SELECT 
      COALESCE(SUM(quantite * prix_unitaire), 0) as ca_total,
      COALESCE(SUM(quantite * (prix_unitaire - cout_unitaire)), 0) as benefice_total,
      COALESCE(COUNT(DISTINCT id_vente), 0) as nb_ventes
    FROM details_vente
  `).get();

  // CA & Bénéfice par mois
  const parMois = db.prepare(`
    SELECT 
      strftime('%Y-%m', v.date_vente) as mois,
      SUM(dv.quantite * dv.prix_unitaire) as ca,
      SUM(dv.quantite * (dv.prix_unitaire - dv.cout_unitaire)) as benefice,
      COUNT(DISTINCT v.id) as nb_ventes
    FROM ventes v
    JOIN details_vente dv ON v.id = dv.id_vente
    GROUP BY mois
    ORDER BY mois DESC
    LIMIT 12
  `).all();

  db.close();
  res.render('admin/statistiques', { 
    title: 'Statistiques', 
    total_stock: stockResult.total,
    totals, parMois 
  });
});

module.exports = router;
