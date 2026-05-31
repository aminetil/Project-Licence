const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDb } = require("../../database/init");
router.get("/", (req, res) => {
  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, nom, email, telephone, adresse, created_at FROM utilisateurs WHERE id = ?",
    )
    .get(req.session.user.id);
  const stats = db
    .prepare(
      "SELECT COUNT(*) as nb_commandes, COALESCE(SUM(total), 0) as total_depense FROM ventes WHERE id_client = ?",
    )
    .get(req.session.user.id);
  db.close();
  res.render("client/profil", { title: "My Profile", user, stats });
});
router.put("/", (req, res) => {
  const { nom, telephone, adresse, password, confirm_password } = req.body;
  const db = getDb();
  db.prepare(
    "UPDATE utilisateurs SET nom = ?, telephone = ?, adresse = ? WHERE id = ?",
  ).run(nom, telephone || null, adresse || null, req.session.user.id);
  if (password && password.length >= 6) {
    if (password !== confirm_password) {
      db.close();
      req.flash("error", "Passwords do not match.");
      return res.redirect("/client/profil");
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?").run(
      hashedPassword,
      req.session.user.id,
    );
  }
  req.session.user.nom = nom;
  db.close();
  req.flash("success", "Profile updated successfully.");
  res.redirect("/client/profil");
});
module.exports = router;
