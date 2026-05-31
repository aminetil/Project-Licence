const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDb } = require("../database/init");
router.get("/login", (req, res) => {
  if (req.session.user) {
    return req.session.user.role === "client"
      ? res.redirect("/client/home")
      : res.redirect("/admin/plantes");
  }
  res.render("auth/login", { title: "Login" });
});
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM utilisateurs WHERE email = ?")
    .get(email);
  db.close();
  if (!user || !bcrypt.compareSync(password, user.mot_de_passe)) {
    req.flash("error", "Incorrect email or password.");
    return res.redirect("/login");
  }
  req.session.user = {
    id: user.id,
    nom: user.nom,
    email: user.email,
    role: user.role,
  };
  req.flash("success", `Welcome back, ${user.nom}!`);
  if (user.role === "client") {
    res.redirect("/client/home");
  } else {
    res.redirect("/admin/plantes");
  }
});
router.get("/register", (req, res) => {
  if (req.session.user) {
    return req.session.user.role === "client"
      ? res.redirect("/client/home")
      : res.redirect("/admin/plantes");
  }
  res.render("auth/register", { title: "Create Account" });
});
router.post("/register", (req, res) => {
  const { nom, email, password, confirm_password, telephone, adresse } =
    req.body;
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    req.flash("error", "Format d'email invalide.");
    return res.redirect("/register");
  }
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
  if (!passwordRegex.test(password)) {
    req.flash(
      "error",
      "Le mot de passe doit contenir au moins 6 caractères, une majuscule, une minuscule et un chiffre.",
    );
    return res.redirect("/register");
  }
  if (password !== confirm_password) {
    req.flash("error", "Passwords do not match.");
    return res.redirect("/register");
  }
  if (telephone && !/^\d{10}$/.test(telephone)) {
    req.flash(
      "error",
      "Le numéro de téléphone doit contenir exactement 10 chiffres.",
    );
    return res.redirect("/register");
  }
  const db = getDb();
  const existingUser = db
    .prepare("SELECT * FROM utilisateurs WHERE email = ?")
    .get(email);
  if (existingUser) {
    db.close();
    req.flash("error", "An account with this email already exists.");
    return res.redirect("/register");
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      `
    INSERT INTO utilisateurs (nom, email, mot_de_passe, role, telephone, adresse)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      nom,
      email,
      hashedPassword,
      "client",
      telephone || null,
      adresse || null,
    );
  const newUser = db
    .prepare("SELECT * FROM utilisateurs WHERE id = ?")
    .get(result.lastInsertRowid);
  db.close();
  req.session.user = {
    id: newUser.id,
    nom: newUser.nom,
    email: newUser.email,
    role: newUser.role,
  };
  req.flash(
    "success",
    `Account created successfully. Welcome, ${newUser.nom}!`,
  );
  res.redirect("/client/home");
});
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});
module.exports = router;
