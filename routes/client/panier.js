const express = require("express");
const router = express.Router();
const { getDb } = require("../../database/init");
router.get("/", (req, res) => {
  const panier = req.session.panier || [];
  const db = getDb();
  const items = panier
    .map((item) => {
      const plante = db
        .prepare("SELECT * FROM plantes WHERE id = ?")
        .get(item.id_plante);
      return { ...item, plante };
    })
    .filter((item) => item.plante);
  const total = items.reduce(
    (sum, item) => sum + item.plante.prix * item.quantite,
    0,
  );
  db.close();
  res.render("client/panier", { title: "My Cart", items, total });
});
router.post("/ajouter", (req, res) => {
  const { id_plante, quantite } = req.body;
  const qty = parseInt(quantite) || 1;
  const db = getDb();
  const plante = db
    .prepare("SELECT * FROM plantes WHERE id = ?")
    .get(parseInt(id_plante));
  db.close();
  if (!plante || plante.growth_status !== "ready to sell") {
    req.flash("error", "This plant is not available for purchase.");
    const referer = req.get("Referer") || "/client/catalogue";
    return res.redirect(referer);
  }
  if (!req.session.panier) req.session.panier = [];
  const existing = req.session.panier.find((i) => i.id_plante == id_plante);
  if (existing) {
    existing.quantite += qty;
  } else {
    req.session.panier.push({ id_plante: parseInt(id_plante), quantite: qty });
  }
  req.flash("success", "Product added to cart!");
  const referer = req.get("Referer") || "/client/catalogue";
  res.redirect(referer);
});
router.post("/modifier", (req, res) => {
  const { id_plante, quantite } = req.body;
  const qty = parseInt(quantite);
  if (req.session.panier) {
    if (qty <= 0) {
      req.session.panier = req.session.panier.filter(
        (i) => i.id_plante != id_plante,
      );
    } else {
      const item = req.session.panier.find((i) => i.id_plante == id_plante);
      if (item) item.quantite = qty;
    }
  }
  res.redirect("/client/panier");
});
router.post("/supprimer", (req, res) => {
  const { id_plante } = req.body;
  if (req.session.panier) {
    req.session.panier = req.session.panier.filter(
      (i) => i.id_plante != id_plante,
    );
  }
  req.flash("success", "Product removed from cart.");
  res.redirect("/client/panier");
});
router.post("/commander", (req, res) => {
  if (!req.session.user) {
    req.flash("error", "Please log in to place an order.");
    return res.redirect("/login");
  }
  const panier = req.session.panier || [];
  if (panier.length === 0) {
    req.flash("error", "Your cart is empty.");
    return res.redirect("/client/panier");
  }
  const db = getDb();
  let total = 0;
  const items = [];
  for (const item of panier) {
    const plante = db
      .prepare("SELECT * FROM plantes WHERE id = ?")
      .get(item.id_plante);
    if (!plante || plante.quantite < item.quantite) {
      db.close();
      req.flash(
        "error",
        `Insufficient stock for "${plante ? plante.nom : "deleted plant"}".`,
      );
      return res.redirect("/client/panier");
    }
    total += plante.prix * item.quantite;
    items.push({ plante, quantite: item.quantite });
  }
  const vente = db
    .prepare("INSERT INTO ventes (id_client, total, statut) VALUES (?, ?, ?)")
    .run(req.session.user.id, total, "pending");
  for (const item of items) {
    db.prepare(
      "INSERT INTO details_vente (id_vente, id_plante, quantite, prix_unitaire, cout_unitaire) VALUES (?, ?, ?, ?, ?)",
    ).run(
      vente.lastInsertRowid,
      item.plante.id,
      item.quantite,
      item.plante.prix,
      item.plante.cout,
    );
    db.prepare("UPDATE plantes SET quantite = quantite - ? WHERE id = ?").run(
      item.quantite,
      item.plante.id,
    );
  }
  db.close();
  req.session.panier = [];
  req.flash(
    "success",
    `Order #${vente.lastInsertRowid} placed successfully! Total: ${total.toFixed(2)} DA`,
  );
  res.redirect("/client/commandes");
});
module.exports = router;
