# 📱 Application Mobile Native PURGE (Expo Go & Android)

Application mobile **PURGE** développée en **React Native** avec **Expo SDK 52** et **TypeScript**, spécialement optimisée pour fonctionner directement sur **Expo Go sur Android** ou être compilée en fichier APK / AAB via EAS Build.

---

## 🏗️ Architecture Mobile Native

L'application mobile est totalement native (aucun DOM de navigateur, aucun `react-dom` ou `window`).

```
mobile/
├── assets/                  # Icônes Android (icon.png, adaptive-icon.png, splash.png)
├── components/              # Composants natifs réutilisables
│   ├── Header.tsx           # En-tête avec logo PURGE, raccourcis et profil
│   ├── BottomNavBar.tsx     # Barre d'onglets inférieure à 5 sections
│   ├── ArticleCard.tsx      # Carte d'article avec couverture, auteur et métriques
│   ├── CategoryPills.tsx    # Filtres horizontaux par thématiques
│   ├── PollWidget.tsx       # Sondage interactif en direct avec jauges de vote
│   └── CommentSection.tsx   # Espace de débat et commentaires en temps réel
├── screens/                 # Écrans principaux de l'application
│   ├── HomeScreen.tsx       # Fil d'actualité (Pour Vous, À la Une, Récents)
│   ├── ArticleDetailScreen.tsx # Lecteur d'enquête complet + sondage + débat
│   ├── SearchScreen.tsx     # Recherche par mots-clés et exploration thématique
│   ├── RankingsScreen.tsx   # Top 7 Maisons de Presse et Top 7 Journalistes
│   ├── BookmarksScreen.tsx  # Archives personnelles et articles sauvegardés
│   ├── ProfileScreen.tsx    # Profil, statistiques, connexion / inscription
│   └── CreateArticleScreen.tsx # Rédaction d'enquête avec téléversement Cloudinary
├── services/
│   ├── api.ts               # Client REST vers le backend PURGE avec Bearer token
│   ├── storage.ts           # Stockage persistant via AsyncStorage
│   ├── firebase.ts          # Intégration Firebase native sans API de navigateur
│   └── imagePicker.ts       # Sélecteur photo via expo-image-picker & Cloudinary
├── types/
│   └── index.ts             # Interfaces TypeScript partagées
├── app.json                 # Configuration Expo pour Android (package: com.purge.info)
├── package.json             # Scripts et dépendances Expo Go
└── tsconfig.json            # Configuration TypeScript stricte
```

---

## 🚀 Démarrage Rapide sur Expo Go (Android)

### 1. Prérequis
Installez l'application gratuite **Expo Go** sur votre smartphone ou tablette Android :
- [Expo Go sur Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. Configuration d'Environnement
Copiez `.env.example` vers `.env` dans le dossier `mobile/` si vous souhaitez personnaliser l'URL de votre backend :
```bash
cp mobile/.env.example mobile/.env
```
Par défaut, `EXPO_PUBLIC_API_URL` pointe directement vers le backend PURGE déployé.

### 3. Lancement
Dans votre terminal, placez-vous dans le dossier `mobile` :
```bash
cd mobile
npm install
npm start
# ou pour vider le cache :
npm run start:clear
```

### 4. Flasher le QR Code
- Ouvrez **Expo Go** sur votre appareil Android.
- Choisissez **« Scan QR Code »** et pointez votre appareil vers le terminal. L'application native se chargera instantanément.

---

## 🛠️ Scripts Disponibles

Dans le dossier `mobile/` :
- `npm start` : Démarre le serveur de développement Expo.
- `npm run android` : Démarre le serveur et tente l'ouverture sur un émulateur Android.
- `npm run start:clear` / `npm run start:clean` : Démarre Expo en réinitialisant le cache Metro.
- `npm run check` / `npm run typecheck` : Vérifie la stricte validité des types TypeScript.

---

## 🎨 Fonctionnalités Principales

- **Fil d'Actualités Immédiat** : Basculez entre *Pour Vous*, *À la Une* et *Récents*. Pull-to-refresh natif.
- **Enquêtes Détaillées** : Mise en page journalistique à fort contraste, temps de lecture estimé, badge vérifié des rédacteurs.
- **Sondages Participatifs** : Votez et visualisez les résultats percentiles en temps réel.
- **Espace Débat** : Publiez vos commentaires avec mise à jour instantanée.
- **Top 7 de la Presse** : Baromètre de réputation des Maisons de Presse et des Journalistes.
- **Rédaction Mobile & Cloudinary** : Les journalistes peuvent sélectionner une photo depuis la galerie Android avec `expo-image-picker` et la téléverser directement sur Cloudinary via l'API sécurisée.
- **Prise en charge de la Touche Retour Android** : La navigation respecte le bouton ou geste « Retour » physique d'Android.
