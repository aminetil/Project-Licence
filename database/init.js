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

  const hashedPassword = bcrypt.hashSync('password123', 10);


  const insertUser = db.prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe, role, telephone, adresse) VALUES (?, ?, ?, ?, ?, ?)');

  const userCount = db.prepare('SELECT COUNT(*) as count FROM utilisateurs').get();
  let adminId = null;
  let vendeurId = null;
  let client1 = null;
  let client2 = null;

  if (userCount.count === 0) {
    adminId   = insertUser.run('Admin KHADRA',    'admin@pepiniere.com',   hashedPassword, 'admin',   null, null).lastInsertRowid;
    vendeurId = insertUser.run('Mohamed Seller',  'mohamed@pepiniere.com', hashedPassword, 'vendeur', null, null).lastInsertRowid;
    client1   = insertUser.run('Karim Benali',    'karim@client.com',      hashedPassword, 'client',  '0555123456', '12 Flower Street, Algiers').lastInsertRowid;
    client2   = insertUser.run('Fatima Zahra',    'fatima@client.com',     hashedPassword, 'client',  '0661234567', '34 Main Avenue, Oran').lastInsertRowid;
  } else {
    adminId = db.prepare('SELECT id FROM utilisateurs WHERE email = ?').get('admin@pepiniere.com')?.id || null;
    vendeurId = db.prepare('SELECT id FROM utilisateurs WHERE email = ?').get('mohamed@pepiniere.com')?.id || null;
    client1 = db.prepare('SELECT id FROM utilisateurs WHERE email = ?').get('karim@client.com')?.id || null;
    client2 = db.prepare('SELECT id FROM utilisateurs WHERE email = ?').get('fatima@client.com')?.id || null;
  }

  // ── Seed plants ──
  const insertPlante = db.prepare(`
    INSERT INTO plantes (nom, species, categorie, cout, prix, quantite, description, image, growth_status, seasonality, watering, light_needs, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // [name, species, category, cost, price, qty, description, image, growth_status, seasonality, watering, light_needs, location]
  const plantsData = [
    ['Red Rose',         'Rose',                   'flower',         100.0,350.0,53, null,                                      '/uploads/plant-1779317086067.jpg',  'ready_to_sell', 'spring',   'moderate', 'full_sun',      'greenhouse'],
    ['Jasmine',          'Jasminum',               'tree',           500.0,1200.0,35,'White climbing flower with fragrance.',  '/uploads/plant-1779317496613.webp', 'growing',       'spring',   'moderate', 'full_sun',      'plot_A'],
    ['Olive Tree',       'olive',                  'tree',           650.0,1500.0,20,null,                                      '/uploads/plant-1779317599613.jpg',  'ready_to_sell', 'all_year', 'low',      'full_sun',      'plot_B'],
    ['Lemon Tree',       'Citrus',                 'tree',           230.0,1250.0,15,'Fruit tree producing fresh lemons.',     '/uploads/plant-1779317685887.webp', 'growing',       'all_year', 'moderate', 'full_sun',      'plot_B'],
    ['Bougainvillea',    'Bougainvillea spectabilis','shrub',         8.0,  18.0, 40, 'Colorful climbing shrub.',               null, 'ready_to_sell', 'summer',   'low',      'full_sun',      'outdoor'],
    ['Spider Plant',     'Chlorophytum comosum',   'indoor_plant',   200.0,600.0,28,'Large popular indoor plant.',             '/uploads/plant-1779318061471.jpg',  'ready_to_sell', 'all_year', 'moderate', 'partial_shade', 'plot_B'],
    ['Ficus',            'Ficus benjamina',        'indoor_plant',   10.0, 25.0, 28, 'Large popular indoor plant.',            null, 'ready_to_sell', 'all_year', 'moderate', 'partial_shade', 'greenhouse'],
    ['Monstera',         'Monstera deliciosa',     'indoor_plant',   12.0, 30.0, 18, 'Trendy tropical indoor plant.',          null, 'growing',       'all_year', 'moderate', 'partial_shade', 'greenhouse'],
    ['Aloe Vera',        'Aloe vera',              'cactus',         3.0,  10.0, 60, 'Succulent plant with healing properties.',null,'ready_to_sell', 'all_year', 'low',      'full_sun',      'greenhouse'],
    ['Lavender',         'Lavandula angustifolia', 'aromatic_herb',  4.0,  9.0,  45, 'Fragrant purple flowering herb.',        null, 'ready_to_sell', 'summer',   'low',      'full_sun',      'plot_A'],
    ['Chamomile',        'Matricaria chamomilla',  'medicinal_plant',3.0,  8.0,  30, 'Medicinal herb with calming properties.',null,'growing',       'spring',   'moderate', 'full_sun',      'zone_1'],
    ['Peppermint',       'Mentha piperita',        'medicinal_plant',2.5,  7.0,  50, 'Aromatic medicinal mint plant.',         null, 'ready_to_sell', 'all_year', 'high',     'partial_shade', 'zone_1'],
    ['Ginger Plant',     'Zingiber officinale',    'medicinal_plant',600.0,1300.0,32,null,                                     '/uploads/plant-1779318389676.jpg',  'seedling',      'spring',   'moderate', 'full_sun',      'greenhouse'],
    ['Sunflower',        'Helianthus annuus',      'flower',         150.0,550.0,43, null,                                      '/uploads/plant-1779318726321.jpeg', 'ready_to_sell', 'summer',   'moderate', 'full_sun',      'zone_2'],
    ['Weeping Willow',   'Salix babylonica',       'tree',           25.0, 55.0, 8,  'Majestic ornamental weeping tree.',      null, 'seedling',      'all_year', 'high',     'full_sun',      'zone_2'],
    ['Rosemary',         'Salvia rosmarinus',      'aromatic_herb',  3.5,  8.5,  40, 'Culinary and aromatic herb.',            null, 'ready_to_sell', 'all_year', 'low',      'full_sun',      'plot_B'],
  ];

  for (const p of plantsData) {
    const existing = db.prepare(`
      SELECT id FROM plantes
      WHERE lower(trim(nom)) = lower(trim(?))
      LIMIT 1
    `).get(p[0]);

    if (!existing) {
      insertPlante.run(...p);
    }
  }


  const salesCount = db.prepare('SELECT COUNT(*) as count FROM ventes').get();
  if (salesCount.count > 0 || !adminId || !vendeurId || !client1 || !client2) {
    db.close();
    console.log(' Database synced (users and missing plants checked).');
    return;
  }

  const insertVente  = db.prepare('INSERT INTO ventes (date_vente, id_client, id_employe, total, statut) VALUES (?, ?, ?, ?, ?)');
  const insertDetail = db.prepare('INSERT INTO details_vente (id_vente, id_plante, quantite, prix_unitaire, cout_unitaire) VALUES (?, ?, ?, ?, ?)');
  const getPlantId = db.prepare('SELECT id FROM plantes WHERE nom = ? LIMIT 1');

  let v1 = insertVente.run('2026-03-10', client1, vendeurId, 45.0, 'paid');
  insertDetail.run(v1.lastInsertRowid, getPlantId.get('Red Rose').id, 3, 15.0, 5.0);

  let v2 = insertVente.run('2026-03-15', client2, adminId, 35.0, 'paid');
  insertDetail.run(v2.lastInsertRowid, getPlantId.get('Olive Tree').id, 1, 35.0, 15.0);

  let v3 = insertVente.run('2026-04-01', client2, null, 30.0, 'paid');
  insertDetail.run(v3.lastInsertRowid, getPlantId.get('Monstera').id, 1, 30.0, 12.0);

  let v4 = insertVente.run('2026-04-20', client1, vendeurId, 19.0, 'pending');
  insertDetail.run(v4.lastInsertRowid, getPlantId.get('Lavender').id, 2, 9.0, 4.0);
  insertDetail.run(v4.lastInsertRowid, getPlantId.get('Peppermint').id, 1, 7.0, 2.5);

  db.close();
  console.log(' Test data inserted (Admin, Clients, Plants, and Sales).');
}

module.exports = { getDb, initDatabase, seedDatabase };
