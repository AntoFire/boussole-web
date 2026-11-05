# Boussole

Appli d'apprentissage personnelle pour le DESS IA (Université Laval) : matières et chapitres, feuille blanche avec répétition espacée, quiz d'examen, Flash (Leitner en cascade), notions à réviser, échéances.

Appli web installable (PWA), React + TypeScript + Vite, données dans Firebase (Firestore), connexion Google réservée au propriétaire.

## Démarrer en local (données de démo)

```bash
npm ci
npm run dev        # http://localhost:5173, backend local (localStorage + public/seed.json)
npm test           # tests unitaires (Vitest)
npm run typecheck
```

`public/seed.json` et `seed/` contiennent des données personnelles : ils sont exclus du dépôt (`.gitignore`).

## Mettre en ligne

Voir [docs/firebase-setup.md](docs/firebase-setup.md).

## Organisation du code

```
src/domain/     logique pure + tests (dates, Leitner, priorités, matières, feuille blanche, quiz)
src/data/       DataStore : LocalStore (dev) et FirestoreStore (prod), mêmes collections que l'artifact
src/features/   écrans : now (vue d'ensemble), subjects (matières, fiche chapitre, feuille blanche, quiz), flash, review, evals, data
src/components/ composants partagés
docs/           specs et plans
```

## Feuille de route

1. **Phase 1 (en cours)** : socle + Matières sans IA, mise en ligne.
2. **Phase 2** : IA (Qwen via OpenRouter, appelée par une Cloud Function) et PDF : fiche, points clés, cartes, carte mentale, quiz d'examen généré, lecture guidée.
3. **Phase 3** : QCM, Fil, Examen, rappel quotidien, pont avec les sessions Claude, bascule depuis l'artifact.
4. **Phase 4** : applis iOS / Android.

Détails : [docs/plan-V3.md](docs/plan-V3.md).
