const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

// GET /admin/ventes — List all sales
router.get('/', (req, res) => {
  const db = getDb();
  const ventes = db.prepare(`
    SELECT v.*, 
      u_client.nom as client_nom,
      u_emp.nom as employe_nom
    FROM ventes v
    LEFT JOIN utilisateurs u_client ON v.id_client = u_client.id
    LEFT JOIN utilisateurs u_emp ON v.id_employe = u_emp.id
    ORDER BY v.date_vente DESC
  `).all();

  // Get details for each sale
  const ventesAvecDetails = ventes.map(v => {
    const details = db.prepare(`
      SELECT dv.*, p.nom as plante_nom
      FROM details_vente dv
      JOIN plantes p ON dv.id_plante = p.id
      WHERE dv.id_vente = ?
    `).all(v.id);
    return { ...v, details };
  });

  db.close();
  res.render('admin/ventes', { title: 'Sales Management', ventes: ventesAvecDetails });
});

// PUT /admin/ventes/:id/statut — Update sale status
router.put('/:id/statut', (req, res) => {
  const { statut } = req.body;
  const db = getDb();
  db.prepare('UPDATE ventes SET statut = ? WHERE id = ?').run(statut, req.params.id);
  db.close();
  req.flash('success', 'Sale status updated.');
  res.redirect('/admin/ventes');
});

module.exports = router;
