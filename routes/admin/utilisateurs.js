const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

// GET /admin/utilisateurs — List all users
router.get('/', (req, res) => {
  const db = getDb();
  const utilisateurs = db.prepare('SELECT id, nom, email, role, telephone, adresse, created_at FROM utilisateurs ORDER BY created_at DESC').all();
  db.close();
  res.render('admin/utilisateurs', { title: 'Gestion des utilisateurs', utilisateurs });
});

// PUT /admin/utilisateurs/:id/role — Change user role
router.put('/:id/role', (req, res) => {
  const { role } = req.body;
  const validRoles = ['admin', 'vendeur', 'client'];
  if (!validRoles.includes(role)) {
    req.flash('error', 'Rôle invalide.');
    return res.redirect('/admin/utilisateurs');
  }
  const db = getDb();
  db.prepare('UPDATE utilisateurs SET role = ? WHERE id = ?').run(role, req.params.id);
  db.close();
  req.flash('success', 'Rôle mis à jour.');
  res.redirect('/admin/utilisateurs');
});

// DELETE /admin/utilisateurs/:id — Delete user
router.delete('/:id', (req, res) => {
  const db = getDb();
  // Prevent self-deletion
  if (parseInt(req.params.id) === req.session.user.id) {
    db.close();
    req.flash('error', 'Vous ne pouvez pas supprimer votre propre compte.');
    return res.redirect('/admin/utilisateurs');
  }
  db.prepare('DELETE FROM utilisateurs WHERE id = ?').run(req.params.id);
  db.close();
  req.flash('success', 'Utilisateur supprimé.');
  res.redirect('/admin/utilisateurs');
});

module.exports = router;
