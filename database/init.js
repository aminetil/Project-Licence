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
    INSERT INTO plantes (nom, species, categorie, cout, prix, quantite, description, image, growth_status, seasonality, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // [name, species, category, cost, price, qty, description, image, growth_status, seasonality, location]
  const plantsData = [
    ['Red Rose',         'Rose',                   'flower',         100.0,350.0,53, 'A classic symbol of beauty and passion. Thrives in full sun with moderate watering — water 2–3 times a week and avoid waterlogging.',                                                        '/uploads/plant-1779317086067.jpg',  'ready_to_sell', 'spring',   'greenhouse'],
    ['Jasmine',          'Jasminum',               'tree',           500.0,1200.0,35,'White climbing flower with an enchanting fragrance. Prefers full sun and moderate watering — keep the soil slightly moist but well-drained.',                                              '/uploads/plant-1779317496613.webp', 'growing',       'spring',   'plot_A'],
    ['Olive Tree',       'olive',                  'tree',           650.0,1500.0,20,'A majestic Mediterranean tree known for its longevity. Extremely drought-tolerant — water sparingly once established. Thrives in full sun and well-drained soil.',                        '/uploads/plant-1779317599613.jpg',  'ready_to_sell', 'all_year', 'plot_B'],
    ['Lemon Tree',       'Citrus',                 'tree',           230.0,1250.0,15,'Fruit tree producing fresh, aromatic lemons year-round. Requires full sun and moderate watering — water every 5–7 days, more often in summer heat.',                                      '/uploads/plant-1779317685887.webp', 'growing',       'all_year', 'plot_B'],
    ['Bougainvillea',    'Bougainvillea spectabilis','flower',        8.0,  18.0, 40, 'Vibrant climbing shrub with brilliant coloured bracts. Loves full sun and tolerates drought — water sparingly once established for best flowering.',                                         null, 'ready_to_sell', 'summer',   'outdoor'],
    ['Spider Plant',     'Chlorophytum comosum',   'indoor_plant',   200.0,600.0,28,'One of the most popular and easy-care indoor plants. Does best in bright indirect light (partial shade) and appreciates moderate watering — let the soil dry slightly between waterings.', '/uploads/plant-1779318061471.jpg',  'ready_to_sell', 'all_year', 'plot_B'],
    ['Ficus',            'Ficus benjamina',        'indoor_plant',   10.0, 25.0, 28, 'Classic indoor tree loved for its elegant, glossy foliage. Place in bright indirect light and water moderately — allow the top centimetre of soil to dry between waterings.',               null, 'ready_to_sell', 'all_year', 'greenhouse'],
    ['Monstera',         'Monstera deliciosa',     'indoor_plant',   12.0, 30.0, 18, 'Iconic tropical houseplant with striking split leaves. Thrives in bright indirect light and needs moderate watering — water once a week and ensure good drainage.',                          null, 'growing',       'all_year', 'greenhouse'],
    ['Lavender',         'Lavandula angustifolia', 'aromatic_herb',  4.0,  9.0,  45, 'Beloved fragrant herb with beautiful purple flower spikes. Thrives in full sun and dry conditions — water sparingly and only when the soil is completely dry.',                              null, 'ready_to_sell', 'summer',   'plot_A'],
    ['Chamomile',        'Matricaria chamomilla',  'medicinal_plant',3.0,  8.0,  30, 'Gentle medicinal herb known for its calming properties and daisy-like flowers. Prefers full sun and moderate watering — keep the soil evenly moist during the growing season.',             null, 'growing',       'spring',   'zone_1'],
    ['Ginger Plant',     'Zingiber officinale',    'medicinal_plant',600.0,1300.0,32,'Tropical spice plant cultivated for its aromatic and medicinal rhizomes. Prefers warm, filtered sunlight (full sun) and moderate watering — water regularly but ensure the soil drains well.','/uploads/plant-1779318389676.jpg',  'seedling',      'spring',   'greenhouse'],
    ['Sunflower',        'Helianthus annuus',      'flower',         150.0,550.0,43, 'Cheerful annual celebrated for its bold yellow blooms and edible seeds. Demands full sun (6–8 hours daily) and moderate watering — water deeply 2–3 times a week at the base.',           '/uploads/plant-1779318726321.jpeg', 'ready_to_sell', 'summer',   'zone_2'],
    ['Rosemary',         'Salvia rosmarinus',      'aromatic_herb',  3.5,  8.5,  40, 'Iconic culinary and aromatic Mediterranean herb with needle-like leaves. Loves full sun and low watering — water only when the soil is fully dry; it thrives on neglect.',                  null, 'ready_to_sell', 'all_year', 'plot_B'],
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

  db.close();
  console.log(' Test data inserted (Admin, Clients, Plants, and Sales).');
}

module.exports = { getDb, initDatabase, seedDatabase };
