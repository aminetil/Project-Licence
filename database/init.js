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

  // ── Table users ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mot_de_passe TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      telephone TEXT,
      adresse TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Table plants ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS plantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      species TEXT,
      categorie TEXT NOT NULL,
      cout REAL NOT NULL DEFAULT 0,
      prix REAL NOT NULL,
      quantite INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      image TEXT,
      growth_status TEXT DEFAULT 'seedling',
      seasonality TEXT DEFAULT 'all_year',
      watering TEXT DEFAULT 'moderate',
      light_needs TEXT DEFAULT 'full_sun',
      fertilization TEXT DEFAULT 'monthly',
      pruning TEXT DEFAULT 'annual',
      location TEXT DEFAULT 'greenhouse',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Table sales ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS ventes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_vente DATETIME DEFAULT CURRENT_TIMESTAMP,
      id_client INTEGER,
      id_employe INTEGER,
      total REAL NOT NULL DEFAULT 0,
      statut TEXT DEFAULT 'paid',
      FOREIGN KEY (id_client) REFERENCES utilisateurs(id) ON DELETE SET NULL,
      FOREIGN KEY (id_employe) REFERENCES utilisateurs(id) ON DELETE SET NULL
    )
  `);

  // ── Table sale details ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS details_vente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_vente INTEGER NOT NULL,
      id_plante INTEGER NOT NULL,
      quantite INTEGER NOT NULL,
      prix_unitaire REAL NOT NULL,
      cout_unitaire REAL NOT NULL,
      FOREIGN KEY (id_vente) REFERENCES ventes(id) ON DELETE CASCADE,
      FOREIGN KEY (id_plante) REFERENCES plantes(id) ON DELETE CASCADE
    )
  `);

  // ── Table stock movements ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_mouvements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_plante INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantite INTEGER NOT NULL,
      note TEXT,
      location TEXT DEFAULT 'greenhouse',
      date_mouvement DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_plante) REFERENCES plantes(id) ON DELETE CASCADE
    )
  `);

  db.close();
  console.log(' Database initialized successfully (KHADRA E-Commerce & Management).');
}

function seedDatabase() {
  const db = getDb();

  const adminExists = db.prepare('SELECT COUNT(*) as count FROM utilisateurs').get();
  if (adminExists.count > 0) {
    db.close();
    console.log(' Database already seeded.');
    return;
  }

  const hashedPassword = bcrypt.hashSync('password123', 10);

  // ── Seed users ──
  const insertUser = db.prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe, role, telephone, adresse) VALUES (?, ?, ?, ?, ?, ?)');

  const adminId   = insertUser.run('Admin KHADRA',    'admin@pepiniere.com',   hashedPassword, 'admin',   null, null).lastInsertRowid;
  const vendeurId = insertUser.run('Mohamed Seller',  'mohamed@pepiniere.com', hashedPassword, 'vendeur', null, null).lastInsertRowid;
  const client1   = insertUser.run('Karim Benali',    'karim@client.com',      hashedPassword, 'client',  '0555123456', '12 Flower Street, Algiers').lastInsertRowid;
  const client2   = insertUser.run('Fatima Zahra',    'fatima@client.com',     hashedPassword, 'client',  '0661234567', '34 Main Avenue, Oran').lastInsertRowid;

  // ── Seed plants ──
  const insertPlante = db.prepare(`
    INSERT INTO plantes (nom, species, categorie, cout, prix, quantite, description, image, growth_status, seasonality, watering, light_needs, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // [name, species, category, cost, price, qty, description, image, growth_status, seasonality, watering, light_needs, location]
  const plantsData = [
    ['Red Rose',         'Rosa gallica',           'flower',         5.0,  15.0, 50, 'Classic vibrant red rose.',              null, 'ready_to_sell', 'spring',   'moderate', 'full_sun',      'plot_A'],
    ['Jasmine',          'Jasminum officinale',    'flower',         4.0,  12.0, 35, 'White climbing flower with fragrance.',  null, 'growing',       'spring',   'moderate', 'full_sun',      'plot_A'],
    ['Olive Tree',       'Olea europaea',          'tree',           20.0, 45.0, 20, 'Iconic drought-resistant tree.',         null, 'ready_to_sell', 'all_year', 'low',      'full_sun',      'plot_B'],
    ['Lemon Tree',       'Citrus limon',           'tree',           15.0, 35.0, 15, 'Fruit tree producing fresh lemons.',     null, 'growing',       'all_year', 'moderate', 'full_sun',      'plot_B'],
    ['Bougainvillea',    'Bougainvillea spectabilis','shrub',         8.0,  18.0, 40, 'Colorful climbing shrub.',               null, 'ready_to_sell', 'summer',   'low',      'full_sun',      'outdoor'],
    ['Ficus',            'Ficus benjamina',        'indoor_plant',   10.0, 25.0, 28, 'Large popular indoor plant.',            null, 'ready_to_sell', 'all_year', 'moderate', 'partial_shade', 'greenhouse'],
    ['Monstera',         'Monstera deliciosa',     'indoor_plant',   12.0, 30.0, 18, 'Trendy tropical indoor plant.',          null, 'growing',       'all_year', 'moderate', 'partial_shade', 'greenhouse'],
    ['Aloe Vera',        'Aloe vera',              'cactus',         3.0,  10.0, 60, 'Succulent plant with healing properties.',null,'ready_to_sell', 'all_year', 'low',      'full_sun',      'greenhouse'],
    ['Lavender',         'Lavandula angustifolia', 'aromatic_herb',  4.0,  9.0,  45, 'Fragrant purple flowering herb.',        null, 'ready_to_sell', 'summer',   'low',      'full_sun',      'plot_A'],
    ['Chamomile',        'Matricaria chamomilla',  'medicinal_plant',3.0,  8.0,  30, 'Medicinal herb with calming properties.',null,'growing',       'spring',   'moderate', 'full_sun',      'zone_1'],
    ['Peppermint',       'Mentha piperita',        'medicinal_plant',2.5,  7.0,  50, 'Aromatic medicinal mint plant.',         null, 'ready_to_sell', 'all_year', 'high',     'partial_shade', 'zone_1'],
    ['Weeping Willow',   'Salix babylonica',       'tree',           25.0, 55.0, 8,  'Majestic ornamental weeping tree.',      null, 'seedling',      'all_year', 'high',     'full_sun',      'zone_2'],
    ['Rosemary',         'Salvia rosmarinus',      'aromatic_herb',  3.5,  8.5,  40, 'Culinary and aromatic herb.',            null, 'ready_to_sell', 'all_year', 'low',      'full_sun',      'plot_B'],
  ];

  for (const p of plantsData) {
    insertPlante.run(...p);
  }

  // ── Seed past sales ──
  const insertVente  = db.prepare('INSERT INTO ventes (date_vente, id_client, id_employe, total, statut) VALUES (?, ?, ?, ?, ?)');
  const insertDetail = db.prepare('INSERT INTO details_vente (id_vente, id_plante, quantite, prix_unitaire, cout_unitaire) VALUES (?, ?, ?, ?, ?)');

  let v1 = insertVente.run('2026-03-10', client1, vendeurId, 45.0, 'paid');
  insertDetail.run(v1.lastInsertRowid, 1, 3, 15.0, 5.0);

  let v2 = insertVente.run('2026-03-15', client2, adminId, 35.0, 'paid');
  insertDetail.run(v2.lastInsertRowid, 3, 1, 35.0, 15.0);

  let v3 = insertVente.run('2026-04-01', client2, null, 30.0, 'paid');
  insertDetail.run(v3.lastInsertRowid, 7, 1, 30.0, 12.0);

  let v4 = insertVente.run('2026-04-20', client1, vendeurId, 19.0, 'pending');
  insertDetail.run(v4.lastInsertRowid, 9, 2, 9.0, 4.0);
  insertDetail.run(v4.lastInsertRowid, 11, 1, 7.0, 2.5);

  db.close();
  console.log('🌱 Test data inserted (Admin, Clients, Plants, and Sales).');
}

module.exports = { getDb, initDatabase, seedDatabase };
