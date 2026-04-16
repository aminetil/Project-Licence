const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/init');

// GET /client/panier — View cart
router.get('/', (req, res) => {
  const panier = req.session.panier || [];
  const db = getDb();
  
  // Enrich cart items with plant data
  const items = panier.map(item => {
    const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(item.id_plante);
    return { ...item, plante };
  }).filter(item => item.plante); // Remove items where plant was deleted
  
  const total = items.reduce((sum, item) => sum + (item.plante.prix * item.quantite), 0);
  
  db.close();
  res.render('client/panier', { title: 'Mon Panier', items, total });
});

// POST /client/panier/ajouter — Add to cart
router.post('/ajouter', (req, res) => {
  const { id_plante, quantite } = req.body;
  const qty = parseInt(quantite) || 1;
  
  if (!req.session.panier) req.session.panier = [];
  
  const existing = req.session.panier.find(i => i.id_plante == id_plante);
  if (existing) {
    existing.quantite += qty;
  } else {
    req.session.panier.push({ id_plante: parseInt(id_plante), quantite: qty });
  }
  
  req.flash('success', 'Produit ajouté au panier !');
  const referer = req.get('Referer') || '/client/catalogue';
  res.redirect(referer);
});

// POST /client/panier/modifier — Update cart item quantity
router.post('/modifier', (req, res) => {
  const { id_plante, quantite } = req.body;
  const qty = parseInt(quantite);
  
  if (req.session.panier) {
    if (qty <= 0) {
      req.session.panier = req.session.panier.filter(i => i.id_plante != id_plante);
    } else {
      const item = req.session.panier.find(i => i.id_plante == id_plante);
      if (item) item.quantite = qty;
    }
  }
  res.redirect('/client/panier');
});

// POST /client/panier/supprimer — Remove from cart
router.post('/supprimer', (req, res) => {
  const { id_plante } = req.body;
  if (req.session.panier) {
    req.session.panier = req.session.panier.filter(i => i.id_plante != id_plante);
  }
  req.flash('success', 'Produit retiré du panier.');
  res.redirect('/client/panier');
});

// POST /client/panier/commander — Checkout (requires login)
router.post('/commander', (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Veuillez vous connecter pour passer commande.');
    return res.redirect('/login');
  }
  
  const panier = req.session.panier || [];
  if (panier.length === 0) {
    req.flash('error', 'Votre panier est vide.');
    return res.redirect('/client/panier');
  }
  
  const db = getDb();
  
  // Calculate total and validate stock
  let total = 0;
  const items = [];
  for (const item of panier) {
    const plante = db.prepare('SELECT * FROM plantes WHERE id = ?').get(item.id_plante);
    if (!plante || plante.quantite < item.quantite) {
      db.close();
      req.flash('error', `Stock insuffisant pour "${plante ? plante.nom : 'plante supprimée'}".`);
      return res.redirect('/client/panier');
    }
    total += plante.prix * item.quantite;
    items.push({ plante, quantite: item.quantite });
  }
  
  // Create vente
  const vente = db.prepare('INSERT INTO ventes (id_client, total, statut) VALUES (?, ?, ?)').run(req.session.user.id, total, 'en_attente');
  
  // Create details + update stock
  for (const item of items) {
    db.prepare('INSERT INTO details_vente (id_vente, id_plante, quantite, prix_unitaire, cout_unitaire) VALUES (?, ?, ?, ?, ?)').run(
      vente.lastInsertRowid, item.plante.id, item.quantite, item.plante.prix, item.plante.cout
    );
    db.prepare('UPDATE plantes SET quantite = quantite - ? WHERE id = ?').run(item.quantite, item.plante.id);
  }
  
  db.close();
  
  // Clear cart
  req.session.panier = [];
  req.flash('success', `Commande #${vente.lastInsertRowid} passée avec succès ! Total: ${total.toFixed(2)} DA`);
  res.redirect('/client/commandes');
});

module.exports = router;
