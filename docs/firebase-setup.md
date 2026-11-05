# Brancher Firebase (≈ 10 min, à faire une fois)

1. console.firebase.google.com → **Ajouter un projet** (ex. `boussole-antonin`), Analytics non nécessaire.
2. **Build → Authentication → Premiers pas → Google** : activer, choisir ton e-mail d'assistance.
3. **Build → Firestore Database → Créer** : mode production, région `northamerica-northeast1` (Montréal).
4. **Paramètres du projet → Vos applications → Web (</>)** : copier la config.
5. Copier `.env.example` en `.env.local` et remplir :
   `VITE_DATA_BACKEND=firebase`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.
6. `npm i -g firebase-tools && firebase login && firebase use <id-du-projet>`
7. `firebase deploy --only firestore:rules` (règles : seul ton compte accède à `users/{ton uid}`).
8. Lancer l'appli, te connecter avec Google ; ton UID s'affiche dans la console Firebase (Authentication → Utilisateurs). Le mettre dans `VITE_OWNER_UID`.
9. Importer tes données : page **Données → Importer** avec un export JSON (ou `public/seed.json`, même format).
10. `npm run build && firebase deploy --only hosting` → l'appli est en ligne et installable sur téléphone (Partager → Sur l'écran d'accueil).

Coût : le plan gratuit (Spark) suffit largement pour un seul utilisateur.
