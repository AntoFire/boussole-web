# Mettre Boussole en ligne (Firebase)

À faire une fois, sur ton Mac. Compter 20 minutes.

## 1. Console Firebase (déjà fait si tu as suivi le guide du 5 novembre)

1. Projet `boussole-antonin`, sans Google Analytics.
2. Forfait **Blaze** + alerte de budget à 1 $ (Google Cloud → Facturation → Budgets et alertes). L'alerte prévient par e-mail, elle ne bloque pas.
3. **Authentication** → Google activé.
4. **Firestore** : mode production, région `northamerica-northeast1` (Montréal).
5. **Storage** : même région.
6. **Paramètres du projet → Vos applications → Web** : garder le bloc `firebaseConfig`.

## 2. Le code sur ton Mac, hors iCloud

Le Bureau est synchronisé avec iCloud : fichiers pas toujours téléchargés, `node_modules` synchronisé pour rien. Travaille dans `~/Developer`.

```bash
cd ~/Developer
git clone https://github.com/AntoFire/boussole-web.git
cd boussole-web
npm ci
cp .env.example .env.local
open -e .env.local   # colle les valeurs de firebaseConfig (apiKey, authDomain, projectId, storageBucket, appId)
```

## 3. Lier le projet et déployer les règles

```bash
npx firebase-tools login
npx firebase-tools use --add          # choisis boussole-antonin, alias « default »
npx firebase-tools deploy --only firestore:rules,storage
```

Règles : seul ton compte lit et écrit `users/{ton uid}/…` (Firestore) et tes PDF (Storage, 25 Mo max, PDF uniquement).

## 4. Première connexion et verrouillage

1. `npm run dev`, ouvre http://localhost:5173 et connecte-toi avec Google.
2. Console Firebase → Authentication → Utilisateurs : copie ton UID.
3. Mets-le dans `.env.local` : `VITE_OWNER_UID=…`. Tout autre compte verra « Ce compte n'a pas accès à Boussole ».

## 5. Importer tes données

Page **Données → Importer un JSON**, avec l'export complet de la Boussole actuelle (format `{collection: {id: document}}`). L'export complet sera ajouté à l'artifact au moment de la bascule.

## 6. Mettre en ligne

```bash
npm run build
npx firebase-tools deploy --only hosting
```

L'appli est sur `https://boussole-antonin.web.app`. Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ».

## Coût

À ton volume (un utilisateur), tout reste dans la part gratuite de Blaze : Firestore (50 000 lectures / jour), Storage (5 Go), Hosting (10 Go / mois), Functions (2 millions d'appels / mois).

## Phase 2 : clé OpenRouter

La clé ne va jamais dans `.env.local` ni dans le dépôt. Elle est enregistrée côté serveur, depuis ton terminal :

```bash
npx firebase-tools functions:secrets:set OPENROUTER_API_KEY
```
