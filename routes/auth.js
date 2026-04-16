const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/init');

// Show login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return req.session.user.role === 'client' 
      ? res.redirect('/client/home') 
      : res.redirect('/admin/dashboard');
  }
  res.render('auth/login', { title: 'Connexion' });
});

// Process login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM utilisateurs WHERE email = ?').get(email);
  db.close();

  if (!user || !bcrypt.compareSync(password, user.mot_de_passe)) {
    req.flash('error', 'Email ou mot de passe incorrect.');
    return res.redirect('/login');
  }

  req.session.user = { id: user.id, nom: user.nom, email: user.email, role: user.role };
  req.flash('success', `Bienvenue, ${user.nom} !`);
  
  if (user.role === 'client') {
    res.redirect('/client/home');
  } else {
    res.redirect('/admin/dashboard');
  }
});

// Show registration page
router.get('/register', (req, res) => {
  if (req.session.user) {
    return req.session.user.role === 'client' 
      ? res.redirect('/client/home') 
      : res.redirect('/admin/dashboard');
  }
  res.render('auth/register', { title: 'Créer un compte' });
});

// Process registration (Defaults to 'client')
router.post('/register', (req, res) => {
  const { nom, email, password, confirm_password, telephone, adresse } = req.body;
  
  if (password !== confirm_password) {
    req.flash('error', 'Les mots de passe ne correspondent pas.');
    return res.redirect('/register');
  }

  const db = getDb();
  const existingUser = db.prepare('SELECT * FROM utilisateurs WHERE email = ?').get(email);
  if (existingUser) {
    db.close();
    req.flash('error', 'Un compte avec cet email existe déjà.');
    return res.redirect('/register');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO utilisateurs (nom, email, mot_de_passe, role, telephone, adresse) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nom, email, hashedPassword, 'client', telephone || null, adresse || null);
  
  const newUser = db.prepare('SELECT * FROM utilisateurs WHERE id = ?').get(result.lastInsertRowid);
  db.close();

  req.session.user = { id: newUser.id, nom: newUser.nom, email: newUser.email, role: newUser.role };
  req.flash('success', `Compte créé avec succès. Bienvenue, ${newUser.nom} !`);
  res.redirect('/client/home');
});

// Process logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
