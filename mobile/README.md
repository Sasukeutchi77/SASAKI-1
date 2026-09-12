# Application Mobile PURGE (Expo Go pour Android & APK)

Cette application mobile officielle **PURGE** est conçue et optimisée exclusivement pour **Android** : prête à être exécutée directement sur **Expo Go (Android)** ou compilée en fichier APK / AAB natif via EAS Build.

## 📱 Format des Images & Conformité Android

Tous les assets d'icône et d'écrans de démarrage ont été calibrés aux dimensions exactes requises par Android et Google Play :

| Asset | Chemin | Format & Dimensions | Description |
|---|---|---|---|
| **App Icon Master** | `mobile/assets/icon.png` | PNG 1024x1024 px | Logo PURGE centré, fond opaque noir `#020512`. |
| **Android Adaptive Icon** | `mobile/assets/adaptive-icon.png` | PNG 1024x1024 px | Format adaptatif avec zone de sécurité centrale (marge de 25%) pour découpe en cercle/squircle Android. |
| **Splash Screen** | `mobile/assets/splash.png` | PNG 1284x2778 px | Écran de démarrage vertical sur fond `#020512`. |
| **Favicon** | `mobile/assets/favicon.png` | PNG 48x48 px | Icône pour navigateur Android. |

---

## 🚀 Démarrage en 3 étapes avec Expo Go (Android)

### 1. Prérequis
Installez l'application gratuite **Expo Go** sur votre téléphone ou tablette Android :
- [Expo Go sur Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. Lancer le serveur mobile
Dans un terminal, placez-vous dans le dossier `mobile` et lancez Expo en mode Android :

```bash
cd mobile
npm install
npx expo start --android
```

### 3. Scanner le QR Code
- Ouvrez l'application **Expo Go** sur votre smartphone Android.
- Appuyez sur **« Scan QR Code »** et scannez le QR code affiché dans le terminal. L'application PURGE se chargera directement.

---

## ⚡ Caractéristiques Android Natives
- **Moteur Web Ultra-Fluide** : WebView connectée au flux d'actualités PURGE en temps réel.
- **Gestionnaire Retour Matériel Android** : Prise en charge native de la touche ou geste physique « Retour » pour revenir à l'article ou à la page précédente sans quitter l'application par inadvertance.
- **Barre d'état immersive** : Intégration de la barre système Android sombre `#020512`.
- **Mode Hors Ligne avec Reconnexion** : Détection automatique des pertes de signal et reprise instantanée.
- **Installation PWA Android** : Possibilité d'installation directe également depuis Chrome Android via le bouton **Installer l'App Android**.
