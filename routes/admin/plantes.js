const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../../database/init');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'plant-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const CATEGORIES = ['flower', 'tree', 'indoor_plant', 'cactus', 'aromatic_herb', 'medicinal_plant'];
const GROWTH_STATUSES = ['seedling', 'transplanting', 'growing', 'ready to sell'];
const SEASONALITIES = ['all_year', 'spring', 'summer', 'autumn', 'winter'];
const LOCATIONS = ['greenhouse', 'plot_A', 'plot_B', 'zone_1', 'zone_2', 'outdoor'];



router.get('/', (req, res) => {
  const db = getDb();
  const plantes = db.prepare('SELECT * FROM plantes ORDER BY created_at DESC').all();
  db.close();
  res.render('admin/plantes', {
    title: 'Plant Management',
    plantes,
    CATEGORIES,
    GROWTH_STATUSES
  });
});


router.get('/ajouter', (req, res) => {
  res.render('admin/plante_form', {
    title: 'Add a Plant',
    plante: null,
    CATEGORIES,
    GROWTH_STATUSES,
    SEASONALITIES,
    LOCATIONS
  });
});



router.post('/', upload.single('image'), (req, res) => {
  const { nom, species, categorie, cout, prix, quantite, description, growth_status, seasonality, location } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : null;
  const db = getDb();
  db.prepare(`
    INSERT INTO plantes (nom, species, categorie, cout, prix, quantite, description, image, growth_status, seasonality, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nom,
    species || null,
    categorie,
    parseFloat(cout) || 0,
    parseFloat(prix),
    parseInt(quantite) || 0,
    description || null,
    image,
    growth_status || 'seedling',
    seasonality || 'all_year',
    location || 'greenhouse'
  );
  db.close();
  req.flash('success', `Plant "${nom}" added successfully.`);
  res.redirect('/admin/plantes');
});



router.get('/:id/modifier', (req, res) => {
  const db = getDb();
  const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(req.params.id);
  db.close();
  if (!plante) {
    req.flash('error', 'Plant not found.');
    return res.redirect('/admin/plantes');
  }
  res.render('admin/plante_form', {
    title: 'Edit Plant',
    plante,
    CATEGORIES,
    GROWTH_STATUSES,
    SEASONALITIES,
    LOCATIONS
  });

});

router.put('/:id', upload.single('image'), (req, res) => {
  const { nom, species, categorie, cout, prix, quantite, description, growth_status, seasonality, location } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM plantes WHERE id = ?').get(req.params.id);
  if (!existing) {
    db.close();
    req.flash('error', 'Plant not found.');
    return res.redirect('/admin/plantes');
  }
  const image = req.file ? '/uploads/' + req.file.filename : existing.image;
  db.prepare(`
    UPDATE plantes
    SET nom=?, species=?, categorie=?, cout=?, prix=?, quantite=?, description=?, image=?,
        growth_status=?, seasonality=?, location=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    nom,
    species || null,
    categorie,
    parseFloat(cout) || 0,
    parseFloat(prix),
    parseInt(quantite) || 0,
    description || null,
    image,
    growth_status || 'seedling',
    seasonality || 'all_year',
    location || 'greenhouse',
    req.params.id
  );
  db.close();
  req.flash('success', `Plant "${nom}" updated successfully.`);
  res.redirect('/admin/plantes');
});



router.delete('/:id', (req, res) => {
  const db = getDb();
  const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM plantes WHERE id = ?').run(req.params.id);
  db.close();
  req.flash('success', `Plant deleted successfully.`);
  res.redirect('/admin/plantes');
});

module.exports = router;
