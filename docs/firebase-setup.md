# Mettre Boussole en ligne (Firebase)

À faire une fois, sur ton Mac. Compter 20 minutes.

## 1. Console Firebase (déjà fait si tu as suivi le guide du 5 novembre)

1. Projet `boussole-antonin`, sans Google Analytics.
2. Forfait **Blaze** + budget mensuel de 5 € avec alertes à 50, 90 et 100 % (Google Cloud → Facturation → Budgets & caps). L'alerte prévient par e-mail ; un « plafond de dépenses » peut en plus mettre les services en pause.
3. **Authentication** → Google activé.
4. **Firestore** : base nommée `boussole`, mode production, région `northamerica-northeast1` (Montréal). Le nom de la base va dans `VITE_FIREBASE_DATABASE_ID` et dans `firebase.json`.
5. **Storage** : bucket `boussole-antonin.firebasestorage.app`, emplacement sans frais `US-EAST1` (Montréal n'a pas de quota gratuit pour Storage).
6. **Paramètres du projet → Vos applications → Web** : garder le bloc `firebaseConfig`.

## 2. Le code sur ton Mac, hors iCloud

Le Bureau est synchronisé avec iCloud : fichiers pas toujours téléchargés, `node_modules` synchronisé pour rien. Travaille dans `~/Developer`.

```bash
cd ~/Developer
git clone https://github.com/AntoFire/boussole-web.git
cd boussole-web
npm ci
cp .env.example .env.local
open -e .env.local   # colle les valeurs de firebaseConfig (apiKey, authDomain, projectId, storageBucket, appId) ; VITE_FIREBASE_DATABASE_ID=boussole
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

1. Dans l'artifact Boussole : **Données → Tout exporter**. Le fichier `boussole-complet-AAAA-MM-JJ.json` contient toutes les collections (format `{_meta, collection: {id: document}}`), et l'artifact affiche le nombre de documents par collection.
2. Dans l'appli : **Données → Importer un JSON**. L'appli affiche ce qu'elle va écrire (mêmes nombres) et ce qu'elle laisse de côté, puis importe après confirmation. Les documents de même identifiant sont remplacés, les autres gardés : relancer l'import ne crée pas de doublons.
3. L'ancien export partiel de l'artifact (notions, échéances, journal) est aussi accepté.

## 6. Mettre en ligne

```bash
npm run build
npx firebase-tools deploy --only hosting
```

L'appli est sur `https://boussole-antonin.web.app`. Sur iPhone : Safari → Partager → « Sur l'écran d'accueil ».

## Coût

À ton volume (un utilisateur), tout reste dans la part gratuite de Blaze : Firestore (50 000 lectures / jour), Storage (5 Go), Hosting (10 Go / mois), Functions (2 millions d'appels / mois).

## Phase 2 : IA (Cloud Function `ai`)

Chaîne : appli → fonction `ai` (région `northamerica-northeast1`) → OpenRouter. La clé n'existe que côté serveur.

### Ce que la fonction vérifie à chaque appel
1. (si activé) un jeton App Check valide ;
2. une connexion Firebase, et que l'UID du jeton est celui de `OWNER_UID` (variable **du serveur** ; `VITE_OWNER_UID` côté appli n'est qu'un confort d'interface et ne protège rien). Sans `OWNER_UID`, la fonction refuse tout le monde ;
3. la forme de la requête (Zod, champs inconnus refusés) ;
4. le quota : `AI_LIMIT_PER_MIN` (5) et `AI_LIMIT_PER_DAY` (40), compteurs dans `aiUsage/{uid}`. Ce document n'est écrit que par le serveur (SDK Admin) ; les règles Firestore, qui refusent tout hors `users/{uid}/**`, n'ont pas changé.

Les journaux contiennent la tâche, la durée, les nombres de tokens et un code d'erreur, jamais le texte des cours, ni la clé, ni l'UID complet.

### Mise en place (une fois)
```bash
npx firebase-tools functions:secrets:set OPENROUTER_API_KEY   # colle la clé OpenRouter quand le terminal la demande
cp functions/.env.example functions/.env                       # puis renseigne OWNER_UID (Authentication → Utilisateurs)
npx firebase-tools deploy --only functions
```
Puis dans l'appli (connecté avec `VITE_DATA_BACKEND=firebase`) : **Données → Assistant IA → Tester la connexion IA**.

Changer de modèle : modifier `AI_MODEL` dans `functions/.env` et redéployer les fonctions, sans toucher au code.

### Coûts à connaître
- Functions et Secret Manager exigent Blaze. Les appels restent dans la part gratuite à ton volume, mais les images de fonctions (Artifact Registry / Cloud Build) et les accès au secret peuvent coûter quelques centimes.
- L'alerte de budget **prévient seulement** ; les plafonds ci-dessus et `maxInstances: 2` sont les vraies limites.
- Le modèle `:free` a ses propres quotas côté OpenRouter, et ses prompts peuvent être conservés par le fournisseur.

### App Check (recommandé, à faire en dernier)
1. Console Firebase → App Check → Applis → Web → reCAPTCHA v3 : copie la clé de site dans `VITE_APPCHECK_SITE_KEY`.
2. En développement, `npm run dev` affiche un jeton de debug dans la console du navigateur : enregistre-le (App Check → Applis → Gérer les jetons de debug).
3. Une fois l'appli redéployée et le test IA OK, mets `AI_ENFORCE_APPCHECK=true` dans `functions/.env` et redéploie les fonctions.
