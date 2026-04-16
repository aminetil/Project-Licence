const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'pepiniere.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDatabase() {
  const db = getDb();

  // ── Table utilisateurs (unifies employes and clients) ──
  db.exec(` CREATE TABLE IF NOT EXISTS utilisateurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mot_de_passe TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client', -- 'admin', 'client'
      telephone TEXT,
      adresse TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Table plantes ── 
  db.exec(` CREATE TABLE IF NOT EXISTS plantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      categorie TEXT NOT NULL,
      cout REAL NOT NULL DEFAULT 0, -- prix d'achat ou de production
      prix REAL NOT NULL, -- prix de vente
      quantite INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      image TEXT,
      saison TEXT DEFAULT 'toute_saison',
      arrosage TEXT DEFAULT 'modéré',
      fertilisation TEXT DEFAULT 'mensuelle',
      taille TEXT DEFAULT 'annuelle',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Table ventes (Sales / Checkout) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS ventes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_vente DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_client INTEGER,
      id_employe INTEGER,
      total REAL NOT NULL DEFAULT 0,
      statut TEXT DEFAULT 'payée', -- payée, en_attente, annulée
      FOREIGN KEY (id_client) REFERENCES utilisateurs(id) ON DELETE SET NULL,
      FOREIGN KEY (id_employe) REFERENCES utilisateurs(id) ON DELETE SET NULL
    )
  `);

  // ── Table details_vente ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS details_vente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_vente INTEGER NOT NULL,
      id_plante INTEGER NOT NULL,
      quantite INTEGER NOT NULL,
      prix_unitaire REAL NOT NULL, -- prix lors de la vente
      cout_unitaire REAL NOT NULL, -- cout lors de la vente (pour benefice)
      FOREIGN KEY (id_vente) REFERENCES ventes(id) ON DELETE CASCADE,
      FOREIGN KEY (id_plante) REFERENCES plantes(id) ON DELETE CASCADE
    )
  `);

  // ── Table stock_mouvements ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_mouvements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_plante INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantite INTEGER NOT NULL,
      note TEXT,
      date_mouvement DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_plante) REFERENCES plantes(id) ON DELETE CASCADE
    )
  `);

  db.close();
  console.log(' Base de données initialisée avec succès (Format double interface Client/Admin).');
}

function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM utilisateurs').get();
  if (adminExists.count > 0) {
    db.close();
    console.log(' Base de données déjà peuplée.');
    return;
  }

  const hashedPassword = bcrypt.hashSync('password123', 10);

  // ── Seed utilisateurs (Admins, Employees, Clients) ──
  const insertUser = db.prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe, role, telephone, adresse) VALUES (?, ?, ?, ?, ?, ?)');

  // Admins & Vendeurs
  const adminId = insertUser.run('Admin Pépinière', 'admin@pepiniere.com', hashedPassword, 'admin', null, null).lastInsertRowid;
  const vendeurId = insertUser.run('Mohamed Vendeur', 'mohamed@pepiniere.com', hashedPassword, 'vendeur', null, null).lastInsertRowid;

  // Clients
  const client1 = insertUser.run('Karim Benali', 'karim@client.com', hashedPassword, 'client', '0555123456', '12 Rue des fleurs, Alger').lastInsertRowid;
  const client2 = insertUser.run('Fatima Zahra', 'fatima@client.com', hashedPassword, 'client', '0661234567', '34 Avenue, Oran').lastInsertRowid;

  // ── Seed plantes (with cout) ──
  const insertPlante = db.prepare(`
    INSERT INTO plantes (nom, categorie, cout, prix, quantite, description, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const plantesData = [
    // [nom, categorie, cout, prix, quantite, description, image(optional)]
    ['Rose rouge', 'fleur', 5.0, 15.0, 50, 'Rose classique rouge vif.', null],
    ['Jasmin', 'fleur', 4.0, 12.0, 35, 'Fleur blanche grimpante.', null],
    ['Olivier', 'arbre', 20.0, 45.0, 20, 'Arbre emblématique résistant.', null],
    ['Citronnier', 'arbre', 15.0, 35.0, 15, 'Arbre fruitier produisant des citrons.', null],
    ['Bougainvillier', 'arbuste', 8.0, 18.0, 40, 'Arbuste grimpant coloré.', null],
    ['Ficus', 'plante_interieur', 10.0, 25.0, 28, 'Grande plante d\'intérieur.', null],
    ['Monstera', 'plante_interieur', 12.0, 30.0, 18, 'Plante tropicale populaire.', null],
    ['Aloe Vera', 'plante_interieur', 3.0, 10.0, 60, 'Plante succulente.', null]
  ];

  for (const p of plantesData) {
    insertPlante.run(...p);
  }

  // ── Seed ventes passées (pour Admin Statistiques et Profil Client) ──
  const insertVente = db.prepare('INSERT INTO ventes (date_vente, id_client, id_employe, total) VALUES (?, ?, ?, ?)');
  const insertDetail = db.prepare('INSERT INTO details_vente (id_vente, id_plante, quantite, prix_unitaire, cout_unitaire) VALUES (?, ?, ?, ?, ?)');

  // Vente 1 pour client 1
  let v1 = insertVente.run('2026-03-10', client1, vendeurId, 45.0); // 3x Rose
  insertDetail.run(v1.lastInsertRowid, 1, 3, 15.0, 5.0);

  // Vente 2 pour client 2
  let v2 = insertVente.run('2026-03-15', client2, adminId, 35.0); // 1x Citronnier
  insertDetail.run(v2.lastInsertRowid, 4, 1, 35.0, 15.0);

  // Vente 3 en ligne (client2 achète directement)
  let v3 = insertVente.run('2026-04-01', client2, null, 30.0); // 1x Monstera (pas de vendeur assigné)
  insertDetail.run(v3.lastInsertRowid, 7, 1, 30.0, 12.0);

  db.close();
  console.log('🌱 Données de test insérées (Admin, Clients, Plantes, et Ventes).');
}

module.exports = { getDb, initDatabase, seedDatabase };
