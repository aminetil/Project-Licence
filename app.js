const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const { initDatabase, seedDatabase } = require('./database/init');

// Initialize database
initDatabase();
seedDatabase();

const app = express();

// ── View engine ──
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ──
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: 'pepiniere-smart-2026-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());

// ── Global template variables ──
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.panier = req.session.panier || [];
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  next();
});

// ── Auth middleware (Rôles) ──
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Veuillez vous connecter.');
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Veuillez vous connecter.');
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin' && req.session.user.role !== 'vendeur') {
    req.flash('error', 'Accès refusé. Espace réservé aux administrateurs.');
    return res.redirect('/client/home');
  }
  next();
}

function requireClient(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Veuillez vous connecter pour accéder à votre espace.');
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'client') {
    return res.redirect('/admin/plantes'); // Les admins n'ont pas d'espace client propre
  }
  next();
}

// ── Routes d'Authentification ──
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

// ── Routes Admin ──
const adminPlantesRoutes = require('./routes/admin/plantes');
const adminStockRoutes = require('./routes/admin/stock');
const adminVentesRoutes = require('./routes/admin/ventes');
const adminUsersRoutes = require('./routes/admin/utilisateurs');
const adminStatsRoutes = require('./routes/admin/statistiques');

// Redirect old dashboard to plantes
app.get('/admin/dashboard', requireAdmin, (req, res) => res.redirect('/admin/plantes'));
app.use('/admin/plantes', requireAdmin, adminPlantesRoutes);
app.use('/admin/stock', requireAdmin, adminStockRoutes);
app.use('/admin/ventes', requireAdmin, adminVentesRoutes);
app.use('/admin/utilisateurs', requireAdmin, adminUsersRoutes);
app.use('/admin/statistiques', requireAdmin, adminStatsRoutes);

// ── Routes Client ──
const clientHomeRoutes = require('./routes/client/home');
const clientCatalogueRoutes = require('./routes/client/catalogue');
const clientPanierRoutes = require('./routes/client/panier');
const clientCommandesRoutes = require('./routes/client/commandes');
const clientProfilRoutes = require('./routes/client/profil');

// Home and Catalogue can be accessible to guests, but the others are protected
app.use('/client/home', clientHomeRoutes);
app.use('/client/catalogue', clientCatalogueRoutes);
app.use('/client/panier', clientPanierRoutes); // Guest can review cart, but checkout requires an account 
app.use('/client/commandes', requireClient, clientCommandesRoutes);
app.use('/client/profil', requireClient, clientProfilRoutes);

// ── Home redirect ──
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/client/home'); // Nouveaux visiteurs e-commerce !
  }
  if (req.session.user.role === 'admin' || req.session.user.role === 'vendeur') {
    return res.redirect('/admin/plantes');
  } else {
    return res.redirect('/client/home');
  }
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page non trouvée' });
});

// ── Start server ──
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🌿 KHADRA E-Commerce & Management System`);
  console.log(`🌐 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin: admin@pepiniere.com / password123`);
  console.log(`👤 Client: karim@client.com / password123\n`);
});
