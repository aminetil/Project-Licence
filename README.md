# 🌿 KHADRA — Système de Gestion de Pépinière

Application web de gestion et de vente en ligne pour une pépinière, développée dans le cadre d'un projet de licence en informatique.

## 📋 Description

KHADRA est une application web full-stack permettant de gérer une pépinière avec deux espaces distincts :
- **Espace Admin** : gestion des plantes, du stock, des ventes et des utilisateurs
- **Espace Client** : catalogue, panier, commandes et profil

## 🛠️ Technologies utilisées

- **Backend** : Node.js, Express.js
- **Base de données** : SQLite (via better-sqlite3)
- **Moteur de templates** : EJS (fichiers .html)
- **Authentification** : Sessions Express + bcryptjs
- **Upload d'images** : Multer
- **Frontend** : HTML, CSS (custom), Bootstrap 5, Font Awesome

## 📁 Structure du projet

```
khadra/
├── app.js                  # Point d'entrée principal
├── database/
│   └── init.js             # Initialisation et seed de la base de données
├── routes/
│   ├── auth.js             # Authentification (login, register, logout)
│   ├── admin/              # Routes administration
│   │   ├── plantes.js
│   │   ├── stock.js
│   │   ├── ventes.js
│   │   ├── utilisateurs.js
│   │   └── statistiques.js
│   └── client/             # Routes espace client
│       ├── home.js
│       ├── catalogue.js
│       ├── panier.js
│       ├── commandes.js
│       └── profil.js
├── views/                  # Templates HTML (EJS)
│   ├── admin/
│   ├── client/
│   ├── auth/
│   └── partials/
└── public/
    ├── css/custom.css
    └── uploads/            # Images des plantes
```

## 🚀 Installation et lancement

### Prérequis
- Node.js (v18 ou supérieur)

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/aminetil/Project-Licence.git
cd Project-Licence

# 2. Installer les dépendances
npm install

# 3. Lancer l'application
npm start
```

L'application sera accessible sur **http://localhost:3001**

## 👥 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@pepiniere.com | password123 |
| Vendeur | mohamed@pepiniere.com | password123 |
| Client | karim@client.com | password123 |

## ✨ Fonctionnalités

### Espace Administrateur
- Gestion complète des plantes (CRUD + upload d'image)
- Gestion du stock (entrées/sorties avec historique)
- Suivi des ventes et mise à jour des statuts
- Gestion des utilisateurs et des rôles
- Tableau de bord statistique (chiffre d'affaires, bénéfices, ventes par mois)

### Espace Client
- Page d'accueil avec plantes en vedette et catégories
- Catalogue avec recherche et filtre par catégorie
- Fiche détaillée de chaque plante avec plantes similaires
- Panier (ajout, modification de quantité, suppression)
- Passage de commande avec vérification du stock
- Historique des commandes
- Gestion du profil (informations + changement de mot de passe)
