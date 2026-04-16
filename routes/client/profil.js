const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../../database/init');

// GET /client/profil — View profile
router.get('/', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, nom, email, telephone, adresse, created_at FROM utilisateurs WHERE id = ?').get(req.session.user.id);
  
  // Count orders
  const stats = db.prepare('SELECT COUNT(*) as nb_commandes, COALESCE(SUM(total), 0) as total_depense FROM ventes WHERE id_client = ?').get(req.session.user.id);
  
  db.close();
  res.render('client/profil', { title: 'Mon Profil', user, stats });
});

// PUT /client/profil — Update profile
router.put('/', (req, res) => {
  const { nom, telephone, adresse, password, confirm_password } = req.body;
  const db = getDb();
  
  // Update basic info
  db.prepare('UPDATE utilisateurs SET nom = ?, telephone = ?, adresse = ? WHERE id = ?').run(nom, telephone || null, adresse || null, req.session.user.id);
  
  // Update password if provided
  if (password && password.length >= 6) {
    if (password !== confirm_password) {
      db.close();
      req.flash('error', 'Les mots de passe ne correspondent pas.');
      return res.redirect('/client/profil');
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?').run(hashedPassword, req.session.user.id);
  }
  
  // Update session
  req.session.user.nom = nom;
  
  db.close();
  req.flash('success', 'Profil mis à jour avec succès.');
  res.redirect('/client/profil');
});

module.exports = router;
