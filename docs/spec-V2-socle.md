# Boussole V2 — Spec du sous-projet A « Socle + parité sans IA + progression visible »

Date : 2026-10-07 · Statut : validé par Antonin (démarrage demandé le 2026-10-07)
Prérequis lus : `docs/spec-progression-visible.md` (fonctionnalités phase 1), `claude/boussole.md` (modèle de données de l'artifact).

## 1. Intention

**But :** transformer Boussole, aujourd'hui un artifact HTML unique, en vraie appli web installable sur téléphone, avec ses propres données, tout en intégrant dès le départ la « progression visible » (test d'entrée T0, journal de séances, bilan du soir).
**Réussite du sous-projet A :**
1. L'appli tourne en local avec **les vraies données** de l'artifact (43 notions, 27 évals, 525 cartes, 44 sources, progression Flash, journal).
2. Les écrans Maintenant, Réviser, Flash, Évals et Données fonctionnent comme dans l'artifact, **sans fonctions IA**.
3. Test d'entrée, journal de séances et bilan du soir fonctionnent.
4. Les règles métier (Leitner, priorités, tirage des cartes, seuils) sont couvertes par des tests automatiques.
5. Le même code tourne sur un backend local (développement, démo) et sur Firebase (production) ; Firebase est prêt à brancher dès que le projet existe.

**Hors périmètre de A :** fonctions IA (explications, génération de questions et de cartes, tuteur, Fil, Labos, exemples guidés) → sous-projet B ; scan Drive, rappel 20h30, rebranchement des sessions de tutorat, gel de l'artifact → sous-projet C.
**Contraintes :** l'artifact reste l'outil quotidien tant que la bascule n'a pas eu lieu (cible : après le 20 octobre 2026) ; langue de l'interface : français ; non-négociables intégrés (mardi ≥ 18h et samedi ≥ 12h : lecture seule ; ≥ 23h30 ou < 5h : fermé).

## 2. Stack et structure

React 18 + Vite + TypeScript (strict), Vitest, React Router, Firebase SDK (Firestore, Auth), CSS par tokens (palette de l'artifact reprise). Installable (PWA : manifest + service worker).

```
boussole-web/
├─ docs/                      specs et plans
├─ seed/raw/                  export brut de l'artifact (ignoré par git)
├─ scripts/build-seed.mjs     seed/raw → public/seed.json
├─ public/                    manifest, icônes, seed.json (dev uniquement)
├─ firebase.json · firestore.rules · .env.example
└─ src/
   ├─ domain/                 logique pure + tests
   ├─ data/                   DataStore, LocalStore, FirestoreStore, hooks
   ├─ features/               now · review · flash · evals · data
   ├─ components/             Card, Chip, TabBar, Sheet, Toast…
   └─ styles/                 tokens.css, global.css
```

## 3. Couche données

- Interface `DataStore` : `get/set/update/delete` de documents, `list/subscribe` de collections et de documents, avec les mêmes noms de collections que l'artifact : `concepts`, `evals`, `flash`, `sources`, `flashcfg`, `flashprog`, `journal`, plus les nouvelles `baseline`, `stats`, `bilans`.
- `LocalStore` : données en mémoire persistées dans `localStorage` ; initialisé au premier lancement depuis `public/seed.json`. Sert au développement, aux tests et à une démo.
- `FirestoreStore` : chemins `users/{uid}/{collection}/{id}` ; connexion Google ; règles : seul le compte propriétaire lit et écrit.
- Le choix du backend se fait par `VITE_DATA_BACKEND=local|firebase`.
- Les écrans ne connaissent que `DataStore` (via des hooks `useCollection`, `useDoc`).

## 4. Règles métier portées (domain/)

Reprises à l'identique de l'artifact, chacune avec ses tests :
- **Répétition des notions :** ≥ 85 % → série +1, retour J+3/J+7/J+16, consolidée après 3 réussites ; 60-84 → jaune, J+1 ; < 60 → rouge, J+1.
- **Priorité :** retard, statut, proximité d'éval, rouge < 10 jours avant éval = priorité absolue ; « lampadaire » = notion due du chapitre le plus bas de la matière prioritaire.
- **Flash :** boîtes de Leitner J+1/3/7/16/35 ; cascade par matière, 4 cartes par chapitre (2 cours + 2 exercices), seuil 80 % ; série 🔥 = jours avec ≥ 5 cartes ; objectif 10 cartes/jour.
- **Dates et non-négociables :** `eveningMode`, jours/semaines, formats français.
- **Nouveau (phase 1) :** `baselineSample` (6 cartes par chapitre), `baselineAppend`, `statsAdd`, `statsPrune`, `courseT0Now`, `weekDelta`, `bilanBuild`, `bilanView`.

## 5. Écrans de A

| Écran | Contenu |
|---|---|
| **Maintenant** | Lampadaire, compte à rebours de la prochaine éval, KPI, bloc de focus (minuteur), règle du jour, courbe T0 → maintenant, bilan du soir, prochaines échéances |
| **Réviser** | Notions par matière puis chapitre, statut et échéance, fiche notion (détail, missions, saisie manuelle de la note d'un exercice fait ailleurs) |
| **Flash** | Cascade par matière, revoir mes erreurs, drill (rappel actif, combo, feedback), remédiation avec fiche du chapitre et erreurs corrigées, test d'entrée |
| **Évals** | Calendrier des échéances par semaine |
| **Données** | Export / import JSON, état du backend |
Les onglets Fil, Labos et Tuteur n'existent pas encore (sous-projet B) ; la barre de navigation n'en affiche aucun.

## 6. Progression visible (reprise de la spec phase 1)

- **Test d'entrée :** 6 cartes par chapitre, sans indice, jamais de modification de `flashprog` ni de `concepts` ; document `baseline/{COURSE}-{ch}` avec `runs[]` (T0 = `runs[0]`).
- **Journal de séances :** `stats/main` avec `days[date] = {cards, ok, mins, byCourse}` ; temps actif plafonné à 60 s par carte.
- **Bilan du soir :** `bilans/{date}` ; visible dès 19h ; comparaison jour/veille et matière/T0 ; micro-victoires ; ce qui a coincé ; 3 pistes pour demain ; note libre ; lecture seule mardi ≥ 18h et samedi ≥ 12h ; fermé ≥ 23h30 ou < 5h.
- Décisions validées : 6 cartes par chapitre ; rappel push 20h30 sauf mardi et samedi (livré en sous-projet C).

## 7. Migration

`scripts/build-seed.mjs` assemble les fichiers de `seed/raw/` en `public/seed.json`. Pour la production, un script d'import écrit ce même JSON dans Firestore (sous-projet C). L'artifact n'est jamais modifié.

## 8. Risques et parades

- **Dérive entre l'artifact et la V2 pendant la construction :** le seed est un instantané du 2026-10-07 ; un re-seed sera fait juste avant la bascule.
- **Règles métier mal portées :** tests unitaires écrits d'après le comportement de l'artifact, avec les valeurs de ses constantes.
- **Données personnelles :** `seed/` est ignoré par git ; Firestore n'accepte que le compte propriétaire.
- **Coût :** A n'appelle ni Claude ni aucun service payant.
