# Boussole V2 — Plan du sous-projet A (socle + parité sans IA + progression visible)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (exécution native dans la session). Cocher les cases au fil de l'eau.

**Goal :** Livrer une appli web React/TS qui reproduit Maintenant, Réviser, Flash, Évals et Données de l'artifact (sans IA) avec test d'entrée, journal de séances et bilan du soir, sur backend local et Firebase.
**Architecture :** `domain/` pur et testé ; `data/` derrière une interface `DataStore` ; `features/` en écrans React qui n'importent que `domain/` et `data/`.
**Tech Stack :** React 18, Vite, TypeScript strict, Vitest, React Router, Firebase (Firestore, Auth, Hosting), PWA.
**Spec :** `docs/spec-V2-socle.md` (+ `docs/spec-progression-visible.md` pour les fonctionnalités phase 1).

## Global Constraints

- TypeScript `strict: true`, aucun `any` implicite ; ESLint sans erreur.
- Test d'entrée : **6 cartes par chapitre**, jamais d'écriture dans `flashprog`/`concepts` ; temps actif **≤ 60 000 ms par carte**.
- Constantes reprises de l'artifact : `FL_BOX=[0,1,3,7,16,35]`, `FL_GOAL=10`, `FL_PER=4`, `FL_PASS=0.8`, `INTERVALS=[1,3,7,16]`, seuils notions 85 / 60.
- Rappel push 20h30 America/Toronto sauf mardi et samedi (livré en C, non en A).
- Aucune valeur `NaN` affichée : valeur absente → « — ».
- Aucun secret dans le dépôt : `.env` ignoré, `seed/` ignoré.
- Interface en français ; thème clair/sombre via tokens CSS.

## Review Focus

1. Chapitre sans carte, ou avec moins de 6 cartes, au test d'entrée → ignoré ou « échantillon réduit », sans erreur.
2. Première journée sans veille ni T0 → « — », jamais `NaN` ni écran vide.
3. Échec d'écriture (réseau) pendant un test ou un drill → message visible, résultats conservés, nouvel essai possible.
4. Séance qui traverse minuit → chaque réponse est comptée à la date de sa réponse.
5. Mardi soir / samedi après-midi → bilan en lecture seule, sans pistes ni bouton.
6. Données du seed avec champs manquants (`ch`, `linked`, `missions`, `history`) → l'appli les tolère.

## Tasks

### A1 — Scaffold et outillage
**Files :** `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.gitignore`, `.env.example`, `public/manifest.webmanifest`, `src/main.tsx`
**Interfaces — Produces :** scripts `npm run dev|build|test|lint|seed`.
- [ ] Créer le projet Vite React-TS, ajouter Vitest, React Router, `firebase`, `vite-plugin-pwa`.
- [ ] `tsconfig` strict ; `.gitignore` inclut `seed/`, `.env*` (sauf `.env.example`), `node_modules`, `dist`.
- [ ] Run : `npm run build && npm test` — Expected : build OK, 0 test.

### A2 — domain : types, dates, leitner, priorité
**Files :** `src/domain/{types,dates,notion,priority}.ts` + `*.test.ts`
**Interfaces — Produces :**
- `types.ts` : `CourseKey`, `Concept`, `Evaluation`, `FlashCard`, `FlashSource`, `FlashProg`, `CardState`, `JournalEntry`, `BaselineDoc`, `StatsDoc`, `Bilan`.
- `dates.ts` : `iso(d)`, `today()`, `parseDay(s)`, `addDays(s,n)`, `dayDiff(a,b)`, `fmtDay(s)`, `fmtRel(s,today)`.
- `notion.ts` : `applyScore(c:Concept, score:number, todayStr:string):{streak,status,nextDue,lastReview}` ; `contactOf(c)`, `levelOf(c)`, `stageLabel(c)`.
- `priority.ts` : `priority(c, evals, todayStr):number`, `reason(c, evals, todayStr):string`, `dueList(concepts, todayStr)`, `lampadaire(concepts, evals, todayStr):Concept|null`.
- [ ] Tests (valeurs de l'artifact) : score 90 avec série 0 → `streak 1`, `vert`, `nextDue=today+3` ; série 2 + score 90 → `consolide` ; 70 → `jaune`, `nextDue=today+1` ; 40 → `rouge`, `streak 0` ; rouge avec éval dans 3 jours → priorité ≥ 40 + base ; notion consolidée → priorité −1 ; lampadaire = notion due du chapitre le plus bas de la matière prioritaire.
- [ ] Implémenter, `npm test` PASS.

### A3 — domain : flash, baseline, stats, bilan, horaire
**Files :** `src/domain/{flash,baseline,stats,bilan,eveningMode}.ts` + tests
**Interfaces — Produces :**
- `flash.ts` : `FL_BOX, FL_GOAL, FL_PER, FL_PASS` ; `cardStateAfter(st:CardState|undefined, ok:boolean, todayStr):CardState` ; `rankCards(cards, progCards, used:Set<string>, todayStr):FlashCard[]` ; `buildBlock(cards, progCards, used, avoid?):FlashCard[]` (4 cartes : 2 cours + 2 exercices, cours d'abord) ; `streak(days:Record<string,number>, todayStr):number`.
- `baseline.ts` : `BASE_PER=6` ; `baselineSample(cards, course, ch, chOf, rng?):{cards,reduced}` ; `baselineAppend(doc|null, course, ch, run):BaselineDoc`.
- `stats.ts` : `CAP_MS=60000` ; `capMs(ms)`, `statsAdd(stats|null, day, course, n, ok, ms)`, `statsPrune(stats, today, keep?)`, `weekDelta(stats, today)`, `courseT0Now(course, baselines, cascade)`.
- `bilan.ts` : `bilanBuild(input, today):Bilan`, `bilanView(mode):{showTomorrow,showNote,showSave,closed}`.
- `eveningMode.ts` : `eveningMode(d:Date):'closed'|'readonly'|'full'`.
- [ ] Tests (valeurs de la spec) : `cardStateAfter` juste → `box+1` et `due=today+FL_BOX[box]`, faux → `box=1`, `due=today+1` ; `buildBlock` rend 4 cartes avec 2 exercices en fin ; `streak` ignore le jour en cours s'il a < 5 cartes ; `capMs(90000)=60000`, `capMs(NaN)=0` ; `baselineSample` rend 6 cartes dont 3 exercices, exclut les `flagged`, `reduced=true` sous 6 ; `statsAdd` immuable ; `eveningMode` : mardi 18:00 `readonly`, mardi 17:59 `full`, samedi 12:00 `readonly`, mercredi 23:30 `closed`, jeudi 05:00 `full` ; `weekDelta` : fenêtre précédente vide → `null` ; 50 % puis 75 % → `25` ; `bilanBuild` sur stats vides → pas de `NaN` (`JSON.stringify` sans `"NaN"`).
- [ ] Implémenter, `npm test` PASS.

### A4 — Données : DataStore, LocalStore, seed, hooks
**Files :** `src/data/{store,localStore,firestoreStore,provider,hooks}.ts(x)`, `scripts/build-seed.mjs`
**Interfaces — Produces :**
- `DataStore` : `getDoc<T>(path):Promise<T|null>`, `setDoc(path, data):Promise<void>`, `updateDoc(path, patch):Promise<void>`, `deleteDoc(path):Promise<void>`, `subscribeCollection<T>(name, cb):Unsubscribe`, `subscribeDoc<T>(path, cb):Unsubscribe`.
- Hooks : `useCollection<T>(name):{data:(T&{id:string})[], ready:boolean}`, `useDoc<T>(path):{data:T|null, ready:boolean}`, `useStore():DataStore`.
- `build-seed.mjs` : lit `seed/raw/<collection>/<id>.json` et écrit `public/seed.json` `{collection:{id:doc}}`.
- [ ] Test `LocalStore` : `setDoc` puis `subscribeDoc` notifie ; `updateDoc` fusionne ; données persistées après rechargement simulé ; collection vide → `[]`.
- [ ] `build-seed` : Run `npm run seed` — Expected : `public/seed.json` avec 43 concepts, 27 evals, 525 flash, 44 sources.
- [ ] `FirestoreStore` implémente la même interface avec `users/{uid}/…` ; `provider` choisit selon `VITE_DATA_BACKEND` ; non testé sans projet Firebase (vérifié à la compilation).

### A5 — Shell : thème, navigation, composants
**Files :** `src/styles/{tokens,global}.css`, `src/components/*`, `src/App.tsx`, `src/routes.tsx`
- [ ] Reprendre les tokens de l'artifact (clair/sombre), barre latérale sur ≥ 761 px, barre d'onglets sur mobile ; onglets : Maintenant, Flash, Réviser, Évals ; accès Données depuis le pied de la barre.
- [ ] Composants : `Card`, `Chip(course)`, `Banner`, `Sheet`, `Toast`, `ProgressBar`.
- [ ] Run : `npm run build` — Expected : OK.

### A6 — Écran Maintenant
**Files :** `src/features/now/*`
**Consumes :** `lampadaire`, `reason`, `dueList`, `fmtDay`, `eveningMode`, `bilanBuild`, `courseT0Now`.
- [ ] Lampadaire, compte à rebours, KPI (dus, en retard, missions ouvertes, séries du mois), bloc de focus 25/45/90 avec rappels mi-parcours et 15 min, règle du jour (rotation par date), garde-fous horaires, échéances à 14 jours, courbe T0 → maintenant.
- [ ] Test de rendu (Testing Library) avec un mini-seed : le lampadaire affiche la bonne notion ; aucune valeur `NaN`.

### A7 — Réviser + fiche notion (sans IA)
**Files :** `src/features/review/*`
- [ ] Liste par matière puis chapitre (libellés via `flashcfg/chapters`), filtres, badges de statut/échéance/missions.
- [ ] `ConceptSheet` : description, statut, missions (ajout/validation), saisie manuelle de la note d'un exercice (applique `applyScore`, écrit `concepts/{id}` et `journal/{YYYY-MM}`).
- [ ] Test : saisir 90 sur une notion rouge → `jaune`/`vert` selon les règles, `journal` incrémenté.

### A8 — Flash : cascade, erreurs, drill, remédiation
**Files :** `src/features/flash/*`
**Consumes :** `buildBlock`, `cardStateAfter`, `streak`, `statsAdd`.
- [ ] Page Flash : cascade par matière (chapitre jusqu'à), mode « chapitres au choix », « Revoir mes erreurs », progression par chapitre.
- [ ] Drill : rappel actif (révéler les choix), 2-4 choix, « ma réponse n'est pas dans la liste », combo, vibration, signalement d'une carte (`flagged`), temps par carte plafonné.
- [ ] Fin de bloc : ≥ 80 % → chapitre validé, sinon remédiation (fiche du chapitre, erreurs corrigées, 2 exercices corrigés) puis nouveau bloc.
- [ ] Commit : `flashprog/main` (cartes, jours, XP, historique, cascade), `concepts/{id}.nextDue` ramené à demain quand une carte liée est ratée, `stats/main`.
- [ ] Tests : un bloc juste à 4/4 passe le chapitre ; 2/4 ouvre la remédiation ; carte ratée liée à une notion non consolidée ramène la notion à demain.

### A9 — Test d'entrée, journal, bilan du soir
**Files :** `src/features/flash/Baseline*.tsx`, `src/features/now/BilanCard.tsx`
- [ ] Mode test d'entrée : par matière, chapitres non mesurés (ou re-mesure), 6 cartes par chapitre, choix toujours visibles, aucun écran de remédiation, écriture de `baseline/{COURSE}-{ch}` et `stats/main` uniquement ; cadrage affiché avant le test.
- [ ] Bilan du soir : `bilanView(eveningMode(now))` décide ce qui s'affiche ; enregistrement `bilans/{date}` ; refus si `closed`.
- [ ] Tests : le test d'entrée ne modifie ni `flashprog` ni `concepts` ; en `readonly` aucun bouton d'enregistrement.

### A10 — Évals et Données
**Files :** `src/features/evals/*`, `src/features/data/*`
- [ ] Évals : semaines, pastille de charge (poids), éléments passés atténués.
- [ ] Données : export JSON de toutes les collections, import avec confirmation, indicateur du backend.

### A11 — Firebase prêt à brancher
**Files :** `firebase.json`, `firestore.rules`, `.env.example`, `src/data/auth.tsx`, `docs/firebase-setup.md`
- [ ] Règles : lecture/écriture uniquement si `request.auth.uid == <UID propriétaire>` sur `users/{uid}/**`.
- [ ] Connexion Google, garde de routes, `docs/firebase-setup.md` : création du projet, activation Firestore/Auth/Hosting, variables `VITE_FIREBASE_*`.
- [ ] Run : `npm run build` avec `VITE_DATA_BACKEND=firebase` — Expected : compilation OK.

### A12 — PWA et vérification finale
- [ ] `vite-plugin-pwa` : manifest, icônes, cache hors ligne de l'appli (les données restent celles du store).
- [ ] Run : `npm test && npm run lint && npm run build` — Expected : tout vert.
- [ ] Rendu navigateur avec les vraies données (captures Maintenant, Réviser, Flash, Évals, mobile et bureau).
- [ ] Mise à jour de `claude/boussole.md` (section V2) dans le projet DESS Boss.

## Auto-revue

- **Couverture de la spec :** §3 → A4, A11 ; §4 → A2, A3 ; §5 → A5-A10 ; §6 → A3, A9 ; §7 → A4 ; §8 → tests A2/A3, `.gitignore` A1.
- **Cohérence des signatures :** `applyScore`, `buildBlock`, `cardStateAfter`, `statsAdd`, `bilanBuild` sont utilisés avec les mêmes paramètres en A6-A9.
- **Proportion :** le plan décrit interfaces et assertions, pas les corps de fonctions.
