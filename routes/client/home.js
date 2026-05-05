const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

// GET /client/home — Client homepage
router.get('/', (req, res) => {
  const db = getDb();
  
  // Featured plants (newest or highest stock)
  const featured = db.prepare('SELECT * FROM plantes WHERE quantite > 0 ORDER BY created_at DESC LIMIT 6').all();
  
  // Categories with counts
  const categories = db.prepare('SELECT categorie, COUNT(*) as count FROM plantes GROUP BY categorie ORDER BY count DESC').all();
  
  db.close();
  res.render('client/home', { title: 'Home', featured, categories });
});

module.exports = router;
