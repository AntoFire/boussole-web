# Boussole V3 — appli indépendante (plan du 2026-11-05)

Copie de travail du plan tenu dans le projet Claude « DESS Boss » (`claude/boussole-v3-appli-plan.md`).

## Décisions
- Firebase, forfait Blaze (alerte de budget à 1 $ ; coût attendu 0 $). Cloud Storage et les appels sortants des Functions exigent Blaze.
- IA : Qwen 3.8 27B gratuit via OpenRouter (`qwen/qwen3.8-27b:free`), appelé uniquement par une Cloud Function qui garde la clé (Secret Manager).
- PDF déposés dans l'appli (Storage), texte extrait dans le navigateur (pdf.js). Plus de dépendance à Google Drive.
- D'abord une appli web installable, une appli des stores plus tard.

## Phase 1 — socle + Matières, sans IA (fait le 2026-11-05)
- Modèle de données aligné sur l'artifact : `chprog/{COURSE}-{n}`, `rewards/main`, Maths en 7 chapitres (BASES fusionné).
- Domaine testé : `subjects.ts` (état d'un chapitre, XP, niveaux, priorités, feuilles dues, calendrier J+1/3/7/16/35), `quiz.ts` (tirage d'examen, score, effets sur Leitner et la cascade).
- Écrans : Vue d'ensemble (feuilles dues, où concentrer), page Matière, fiche chapitre (cours vu, vidéo de renfort, feuille blanche guidée/libre avec boucle sur les points manqués, points clés, quiz d'examen 10 questions, rappel rapide 4 cartes, fiche), récompenses.
- Firebase : règles Firestore et Storage, import par lots, guide `docs/firebase-setup.md`.
- Reste pour la bascule : export complet depuis l'artifact (à ajouter à l'artifact lui-même), import, mise en ligne.

## Phase 2 — IA + PDF
Cloud Function `ai` (propriétaire seul, plafond quotidien, validation JSON, un nouvel essai) ; dépôt d'un PDF dans un chapitre → fiche, points clés, 8-10 cartes, carte mentale ; quiz d'examen complété par génération ; lecture guidée.

## Phase 3 — reste et bascule
QCM, Fil, Examen selon besoin ; rappel quotidien ; pont avec les sessions Claude (serveur MCP Firebase local) ; artifact en lecture seule.

## Phase 4 — stores (Capacitor)
