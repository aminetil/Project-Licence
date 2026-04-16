const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../../database/init');

// Multer config for plant images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, 'plante-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /admin/plantes — List all plants
router.get('/', (req, res) => {
  const db = getDb();
  const plantes = db.prepare('SELECT * FROM plantes ORDER BY created_at DESC').all();
  db.close();
  res.render('admin/plantes', { title: 'Gestion des plantes', plantes });
});

// GET /admin/plantes/ajouter — Show add form
router.get('/ajouter', (req, res) => {
  res.render('admin/plante_form', { title: 'Ajouter une plante', plante: null });
});

// POST /admin/plantes — Create plant
router.post('/', upload.single('image'), (req, res) => {
  const { nom, categorie, cout, prix, quantite, description, saison, arrosage } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : null;
  const db = getDb();
  db.prepare(`
    INSERT INTO plantes (nom, categorie, cout, prix, quantite, description, image, saison, arrosage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nom, categorie, parseFloat(cout) || 0, parseFloat(prix), parseInt(quantite) || 0, description || null, image, saison || 'toute_saison', arrosage || 'modéré');
  db.close();
  req.flash('success', `Plante "${nom}" ajoutée avec succès.`);
  res.redirect('/admin/plantes');
});

// GET /admin/plantes/:id/modifier — Show edit form
router.get('/:id/modifier', (req, res) => {
  const db = getDb();
  const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(req.params.id);
  db.close();
  if (!plante) {
    req.flash('error', 'Plante introuvable.');
    return res.redirect('/admin/plantes');
  }
  res.render('admin/plante_form', { title: 'Modifier la plante', plante });
});

// PUT /admin/plantes/:id — Update plant
router.put('/:id', upload.single('image'), (req, res) => {
  const { nom, categorie, cout, prix, quantite, description, saison, arrosage } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM plantes WHERE id = ?').get(req.params.id);
  if (!existing) {
    db.close();
    req.flash('error', 'Plante introuvable.');
    return res.redirect('/admin/plantes');
  }
  const image = req.file ? '/uploads/' + req.file.filename : existing.image;
  db.prepare(`
    UPDATE plantes SET nom=?, categorie=?, cout=?, prix=?, quantite=?, description=?, image=?, saison=?, arrosage=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(nom, categorie, parseFloat(cout) || 0, parseFloat(prix), parseInt(quantite) || 0, description || null, image, saison || 'toute_saison', arrosage || 'modéré', req.params.id);
  db.close();
  req.flash('success', `Plante "${nom}" mise à jour.`);
  res.redirect('/admin/plantes');
});

// DELETE /admin/plantes/:id — Delete plant
router.delete('/:id', (req, res) => {
  const db = getDb();
  const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM plantes WHERE id = ?').run(req.params.id);
  db.close();
  req.flash('success', `Plante supprimée.`);
  res.redirect('/admin/plantes');
});

module.exports = router;
