# Guide de Déploiement sur Render (render.com)

La plateforme **PURGE-INFO** est prête pour un déploiement continu et automatisé sur **Render** sous forme de **Web Service Node.js**.

---

### Pourquoi Render est supérieur pour PURGE-INFO (par rapport à Vercel) :
1. **Support natif des WebSockets en temps réel (`/ws`)** : Contrairement aux fonctions serverless qui coupent les connexions persistantes après quelques secondes, Render maintient des processus serveurs actifs 24/7.
2. **Server-Sent Events (SSE) continus** : Synchronisation continue des flux d'actualités, des alertes de purge et des notifications instantanées.
3. **Uploads de médias volumineux (Vidéos jusqu'à 90 Mo)** : Aucune limite stricte de payload serverless (la limite de 4.5 Mo de Vercel n'existe plus).
4. **Persistance Cloud Firestore autoritaire** : Données synchronisées en temps réel entre le Web et le Mobile.

---

### Option 1 : Déploiement automatique avec le Blueprint (`render.yaml`)

1. Connectez-vous sur [dashboard.render.com](https://dashboard.render.com).
2. Cliquez sur **New +** puis sélectionnez **Blueprint**.
3. Choisissez votre dépôt GitHub contenant le projet PURGE-INFO.
4. Render lira automatiquement le fichier `render.yaml` situé à la racine et configurera tous les réglages requis.
5. Renseignez les variables d'environnement dans l'interface et cliquez sur **Apply**.

---

### Option 2 : Déploiement manuel via Web Service

Si vous préférez configurer le service manuellement :
1. Cliquez sur **New +** > **Web Service**.
2. Sélectionnez votre dépôt GitHub.
3. Paramètres de configuration :
   - **Name** : `purge-info`
   - **Region** : `Frankfurt (EU Central)` ou la région la plus proche de vos utilisateurs
   - **Runtime** : `Node`
   - **Branch** : `main`
   - **Build Command** :
     ```bash
     npm install && npm run build
     ```
   - **Start Command** :
     ```bash
     node dist/server.cjs
     ```
     *(ou `npm run serve`)*
   - **Plan** : `Free` ou `Starter`

---

### Variables d'Environnement à Configurer sur Render

Dans la section **Environment** de votre Web Service sur Render, ajoutez :

#### 1. Configuration de Base
- `NODE_ENV` = `production`
- `PORT` = `10000` *(ou laissez Render injecter automatiquement le port)*
- `JWT_SECRET` = *(Une chaîne secrète robuste générée aléatoirement)*

#### 2. Firebase Client (Front-End Web)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID` = `ai-studio-sasaki1-d54f04b6-c7ca-43c4-b242-bda2d7957a17`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_ID`

#### 3. Firebase Admin SDK (Backend Firestore Autoritaire)
- `FIREBASE_PROJECT_ID` = `ai-studio-sasaki1-d54f04b6-c7ca-43c4-b242-bda2d7957a17`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

#### 4. Cloudinary (Hébergement Photos & Vidéos)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

### URL de Santé et Monitoring
Render peut vérifier automatiquement l'état de l'application grâce au endpoint de healthcheck :
- **Health Check Path** : `/api/health`
