const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

// GET /client/commandes — Order history
router.get('/', (req, res) => {
  const db = getDb();
  const commandes = db.prepare(`
    SELECT v.* FROM ventes v
    WHERE v.id_client = ?
    ORDER BY v.date_vente DESC
  `).all(req.session.user.id);
  
  // Get details for each order
  const commandesAvecDetails = commandes.map(c => {
    const details = db.prepare(`
      SELECT dv.*, p.nom as plante_nom, p.image as plante_image
      FROM details_vente dv
      JOIN plantes p ON dv.id_plante = p.id
      WHERE dv.id_vente = ?
    `).all(c.id);
    return { ...c, details };
  });
  
  db.close();
  res.render('client/commandes', { title: 'My Orders', commandes: commandesAvecDetails });
});

module.exports = router;
