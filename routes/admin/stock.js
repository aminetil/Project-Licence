const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

const LOCATIONS = ['greenhouse', 'plot_A', 'plot_B', 'zone_1', 'zone_2', 'outdoor'];

// GET /admin/stock — Stock overview
router.get('/', (req, res) => {
  const db = getDb();
  const plantes = db.prepare('SELECT * FROM plantes ORDER BY quantite ASC').all();
  const mouvements = db.prepare(`
    SELECT sm.*, p.nom as plante_nom
    FROM stock_mouvements sm
    JOIN plantes p ON sm.id_plante = p.id
    ORDER BY sm.date_mouvement DESC
    LIMIT 20
  `).all();
  const lowStock = plantes.filter(p => p.quantite < 10);
  db.close();
  res.render('admin/stock', {
    title: 'Stock Management',
    plantes,
    mouvements,
    lowStock,
    LOCATIONS
  });
});

// POST /admin/stock/mouvement — Add stock movement
router.post('/mouvement', (req, res) => {
  const { id_plante, type, quantite, note, location } = req.body;
  const qty = parseInt(quantite);
  const db = getDb();

  const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(id_plante);
  if (!plante) {
    db.close();
    req.flash('error', 'Plant not found.');
    return res.redirect('/admin/stock');
  }

  // Record movement
  db.prepare('INSERT INTO stock_mouvements (id_plante, type, quantite, note, location) VALUES (?, ?, ?, ?, ?)')
    .run(id_plante, type, qty, note || null, location || 'greenhouse');

  // Update plant quantity and location
  if (type === 'entry') {
    db.prepare('UPDATE plantes SET quantite = quantite + ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(qty, location || plante.location, id_plante);
  } else if (type === 'exit') {
    db.prepare('UPDATE plantes SET quantite = MAX(0, quantite - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(qty, id_plante);
  }

  db.close();
  req.flash('success', `Stock movement recorded for "${plante.nom}".`);
  res.redirect('/admin/stock');
});

module.exports = router;
