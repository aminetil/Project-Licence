const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

// GET /client/catalogue — Browse plants
router.get('/', (req, res) => {
  const db = getDb();
  const { q, categorie } = req.query;
  
  let query = 'SELECT * FROM plantes WHERE 1=1';
  const params = [];
  
  if (q) {
    query += ' AND (nom LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (categorie) {
    query += ' AND categorie = ?';
    params.push(categorie);
  }
  
  query += ' ORDER BY nom';
  const plantes = db.prepare(query).all(...params);
  const categories = db.prepare('SELECT DISTINCT categorie FROM plantes ORDER BY categorie').all();
  
  db.close();
  res.render('client/catalogue', { 
    title: 'Catalogue', plantes, categories, 
    search: q || '', selectedCategorie: categorie || '' 
  });
});

// GET /client/catalogue/:id — Plant detail
router.get('/:id', (req, res) => {
  const db = getDb();
  const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(req.params.id);
  
  if (!plante) {
    db.close();
    req.flash('error', 'Plante introuvable.');
    return res.redirect('/client/catalogue');
  }
  
  // Related plants (same category)
  const related = db.prepare('SELECT * FROM plantes WHERE categorie = ? AND id != ? LIMIT 4').all(plante.categorie, plante.id);
  
  db.close();
  res.render('client/plante_detail', { title: plante.nom, plante, related });
});

module.exports = router;
